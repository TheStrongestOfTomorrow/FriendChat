import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { nanoid } from 'nanoid';
import gun from '../utils/gun';
import { ConnectionStatus, PeerConnection } from '../types/p2p';
import { PEER_ID_LENGTH, P2P_CONFIG_DEFAULTS, GUN_ROOM_PREFIX } from '../utils/constants';

export const useConnection = (roomId?: string | null) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [peers, setPeers] = useState<PeerConnection[]>([]);
  const [connections, setConnections] = useState<Map<string, DataConnection>>(new Map());
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const broadcast = useCallback((data: any) => {
    connections.forEach(conn => {
      if (conn.open) conn.send(data);
    });
  }, [connections]);

  useEffect(() => {
    const id = nanoid(PEER_ID_LENGTH);
    setPeerId(id);
    setStatus('connecting');

    const newPeer = new Peer(id, {
      debug: 1,
    });

    newPeer.on('open', (openedId) => {
      console.log('PeerJS connection opened with ID:', openedId);
      setStatus('connected');
      
      heartbeatTimerRef.current = setInterval(() => {
        if (newPeer && !newPeer.destroyed && newPeer.open) {
          (newPeer as any).socket?.send({ type: 'HEARTBEAT' });
          broadcast({ type: 'PING', timestamp: Date.now() });
        }
      }, P2P_CONFIG_DEFAULTS.heartbeatInterval);
    });

    newPeer.on('connection', (conn) => {
      conn.on('open', () => {
        setConnections(prev => new Map(prev.set(conn.peer, conn)));
      });
      conn.on('data', (data: any) => {
        console.log('Received data from', conn.peer, data);
      });
    });

    newPeer.on('error', (err) => {
      console.error('PeerJS error:', err);
      setStatus('error');
    });

    newPeer.on('disconnected', () => {
      console.log('PeerJS disconnected, attempting to reconnect...');
      setStatus('disconnected');
      newPeer.reconnect();
    });

    newPeer.on('close', () => {
      setStatus('disconnected');
    });

    setPeer(newPeer);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      newPeer.destroy();
      setPeer(null);
      setStatus('disconnected');
    };
  }, [broadcast]);

  useEffect(() => {
    if (!roomId || !peerId) {
        setPeers([]);
        return;
    }

    const roomPath = `${GUN_ROOM_PREFIX}${roomId}`;
    const room = gun.get(roomPath);
    
    const presenceRef = room.get('peers').get(peerId);
    presenceRef.put({
      peerId,
      status: 'connected',
      lastSeen: Date.now()
    });

    const interval = setInterval(() => {
      presenceRef.get('lastSeen').put(Date.now());
    }, P2P_CONFIG_DEFAULTS.heartbeatInterval);

    room.get('peers').map().on((data: any, id: string) => {
      if (!data || id === peerId) return;
      
      setPeers(prev => {
        const existing = prev.find(p => p.peerId === id);
        if (existing) {
          if (existing.lastSeen === data.lastSeen && existing.status === data.status) return prev;
          return prev.map(p => p.peerId === id ? { ...p, ...data } : p);
        }
        return [...prev, { ...data, peerId: id }];
      });
    });

    const staleInterval = setInterval(() => {
      const now = Date.now();
      setPeers(prev => prev.filter(p => now - p.lastSeen < P2P_CONFIG_DEFAULTS.connectionTimeout));
    }, P2P_CONFIG_DEFAULTS.connectionTimeout);

    return () => {
      clearInterval(interval);
      clearInterval(staleInterval);
      presenceRef.put(null);
      room.get('peers').off();
    };
  }, [roomId, peerId]);

  return { peer, gun, status, peerId, peers, broadcast };
};
