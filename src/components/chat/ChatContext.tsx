import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
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
  lastSenderId?: string;
  unreadCount: number;
}

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  unreadTotal: number;
  onlineUsers: Set<string>;
  latestMessageFromOther: Message | null;
  setActiveChat: (chat: Chat | null) => void;
  sendMessage: (content: string, type: 'text' | 'emoji' | 'gif') => Promise<void>;
  createChat: (participantIds: string[], participantNames: Record<string, string>) => Promise<string>;
  markAsRead: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  clearLatestMessage: () => void;
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
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [latestMessageFromOther, setLatestMessageFromOther] = useState<Message | null>(null);
  const prevMessagesLength = useRef(0);

  // Track user presence
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      try {
        const presenceRef = doc(db, 'presence', user.uid);
        await updateDoc(presenceRef, {
          online: true,
          lastSeen: serverTimestamp(),
        }).catch(() => {
          // Create if doesn't exist
          addDoc(collection(db, 'presence'), {
            odoc: user.uid,
            online: true,
            lastSeen: serverTimestamp(),
          });
        });
      } catch (e) {
        console.error('Error updating presence:', e);
      }
    };

    updatePresence();

    // Set offline on unload
    const handleUnload = () => {
      const presenceRef = doc(db, 'presence', user.uid);
      updateDoc(presenceRef, { online: false, lastSeen: serverTimestamp() });
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user]);

  // Listen to online users
  useEffect(() => {
    const presenceQuery = query(
      collection(db, 'presence'),
      where('online', '==', true)
    );

    const unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
      const online = new Set<string>();
      snapshot.forEach((doc) => {
        online.add(doc.id);
      });
      setOnlineUsers(online);
    }, (error) => {
      console.error('Error fetching presence:', error);
    });

    return () => unsubscribe();
  }, []);

  // Listen to user's chats
  useEffect(() => {
    if (!user) return;

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
          lastSenderId: data.lastSenderId,
          unreadCount,
        });
      });
      
      // Sort client-side
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
      prevMessagesLength.current = 0;
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
      
      // Check for new messages from others
      if (messagesList.length > prevMessagesLength.current && user) {
        const latestMsg = messagesList[messagesList.length - 1];
        if (latestMsg && latestMsg.senderId !== user.uid) {
          setLatestMessageFromOther(latestMsg);
        }
      }
      prevMessagesLength.current = messagesList.length;
      
      setMessages(messagesList);
    }, (error) => {
      console.error('Error fetching messages:', error);
    });

    return () => unsubscribe();
  }, [activeChat, user]);

  const clearLatestMessage = useCallback(() => {
    setLatestMessageFromOther(null);
  }, []);

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

      // Update chat's last message and unread counts for others
      const unreadBy: Record<string, number> = {};
      activeChat.participants.forEach(pid => {
        if (pid !== user.uid) {
          const currentUnread = chats.find(c => c.id === activeChat.id)?.unreadCount || 0;
          unreadBy[pid] = currentUnread + 1;
        }
      });

      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: type === 'gif' ? '🖼️ GIF' : content,
        lastMessageAt: serverTimestamp(),
        lastSenderId: user.uid,
        unreadBy,
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [activeChat, user, userProfile, chats]);

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

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteDoc(doc(db, 'chats', chatId));
      if (activeChat?.id === chatId) {
        setActiveChat(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }, [activeChat]);

  return (
    <ChatContext.Provider value={{
      chats,
      activeChat,
      messages,
      unreadTotal,
      onlineUsers,
      latestMessageFromOther,
      setActiveChat,
      sendMessage,
      createChat,
      markAsRead,
      deleteChat,
      clearLatestMessage,
    }}>
      {children}
    </ChatContext.Provider>
  );
};