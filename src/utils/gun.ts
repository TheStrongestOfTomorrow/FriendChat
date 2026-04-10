import Gun from 'gun';
import 'gun/sea';
import { Room, WallMessage, PresenceStatus } from '../types/chat';

const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://peer.wallie.io/gun',
    'https://relay.peer.ooo/gun'
  ]
});

// @ts-ignore
export const SEA = Gun.SEA;

const roomsRef = gun.get('friendchat-rooms-v3');

export const announceRoom = (room: Room) => {
  console.log('Publishing Room to Global Mesh:', room.name, room.id);
  roomsRef.get(room.id).put(room);

  // Verification check
  roomsRef.get(room.id).once((data) => {
      if (data && data.id === room.id) {
          console.log('SUCCESS: Room verified in Gun mesh.');
      } else {
          console.error('ERROR: Room failed mesh propagation check!');
      }
  });
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
  console.log('Querying Global Mesh for Invite Code:', code);
  return new Promise((resolve) => {
    let found = false;
    const searchNode = roomsRef.map();

    searchNode.on((data, id) => {
      if (data && data.hostPeerId === code && !found) {
        console.log('NODE_MATCH_FOUND:', data.name);
        found = true;
        searchNode.off();
        resolve(data);
      }
    });

    setTimeout(() => {
        if (!found) {
            console.log('SEARCH_TIMEOUT: Node not found in active mesh.');
            searchNode.off();
            resolve(null);
        }
    }, 10000);
  });
};

export const subscribeToRooms = (callback: (rooms: Room[]) => void) => {
  const roomsMap = new Map<string, Room>();
  console.log('Subscribing to Global Room Broadcasts...');

  const node = roomsRef.map();
  node.on((data, id) => {
    if (data && data.id) {
      // Vitality check: Only show rooms updated in the last 5 minutes
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
    node.off();
    clearInterval(interval);
  };
};

export const updateRoomHeartbeat = (roomId: string) => {
  roomsRef.get(roomId).get('lastSeen').put(Date.now());
};

export default gun;
