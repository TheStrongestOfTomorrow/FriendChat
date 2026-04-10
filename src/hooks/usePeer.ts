import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { nanoid } from 'nanoid';
import { ChatMessage, PeerUser } from '../types/chat';
import { FileReceiver } from '../utils/fileTransfer';
import { saveMessage, getAllMessages } from '../utils/db';

export const usePeer = (userName: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [connections, setConnections] = useState<Map<string, DataConnection>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<PeerUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isRoomClosed, setIsRoomClosed] = useState(false);

  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const fileReceiver = useRef(new FileReceiver());

  useEffect(() => {
    // Load history
    getAllMessages().then(setMessages);

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
      typingTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  const handleConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      conn.send({ type: 'user-info', user: { peerId: peerIdRef.current, name: userNameRef.current } });
      connectionsRef.current.set(conn.peer, conn);
      setConnections(new Map(connectionsRef.current));
    });

    conn.on('data', (data: any) => {
      if (data.type === 'chat') {
        const msg = data.message;
        setMessages(prev => [...prev, msg]);
        saveMessage(msg);
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(msg.senderName);
          return next;
        });
      } else if (data.type === 'reaction') {
        setMessages(prev => prev.map(msg => {
            if (msg.id === data.messageId) {
                const reactions = { ...(msg.reactions || {}) };
                const users = reactions[data.emoji] || [];
                if (users.includes(data.senderId)) {
                    reactions[data.emoji] = users.filter(id => id !== data.senderId);
                    if (reactions[data.emoji].length === 0) delete reactions[data.emoji];
                } else {
                    reactions[data.emoji] = [...users, data.senderId];
                }
                const nextMsg = { ...msg, reactions };
                saveMessage(nextMsg);
                return nextMsg;
            }
            return msg;
        }));
      } else if (data.type === 'user-info') {
        setUsers(prev => {
          if (prev.find(u => u.peerId === data.user.peerId)) return prev;
          return [...prev, data.user];
        });
      } else if (data.type === 'typing') {
        setTypingUsers(prev => new Set(prev).add(data.userName));
        if (typingTimeouts.current.has(data.userName)) {
          clearTimeout(typingTimeouts.current.get(data.userName)!);
        }
        const timeout = setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(data.userName);
            return next;
          });
          typingTimeouts.current.delete(data.userName);
        }, 3000);
        typingTimeouts.current.set(data.userName, timeout);
      } else if (data.type === 'file-start') {
          fileReceiver.current.start(data.fileId, data.metadata);
      } else if (data.type === 'file-chunk') {
          const result = fileReceiver.current.receiveChunk(data.chunk);
          if (result) {
              const { blob, metadata } = result;
              const content = URL.createObjectURL(blob);
              const message: ChatMessage = {
                  id: nanoid(),
                  senderId: conn.peer,
                  senderName: users.find(u => u.peerId === conn.peer)?.name || 'Unknown',
                  content: content,
                  timestamp: Date.now(),
                  isPrivate: false,
                  type: 'file',
                  fileMetadata: metadata
              };
              setMessages(prev => [...prev, message]);
              saveMessage(message);
          }
      } else if (data.type === 'room-closed') {
        setIsRoomClosed(true);
        connectionsRef.current.forEach(c => c.close());
        connectionsRef.current.clear();
        setConnections(new Map());
      }
    });

    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      setConnections(new Map(connectionsRef.current));
      setUsers(prev => prev.filter(u => u.peerId !== conn.peer));
    });
  }, [users]);

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

  const broadcastMessage = useCallback((content: string, type: 'text' | 'file' = 'text', fileMetadata?: any) => {
    const message: ChatMessage = {
      id: nanoid(),
      senderId: peerId,
      senderName: userName,
      content,
      timestamp: Date.now(),
      isPrivate: false,
      type,
      fileMetadata
    };

    setMessages(prev => [...prev, message]);
    saveMessage(message);
    connectionsRef.current.forEach(conn => {
      conn.send({ type: 'chat', message });
    });
  }, [peerId, userName]);

  const sendPrivateMessage = useCallback((targetPeerId: string, content: string, type: 'text' | 'file' = 'text', fileMetadata?: any) => {
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
      type,
      fileMetadata
    };

    setMessages(prev => [...prev, message]);
    saveMessage(message);
    conn.send({ type: 'chat', message });
  }, [peerId, userName]);

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
            const reactions = { ...(msg.reactions || {}) };
            const users = reactions[emoji] || [];
            if (users.includes(peerId)) {
                reactions[emoji] = users.filter(id => id !== peerId);
                if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
                reactions[emoji] = [...users, peerId];
            }
            const nextMsg = { ...msg, reactions };
            saveMessage(nextMsg);
            return nextMsg;
        }
        return msg;
    }));

    connectionsRef.current.forEach(conn => {
      conn.send({ type: 'reaction', messageId, emoji, senderId: peerId });
    });
  }, [peerId]);

  const broadcastTyping = useCallback(() => {
    connectionsRef.current.forEach(conn => {
      conn.send({ type: 'typing', userName });
    });
  }, [userName]);

  const stopRoom = useCallback(() => {
    connectionsRef.current.forEach(conn => {
      conn.send({ type: 'room-closed' });
      conn.close();
    });
    connectionsRef.current.clear();
    setConnections(new Map());
    setIsRoomClosed(true);
  }, []);

  return {
    peerId,
    messages,
    users,
    typingUsers,
    isRoomClosed,
    setIsRoomClosed,
    connectToPeer,
    broadcastMessage,
    sendPrivateMessage,
    sendReaction,
    broadcastTyping,
    stopRoom,
    connections: connectionsRef.current
  };
};
