export interface Room {
  id: string;
  name: string;
  hostPeerId: string;
  isPrivate: boolean;
  passwordHash?: string;
  createdAt: number;
  lastSeen: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isPrivate: boolean;
  receiverId?: string;
  type: 'text' | 'file';
  fileMetadata?: FileMetadata;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface FileChunk {
  id: string;
  index: number;
  total: number;
  data: ArrayBuffer | Uint8Array;
}

export interface PeerUser {
  peerId: string;
  name: string;
}
