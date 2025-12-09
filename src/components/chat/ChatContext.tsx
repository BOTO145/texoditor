import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'emoji' | 'gif';
  createdAt: Date;
  read: boolean;
}

interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
}

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  unreadTotal: number;
  setActiveChat: (chat: Chat | null) => void;
  sendMessage: (content: string, type: 'text' | 'emoji' | 'gif') => Promise<void>;
  createChat: (participantIds: string[], participantNames: Record<string, string>) => Promise<string>;
  markAsRead: (chatId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);

  // Listen to user's chats
  useEffect(() => {
    if (!user) return;

    // Simple query without orderBy to avoid composite index requirement
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatsList: Chat[] = [];
      let totalUnread = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const unreadCount = data.unreadBy?.[user.uid] || 0;
        totalUnread += unreadCount;
        
        chatsList.push({
          id: doc.id,
          participants: data.participants,
          participantNames: data.participantNames || {},
          lastMessage: data.lastMessage,
          lastMessageAt: data.lastMessageAt?.toDate(),
          unreadCount,
        });
      });
      
      // Sort client-side instead
      chatsList.sort((a, b) => {
        const dateA = a.lastMessageAt?.getTime() || 0;
        const dateB = b.lastMessageAt?.getTime() || 0;
        return dateB - dateA;
      });
      
      setChats(chatsList);
      setUnreadTotal(totalUnread);
    }, (error) => {
      console.error('Error fetching chats:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen to active chat messages
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, 'chats', activeChat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messagesList.push({
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.content,
          type: data.type || 'text',
          createdAt: data.createdAt?.toDate() || new Date(),
          read: data.read || false,
        });
      });
      setMessages(messagesList);
    }, (error) => {
      console.error('Error fetching messages:', error);
    });

    return () => unsubscribe();
  }, [activeChat]);

  const sendMessage = useCallback(async (content: string, type: 'text' | 'emoji' | 'gif') => {
    if (!activeChat || !user || !userProfile) return;

    try {
      await addDoc(collection(db, 'chats', activeChat.id, 'messages'), {
        senderId: user.uid,
        senderName: userProfile.username,
        content,
        type,
        createdAt: serverTimestamp(),
        read: false,
      });

      // Update chat's last message and unread counts
      const unreadBy: Record<string, number> = {};
      activeChat.participants.forEach(pid => {
        if (pid !== user.uid) {
          unreadBy[pid] = (activeChat.unreadCount || 0) + 1;
        }
      });

      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: type === 'gif' ? '🖼️ GIF' : content,
        lastMessageAt: serverTimestamp(),
        unreadBy,
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [activeChat, user, userProfile]);

  const createChat = useCallback(async (participantIds: string[], participantNames: Record<string, string>) => {
    if (!user || !userProfile) throw new Error('Not authenticated');

    const allParticipants = [...participantIds, user.uid];
    const allNames = { ...participantNames, [user.uid]: userProfile.username };

    // Check if chat already exists
    const existingQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );
    
    const existingDocs = await getDocs(existingQuery);
    for (const chatDoc of existingDocs.docs) {
      const chatParticipants = chatDoc.data().participants as string[];
      if (chatParticipants.length === allParticipants.length &&
          allParticipants.every(p => chatParticipants.includes(p))) {
        return chatDoc.id;
      }
    }

    const chatRef = await addDoc(collection(db, 'chats'), {
      participants: allParticipants,
      participantNames: allNames,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      unreadBy: {},
    });

    return chatRef.id;
  }, [user, userProfile]);

  const markAsRead = useCallback(async (chatId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`unreadBy.${user.uid}`]: 0,
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user]);

  return (
    <ChatContext.Provider value={{
      chats,
      activeChat,
      messages,
      unreadTotal,
      setActiveChat,
      sendMessage,
      createChat,
      markAsRead,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
