import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { nanoid } from 'nanoid';
import { ChatMessage, PeerUser, PresenceStatus, Room } from '../types/chat';
import { FileReceiver } from '../utils/fileTransfer';
import { saveMessage, getRoomMessages, deleteMessage as deleteFromDB } from '../utils/db';
import { SEA, setVoicePresence, setGlobalStatus } from '../utils/gun';
import { useConnection } from './useConnection';

export const usePeer = (userName: string) => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const { peer, peerId, status, peers } = useConnection(roomId);
  
  const [userKeyPair, setUserKeyPair] = useState<any>(null);
  const [connections, setConnections] = useState<Map<string, DataConnection>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<PeerUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isRoomClosed, setIsRoomClosed] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [myStatus, setMyStatus] = useState<PresenceStatus>('Online');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [managerId, setManagerId] = useState<string>('');
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);

  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const callsRef = useRef<Map<string, MediaConnection>>(new Map());
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const fileReceiver = useRef(new FileReceiver());
  const currentRoomId = useRef<string | null>(null);
  const joinedAt = useRef<number>(0);
  const hostIdRef = useRef<string>('');
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerIdRef = useRef(peerId);
  const userNameRef = useRef(userName);
  const userKeyPairRef = useRef(userKeyPair);
  const usersRef = useRef(users);
  const peerRef = useRef(peer);
  const myStatusRef = useRef(myStatus);
  const managerIdRef = useRef(managerId);
  const connectToPeerRef = useRef<(id: string) => void>(() => {});

  useEffect(() => {
    peerIdRef.current = peerId;
    peerRef.current = peer;
    userNameRef.current = userName;
    userKeyPairRef.current = userKeyPair;
    usersRef.current = users;
    myStatusRef.current = myStatus;
    managerIdRef.current = managerId;
    currentRoomId.current = roomId;
    hostIdRef.current = hostId || '';
  }, [peerId, peer, userName, userKeyPair, users, myStatus, managerId, roomId, hostId]);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    deleteFromDB(messageId);
    connectionsRef.current.forEach(conn => {
        conn.send({ type: 'delete-message', messageId });
    });
  }, []);

  const handleCall = useCallback((call: MediaConnection) => {
      call.on('stream', (stream) => {
          setRemoteStreams(prev => new Map(prev).set(call.peer, stream));
      });
      call.on('close', () => {
          setRemoteStreams(prev => {
              const next = new Map(prev);
              next.delete(call.peer);
              return next;
          });
      });
      callsRef.current.set(call.peer, call);
  }, []);

  const handleConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      conn.send({
          type: 'user-info',
          user: {
              peerId: peerIdRef.current,
              name: userNameRef.current,
              pubKey: userKeyPairRef.current?.pub,
              isVoiceActive: !!localStreamRef.current,
              status: myStatusRef.current,
              joinedAt: joinedAt.current
          }
      });
      connectionsRef.current.set(conn.peer, conn);
      setConnections(new Map(connectionsRef.current));

      // MESH LOGIC: If I am the host, tell everyone else about this new peer
      if (peerIdRef.current === hostIdRef.current) {
        connectionsRef.current.forEach((otherConn, otherId) => {
          if (otherId !== conn.peer) {
            otherConn.send({ type: 'mesh-connect', targetPeerId: conn.peer });
          }
        });
      }

      if (localStreamRef.current && peerRef.current) {
          const call = peerRef.current.call(conn.peer, localStreamRef.current);
          handleCall(call);
      }
    });

    conn.on('data', async (data: any) => {
      if (data.type === 'chat') {
        let msg = data.message;
        if (msg.roomId !== currentRoomId.current) return;

        if (msg.isEncrypted && msg.isPrivate && userKeyPairRef.current) {
            const sender = usersRef.current.find(u => u.peerId === msg.senderId);
            if (sender?.pubKey) {
                try {
                    const secret = await (SEA as any).secret(sender.pubKey, userKeyPairRef.current);
                    const decrypted = await (SEA as any).decrypt(msg.content, secret);
                    if (decrypted) {
                        msg = { ...msg, content: decrypted as string, isEncrypted: false };
                    } else {
                        msg = { ...msg, content: '[DECRYPTION_FAILED]', isEncrypted: false };
                    }
                } catch (e) {
                    msg = { ...msg, content: '[DECRYPTION_ERROR]', isEncrypted: false };
                }
            }
        }
        conn.send({ type: 'ack', messageId: msg.id, status: 'seen' });
        setMessages(prev => [...prev, msg]);
        saveMessage(msg);
      } else if (data.type === 'ack') {
          setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, deliveryStatus: data.status } : m));
      } else if (data.type === 'user-info') {
        setUsers(prev => {
          if (prev.find(u => u.peerId === data.user.peerId)) return prev.map(u => u.peerId === data.user.peerId ? {...u, ...data.user} : u);
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
              const sender = usersRef.current.find(u => u.peerId === conn.peer);
              const message: ChatMessage = {
                  id: nanoid(),
                  roomId: currentRoomId.current!,
                  senderId: conn.peer,
                  senderName: sender?.name || 'Unknown',
                  content: content,
                  timestamp: Date.now(),
                  isPrivate: false,
                  type: 'file',
                  fileMetadata: metadata,
                  deliveryStatus: 'seen'
              };
              setMessages(prev => [...prev, message]);
              saveMessage(message);
              conn.send({ type: 'ack', messageId: data.chunk.id, status: 'seen' });
          }
      } else if (data.type === 'room-closed') {
        setIsRoomClosed(true);
      } else if (data.type === 'mesh-connect') {
        if (data.targetPeerId !== peerIdRef.current && !connectionsRef.current.has(data.targetPeerId)) {
          connectToPeerRef.current(data.targetPeerId);
        }
      } else if (data.type === 'reaction') {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            const reactions = { ...(msg.reactions || {}) };
            const usersArr = reactions[data.emoji] || [];
            if (usersArr.includes(data.senderId)) {
                reactions[data.emoji] = usersArr.filter(id => id !== data.senderId);
                if (reactions[data.emoji].length === 0) delete reactions[data.emoji];
            } else {
                reactions[data.emoji] = [...usersArr, data.senderId];
            }
            return { ...msg, reactions };
          }
          return msg;
        }));
      } else if (data.type === 'delete-message') {
          setMessages(prev => prev.filter(m => m.id !== data.messageId));
          deleteFromDB(data.messageId);
      } else if (data.type === 'ping') {
        console.log('Ping received from', data.senderName);
      }
    });

    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      setConnections(new Map(connectionsRef.current));
      setUsers(prev => prev.filter(u => u.peerId !== conn.peer));
    });
  }, [handleCall]);

  const connectToPeer = useCallback((targetPeerId: string) => {
    if (!peerRef.current) return;
    const conn = peerRef.current.connect(targetPeerId);
    handleConnection(conn);
  }, [handleConnection]);

  useEffect(() => {
    connectToPeerRef.current = connectToPeer;
  }, [connectToPeer]);

  useEffect(() => {
    joinedAt.current = Date.now();
  }, []);

  const broadcastMessage = useCallback((content: string, type: 'text' | 'file' | 'voice-note' | 'wall-post' | 'ping' = 'text', fileMetadata?: any) => {
    if (!currentRoomId.current) return;
    const message: ChatMessage = {
      id: nanoid(),
      roomId: currentRoomId.current,
      senderId: peerIdRef.current,
      senderName: userNameRef.current,
      content,
      timestamp: Date.now(),
      isPrivate: false,
      type,
      fileMetadata,
      deliveryStatus: 'sent'
    };
    setMessages(prev => [...prev, message]);
    saveMessage(message);
    connectionsRef.current.forEach(conn => {
      conn.send({ type: 'chat', message });
    });
  }, []);

  const sendPrivateMessage = useCallback(async (targetPeerId: string, content: string, type: 'text' | 'file' | 'voice-note' = 'text', fileMetadata?: any) => {
    const conn = connectionsRef.current.get(targetPeerId);
    if (!conn || !currentRoomId.current) return;
    let finalContent = content;
    let isEncrypted = false;
    const targetUser = usersRef.current.find(u => u.peerId === targetPeerId);
    if (targetUser?.pubKey && userKeyPairRef.current && type === 'text') {
        try {
            const secret = await (SEA as any).secret(targetUser.pubKey, userKeyPairRef.current);
            const encrypted = await (SEA as any).encrypt(content, secret);
            if (encrypted) {
                finalContent = encrypted;
                isEncrypted = true;
            }
        } catch (e) {}
    }
    const message: ChatMessage = {
      id: nanoid(),
      roomId: currentRoomId.current,
      senderId: peerIdRef.current,
      senderName: userNameRef.current,
      content: finalContent,
      timestamp: Date.now(),
      isPrivate: true,
      receiverId: targetPeerId,
      type,
      fileMetadata,
      isEncrypted,
      deliveryStatus: 'sent'
    };
    const displayMsg = { ...message, content, isEncrypted: false };
    setMessages(prev => [...prev, displayMsg]);
    saveMessage(displayMsg);
    conn.send({ type: 'chat', message });
  }, []);

  const toggleVoice = async (roomId: string) => {
      if (localStream) {
          localStream.getTracks().forEach(t => t.stop());
          setLocalStream(null);
          setIsScreenSharing(false);
          callsRef.current.forEach(c => c.close());
          callsRef.current.clear();
          setRemoteStreams(new Map());
          setVoicePresence(roomId, peerId, false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              setLocalStream(stream);
              setVoicePresence(roomId, peerId, true);
              connectionsRef.current.forEach(conn => {
                  if (peerRef.current) {
                    const call = peerRef.current.call(conn.peer, stream);
                    handleCall(call);
                  }
              });
          } catch (e) {}
      }
  };

  const toggleScreenShare = async () => {
      if (isScreenSharing && localStream) {
          localStream.getTracks().forEach(t => t.stop());
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setLocalStream(audioStream);
          setIsScreenSharing(false);
          replaceStreamInCalls(audioStream);
      } else {
          try {
              const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
              setLocalStream(stream);
              setIsScreenSharing(true);
              replaceStreamInCalls(stream);
              stream.getVideoTracks()[0].onended = () => toggleScreenShare();
          } catch (e) {}
      }
  };

  const replaceStreamInCalls = (newStream: MediaStream) => {
      callsRef.current.forEach(call => {
          const sender = (call as any).peerConnection.getSenders().find((s: any) => s.track?.kind === 'video' || s.track?.kind === 'audio');
          if (sender) {
              const track = newStream.getTracks().find(t => t.kind === sender.track?.kind);
              if (track) sender.replaceTrack(track);
          }
      });
  };

  const updateStatus = (roomId: string, status: PresenceStatus) => {
      setMyStatus(status);
      setGlobalStatus(roomId, peerId, status);
      connectionsRef.current.forEach(conn => {
          conn.send({ type: 'user-info', user: { peerId, name: userName, status, joinedAt: joinedAt.current } });
      });
  };

  const sendPing = (targetPeerId: string) => {
      const conn = connectionsRef.current.get(targetPeerId);
      if (conn) conn.send({ type: 'ping', senderName: userName });
  };

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
            const reactions = { ...(msg.reactions || {}) };
            const usersArr = reactions[emoji] || [];
            if (usersArr.includes(peerId)) {
                reactions[emoji] = usersArr.filter(id => id !== peerId);
                if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
                reactions[emoji] = [...usersArr, peerId];
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
    updateStatus,
    sendPing,
    toggleVoice,
    toggleScreenShare,
    sendReaction,
    broadcastTyping,
    stopRoom,
    localStream,
    remoteStreams,
    isScreenSharing,
    myStatus,
    managerId,
    promotionMessage,
    setPromotionMessage,
    setHostId,
    setRoomId,
    deleteMessage,
    connections
  };
};
