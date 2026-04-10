import Gun from 'gun';
import 'gun/sea';
import { Room } from '../types/chat';

const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://relay.peer.ooo/gun',
    'https://gun-server.com/gun'
  ]
});

const roomsRef = gun.get('friendchat-rooms-v1');

export const announceRoom = (room: Room) => {
  roomsRef.get(room.id).put(room);
};

export const deleteRoom = (roomId: string) => {
  roomsRef.get(roomId).put(null);
};

export const getRoomByCode = (code: string): Promise<Room | null> => {
  return new Promise((resolve) => {
    roomsRef.map().once((data, id) => {
      if (data && data.hostPeerId === code) {
        resolve(data);
      }
    });
    // Timeout if not found
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
