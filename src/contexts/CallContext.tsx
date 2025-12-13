import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, deleteDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

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
  ],
};

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

  // Create audio element for remote stream
  useEffect(() => {
    remoteAudioRef.current = new Audio();
    remoteAudioRef.current.autoplay = true;
    return () => {
      remoteAudioRef.current = null;
    };
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
        return;
      }

      const data = snapshot.data();
      
      // Handle answer from callee
      if (data.answer && peerConnectionRef.current && !peerConnectionRef.current.currentRemoteDescription) {
        const answer = new RTCSessionDescription(data.answer);
        await peerConnectionRef.current.setRemoteDescription(answer);
      }

      // Handle ICE candidates
      if (data.iceCandidates) {
        const candidates = data.iceCandidates;
        for (const candidate of candidates) {
          if (candidate && peerConnectionRef.current) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.log('Error adding ICE candidate:', e);
            }
          }
        }
      }

      if (data.status === 'connected') {
        setCallState(prev => ({ ...prev, status: 'connected' }));
      } else if (data.status === 'ended') {
        await cleanup();
        setCallState({ callId: null, caller: '', callee: '', status: 'idle', isMuted: false });
        setIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [callState.callId]);

  const cleanup = async () => {
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
          await updateDoc(callDocRef, { iceCandidates });
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
    } catch (error) {
      console.error('Error starting call:', error);
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
      
      if (callDoc.empty) return;
      
      const callData = callDoc.docs[0].data();

      // Set remote description (offer)
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(callData.offer));

      // Collect ICE candidates
      const iceCandidates: RTCIceCandidateInit[] = callData.iceCandidates || [];
      peerConnectionRef.current.onicecandidate = async (event) => {
        if (event.candidate) {
          iceCandidates.push(event.candidate.toJSON());
          await updateDoc(callDocRef, { answerIceCandidates: iceCandidates });
        }
      };

      // Add existing ICE candidates from caller
      if (callData.iceCandidates) {
        for (const candidate of callData.iceCandidates) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.log('Error adding ICE candidate:', e);
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
    } catch (error) {
      console.error('Error accepting call:', error);
      await cleanup();
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
    if (!callState.callId) return;

    try {
      await deleteDoc(doc(db, 'calls', callState.callId));
      await cleanup();
      setCallState({ callId: null, caller: '', callee: '', status: 'idle', isMuted: false });
      setIncomingCall(null);
    } catch (error) {
      console.error('Error ending call:', error);
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