import Gun from 'gun';
import 'gun/sea';
import { Room, WallMessage, PresenceStatus, SpaceBlueprint } from '../types/chat';

const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://peer.wallie.io/gun',
    'https://relay.peer.ooo/gun'
  ]
});

export const SEA = Gun.SEA;

const roomsRef = gun.get('friendchat-rooms-v3');
const blueprintsRef = gun.get('friendchat-blueprints-v1');

export const announceRoom = (room: Room) => {
  console.log('Publishing Room to Global Mesh:', room.name, room.id);
  roomsRef.get(room.id).put(room);

  roomsRef.get(room.id).once((data) => {
      if (data && data.id === room.id) {
          console.log('SUCCESS: Room verified in Gun mesh.');
      } else {
          console.error('ERROR: Room failed mesh propagation check!');
      }
  });
};

export const saveSpaceBlueprint = (blueprint: SpaceBlueprint) => {
    blueprintsRef.get(blueprint.id).put(blueprint);
    const saved = JSON.parse(localStorage.getItem('saved-spaces') || '[]');
    if (!saved.includes(blueprint.id)) {
        localStorage.setItem('saved-spaces', JSON.stringify([...saved, blueprint.id]));
    }
};

export const getSpaceBlueprint = (id: string): Promise<SpaceBlueprint | null> => {
    return new Promise((resolve) => {
        blueprintsRef.get(id).once((data) => {
            resolve(data || null);
        });
        setTimeout(() => resolve(null), 5000);
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

export const writeHeartbeat = (roomId: string, peerId: string) => {
    roomsRef.get(roomId).get('heartbeats').get(peerId).put(Date.now());
};

export const monitorHeartbeats = (roomId: string, callback: (heartbeats: Record<string, number>) => void): () => void => {
    const node = roomsRef.get(roomId).get('heartbeats');
    const beats: Record<string, number> = {};
    node.map().on((data, id) => {
        if (data) {
            beats[id] = data;
            callback({ ...beats });
        }
    });
    return () => node.off();
};

export const postToWall = (roomId: string, post: WallMessage) => {
    roomsRef.get(roomId).get('wall').get(post.id).put(post);
};

export const subscribeToWall = (roomId: string, callback: (posts: WallMessage[]) => void): () => void => {
    const postsMap = new Map<string, WallMessage>();
    const node = roomsRef.get(roomId).get('wall');
    node.map().on((data, id) => {
        if (data && id) {
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
  const node = roomsRef.map();
  node.on((data, id) => {
    if (data && data.id) {
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
