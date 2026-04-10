export type PresenceStatus = 'Online' | 'Busy' | 'Away';

export interface Room {
  id: string;
  name: string;
  hostPeerId: string;
  originalHostId: string;
  managerId: string;
  isPrivate: boolean;
  passwordHash?: string;
  createdAt: number;
  lastSeen: number;
  savedAt?: number;
  blacklist?: Record<string, boolean>;
  voiceActive?: Record<string, boolean>;
}

export interface SpaceBlueprint {
    id: string;
    name: string;
    inviteCode: string;
    originalHostId: string;
    createdAt: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isPrivate: boolean;
  receiverId?: string;
  type: 'text' | 'file' | 'voice-note' | 'wall-post' | 'ping';
  fileMetadata?: FileMetadata;
  reactions?: Record<string, string[]>;
  isEncrypted?: boolean;
  deliveryStatus?: 'sent' | 'seen';
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
  data: ArrayBuffer | Uint8Array | string;
}

export interface PeerUser {
  peerId: string;
  name: string;
  pubKey?: string;
  isVoiceActive?: boolean;
  status: PresenceStatus;
  joinedAt: number;
}

export interface WallMessage {
    id: string;
    senderName: string;
    content: string;
    timestamp: number;
    type: 'text' | 'image';
}
