import React, { useState, useRef, useEffect } from 'react';
import { useChat } from './ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Smile, 
  Image as ImageIcon, 
  X, 
  ArrowLeft,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import EmojiPicker from './EmojiPicker';
import GifPicker from './GifPicker';

interface ChatPanelProps {
  onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onClose }) => {
  const { chats, activeChat, messages, setActiveChat, sendMessage, markAsRead } = useChat();
  const { user, userProfile } = useAuth();
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeChat) {
      markAsRead(activeChat.id);
    }
  }, [activeChat, markAsRead]);

  const handleSend = async () => {
    if (!message.trim()) return;
    await sendMessage(message, 'text');
    setMessage('');
  };

  const handleEmojiSelect = async (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleGifSelect = async (gifUrl: string) => {
    await sendMessage(gifUrl, 'gif');
    setShowGif(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getOtherParticipantName = (chat: typeof chats[0]) => {
    if (!user) return 'Unknown';
    const otherIds = chat.participants.filter(p => p !== user.uid);
    return otherIds.map(id => chat.participantNames[id] || 'Unknown').join(', ');
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        {activeChat ? (
          <>
            <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-foreground">
              {getOtherParticipantName(activeChat)}
            </span>
          </>
        ) : (
          <span className="font-serif text-lg text-foreground">Messages</span>
        )}
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      {activeChat ? (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOwn = msg.senderId === user?.uid;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-2 animate-fade-in',
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      )}
                    >
                      {!isOwn && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {msg.senderName}
                        </p>
                      )}
                      {msg.type === 'gif' ? (
                        <img 
                          src={msg.content} 
                          alt="GIF" 
                          className="rounded-lg max-w-full h-auto"
                        />
                      ) : (
                        <p className="text-sm break-words">{msg.content}</p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] opacity-70">
                          {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOwn && <Check className="h-3 w-3 opacity-70" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Emoji/GIF Picker */}
          {showEmoji && (
            <div className="border-t border-border">
              <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
            </div>
          )}
          {showGif && (
            <div className="border-t border-border">
              <GifPicker onSelect={handleGifSelect} onClose={() => setShowGif(false)} />
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
                className={cn(showEmoji && 'bg-muted')}
              >
                <Smile className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
                className={cn(showGif && 'bg-muted')}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        /* Chat List */
        <ScrollArea className="flex-1">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat from the dashboard</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className="w-full p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {getOtherParticipantName(chat)}
                      </p>
                      {chat.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {chat.lastMessage}
                        </p>
                      )}
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="ml-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
};

export default ChatPanel;
