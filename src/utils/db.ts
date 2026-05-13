import { ChatMessage, Friend } from '../types/chat';

const DB_NAME = 'friendchat-db-v2';
const MESSAGES_STORE = 'messages';
const FRIENDS_STORE = 'friends';
const ROOMS_STORE = 'rooms';
const DB_VERSION = 2;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
        store.createIndex('roomId', 'roomId', { unique: false });
      }
      if (!db.objectStoreNames.contains(FRIENDS_STORE)) {
        const store = db.createObjectStore(FRIENDS_STORE, { keyPath: 'id' });
        store.createIndex('peerId', 'peerId', { unique: false });
      }
      if (!db.objectStoreNames.contains(ROOMS_STORE)) {
        const store = db.createObjectStore(ROOMS_STORE, { keyPath: 'id' });
        store.createIndex('hostPeerId', 'hostPeerId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveMessage = async (message: ChatMessage) => {
  const db = await openDB();
  const tx = db.transaction(MESSAGES_STORE, 'readwrite');
  const store = tx.objectStore(MESSAGES_STORE);
  store.put(message);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const getRoomMessages = async (roomId: string): Promise<ChatMessage[]> => {
  const db = await openDB();
  const tx = db.transaction(MESSAGES_STORE, 'readonly');
  const store = tx.objectStore(MESSAGES_STORE);
  const index = store.index('roomId');
  const request = index.getAll(roomId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteMessage = async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(MESSAGES_STORE);
    store.delete(id);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

export const clearMessages = async () => {
    const db = await openDB();
    const tx = db.transaction(MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(MESSAGES_STORE);
    store.clear();
};

// Friend management functions
export const saveFriend = async (friend: Friend) => {
  const db = await openDB();
  const tx = db.transaction(FRIENDS_STORE, 'readwrite');
  const store = tx.objectStore(FRIENDS_STORE);
  store.put(friend);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllFriends = async (): Promise<Friend[]> => {
  const db = await openDB();
  const tx = db.transaction(FRIENDS_STORE, 'readonly');
  const store = tx.objectStore(FRIENDS_STORE);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getFriendByPeerId = async (peerId: string): Promise<Friend | null> => {
  const db = await openDB();
  const tx = db.transaction(FRIENDS_STORE, 'readonly');
  const store = tx.objectStore(FRIENDS_STORE);
  const index = store.index('peerId');
  const request = index.get(peerId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const updateFriendStatus = async (peerId: string, status: Friend['status'], currentRoomId?: string) => {
  const friend = await getFriendByPeerId(peerId);
  if (friend) {
    const updated: Friend = {
      ...friend,
      status,
      lastSeen: Date.now(),
      currentRoomId
    };
    await saveFriend(updated);
    return updated;
  }
  return null;
};

export const removeFriend = async (friendId: string) => {
  const db = await openDB();
  const tx = db.transaction(FRIENDS_STORE, 'readwrite');
  const store = tx.objectStore(FRIENDS_STORE);
  store.delete(friendId);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

// Room management in IndexedDB
export const saveRoom = async (room: any) => {
  const db = await openDB();
  const tx = db.transaction(ROOMS_STORE, 'readwrite');
  const store = tx.objectStore(ROOMS_STORE);
  store.put(room);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllRooms = async (): Promise<any[]> => {
  const db = await openDB();
  const tx = db.transaction(ROOMS_STORE, 'readonly');
  const store = tx.objectStore(ROOMS_STORE);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
