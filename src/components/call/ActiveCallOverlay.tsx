import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';

const ActiveCallOverlay: React.FC = () => {
  const { callState, endCall, toggleMute } = useCall();
  const [duration, setDuration] = useState(0);

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
    <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-2xl shadow-2xl p-4 min-w-[280px] animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            {callState.status === 'calling' ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Phone className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">{otherUser}</p>
            <p className="text-sm text-muted-foreground">
              {callState.status === 'calling' ? 'Calling...' : formatDuration(duration)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full w-12 h-12 ${callState.isMuted ? 'bg-red-500/20 border-red-500' : ''}`}
          onClick={toggleMute}
        >
          {callState.isMuted ? (
            <MicOff className="w-5 h-5 text-red-500" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={endCall}
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default ActiveCallOverlay;