import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Loader2 } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import { useToast } from '@/hooks/use-toast';

interface StartCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StartCallModal: React.FC<StartCallModalProps> = ({ open, onOpenChange }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { startCall } = useCall();
  const { toast } = useToast();

  const handleStartCall = async () => {
    if (!username.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a username',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await startCall(username.trim());
      onOpenChange(false);
      setUsername('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start call',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Start a Call
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter username to call..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartCall()}
            />
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleStartCall}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calling...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Call
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StartCallModal;