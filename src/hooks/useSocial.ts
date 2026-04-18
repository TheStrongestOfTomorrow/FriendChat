import { useState, useEffect, useCallback } from 'react';
import Gun, { SEA } from 'gun';
import { SocialState } from '../types/p2p';
import gun from '../utils/gun';

export const useSocial = (userId: string | undefined, userKeyPair: any) => {
  const [socialState, setSocialState] = useState<SocialState>({
    friends: [],
    pendingRequests: []
  });

  const user = gun.user();
  const mailbox = userId ? user.get('mailbox') : null;

  useEffect(() => {
    if (!mailbox) return;

    // Use a simple listener to avoid chain issues
    mailbox.map().on((data: any) => {
      if (data) {
        // Assume userKeyPair is fully defined based on context
        SEA.decrypt(data, userKeyPair).then((decrypted: any) => {
          if (decrypted && decrypted.type === 'friend-request') {
            setSocialState(prev => ({
              ...prev,
              pendingRequests: Array.from(new Set([...prev.pendingRequests, decrypted.from]))
            }));
          }
        });
      }
    });

    return () => { mailbox.map().off(); };
  }, [mailbox, userKeyPair]);

  const sendFriendRequest = useCallback(async (targetPeerId: string, targetPublicKey: string) => {
    if (!userId || !userKeyPair) return;

    const request = {
      type: 'friend-request',
      from: userId,
      timestamp: Date.now()
    };

    const encryptedRequest = await SEA.encrypt(request, targetPublicKey);
    
    // Send via Gun mailbox
    gun.user(targetPeerId).get('mailbox').get(userId).put(encryptedRequest);
  }, [userId, userKeyPair]);

  const acceptFriendRequest = useCallback(async (friendId: string) => {
    if (!userId) return;

    // Add to friends list
    user.get('friends').get(friendId).put(true);
    
    setSocialState(prev => ({
      ...prev,
      friends: Array.from(new Set([...prev.friends, friendId])),
      pendingRequests: prev.pendingRequests.filter(id => id !== friendId)
    }));
  }, [userId, user]);

  const grantRoomAccess = useCallback(async (roomId: string, friendPublicKey: string) => {
    if (!userKeyPair) return;
    
    // SEA.secret(friendPub, myPair) returns shared secret
    const roomSecret: any = await SEA.secret(friendPublicKey, userKeyPair);
    const encryptedSecret = await SEA.encrypt(roomId, roomSecret);
    
    // Store in Gun
    gun.get('room-access').get(roomId).get(friendPublicKey).put(encryptedSecret);
  }, [userKeyPair]);

  return {
    socialState,
    sendFriendRequest,
    acceptFriendRequest,
    grantRoomAccess
  };
};
