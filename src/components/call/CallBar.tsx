import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import { cn } from '@/lib/utils';

interface CallBarProps {
  className?: string;
}

const CallBar: React.FC<CallBarProps> = ({ className }) => {
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
    <div className={cn(
      "flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2",
      className
    )}>
      {/* Call icon with status */}
      <div className="flex items-center gap-2">
        {callState.status === 'calling' ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <Phone className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* User info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="font-medium text-sm text-foreground truncate">{otherUser}</span>
        <span className="text-xs text-muted-foreground">
          {callState.status === 'calling' ? 'Calling...' : formatDuration(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-full w-8 h-8 p-0",
            callState.isMuted && "bg-destructive/20 text-destructive hover:bg-destructive/30"
          )}
          onClick={toggleMute}
        >
          {callState.isMuted ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="rounded-full w-8 h-8 p-0"
          onClick={endCall}
        >
          <PhoneOff className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CallBar;
