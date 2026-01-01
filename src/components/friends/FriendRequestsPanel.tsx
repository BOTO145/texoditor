import React from 'react';
import { useFriends } from '@/contexts/FriendContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Clock, UserMinus, User } from 'lucide-react';
import { toast } from 'sonner';

interface FriendRequestsPanelProps {
  onStartChat?: (userId: string, username: string) => void;
}

const FriendRequestsPanel: React.FC<FriendRequestsPanelProps> = ({ onStartChat }) => {
  const { 
    friends, 
    incomingRequests, 
    outgoingRequests, 
    acceptFriendRequest, 
    rejectFriendRequest,
    removeFriend 
  } = useFriends();

  const handleAccept = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      toast.success('Friend request accepted!');
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      toast.info('Friend request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleRemoveFriend = async (friendshipId: string, username: string) => {
    if (!confirm(`Remove ${username} from friends?`)) return;
    try {
      await removeFriend(friendshipId);
      toast.success(`Removed ${username} from friends`);
    } catch (error) {
      toast.error('Failed to remove friend');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Incoming Requests */}
          {incomingRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Incoming Requests ({incomingRequests.length})
              </h3>
              <div className="space-y-2">
                {incomingRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{request.senderUsername}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                        onClick={() => handleAccept(request.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleReject(request.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing Requests */}
          {outgoingRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Pending Requests ({outgoingRequests.length})
              </h3>
              <div className="space-y-2">
                {outgoingRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{request.receiverUsername}</span>
                        <p className="text-xs text-muted-foreground">Pending...</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Friends ({friends.length})
            </h3>
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No friends yet. Send a friend request to get started!
              </p>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div 
                    key={friend.id} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <button
                      className="flex items-center gap-3 flex-1 text-left"
                      onClick={() => onStartChat?.(friend.odocId, friend.username)}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {friend.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-foreground">{friend.username}</span>
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveFriend(friend.id, friend.username)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default FriendRequestsPanel;
