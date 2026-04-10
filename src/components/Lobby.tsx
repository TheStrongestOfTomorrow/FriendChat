import React, { useState, useEffect } from 'react';
import { Room, SpaceBlueprint } from '../types/chat';
import { subscribeToRooms, announceRoom, getRoomByCode, getSpaceBlueprint } from '../utils/gun';
import { nanoid } from 'nanoid';
import { RefreshCw, Lock, Plus, Search, MessageCircle, Hash, Copy, ChevronRight, Save, Zap } from 'lucide-react';

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
    return subscribeToRooms(setRooms);
  }, []);

  useEffect(() => {
      const savedIds: string[] = JSON.parse(localStorage.getItem('saved-spaces') || '[]');
      Promise.all(savedIds.map((id: string) => getSpaceBlueprint(id))).then(data => {
          setSavedSpaces(data.filter((d): d is SpaceBlueprint => d !== null));
      });
  }, []);

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
    else alert('Error: Room not found.');
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-whatsapp-bg font-sans flex flex-col overflow-hidden">
      <header className="bg-whatsapp-darkGreen text-white p-6 shadow-md shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle size={32} />
            <h1 className="text-3xl font-bold tracking-tight">FriendChat</h1>
          </div>
          <p className="text-[10px] opacity-80 uppercase tracking-[0.4em] font-black">Launch Version</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-12 scrollbar-hide">
        {savedSpaces.length > 0 && (
            <section className="max-w-4xl mx-auto space-y-4">
                <h2 className="text-xs font-black text-whatsapp-darkGreen uppercase tracking-widest flex items-center gap-2">
                    <Save size={14}/> My Saved Spaces
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedSpaces.map(space => {
                        const active = rooms.find(r => r.id === space.id);
                        return (
                            <div key={space.id} className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-whatsapp-teal flex flex-col justify-between group">
                                <div>
                                    <h3 className="font-bold text-xl text-gray-800">{space.name}</h3>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">Creator ID: {space.originalHostId.slice(0, 12)}...</p>
                                </div>
                                <div className="mt-6 flex gap-2">
                                    {active ? (
                                        <button
                                            onClick={() => onJoinRoom(active)}
                                            className="flex-1 bg-whatsapp-green text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <Zap size={14} fill="white"/> Join Live
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleBringOnline(space)}
                                            className="flex-1 bg-whatsapp-teal text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest"
                                        >
                                            Bring Group Online
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        )}

        <section className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-xs font-black text-whatsapp-darkGreen uppercase tracking-widest flex items-center gap-2">
                <Zap size={14}/> Live Mesh Discovery
            </h2>
            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search active rooms..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white rounded-xl py-4 pl-10 pr-4 shadow-sm text-sm"
                    />
                </div>
                <button onClick={() => window.location.reload()} className="p-4 bg-white rounded-xl text-whatsapp-teal shadow-sm hover:bg-gray-50 active:scale-95 transition-all"><RefreshCw size={20}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRooms.map(room => (
                    <button
                        key={room.id}
                        onClick={() => onJoinRoom(room)}
                        className="bg-white p-6 rounded-2xl shadow-sm text-left flex items-center justify-between group hover:shadow-md transition-all border-l-8 border-whatsapp-green"
                    >
                        <div>
                            <h3 className="font-bold text-xl text-gray-800">{room.name}</h3>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">Host Node: {room.hostPeerId.slice(0, 12)}...</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {room.isPrivate && <Lock size={18} className="text-gray-300" />}
                            <ChevronRight size={24} className="text-whatsapp-teal group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                ))}
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-6 rounded-2xl border-4 border-dotted border-whatsapp-teal/30 flex flex-col items-center justify-center gap-2 text-whatsapp-teal font-black hover:bg-whatsapp-teal/5 transition-all uppercase tracking-widest text-xs"
                >
                    <Plus size={32} className="mb-1" /> Create New Space
                </button>
            </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <section className="bg-white p-8 rounded-2xl shadow-md border-t-4 border-whatsapp-teal">
                <h2 className="font-bold text-whatsapp-darkGreen mb-6 flex items-center gap-2 uppercase tracking-widest text-sm">
                    <Hash size={18} /> Join by Invite Code
                </h2>
                <form onSubmit={handleJoinByCode} className="space-y-4">
                    <input
                        type="text"
                        placeholder="PASTE_CODE_HERE"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm font-mono"
                    />
                    <button
                        type="submit"
                        disabled={isSearchingCode}
                        className="w-full py-4 bg-whatsapp-teal text-white font-black rounded-xl shadow-lg hover:bg-whatsapp-darkGreen disabled:opacity-50 transition-all uppercase tracking-[0.2em] text-xs"
                    >
                        {isSearchingCode ? 'Scanning Mesh...' : 'Establish Link'}
                    </button>
                </form>
            </section>

            <div className="bg-whatsapp-darkGreen text-white p-8 rounded-2xl shadow-xl flex flex-col justify-center text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-70">Your Public Node Identity</p>
                <div className="bg-black/20 p-4 rounded-xl font-mono text-[9px] break-all select-all mb-6 border border-white/10">{peerId}</div>
                <button onClick={() => { navigator.clipboard.writeText(peerId); alert('Code Copied!'); }} className="flex items-center justify-center gap-3 w-full bg-white text-whatsapp-darkGreen font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-gray-100 transition-all shadow-lg active:scale-95">
                    <Copy size={16}/> Copy My Code
                </button>
            </div>
        </div>
      </div>

      {isCreating && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <form onSubmit={handleCreateRoom} className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
                  <h2 className="text-3xl font-black text-whatsapp-darkGreen mb-2 uppercase tracking-tighter">New Mesh Space</h2>
                  <p className="text-xs text-gray-400 mb-8 font-bold uppercase tracking-widest">Initialize a decentralized chat room</p>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Space Name</label>
                          <input
                            autoFocus required type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-lg font-bold" placeholder="e.g. Class 2026"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Access Key (Optional)</label>
                          <input
                            type="password" value={newRoomPassword} onChange={(e) => setNewRoomPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 font-mono" placeholder="Secret security key..."
                          />
                      </div>
                  </div>
                  <div className="flex gap-4 mt-10">
                      <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-4 text-gray-400 font-black uppercase tracking-widest text-xs">Abort</button>
                      <button type="submit" className="flex-1 py-4 bg-whatsapp-teal text-white font-black rounded-xl shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all">Initialize</button>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
};
