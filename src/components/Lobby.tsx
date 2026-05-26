import { saveSpaceBlueprint } from "../utils/gun";
import { hashPassword } from "../utils/crypto";
import React, { useState, useEffect } from 'react';
import { Room, SpaceBlueprint, Friend } from '../types/chat';
import { subscribeToRooms, announceRoom, getRoomByCode, getSpaceBlueprint } from '../utils/gun';
import { nanoid } from 'nanoid';
import { RefreshCw, Lock, Plus, Search, MessageCircle, Hash, Copy, ChevronRight, Save, Zap, Activity, Share2, ImageIcon as ImageIconLucide, Users, UserPlus, Check, X, Trash2 } from 'lucide-react';
import { clearMessages } from '../utils/db';
import { useFriends } from '../hooks/useFriends';
import { SEA } from 'gun';
import gun from '../utils/gun';

interface LobbyProps {
  onJoinRoom: (room: Room) => void;
  peerId: string;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinRoom, peerId }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [savedSpaces, setSavedSpaces] = useState<SpaceBlueprint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomListInSearch, setNewRoomListInSearch] = useState(true);
  const [isSearchingCode, setIsSearchingCode] = useState(false);
  const [meshStatus, setMeshStatus] = useState<'Connecting' | 'Online'>('Connecting');
  
  // Friend system state
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userKeyPair, setUserKeyPair] = useState<any>(null);
  const [friendRequestInput, setFriendRequestInput] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  
  const { socialState: hookSocialState, isOnline, sendFriendRequest, acceptFriendRequest, removeFriend } = useFriends(userId, userKeyPair, peerId);
  
  // Merge hook state with local pending requests
  const socialState = {
    ...hookSocialState,
    pendingRequests
  };
  
  const setSocialState = (updater: any) => {
    if (typeof updater === 'function') {
      const result = updater(socialState);
      if (result.pendingRequests !== pendingRequests) {
        setPendingRequests(result.pendingRequests);
      }
    }
  };

  // Initialize user ID and keypair for friends system
  useEffect(() => {
    const initUser = async () => {
      const storedName = localStorage.getItem('chat-username') || 'Anonymous';
      const storedId = localStorage.getItem('friendchat-userid');
      let id = storedId;
      let keypair = null;
      
      if (!id) {
        id = nanoid();
        localStorage.setItem('friendchat-userid', id);
      }
      
      // Get or create keypair from Gun SEA
      const user = gun.user();
      const storedPair = localStorage.getItem(`gun-key-${id}`);
      
      if (storedPair) {
        try {
          keypair = JSON.parse(storedPair);
        } catch (e) {
          keypair = await SEA.pair();
          localStorage.setItem(`gun-key-${id}`, JSON.stringify(keypair));
        }
      } else {
        keypair = await SEA.pair();
        localStorage.setItem(`gun-key-${id}`, JSON.stringify(keypair));
      }
      
      setUserId(id);
      setUserKeyPair(keypair);
    };
    
    initUser();
  }, []);

  // Listen for friend requests
  useEffect(() => {
    if (!userId || !userKeyPair) return undefined;
    
    const mailbox = gun.user().get('mailbox');
    const subscription = mailbox.map().on(async (data: any) => {
      if (!data) return;
      
      try {
        const decrypted = await SEA.decrypt(data, userKeyPair);
        
        if (decrypted && decrypted.type === 'friend-request') {
          // Check if already friends or pending
          const existingPending = pendingRequests.find(pr => pr === decrypted.from);
          const existingFriend = hookSocialState.friends.find(f => f.peerId === decrypted.from);
          
          if (!existingPending && !existingFriend) {
            // Add to pending requests
            setPendingRequests(prev => [...prev, decrypted.from]);
            
            // Store request details temporarily
            sessionStorage.setItem(`friend-request-${decrypted.from}`, JSON.stringify({
              from: decrypted.from,
              fromPeerId: decrypted.fromPeerId,
              fromName: decrypted.fromName,
              fromPublicKey: decrypted.fromPublicKey,
              timestamp: decrypted.timestamp
            }));
          }
        }
      } catch (error) {
        // Ignore decryption errors
      }
    });
    
    return () => {
      if (subscription && typeof (subscription as any).off === 'function') {
        (subscription as any).off();
      }
    };
  }, [userId, userKeyPair, pendingRequests, hookSocialState.friends]);

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendRequestInput.trim() || !userId || !userKeyPair) return;
    
    setIsSendingRequest(true);
    const targetPeerId = friendRequestInput.trim();
    
    try {
      // Get target's public key from Gun
      const targetPub = await new Promise<string>((resolve) => {
        gun.user(targetPeerId).get('pub').once((pub: string) => {
          resolve(pub || '');
        });
        setTimeout(() => resolve(''), 3000);
      });
      
      if (!targetPub) {
        alert('Error: User not found. They might be offline.');
        setIsSendingRequest(false);
        return;
      }
      
      await sendFriendRequest(targetPeerId, targetPub, localStorage.getItem('chat-username') || 'Unknown');
      alert('Friend request sent!');
      setFriendRequestInput('');
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Error sending friend request.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleAcceptFriend = async (requestFrom: string) => {
    const requestData = sessionStorage.getItem(`friend-request-${requestFrom}`);
    if (!requestData) return;
    
    const request = JSON.parse(requestData);
    await acceptFriendRequest(request.from, request.fromPeerId, request.fromPublicKey, request.fromName);
    sessionStorage.removeItem(`friend-request-${requestFrom}`);
    alert(`${request.fromName} added to friends!`);
  };

  const handleDeclineFriend = (requestFrom: string) => {
    sessionStorage.removeItem(`friend-request-${requestFrom}`);
    setPendingRequests(prev => prev.filter(id => id !== requestFrom));
  };

  const handleRemoveFriend = async (friendId: string, friendPeerId: string) => {
    if (window.confirm('Remove this friend?')) {
      await removeFriend(friendId, friendPeerId);
    }
  };

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const invite = params.get('invite');
      if (invite) {
          getRoomByCode(invite).then(room => {
              if (room) onJoinRoom(room);
          });
      }
  }, [onJoinRoom]);

  useEffect(() => {
    const unsub = subscribeToRooms((data) => {
        setRooms(data);
        if (data.length >= 0) setMeshStatus('Online');
    });
    return unsub;
  }, []);

  const loadSaved = () => {
      const savedIds: string[] = JSON.parse(localStorage.getItem('saved-spaces') || '[]');
      Promise.all(savedIds.map((id: string) => getSpaceBlueprint(id))).then(data => {
          setSavedSpaces(data.filter((d): d is SpaceBlueprint => d !== null));
      });
  };

  useEffect(() => {
      loadSaved();
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const now = Date.now();
    const roomCode = Math.random().toString(36).substr(2, 8).toUpperCase();
    
    const handleCreate = async () => {
      const passwordHash = newRoomPassword ? await hashPassword(newRoomPassword) : "";
      const newRoom: Room = {
        id: nanoid(),
        name: newRoomName,
        hostPeerId: peerId,
        originalHostId: peerId,
        managerId: peerId,
        isPrivate: !!newRoomPassword,
        passwordHash,
        inviteCode: roomCode, // Persistent code
        listInSearch: newRoomListInSearch,
        description: newRoomDescription,
        createdAt: now,
        lastSeen: now
      };

      announceRoom(newRoom);
      onJoinRoom(newRoom);
    };
    handleCreate();
  };

  const handleBringOnline = (blueprint: SpaceBlueprint) => {
      const createdAt = Date.now();
      const newRoom: Room = {
          id: blueprint.id,
          name: blueprint.name,
          hostPeerId: peerId,
          originalHostId: blueprint.originalHostId,
          managerId: peerId,
          isPrivate: false,
          inviteCode: blueprint.inviteCode, // Preserve the original invite code
          createdAt,
          lastSeen: createdAt
      };
      announceRoom(newRoom);
      onJoinRoom(newRoom);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    setIsSearchingCode(true);
    const room = await getRoomByCode(code);
    setIsSearchingCode(false);
    if (room) onJoinRoom(room);
    else alert('Error: Room not found. Friend might be offline.');
  };

  const handleClearHistory = async () => {
      if (window.confirm('PERMANENTLY DELETE ALL MESSAGES?')) {
          await clearMessages();
          localStorage.removeItem('saved-spaces');
          setSavedSpaces([]);
          alert('History cleared.');
      }
  };

  const copyInviteCode = (code: string) => {
      const url = `${window.location.origin}${window.location.pathname}?invite=${code}`;
      navigator.clipboard.writeText(url);
      alert('Copied link!');
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-whatsapp-bg font-sans flex flex-col overflow-hidden animate-in fade-in duration-500">
      <header className="bg-whatsapp-darkGreen text-white p-6 shadow-md shrink-0 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
                <MessageCircle size={36} className="text-whatsapp-green" />
                <div>
                    <h1 className="text-7xl font-black tracking-tighter leading-none">FriendChat</h1>
                    <p className="text-3xl opacity-100 uppercase tracking-[0.4em] font-black mt-1">Private Chat</p>
                </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-3xl font-black uppercase tracking-widest transition-all ${meshStatus === 'Online' ? 'bg-whatsapp-green/20 text-whatsapp-green border border-whatsapp-green/30' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse'}`}>
                <Activity size={12} className={meshStatus === 'Connecting' ? 'animate-spin' : ''} />
                {meshStatus === 'Connecting' ? 'Connecting...' : 'Online'}
            </div>
          </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-12 pb-24 scrollbar-hide">
        {/* Friends Section */}
        <section className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-100">
            <h2 className="text-3xl font-black text-whatsapp-darkGreen uppercase tracking-[0.2em] flex items-center gap-2 opacity-100">
                <Users size={40}/> Friends {isOnline && socialState.friends.length > 0 && `(${socialState.friends.filter(f => socialState.onlineFriends[f.peerId]).length} Online)`}
            </h2>
            
            {/* Friend Request Input */}
            <div className="bg-white p-6 rounded-3xl shadow-lg border-l-8 border-whatsapp-teal">
                <form onSubmit={handleSendFriendRequest} className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Paste friend's Peer ID here..."
                        value={friendRequestInput}
                        onChange={(e) => setFriendRequestInput(e.target.value)}
                        className="flex-1 bg-gray-50 border-none rounded-2xl p-4 text-xl font-mono shadow-inner focus:bg-white focus:ring-4 focus:ring-whatsapp-green/10 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isSendingRequest || !friendRequestInput.trim()}
                        className="bg-whatsapp-green text-white font-black py-4 px-8 rounded-2xl shadow-xl hover:bg-whatsapp-darkGreen disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest text-2xl flex items-center gap-2"
                    >
                        <UserPlus size={28} /> {isSendingRequest ? 'Sending...' : 'Add Friend'}
                    </button>
                </form>
                <p className="mt-4 text-sm font-black text-gray-500 uppercase tracking-widest">Ask your friend to copy their Peer ID and send it to you!</p>
            </div>
            
            {/* Pending Friend Requests */}
            {socialState.pendingRequests.length > 0 && (
                <div className="bg-white p-6 rounded-3xl shadow-lg border-l-8 border-yellow-400">
                    <h3 className="text-2xl font-black uppercase tracking-widest mb-4">Pending Requests ({socialState.pendingRequests.length})</h3>
                    <div className="space-y-3">
                        {socialState.pendingRequests.map(requestFrom => {
                            const requestData = JSON.parse(sessionStorage.getItem(`friend-request-${requestFrom}`) || '{}');
                            return (
                                <div key={requestFrom} className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                                    <div>
                                        <p className="font-black text-xl">{requestData.fromName || 'Unknown User'}</p>
                                        <p className="text-sm font-mono text-gray-500">{requestFrom.slice(0, 12)}...</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAcceptFriend(requestFrom)} className="p-3 bg-whatsapp-green text-white rounded-full hover:bg-whatsapp-darkGreen transition-colors">
                                            <Check size={24} />
                                        </button>
                                        <button onClick={() => handleDeclineFriend(requestFrom)} className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* Friends List */}
            {socialState.friends.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {socialState.friends.map(friend => (
                        <div key={friend.id} className="bg-white p-5 rounded-3xl shadow-lg border-l-8 border-whatsapp-green flex items-center justify-between group hover:shadow-xl transition-all">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-14 h-14 bg-whatsapp-green/20 rounded-2xl flex items-center justify-center text-whatsapp-darkGreen font-black text-2xl">
                                        {friend.name[0].toUpperCase()}
                                    </div>
                                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${socialState.onlineFriends[friend.peerId] ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                </div>
                                <div>
                                    <p className="font-black text-xl uppercase tracking-tight">{friend.name}</p>
                                    <p className="text-sm font-black text-gray-500 uppercase tracking-widest">
                                        {socialState.onlineFriends[friend.peerId] ? 'Online' : friend.status}
                                    </p>
                                    {friend.currentRoomId && socialState.onlineFriends[friend.peerId] && (
                                        <p className="text-xs text-whatsapp-darkGreen font-mono mt-1">In a group</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveFriend(friend.id, friend.peerId)}
                                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white p-6 rounded-3xl shadow-lg border-l-8 border-whatsapp-teal text-center">
                    <p className="text-2xl font-black text-gray-500 uppercase tracking-widest">No friends yet. Add someone using their peer ID!</p>
                </div>
            )}
        </section>

        {savedSpaces.length > 0 && (
            <section className="max-w-4xl mx-auto space-y-4 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                <h2 className="text-3xl font-black text-whatsapp-darkGreen uppercase tracking-[0.2em] flex items-center gap-2 opacity-100">
                    <Save size={40}/> My Groups
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedSpaces.map(space => {
                        const active = rooms.find(r => r.id === space.id);
                        return (
                            <div key={space.id} className="bg-white p-6 rounded-3xl shadow-lg border-l-8 border-whatsapp-teal flex flex-col justify-between group hover:shadow-xl transition-all relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="font-black text-3xl text-black uppercase tracking-tight mb-1">{space.name}</h3>
                                    <p className="text-3xl text-gray-900 uppercase font-black tracking-widest">Creator: {space.originalHostId.slice(0, 8)}...</p>
                                </div>
                                <div className="mt-8 flex gap-3 relative z-10">
                                    {active ? (
                                        <button
                                            onClick={() => onJoinRoom(active)}
                                            className="flex-1 bg-whatsapp-green text-white font-black py-4 rounded-2xl text-3xl uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                                        >
                                            <Zap size={40} fill="white"/> Join Chat
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleBringOnline(space)}
                                            className="flex-1 bg-whatsapp-green text-white font-black py-4 rounded-2xl text-3xl uppercase tracking-widest shadow-md hover:bg-whatsapp-darkGreen transition-all"
                                        >
                                            Start Room
                                        </button>
                                    )}
                                    <button onClick={() => copyInviteCode(space.inviteCode)} className="p-4 bg-gray-50 text-whatsapp-darkGreen rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors shadow-sm">
                                        <Share2 size={28} />
                                    </button>
                                </div>
                                <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-whatsapp-green/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                            </div>
                        );
                    })}
                </div>
            </section>
        )}

        <section className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-whatsapp-darkGreen uppercase tracking-[0.2em] flex items-center gap-2 opacity-100">
                    <Zap size={40}/> Active Groups
                </h2>
                <button onClick={handleClearHistory} className="text-3xl font-black text-red-400 uppercase tracking-widest border border-red-100 px-3 py-1 rounded-full hover:bg-red-50 transition-colors">
                    Clear History
                </button>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900" size={32} />
                    <input
                        type="text"
                        placeholder="Search rooms..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white rounded-2xl py-5 pl-12 pr-6 shadow-xl text-3xl border-none focus:ring-4 focus:ring-whatsapp-green/10 transition-all font-black"
                    />
                </div>
                <button onClick={() => window.location.reload()} className="p-5 bg-white rounded-2xl text-whatsapp-darkGreen shadow-xl hover:bg-gray-50 active:scale-90 transition-all border border-gray-50"><RefreshCw size={40}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRooms.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-200">
                        <Activity size={40} className="mx-auto mb-4 text-whatsapp-darkGreen opacity-100 animate-pulse" />
                        <p className="text-3xl font-black text-gray-900 uppercase tracking-[0.3em]">Looking for rooms...</p>
                    </div>
                ) : filteredRooms.map(room => (
                    <button
                        key={room.id}
                        onClick={() => onJoinRoom(room)}
                        className="bg-white p-6 rounded-3xl shadow-lg text-left flex items-center justify-between group hover:shadow-2xl transition-all border-l-8 border-whatsapp-green relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <h3 className="font-black text-3xl text-black uppercase tracking-tight">{room.name}</h3>
                            <p className="text-3xl text-gray-900 uppercase font-black tracking-widest mt-1 opacity-100">Code: {room.inviteCode || room.hostPeerId.slice(0, 12)}...</p>
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    saveSpaceBlueprint({ id: room.id, name: room.name, originalHostId: room.originalHostId, inviteCode: room.inviteCode || room.hostPeerId, createdAt: Date.now() });
                                    alert("Group Saved!");
                                    window.location.reload();
                                }}
                                className="p-3 hover:bg-whatsapp-green/10 rounded-full text-whatsapp-darkGreen transition-colors"
                            >
                                <Save size={32} />
                            </button>
                            {room.isPrivate && <Lock size={32} className="text-yellow-400 fill-yellow-50" />}
                            <ChevronRight size={28} className="text-whatsapp-darkGreen group-hover:translate-x-2 transition-transform" />
                        </div>
                        <div className="absolute inset-y-0 left-0 w-full bg-whatsapp-green/5 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                    </button>
                ))}
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-8 rounded-3xl border-4 border-dotted border-whatsapp-teal/20 flex flex-col items-center justify-center gap-3 text-whatsapp-darkGreen font-black hover:bg-whatsapp-green/5 hover:border-whatsapp-teal/40 transition-all uppercase tracking-[0.3em] text-3xl shadow-sm active:scale-95"
                >
                    <Plus size={40} className="mb-1" /> Create Room
                </button>
            </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 delay-300">
            <section className="bg-white p-10 rounded-3xl shadow-xl border-t-8 border-whatsapp-teal">
                <h2 className="font-black text-whatsapp-darkGreen mb-8 flex items-center gap-3 uppercase tracking-[0.2em] text-3xl">
                    <Hash size={32} className="text-whatsapp-darkGreen" /> Join by Code
                </h2>
                <form onSubmit={handleJoinByCode} className="space-y-6">
                    <input
                        type="text"
                        placeholder="Paste code here"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-3xl font-mono shadow-inner focus:bg-white transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isSearchingCode}
                        className="w-full py-5 bg-whatsapp-green text-white font-black rounded-2xl shadow-xl hover:bg-whatsapp-darkGreen disabled:opacity-100 transition-all uppercase tracking-[0.3em] text-3xl active:scale-95"
                    >
                        {isSearchingCode ? 'Joining...' : 'Join Room'}
                    </button>
                </form>
            </section>

            <div className="bg-whatsapp-darkGreen text-white p-10 rounded-3xl shadow-2xl flex flex-col justify-center text-center relative overflow-hidden group">
                <div className="relative z-10">
                    <p className="text-3xl font-black uppercase tracking-[0.4em] mb-6 opacity-100">My Peer ID</p>
                    <p className="text-xl font-black text-whatsapp-green/90 mb-8 uppercase tracking-widest">Share this with friends so they can add you!</p>
                    <div className="bg-black/30 backdrop-blur-md p-5 rounded-2xl font-mono text-2xl break-all select-all mb-8 border border-white/10 shadow-inner group-hover:border-whatsapp-green/40 transition-colors leading-relaxed max-h-40 overflow-y-auto">
                        {peerId}
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(peerId); alert('Peer ID Copied! Share this with friends so they can add you.'); }} className="flex items-center justify-center gap-3 w-full bg-whatsapp-green text-black font-black py-5 rounded-2xl text-3xl uppercase tracking-[0.4em] shadow-2xl hover:bg-white transition-all active:scale-95">
                        <Copy size={28}/> Copy Peer ID
                    </button>
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-whatsapp-green/10 to-transparent pointer-events-none"></div>
            </div>
        </div>
      </div>

      {isCreating && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
              <form onSubmit={handleCreateRoom} className="bg-white rounded-[2rem] p-10 md:p-14 w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden border-t-8 border-whatsapp-green">
                  <div className="relative z-10">
                      <h2 className="text-6xl font-black text-whatsapp-darkGreen mb-2 uppercase tracking-tighter italic">New Group</h2>
                      <p className="text-3xl text-gray-900 mb-12 font-black uppercase tracking-[0.3em]">Start a private group chat</p>
                      <div className="space-y-8">
                          <div>
                              <label className="block text-3xl font-black text-gray-900 uppercase tracking-[0.4em] mb-3 leading-none">Room Name</label>
                              <input
                                autoFocus required type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl p-5 text-3xl font-black shadow-inner focus:bg-white focus:ring-4 focus:ring-whatsapp-green/10 transition-all" placeholder="..."
                              />
                          </div>
                          <div>
                              <label className="block text-3xl font-black text-gray-900 uppercase tracking-[0.4em] mb-3 leading-none">Password [Optional]</label>
                              <input
                                type="password" value={newRoomPassword} onChange={(e) => setNewRoomPassword(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl p-5 font-mono shadow-inner focus:bg-white focus:ring-4 focus:ring-whatsapp-green/10 transition-all" placeholder="..."
                              />
                          </div>
                          <div>
                              <label className="block text-3xl font-black text-gray-900 uppercase tracking-[0.4em] mb-3 leading-none">Description [Optional]</label>
                              <input
                                type="text" value={newRoomDescription} onChange={(e) => setNewRoomDescription(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl p-5 shadow-inner focus:bg-white focus:ring-4 focus:ring-whatsapp-green/10 transition-all" placeholder="What's this group about?"
                              />
                          </div>
                          <div className="flex items-center gap-4 py-4">
                              <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={newRoomListInSearch}
                                    onChange={(e) => setNewRoomListInSearch(e.target.checked)}
                                    className="w-8 h-8 rounded-lg accent-whatsapp-green"
                                  />
                                  <span className="text-2xl font-black uppercase tracking-[0.2em]">List in Public Search</span>
                              </label>
                          </div>
                      </div>
                      <div className="flex gap-6 mt-14">
                          <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-5 text-gray-900 font-black uppercase tracking-[0.3em] text-3xl hover:text-red-500 transition-colors">Cancel</button>
                          <button type="submit" className="flex-1 py-5 bg-whatsapp-green text-white font-black rounded-2xl shadow-2xl shadow-whatsapp-teal/20 uppercase tracking-[0.3em] text-3xl active:scale-95 transition-all">Start</button>
                      </div>
                  </div>
                  <ImageIconLucide size={120} className="absolute bottom-[-40px] right-[-40px] text-whatsapp-green opacity-10 rotate-12" />
              </form>
          </div>
      )}
    </div>
  );
};
