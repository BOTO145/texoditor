import React, { useEffect, useState } from 'react';
import { useChat } from './ChatContext';
import { X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  senderName: string;
  message: string;
  timestamp: Date;
}

interface ChatNotificationProps {
  onOpenChat: () => void;
}

const ChatNotification: React.FC<ChatNotificationProps> = ({ onOpenChat }) => {
  const { messages, activeChat } = useChat();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!activeChat || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    
    // Only show notification for new messages from others
    if (latestMessage && !latestMessage.read) {
      const newNotification: Notification = {
        id: latestMessage.id,
        senderName: latestMessage.senderName,
        message: latestMessage.type === 'gif' ? '🖼️ Sent a GIF' : latestMessage.content,
        timestamp: latestMessage.createdAt,
      };

      setNotifications(prev => {
        if (prev.some(n => n.id === newNotification.id)) return prev;
        return [...prev, newNotification];
      });

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    }
  }, [messages, activeChat]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={cn(
            'bg-card border border-border rounded-lg p-4 shadow-lg animate-slide-in-right cursor-pointer',
            'hover:bg-muted/50 transition-colors'
          )}
          style={{ animationDelay: `${index * 0.1}s` }}
          onClick={() => {
            onOpenChat();
            dismissNotification(notification.id);
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">
                {notification.senderName}
              </p>
              <p className="text-muted-foreground text-sm truncate">
                {notification.message}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissNotification(notification.id);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatNotification;
