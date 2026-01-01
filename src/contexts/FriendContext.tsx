import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  getDocs,
  updateDoc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface FriendRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  receiverUsername: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

interface Friend {
  id: string;
  odocId: string;
  username: string;
  createdAt: Date;
}

interface FriendContextType {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  sendFriendRequest: (username: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  isFriend: (userId: string) => boolean;
}

const FriendContext = createContext<FriendContextType | undefined>(undefined);

export const useFriends = () => {
  const context = useContext(FriendContext);
  if (!context) {
    throw new Error('useFriends must be used within a FriendProvider');
  }
  return context;
};

export const FriendProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

  // Listen for incoming friend requests
  useEffect(() => {
    if (!user) return;

    const incomingQuery = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(incomingQuery, (snapshot) => {
      const requests: FriendRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          senderId: data.senderId,
          senderUsername: data.senderUsername,
          receiverId: data.receiverId,
          receiverUsername: data.receiverUsername,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setIncomingRequests(requests);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for outgoing friend requests
  useEffect(() => {
    if (!user) return;

    const outgoingQuery = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(outgoingQuery, (snapshot) => {
      const requests: FriendRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          senderId: data.senderId,
          senderUsername: data.senderUsername,
          receiverId: data.receiverId,
          receiverUsername: data.receiverUsername,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setOutgoingRequests(requests);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for friends
  useEffect(() => {
    if (!user) return;

    const friendsQuery = query(
      collection(db, 'friends'),
      where('users', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(friendsQuery, (snapshot) => {
      const friendsList: Friend[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const otherId = data.users.find((id: string) => id !== user.uid);
        const otherUsername = data.usernames?.[otherId] || 'Unknown';
        
        friendsList.push({
          id: doc.id,
          odocId: otherId,
          username: otherUsername,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setFriends(friendsList);
    });

    return () => unsubscribe();
  }, [user]);

  const sendFriendRequest = useCallback(async (username: string) => {
    if (!user || !userProfile) throw new Error('Not authenticated');
    if (username.toLowerCase() === userProfile.username.toLowerCase()) {
      throw new Error("You can't send a friend request to yourself");
    }

    // Find user by username
    const usersQuery = query(
      collection(db, 'users'),
      where('username', '==', username)
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      throw new Error('User not found');
    }

    const targetUser = usersSnapshot.docs[0];
    const targetId = targetUser.id;

    // Check if already friends
    const friendsQuery = query(
      collection(db, 'friends'),
      where('users', 'array-contains', user.uid)
    );
    const friendsSnapshot = await getDocs(friendsQuery);
    const alreadyFriends = friendsSnapshot.docs.some(doc => 
      doc.data().users.includes(targetId)
    );
    
    if (alreadyFriends) {
      throw new Error('Already friends with this user');
    }

    // Check for existing pending request
    const existingQuery = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', user.uid),
      where('receiverId', '==', targetId),
      where('status', '==', 'pending')
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('Friend request already sent');
    }

    // Check if they sent us a request (auto-accept)
    const reverseQuery = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', targetId),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const reverseSnapshot = await getDocs(reverseQuery);
    
    if (!reverseSnapshot.empty) {
      // Auto-accept by accepting their request
      await acceptFriendRequest(reverseSnapshot.docs[0].id);
      return;
    }

    // Create friend request
    await addDoc(collection(db, 'friendRequests'), {
      senderId: user.uid,
      senderUsername: userProfile.username,
      receiverId: targetId,
      receiverUsername: username,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  }, [user, userProfile]);

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    if (!user || !userProfile) return;

    const request = incomingRequests.find(r => r.id === requestId);
    if (!request) return;

    // Create friendship
    await addDoc(collection(db, 'friends'), {
      users: [user.uid, request.senderId],
      usernames: {
        [user.uid]: userProfile.username,
        [request.senderId]: request.senderUsername,
      },
      createdAt: serverTimestamp(),
    });

    // Delete the request
    await deleteDoc(doc(db, 'friendRequests', requestId));
  }, [user, userProfile, incomingRequests]);

  const rejectFriendRequest = useCallback(async (requestId: string) => {
    await deleteDoc(doc(db, 'friendRequests', requestId));
  }, []);

  const removeFriend = useCallback(async (friendshipId: string) => {
    await deleteDoc(doc(db, 'friends', friendshipId));
  }, []);

  const isFriend = useCallback((userId: string) => {
    return friends.some(f => f.odocId === userId);
  }, [friends]);

  return (
    <FriendContext.Provider value={{
      friends,
      incomingRequests,
      outgoingRequests,
      sendFriendRequest,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend,
      isFriend,
    }}>
      {children}
    </FriendContext.Provider>
  );
};
