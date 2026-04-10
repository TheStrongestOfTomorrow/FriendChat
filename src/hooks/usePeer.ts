import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { nanoid } from 'nanoid';
import { ChatMessage, PeerUser } from '../types/chat';

export const usePeer = (userName: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [connections, setConnections] = useState<Map<string, DataConnection>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<PeerUser[]>([]);

  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());

  useEffect(() => {
    const newPeer = new Peer(nanoid(), {
      debug: 1
    });

    newPeer.on('open', (id) => {
      setPeerId(id);
      setPeer(newPeer);
    });

    newPeer.on('connection', (conn) => {
      handleConnection(conn);
    });

    return () => {
      newPeer.destroy();
    };
  }, []);

  const handleConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      // Send our info to the new connection
      conn.send({ type: 'user-info', user: { peerId: peerIdRef.current, name: userNameRef.current } });

      connectionsRef.current.set(conn.peer, conn);
      setConnections(new Map(connectionsRef.current));
    });

    conn.on('data', (data: any) => {
      if (data.type === 'chat') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'user-info') {
        setUsers(prev => {
          if (prev.find(u => u.peerId === data.user.peerId)) return prev;
          return [...prev, data.user];
        });
      } else if (data.type === 'file-chunk') {
        // Handle file chunks here or via callback
      }
    });

    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      setConnections(new Map(connectionsRef.current));
      setUsers(prev => prev.filter(u => u.peerId !== conn.peer));
    });
  }, []);

  // Use refs to avoid closure issues in callbacks
  const peerIdRef = useRef(peerId);
  const userNameRef = useRef(userName);
  useEffect(() => {
    peerIdRef.current = peerId;
    userNameRef.current = userName;
  }, [peerId, userName]);

  const connectToPeer = useCallback((targetPeerId: string) => {
    if (!peer) return;
    const conn = peer.connect(targetPeerId);
    handleConnection(conn);
  }, [peer, handleConnection]);

  const broadcastMessage = useCallback((content: string) => {
    const message: ChatMessage = {
      id: nanoid(),
      senderId: peerId,
      senderName: userName,
      content,
      timestamp: Date.now(),
      isPrivate: false,
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    connectionsRef.current.forEach(conn => {
      conn.send({ type: 'chat', message });
    });
  }, [peerId, userName]);

  const sendPrivateMessage = useCallback((targetPeerId: string, content: string) => {
    const conn = connectionsRef.current.get(targetPeerId);
    if (!conn) return;

    const message: ChatMessage = {
      id: nanoid(),
      senderId: peerId,
      senderName: userName,
      content,
      timestamp: Date.now(),
      isPrivate: true,
      receiverId: targetPeerId,
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    conn.send({ type: 'chat', message });
  }, [peerId, userName]);

  return {
    peerId,
    messages,
    users,
    connectToPeer,
    broadcastMessage,
    sendPrivateMessage,
    connections: connectionsRef.current
  };
};
