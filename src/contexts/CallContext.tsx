import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, deleteDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CallState {
  callId: string | null;
  caller: string;
  callee: string;
  status: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
  isMuted: boolean;
}

interface CallContextType {
  callState: CallState;
  incomingCall: { callId: string; callerUsername: string } | null;
  startCall: (username: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const CALL_TIMEOUT = 30000; // 30 seconds

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [callState, setCallState] = useState<CallState>({
    callId: null,
    caller: '',
    callee: '',
    status: 'idle',
    isMuted: false,
  });
  const [incomingCall, setIncomingCall] = useState<{ callId: string; callerUsername: string } | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create audio element for remote stream
  useEffect(() => {
    remoteAudioRef.current = new Audio();
    remoteAudioRef.current.autoplay = true;
    return () => {
      remoteAudioRef.current = null;
    };
  }, []);

  // Clear timeout helper
  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!userProfile?.username) return;

    const callsQuery = query(
      collection(db, 'calls'),
      where('calleeUsername', '==', userProfile.username),
      where('status', '==', 'calling')
    );

    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          setIncomingCall({
            callId: change.doc.id,
            callerUsername: data.callerUsername,
          });
          setCallState(prev => ({ ...prev, status: 'incoming' }));
        }
      });
    });

    return () => unsubscribe();
  }, [userProfile?.username]);

  // Listen for call document changes when in a call
  useEffect(() => {
    if (!callState.callId) return;

    const callDocRef = doc(db, 'calls', callState.callId);
    
    const unsubscribe = onSnapshot(callDocRef, async (snapshot) => {
      if (!snapshot.exists()) {
        // Call was deleted (ended)
        await cleanup();
        setCallState({ callId: null, caller: '', callee: '', status: 'idle', isMuted: false });
        setIncomingCall(null);
        clearCallTimeout();
        return;
      }

      const data = snapshot.data();
      
      // Handle answer from callee
      if (data.answer && peerConnectionRef.current && !peerConnectionRef.current.currentRemoteDescription) {
        try {
          const answer = new RTCSessionDescription(data.answer);
          await peerConnectionRef.current.setRemoteDescription(answer);
          clearCallTimeout(); // Call was answered
        } catch (e) {
          console.error('Error setting remote description:', e);
        }
      }

      // Handle ICE candidates
      if (data.iceCandidates && peerConnectionRef.current) {
        for (const candidate of data.iceCandidates) {
          if (candidate) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              // Ignore duplicate candidates
            }
          }
        }
      }

      // Handle answer ICE candidates
      if (data.answerIceCandidates && peerConnectionRef.current) {
        for (const candidate of data.answerIceCandidates) {
          if (candidate) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              // Ignore duplicate candidates
            }
          }
        }
      }

      if (data.status === 'connected') {
        setCallState(prev => ({ ...prev, status: 'connected' }));
        clearCallTimeout();
      } else if (data.status === 'ended') {
        await cleanup();
        setCallState({ callId: null, caller: '', callee: '', status: 'idle', isMuted: false });
        setIncomingCall(null);
        clearCallTimeout();
      }
    });

    return () => unsubscribe();
  }, [callState.callId, clearCallTimeout]);

  const cleanup = async () => {
    clearCallTimeout();
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const startCall = useCallback(async (username: string) => {
    if (!userProfile) return;

    try {
      // Get local audio stream
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS);
      
      // Monitor connection state
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current?.connectionState;
        if (state === 'failed' || state === 'disconnected') {
          toast.error('Call connection lost');
          endCall();
        }
      };

      // Add local stream tracks
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current!.addTrack(track, localStreamRef.current!);
      });

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      const callId = `${userProfile.uid}_${Date.now()}`;
      const callDocRef = doc(db, 'calls', callId);

      // Collect ICE candidates
      const iceCandidates: RTCIceCandidateInit[] = [];
      peerConnectionRef.current.onicecandidate = async (event) => {
        if (event.candidate) {
          iceCandidates.push(event.candidate.toJSON());
          try {
            await updateDoc(callDocRef, { iceCandidates });
          } catch (e) {
            // Document may not exist yet
          }
        }
      };

      // Create offer
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      // Save call to Firestore
      await setDoc(callDocRef, {
        callerId: userProfile.uid,
        callerUsername: userProfile.username,
        calleeUsername: username,
        offer: { type: offer.type, sdp: offer.sdp },
        status: 'calling',
        createdAt: Date.now(),
        iceCandidates: [],
      });

      setCallState({
        callId,
        caller: userProfile.username,
        callee: username,
        status: 'calling',
        isMuted: false,
      });

      // Set timeout for unanswered call
      callTimeoutRef.current = setTimeout(async () => {
        toast.info(`${username} didn't answer`);
        await endCall();
      }, CALL_TIMEOUT);

    } catch (error: any) {
      console.error('Error starting call:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied');
      } else {
        toast.error('Failed to start call');
      }
      await cleanup();
    }
  }, [userProfile]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !userProfile) return;

    try {
      // Get local audio stream
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS);
      
      // Monitor connection state
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current?.connectionState;
        if (state === 'failed' || state === 'disconnected') {
          toast.error('Call connection lost');
          endCall();
        }
      };

      // Add local stream tracks
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current!.addTrack(track, localStreamRef.current!);
      });

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      const callDocRef = doc(db, 'calls', incomingCall.callId);
      const callDoc = await getDocs(query(collection(db, 'calls'), where('__name__', '==', incomingCall.callId)));
      
      if (callDoc.empty) {
        toast.error('Call no longer exists');
        setIncomingCall(null);
        return;
      }
      
      const callData = callDoc.docs[0].data();

      // Set remote description (offer)
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(callData.offer));

      // Collect ICE candidates
      const answerIceCandidates: RTCIceCandidateInit[] = [];
      peerConnectionRef.current.onicecandidate = async (event) => {
        if (event.candidate) {
          answerIceCandidates.push(event.candidate.toJSON());
          try {
            await updateDoc(callDocRef, { answerIceCandidates });
          } catch (e) {
            console.error('Error updating answer ICE candidates:', e);
          }
        }
      };

      // Add existing ICE candidates from caller
      if (callData.iceCandidates) {
        for (const candidate of callData.iceCandidates) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            // Ignore
          }
        }
      }

      // Create answer
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      // Update call document with answer
      await updateDoc(callDocRef, {
        answer: { type: answer.type, sdp: answer.sdp },
        status: 'connected',
      });

      setCallState({
        callId: incomingCall.callId,
        caller: incomingCall.callerUsername,
        callee: userProfile.username,
        status: 'connected',
        isMuted: false,
      });
      setIncomingCall(null);
    } catch (error: any) {
      console.error('Error accepting call:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied');
      } else {
        toast.error('Failed to accept call');
      }
      await cleanup();
      setIncomingCall(null);
    }
  }, [incomingCall, userProfile]);

  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      await deleteDoc(doc(db, 'calls', incomingCall.callId));
      setIncomingCall(null);
      setCallState({ callId: null, caller: '', callee: '', status: 'idle', isMuted: false });
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  }, [incomingCall]);

  const endCall = useCallback(async () => {
    const currentCallId = callState.callId;
    
    // Reset state immediately
    setCallState({ callId: null, caller: '', callee: '', status: 'idle', isMuted: false });
    setIncomingCall(null);
    
    // Then cleanup
    await cleanup();
    
    // Finally delete from Firestore
    if (currentCallId) {
      try {
        await deleteDoc(doc(db, 'calls', currentCallId));
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
  }, [callState.callId]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  return (
    <CallContext.Provider value={{
      callState,
      incomingCall,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
    }}>
      {children}
    </CallContext.Provider>
  );
};
