import { sendFriendRequest, subscribeToFriendRequests, acceptFriendRequest, subscribeToFriends } from "../utils/gun";
import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { nanoid } from 'nanoid';
import { ChatMessage, PeerUser, PresenceStatus, Room } from '../types/chat';
import { FileReceiver } from '../utils/fileTransfer';
import { saveMessage, getRoomMessages } from '../utils/db';
import { SEA, setVoicePresence, setGlobalStatus, writeHeartbeat, monitorHeartbeats } from '../utils/gun';

export const usePeer = (userName: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string>('');
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
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);

  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const callsRef = useRef<Map<string, MediaConnection>>(new Map());
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const fileReceiver = useRef(new FileReceiver());
  const currentRoomId = useRef<string | null>(null);
  const joinedAt = useRef<number>(Date.now());
  const hostIdRef = useRef<string>('');

  useEffect(() => {
    const init = async () => {
        const pair = await SEA.pair();
        setUserKeyPair(pair);

        const newPeer = new Peer(nanoid(), {
            debug: 1,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    { urls: 'stun:stun.metered.ca:80' },
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ]
            }
        });

        newPeer.on('open', (id) => {
            setPeerId(id);
            setPeer(newPeer);
        });

        newPeer.on('connection', (conn) => {
            handleConnection(conn);
        });

        newPeer.on('call', (call) => {
            if (localStreamRef.current) {
                call.answer(localStreamRef.current);
                handleCall(call);
            } else {
                call.close();
            }
        });

        return newPeer;
    };

    const peerPromise = init();



    return () => {
        peerPromise.then(p => p.destroy());
        typingTimeouts.current.forEach(clearTimeout);
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!peerId || !currentRoomId.current) return;

    const hbInterval = setInterval(() => {
        writeHeartbeat(currentRoomId.current!, peerId);
    }, 5000);

    const unsub = monitorHeartbeats(currentRoomId.current!, (beats) => {
        const now = Date.now();
        const leaderId = managerIdRef.current || hostIdRef.current;
        const leaderBeat = beats[leaderId] || 0;

        if (leaderId && leaderId !== peerId && (now - leaderBeat > 15000)) {
            const candidates = usersRef.current.concat({
                peerId, name: userName, status: myStatusRef.current, joinedAt: joinedAt.current
            });
            const oldest = candidates.sort((a, b) => a.joinedAt - b.joinedAt)[0];

            if (oldest.peerId === peerId && oldest.peerId !== managerIdRef.current) {
                setManagerId(peerId);
                setPromotionMessage('Host is away. You are the Manager now.');
            } else if (oldest.peerId !== managerIdRef.current) {
                setManagerId(oldest.peerId);
            }
        }
    });



    return () => {
        clearInterval(hbInterval);
        unsub();
    };
  }, [peerId]);

  useEffect(() => {
    if (!peerId) return;
    const unsubRequests = subscribeToFriendRequests(peerId, (reqs) => {
        setFriendRequests(reqs);
    });
    const unsubFriends = subscribeToFriends(peerId, (fs) => {
        setFriends(fs);
    });
    return () => {
        unsubRequests();
        unsubFriends();
    };
  }, [peerId]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerIdRef = useRef(peerId);
  const userNameRef = useRef(userName);
  const userKeyPairRef = useRef(userKeyPair);
  const usersRef = useRef(users);
  const peerRef = useRef(peer);
  const myStatusRef = useRef(myStatus);
  const managerIdRef = useRef(managerId);

  useEffect(() => {
    localStreamRef.current = localStream;
    peerIdRef.current = peerId;
    userNameRef.current = userName;
    userKeyPairRef.current = userKeyPair;
    usersRef.current = users;
    peerRef.current = peer;
    myStatusRef.current = myStatus;
    managerIdRef.current = managerId;
  }, [localStream, peerId, userName, userKeyPair, users, peer, myStatus, managerId]);

  const setHostId = (id: string) => { hostIdRef.current = id; };

  const loadRoomHistory = async (roomId: string) => {
      const history = await getRoomMessages(roomId);
      setMessages(history);
  };

  const setRoomId = (id: string | null) => {
      if (id === null) {
          currentRoomId.current = null;
          setMessages([]);
          setUsers([]);
          setTypingUsers(new Set());
          return;
      }
      currentRoomId.current = id;
      loadRoomHistory(id);
  };

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
          connectToPeer(data.targetPeerId);
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
      } else if (data.type === 'ping') {
        console.log('Ping received from', data.senderName);
      }
    });

    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      setConnections(new Map(connectionsRef.current));
      setUsers(prev => prev.filter(u => u.peerId !== conn.peer));
    });
  }, []);

  const connectToPeer = useCallback((targetPeerId: string) => {
    if (!peerRef.current) return;
    const conn = peerRef.current.connect(targetPeerId);
    handleConnection(conn);
  }, [handleConnection]);

  const broadcastMessage = useCallback((content: string, type: 'text' | 'file' | 'voice-note' | 'wall-post' | 'ping' = 'text', fileMetadata?: any) => {
    if (!currentRoomId.current) return;
    const message: ChatMessage = {
      id: nanoid(),
      roomId: currentRoomId.current,
      senderId: peerId,
      senderName: userName,
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
  }, [peerId, userName]);

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
      senderId: peerId,
      senderName: userName,
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
  }, [peerId, userName]);

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
    connections: connectionsRef.current,
    friends,
    friendRequests,
    onSendFriendRequest: (toId: string, toName: string) => {
        sendFriendRequest({ id: nanoid(), fromId: peerId, fromName: userName, toId, status: 'pending', timestamp: Date.now() });
    },
    onAcceptFriendRequest: (fromId: string, fromName: string) => {
        acceptFriendRequest(peerId, fromId, userName, fromName);
    }
  };
};
