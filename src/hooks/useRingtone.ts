import { useRef, useCallback, useEffect } from 'react';

type RingtoneType = 'incoming' | 'outgoing';

// Generate ringtone using Web Audio API
const createRingtone = (type: RingtoneType): AudioContext | null => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioContext;
  } catch {
    return null;
  }
};

const playTone = (
  audioContext: AudioContext, 
  frequency: number, 
  duration: number, 
  startTime: number
) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
  
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
};

export const useRingtone = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);

  const playIncomingRingtone = useCallback(() => {
    if (isPlayingRef.current) return;
    
    try {
      audioContextRef.current = createRingtone('incoming');
      if (!audioContextRef.current) return;
      
      isPlayingRef.current = true;
      const ctx = audioContextRef.current;
      
      const playRingPattern = () => {
        if (!isPlayingRef.current || ctx.state === 'closed') return;
        
        const now = ctx.currentTime;
        // Two-tone ring pattern (like a phone)
        playTone(ctx, 440, 0.2, now);
        playTone(ctx, 480, 0.2, now + 0.25);
        playTone(ctx, 440, 0.2, now + 0.5);
        playTone(ctx, 480, 0.2, now + 0.75);
      };
      
      playRingPattern();
      intervalRef.current = setInterval(playRingPattern, 2000);
    } catch (e) {
      console.log('Failed to play ringtone:', e);
    }
  }, []);

  const playOutgoingRingtone = useCallback(() => {
    if (isPlayingRef.current) return;
    
    try {
      audioContextRef.current = createRingtone('outgoing');
      if (!audioContextRef.current) return;
      
      isPlayingRef.current = true;
      const ctx = audioContextRef.current;
      
      const playRingback = () => {
        if (!isPlayingRef.current || ctx.state === 'closed') return;
        
        const now = ctx.currentTime;
        // Single long tone (like a phone ringback)
        playTone(ctx, 440, 1.5, now);
      };
      
      playRingback();
      intervalRef.current = setInterval(playRingback, 4000);
    } catch (e) {
      console.log('Failed to play ringback:', e);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    isPlayingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
    };
  }, [stopRingtone]);

  return {
    playIncomingRingtone,
    playOutgoingRingtone,
    stopRingtone,
  };
};
