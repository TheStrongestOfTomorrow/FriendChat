export const GUN_ROOM_PREFIX = 'fc-room-';
export const PEER_ID_LENGTH = 12;

export const DEFAULT_GUN_PEERS: string[] = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://relay.peer.ooo/gun',
];

export const MESH_TOPOLOGY: 'full' | 'relay-lite' = 'relay-lite';

export const P2P_CONFIG_DEFAULTS = {
  heartbeatInterval: 10000,
  connectionTimeout: 15000,
  maxRetries: 3,
};
