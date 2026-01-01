import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import { useRingtone } from '@/hooks/useRingtone';

const ActiveCallOverlay: React.FC = () => {
  const { callState, endCall, toggleMute } = useCall();
  const { playOutgoingRingtone, stopRingtone } = useRingtone();
  const [duration, setDuration] = useState(0);

  // Play outgoing ringtone when calling
  useEffect(() => {
    if (callState.status === 'calling') {
      playOutgoingRingtone();
    } else {
      stopRingtone();
    }
    
    return () => stopRingtone();
  }, [callState.status, playOutgoingRingtone, stopRingtone]);

  useEffect(() => {
    if (callState.status !== 'connected') {
      setDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callState.status]);

  if (callState.status === 'idle' || callState.status === 'incoming') return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const otherUser = callState.caller === callState.callee ? callState.caller : 
    (callState.status === 'calling' ? callState.callee : callState.caller);

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-card border border-border rounded-2xl shadow-2xl p-5 min-w-[300px] animate-slide-up">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          {callState.status === 'calling' ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <Phone className="w-6 h-6 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate text-lg">{otherUser}</p>
          <p className="text-sm text-muted-foreground">
            {callState.status === 'calling' ? 'Calling...' : formatDuration(duration)}
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className={`rounded-full w-14 h-14 ${callState.isMuted ? 'bg-destructive/20 border-destructive text-destructive' : ''}`}
          onClick={toggleMute}
        >
          {callState.isMuted ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={endCall}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

export default ActiveCallOverlay;
