import { useState, useEffect, useCallback, useRef } from 'react';
import Gun, { SEA } from 'gun';
import { Friend, PresenceStatus } from '../types/chat';
import { SocialState } from '../types/p2p';
import gun from '../utils/gun';
import { saveFriend, getAllFriends, updateFriendStatus, removeFriend } from '../utils/db';

export const useFriends = (userId: string | undefined, userKeyPair: any, peerId: string | null) => {
  const [socialState, setSocialState] = useState<SocialState>({
    friends: [],
    pendingRequests: [],
    onlineFriends: {}
  });
  const [isOnline, setIsOnline] = useState(false);
  
  const user = gun.user();
  const friendsRef = userId ? user.get('friends') : null;
  const statusRef = userId ? user.get('status') : null;
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Load friends from IndexedDB on mount
  useEffect(() => {
    mountedRef.current = true;
    
    const loadFriends = async () => {
      try {
        const dbFriends = await getAllFriends();
        if (mountedRef.current) {
          setSocialState(prev => ({
            ...prev,
            friends: dbFriends
          }));
        }
      } catch (error) {
        console.error('Error loading friends:', error);
      }
    };
    
    loadFriends();
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Set up user's online status in Gun
  useEffect(() => {
    if (!userId || !userKeyPair || !peerId) return;

    setIsOnline(true);
    
    // Publish our online status
    const publishStatus = async () => {
      const statusData = {
        peerId,
        status: 'Online' as PresenceStatus,
        timestamp: Date.now()
      };
      
      try {
        const encrypted = await SEA.encrypt(statusData, userKeyPair.pub);
        statusRef?.put(encrypted);
      } catch (error) {
        console.error('Error publishing status:', error);
      }
    };

    publishStatus();
    
    // Update status periodically
    const interval = setInterval(publishStatus, 15000);
    
    return () => {
      clearInterval(interval);
      // Set offline status when leaving
      const setOffline = async () => {
        try {
          const statusData = {
            peerId,
            status: 'Offline' as PresenceStatus,
            timestamp: Date.now()
          };
          const encrypted = await SEA.encrypt(statusData, userKeyPair.pub);
          statusRef?.put(encrypted);
        } catch (error) {
          console.error('Error setting offline status:', error);
        }
      };
      setOffline();
    };
  }, [userId, userKeyPair, peerId, statusRef]);

  // Subscribe to friends' status updates
  useEffect(() => {
    if (!friendsRef || socialState.friends.length === 0) return;

    const unsubscribeCallbacks: (() => void)[] = [];

    socialState.friends.forEach((friend) => {
      const friendStatusNode = gun.user(friend.peerId).get('status');
      
      const subscription = friendStatusNode.on(async (data: any) => {
        if (!data) return;
        
        try {
          let decrypted: any;
          if (typeof data === 'string') {
            decrypted = await SEA.decrypt(data, userKeyPair);
          } else {
            decrypted = data;
          }
          
          if (decrypted && decrypted.peerId === friend.peerId) {
            const timeSinceUpdate = Date.now() - decrypted.timestamp;
            const status: PresenceStatus = timeSinceUpdate > 30000 ? 'Offline' : (decrypted.status || 'Online');
            
            // Update in-memory state
            setSocialState(prev => {
              const updatedFriends = prev.friends.map(f => 
                f.peerId === friend.peerId 
                  ? { ...f, status, lastSeen: decrypted.timestamp, currentRoomId: decrypted.currentRoomId }
                  : f
              );
              
              const updatedOnlineFriends = { ...prev.onlineFriends };
              updatedOnlineFriends[friend.peerId] = status === 'Online';
              
              return {
                ...prev,
                friends: updatedFriends,
                onlineFriends: updatedOnlineFriends
              };
            });
            
            // Update in IndexedDB
            updateFriendStatus(friend.peerId, status, decrypted.currentRoomId).catch(console.error);
          }
        } catch (error) {
          console.error('Error decrypting friend status:', error);
        }
      });
      
      // Gun v11 returns the chain from .on(), we need to call .off() on it to unsubscribe
      unsubscribeCallbacks.push(() => subscription.off());
    });

    return () => {
      unsubscribeCallbacks.forEach(cb => cb());
    };
  }, [friendsRef, socialState.friends.length, userKeyPair]);

  // Ping friends periodically to check if they're online
  useEffect(() => {
    if (!userId || !userKeyPair || socialState.friends.length === 0) return;

    const pingFriends = async () => {
      socialState.friends.forEach(async (friend) => {
        try {
          const pingData = {
            type: 'ping',
            from: userId,
            timestamp: Date.now()
          };
          
          const encrypted = await SEA.encrypt(pingData, friend.publicKey || userKeyPair.pub);
          gun.user(friend.peerId).get('mailbox').get(userId).put(encrypted);
        } catch (error) {
          console.error('Error sending ping:', error);
        }
      });
    };

    // Initial ping
    pingFriends();
    
    // Ping every 10 seconds
    pingIntervalRef.current = setInterval(pingFriends, 10000);
    
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [userId, userKeyPair, socialState.friends]);

  // Listen for incoming pings and respond
  useEffect(() => {
    if (!userId || !userKeyPair) return;

    const mailbox = user.get('mailbox');
    
    const subscription = mailbox.map().on(async (data: any) => {
      if (!data) return;
      
      try {
        const decrypted = await SEA.decrypt(data, userKeyPair);
        
        if (decrypted && decrypted.type === 'ping') {
          // Respond with pong
          const pongData = {
            type: 'pong',
            from: userId,
            peerId,
            timestamp: Date.now(),
            currentRoomId: null
          };
          
          const senderFriend = socialState.friends.find(f => f.peerId === decrypted.from);
          if (senderFriend?.publicKey) {
            const encrypted = await SEA.encrypt(pongData, senderFriend.publicKey);
            gun.user(decrypted.from).get('mailbox').get(userId).put(encrypted);
          }
        }
        
        if (decrypted && decrypted.type === 'pong') {
          // Friend is online!
          setSocialState(prev => {
            const updatedFriends = prev.friends.map(f => 
              f.peerId === decrypted.from 
                ? { ...f, status: 'Online' as PresenceStatus, lastSeen: Date.now() }
                : f
            );
            
            const updatedOnlineFriends = { ...prev.onlineFriends };
            updatedOnlineFriends[decrypted.from] = true;
            
            return {
              ...prev,
              friends: updatedFriends,
              onlineFriends: updatedOnlineFriends
            };
          });
          
          updateFriendStatus(decrypted.from, 'Online').catch(console.error);
        }
      } catch (error) {
        // Ignore decryption errors (might be from non-friends)
      }
    });

    return () => {
      subscription.off();
    };
  }, [userId, userKeyPair, peerId, socialState.friends]);

  const sendFriendRequest = useCallback(async (targetPeerId: string, targetPublicKey: string, targetName: string) => {
    if (!userId || !userKeyPair) return;

    const request = {
      type: 'friend-request',
      from: userId,
      fromPeerId: peerId,
      fromName: localStorage.getItem('chat-username') || 'Unknown',
      fromPublicKey: userKeyPair.pub,
      timestamp: Date.now()
    };

    try {
      const encryptedRequest = await SEA.encrypt(request, targetPublicKey);
      gun.user(targetPeerId).get('mailbox').get(userId).put(encryptedRequest);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  }, [userId, userKeyPair, peerId]);

  const acceptFriendRequest = useCallback(async (friendId: string, friendPeerId: string, friendPublicKey: string, friendName: string) => {
    if (!userId || !userKeyPair) return;

    const friend: Friend = {
      id: friendId,
      peerId: friendPeerId,
      name: friendName,
      publicKey: friendPublicKey,
      status: 'Offline',
      addedAt: Date.now()
    };

    try {
      // Save to IndexedDB
      await saveFriend(friend);
      
      // Add to Gun friends list
      user.get('friends').get(friendId).put({
        peerId: friendPeerId,
        publicKey: friendPublicKey,
        acceptedAt: Date.now()
      });
      
      setSocialState(prev => ({
        ...prev,
        friends: [...prev.friends, friend],
        pendingRequests: prev.pendingRequests.filter(id => id !== friendId)
      }));
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  }, [userId, userKeyPair, user]);

  const removeFriendAction = useCallback(async (friendId: string, friendPeerId: string) => {
    if (!userId) return;

    try {
      // Remove from IndexedDB
      await removeFriend(friendId);
      
      // Remove from Gun
      user.get('friends').get(friendId).put(null);
      
      setSocialState(prev => ({
        ...prev,
        friends: prev.friends.filter(f => f.id !== friendId),
        onlineFriends: Object.fromEntries(
          Object.entries(prev.onlineFriends).filter(([key]) => key !== friendPeerId)
        )
      }));
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  }, [userId, user]);

  const grantRoomAccess = useCallback(async (roomId: string, friendPublicKey: string) => {
    if (!userKeyPair) return;
    
    try {
      // SEA.secret(friendPub, myPair) returns shared secret
      const roomSecret: any = await SEA.secret(friendPublicKey, userKeyPair);
      const encryptedSecret = await SEA.encrypt(roomId, roomSecret);
      
      // Store in Gun
      gun.get('room-access').get(roomId).get(friendPublicKey).put(encryptedSecret);
    } catch (error) {
      console.error('Error granting room access:', error);
    }
  }, [userKeyPair]);

  return {
    socialState,
    isOnline,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend: removeFriendAction,
    grantRoomAccess
  };
};
