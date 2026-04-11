import React, { useState, useEffect } from 'react';
import { Room, SpaceBlueprint } from '../types/chat';
import { subscribeToRooms, announceRoom, getRoomByCode, getSpaceBlueprint } from '../utils/gun';
import { nanoid } from 'nanoid';
import { RefreshCw, Lock, Plus, Search, MessageCircle, Hash, Copy, ChevronRight, Save, Zap, Activity, Trash2, Share2, ImageIcon as ImageIconLucide } from 'lucide-react';
import { clearMessages } from '../utils/db';

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
  const [isSearchingCode, setIsSearchingCode] = useState(false);
  const [meshStatus, setMeshStatus] = useState<'Connecting' | 'Online'>('Connecting');

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const invite = params.get('invite');
      if (invite) {
          getRoomByCode(invite).then(room => {
              if (room) onJoinRoom(room);
          });
      }
  }, []);

  useEffect(() => {
    const unsub = subscribeToRooms((data) => {
        setRooms(data);
        if (data.length >= 0) setMeshStatus('Online');
    });
    return unsub;
  }, []);

  useEffect(() => {
      loadSaved();
  }, []);

  const loadSaved = () => {
      const savedIds: string[] = JSON.parse(localStorage.getItem('saved-spaces') || '[]');
      Promise.all(savedIds.map((id: string) => getSpaceBlueprint(id))).then(data => {
          setSavedSpaces(data.filter((d): d is SpaceBlueprint => d !== null));
      });
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const newRoom: Room = {
      id: nanoid(),
      name: newRoomName,
      hostPeerId: peerId,
      originalHostId: peerId,
      managerId: peerId,
      isPrivate: !!newRoomPassword,
      passwordHash: newRoomPassword,
      createdAt: Date.now(),
      lastSeen: Date.now()
    };

    announceRoom(newRoom);
    onJoinRoom(newRoom);
  };

  const handleBringOnline = (blueprint: SpaceBlueprint) => {
      const newRoom: Room = {
          id: blueprint.id,
          name: blueprint.name,
          hostPeerId: peerId,
          originalHostId: blueprint.originalHostId,
          managerId: peerId,
          isPrivate: false,
          createdAt: Date.now(),
          lastSeen: Date.now()
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
                    <h1 className="text-3xl font-black tracking-tighter leading-none">FriendChat</h1>
                    <p className="text-[10px] opacity-60 uppercase tracking-[0.4em] font-black mt-1">Private Chat</p>
                </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${meshStatus === 'Online' ? 'bg-whatsapp-green/20 text-whatsapp-green border border-whatsapp-green/30' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse'}`}>
                <Activity size={12} className={meshStatus === 'Connecting' ? 'animate-spin' : ''} />
                {meshStatus === 'Connecting' ? 'Connecting...' : 'Online'}
            </div>
          </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-12 pb-24 scrollbar-hide">
        {savedSpaces.length > 0 && (
            <section className="max-w-4xl mx-auto space-y-4 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                <h2 className="text-xs font-black text-whatsapp-darkGreen uppercase tracking-[0.2em] flex items-center gap-2 opacity-70">
                    <Save size={14}/> My Groups
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedSpaces.map(space => {
                        const active = rooms.find(r => r.id === space.id);
                        return (
                            <div key={space.id} className="bg-white p-6 rounded-3xl shadow-lg border-l-8 border-whatsapp-teal flex flex-col justify-between group hover:shadow-xl transition-all relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="font-black text-2xl text-gray-800 uppercase tracking-tight mb-1">{space.name}</h3>
                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Creator: {space.originalHostId.slice(0, 8)}...</p>
                                </div>
                                <div className="mt-8 flex gap-3 relative z-10">
                                    {active ? (
                                        <button
                                            onClick={() => onJoinRoom(active)}
                                            className="flex-1 bg-whatsapp-green text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                                        >
                                            <Zap size={14} fill="white"/> Join Chat
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleBringOnline(space)}
                                            className="flex-1 bg-whatsapp-teal text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-md hover:bg-whatsapp-darkGreen transition-all"
                                        >
                                            Start Room
                                        </button>
                                    )}
                                    <button onClick={() => copyInviteCode(space.inviteCode)} className="p-4 bg-gray-50 text-whatsapp-teal rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors shadow-sm">
                                        <Share2 size={18} />
                                    </button>
                                </div>
                                <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-whatsapp-teal/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                            </div>
                        );
                    })}
                </div>
            </section>
        )}

        <section className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-whatsapp-darkGreen uppercase tracking-[0.2em] flex items-center gap-2 opacity-70">
                    <Zap size={14}/> Active Groups
                </h2>
                <button onClick={handleClearHistory} className="text-[9px] font-black text-red-400 uppercase tracking-widest border border-red-100 px-3 py-1 rounded-full hover:bg-red-50 transition-colors">
                    Clear History
                </button>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search rooms..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white rounded-2xl py-5 pl-12 pr-6 shadow-xl text-sm border-none focus:ring-4 focus:ring-whatsapp-green/10 transition-all font-medium"
                    />
                </div>
                <button onClick={() => window.location.reload()} className="p-5 bg-white rounded-2xl text-whatsapp-teal shadow-xl hover:bg-gray-50 active:scale-90 transition-all border border-gray-50"><RefreshCw size={24}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRooms.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-200">
                        <Activity size={40} className="mx-auto mb-4 text-whatsapp-teal opacity-20 animate-pulse" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Looking for rooms...</p>
                    </div>
                ) : filteredRooms.map(room => (
                    <button
                        key={room.id}
                        onClick={() => onJoinRoom(room)}
                        className="bg-white p-6 rounded-3xl shadow-lg text-left flex items-center justify-between group hover:shadow-2xl transition-all border-l-8 border-whatsapp-green relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <h3 className="font-black text-xl text-gray-800 uppercase tracking-tight">{room.name}</h3>
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1 opacity-70">Code: {room.hostPeerId.slice(0, 12)}...</p>
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                            {room.isPrivate && <Lock size={20} className="text-yellow-400 fill-yellow-50" />}
                            <ChevronRight size={28} className="text-whatsapp-teal group-hover:translate-x-2 transition-transform" />
                        </div>
                        <div className="absolute inset-y-0 left-0 w-full bg-whatsapp-green/5 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                    </button>
                ))}
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-8 rounded-3xl border-4 border-dotted border-whatsapp-teal/20 flex flex-col items-center justify-center gap-3 text-whatsapp-teal font-black hover:bg-whatsapp-teal/5 hover:border-whatsapp-teal/40 transition-all uppercase tracking-[0.3em] text-[10px] shadow-sm active:scale-95"
                >
                    <Plus size={40} className="mb-1" /> Create Room
                </button>
            </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 delay-300">
            <section className="bg-white p-10 rounded-3xl shadow-xl border-t-8 border-whatsapp-teal">
                <h2 className="font-black text-whatsapp-darkGreen mb-8 flex items-center gap-3 uppercase tracking-[0.2em] text-xs">
                    <Hash size={20} className="text-whatsapp-teal" /> Join by Code
                </h2>
                <form onSubmit={handleJoinByCode} className="space-y-6">
                    <input
                        type="text"
                        placeholder="Paste code here"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm font-mono shadow-inner focus:bg-white transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isSearchingCode}
                        className="w-full py-5 bg-whatsapp-teal text-white font-black rounded-2xl shadow-xl hover:bg-whatsapp-darkGreen disabled:opacity-50 transition-all uppercase tracking-[0.3em] text-[10px] active:scale-95"
                    >
                        {isSearchingCode ? 'Joining...' : 'Join Room'}
                    </button>
                </form>
            </section>

            <div className="bg-whatsapp-darkGreen text-white p-10 rounded-3xl shadow-2xl flex flex-col justify-center text-center relative overflow-hidden group">
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 opacity-60">My Invite Code</p>
                    <div className="bg-black/30 backdrop-blur-md p-5 rounded-2xl font-mono text-[10px] break-all select-all mb-8 border border-white/10 shadow-inner group-hover:border-whatsapp-green/40 transition-colors leading-relaxed">
                        {peerId}
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(peerId); alert('Code Copied!'); }} className="flex items-center justify-center gap-3 w-full bg-whatsapp-green text-black font-black py-5 rounded-2xl text-[10px] uppercase tracking-[0.4em] shadow-2xl hover:bg-white transition-all active:scale-95">
                        <Copy size={18}/> Copy Code
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
                      <h2 className="text-4xl font-black text-whatsapp-darkGreen mb-2 uppercase tracking-tighter italic">New Group</h2>
                      <p className="text-[10px] text-gray-400 mb-12 font-black uppercase tracking-[0.3em]">Start a private group chat</p>
                      <div className="space-y-8">
                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-3 leading-none">Room Name</label>
                              <input
                                autoFocus required type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl p-5 text-xl font-bold shadow-inner focus:bg-white focus:ring-4 focus:ring-whatsapp-green/10 transition-all" placeholder="..."
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-3 leading-none">Password [Optional]</label>
                              <input
                                type="password" value={newRoomPassword} onChange={(e) => setNewRoomPassword(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl p-5 font-mono shadow-inner focus:bg-white focus:ring-4 focus:ring-whatsapp-green/10 transition-all" placeholder="..."
                              />
                          </div>
                      </div>
                      <div className="flex gap-6 mt-14">
                          <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-5 text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] hover:text-red-500 transition-colors">Cancel</button>
                          <button type="submit" className="flex-1 py-5 bg-whatsapp-teal text-white font-black rounded-2xl shadow-2xl shadow-whatsapp-teal/20 uppercase tracking-[0.3em] text-[10px] active:scale-95 transition-all">Start</button>
                      </div>
                  </div>
                  <ImageIconLucide size={120} className="absolute bottom-[-40px] right-[-40px] text-whatsapp-green opacity-5 rotate-12" />
              </form>
          </div>
      )}
    </div>
  );
};
