import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, User } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';

const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  return (
    <Dialog open={!!incomingCall} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <div className="flex flex-col items-center py-6 space-y-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <User className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-primary animate-ping opacity-20" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Incoming Call</h3>
            <p className="text-lg text-muted-foreground">{incomingCall.callerUsername}</p>
          </div>

          <div className="flex gap-6">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={rejectCall}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
              onClick={acceptCall}
            >
              <Phone className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;