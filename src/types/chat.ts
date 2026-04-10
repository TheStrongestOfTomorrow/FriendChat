export interface Room {
  id: string;
  name: string;
  hostPeerId: string;
  isPrivate: boolean;
  passwordHash?: string;
  createdAt: number;
  lastSeen: number;
  blacklist?: Record<string, boolean>;
  voiceActive?: Record<string, boolean>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string; // May be encrypted
  timestamp: number;
  isPrivate: boolean;
  receiverId?: string;
  type: 'text' | 'file';
  fileMetadata?: FileMetadata;
  reactions?: Record<string, string[]>;
  isEncrypted?: boolean;
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
}

export interface VoiceNode {
    peerId: string;
    stream: MediaStream | null;
}
