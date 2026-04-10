import Gun from 'gun';
import 'gun/sea';
import { Room, WallMessage, PresenceStatus } from '../types/chat';

const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://relay.peer.ooo/gun',
    'https://gun-server.com/gun'
  ]
});

// @ts-ignore
export const SEA = Gun.SEA;

const roomsRef = gun.get('friendchat-rooms-v3');

export const announceRoom = (room: Room) => {
  roomsRef.get(room.id).put(room);
};

export const deleteRoom = (roomId: string) => {
  roomsRef.get(roomId).put(null);
};

export const blacklistUser = (roomId: string, peerId: string) => {
    roomsRef.get(roomId).get('blacklist').get(peerId).put(true);
};

export const setVoicePresence = (roomId: string, peerId: string, isActive: boolean) => {
    roomsRef.get(roomId).get('voiceActive').get(peerId).put(isActive);
};

export const setGlobalStatus = (roomId: string, peerId: string, status: PresenceStatus) => {
    roomsRef.get(roomId).get('presence').get(peerId).put(status);
};

export const postToWall = (roomId: string, post: WallMessage) => {
    roomsRef.get(roomId).get('wall').get(post.id).put(post);
};

export const subscribeToWall = (roomId: string, callback: (posts: WallMessage[]) => void): () => void => {
    const postsMap = new Map<string, WallMessage>();
    const node = roomsRef.get(roomId).get('wall');
    node.map().on((data, id) => {
        if (data) {
            postsMap.set(id, data);
            callback(Array.from(postsMap.values()).sort((a, b) => b.timestamp - a.timestamp));
        }
    });
    return () => node.off();
};

export const getRoomByCode = (code: string): Promise<Room | null> => {
  return new Promise((resolve) => {
    roomsRef.map().once((data, id) => {
      if (data && data.hostPeerId === code) {
        resolve(data);
      }
    });
    setTimeout(() => resolve(null), 3000);
  });
};

export const subscribeToRooms = (callback: (rooms: Room[]) => void) => {
  const roomsMap = new Map<string, Room>();

  roomsRef.map().on((data, id) => {
    if (data) {
      if (Date.now() - data.lastSeen < 300000) {
        roomsMap.set(id, data);
      } else {
        roomsMap.delete(id);
      }
    } else {
      roomsMap.delete(id);
    }
    callback(Array.from(roomsMap.values()));
  });

  const interval = setInterval(() => {
    const now = Date.now();
    let changed = false;
    roomsMap.forEach((room, id) => {
      if (now - room.lastSeen > 300000) {
        roomsMap.delete(id);
        changed = true;
      }
    });
    if (changed) {
      callback(Array.from(roomsMap.values()));
    }
  }, 30000);

  return () => {
    roomsRef.map().off();
    clearInterval(interval);
  };
};

export const updateRoomHeartbeat = (roomId: string) => {
  roomsRef.get(roomId).get('lastSeen').put(Date.now());
};

export default gun;
