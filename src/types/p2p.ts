import { Friend } from './chat';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PeerMessage {
  type: 'chat' | 'file' | 'media' | 'social';
  content: Record<string, unknown>;
  encrypted: boolean;
}

export interface SocialState {
  friends: Friend[];
  pendingRequests: string[];
  onlineFriends: Record<string, boolean>;
}

export interface PeerConnection {
  peerId: string;
  status: ConnectionStatus;
  lastSeen: number;
}

export interface MessagingState {
  messages: Record<string, unknown>[];
  isTyping: Record<string, boolean>;
}

export interface MediaState {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  activeStreams: Record<string, MediaStream>;
}

export interface TransferProgress {
  fileId: string;
  name: string;
  progress: number;
  total: number;
  status: 'transferring' | 'completed' | 'error' | 'cancelled';
  type: 'incoming' | 'outgoing';
}

export interface FileTransferState {
  activeTransfers: Record<string, TransferProgress>;
}
