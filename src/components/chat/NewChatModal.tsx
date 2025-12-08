import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from './ChatContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface User {
  uid: string;
  username: string;
  email: string;
}

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ open, onOpenChange, onChatCreated }) => {
  const { user } = useAuth();
  const { createChat, setActiveChat, chats } = useChat();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!search.trim() || !user) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('username', '>=', search.toLowerCase()),
          where('username', '<=', search.toLowerCase() + '\uf8ff')
        );
        
        const snapshot = await getDocs(usersQuery);
        const usersList: User[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.uid !== user.uid) {
            usersList.push({
              uid: data.uid,
              username: data.username,
              email: data.email,
            });
          }
        });
        
        setUsers(usersList);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [search, user]);

  const toggleUser = (selectedUser: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.uid === selectedUser.uid);
      if (isSelected) {
        return prev.filter(u => u.uid !== selectedUser.uid);
      }
      return [...prev, selectedUser];
    });
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;

    setCreating(true);
    try {
      const participantIds = selectedUsers.map(u => u.uid);
      const participantNames: Record<string, string> = {};
      selectedUsers.forEach(u => {
        participantNames[u.uid] = u.username;
      });

      const chatId = await createChat(participantIds, participantNames);
      
      // Find the chat and set it as active
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setActiveChat(chat);
      }

      toast.success('Chat created!');
      onOpenChange(false);
      onChatCreated();
      setSelectedUsers([]);
      setSearch('');
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">New Chat</DialogTitle>
          <DialogDescription>
            Search for users by username to start a conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username..."
              className="pl-10"
            />
          </div>

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => toggleUser(u)}
                  className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-1 rounded-full text-sm hover:bg-primary/30 transition-colors"
                >
                  @{u.username}
                  <Check className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {/* Search results */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : users.length > 0 ? (
              <div className="space-y-1">
                {users.map((u) => {
                  const isSelected = selectedUsers.some(su => su.uid === u.uid);
                  return (
                    <button
                      key={u.uid}
                      onClick={() => toggleUser(u)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors',
                        isSelected ? 'bg-primary/20' : 'hover:bg-muted'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-medium text-sm">
                          {u.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-foreground">@{u.username}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            ) : search.trim() ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No users found
              </p>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Type a username to search
              </p>
            )}
          </div>

          {/* Create button */}
          <Button
            onClick={handleCreateChat}
            disabled={selectedUsers.length === 0 || creating}
            className="w-full gap-2"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Start Chat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatModal;
