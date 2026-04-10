import React, { useState, useEffect } from 'react';
import { Room } from '../types/chat';
import { subscribeToRooms, announceRoom, getRoomByCode } from '../utils/gun';
import { nanoid } from 'nanoid';
import { RefreshCw, Lock, Plus, Search, Terminal, Hash, Key, Activity } from 'lucide-react';

interface LobbyProps {
  onJoinRoom: (room: Room) => void;
  peerId: string;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinRoom, peerId }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [isSearchingCode, setIsSearchingCode] = useState(false);

  useEffect(() => {
    return subscribeToRooms((updatedRooms) => {
      setRooms(updatedRooms);
    });
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const newRoom: Room = {
      id: nanoid(),
      name: newRoomName.toUpperCase(),
      hostPeerId: peerId,
      isPrivate: !!newRoomPassword,
      passwordHash: newRoomPassword,
      createdAt: Date.now(),
      lastSeen: Date.now()
    };

    announceRoom(newRoom);
    onJoinRoom(newRoom);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsSearchingCode(true);
    const room = await getRoomByCode(joinCode.trim());
    setIsSearchingCode(false);

    if (room) {
      onJoinRoom(room);
    } else {
      alert('NODE_NOT_FOUND: TARGET_OFFLINE_OR_INCORRECT_CODE');
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface font-mono text-primary p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 border-b border-primary/20 pb-8">
          <div className="flex items-center gap-4 mb-2">
            <Terminal size={32} className="animate-pulse" />
            <h1 className="text-4xl font-bold tracking-tighter terminal-glow underline decoration-double">
              FRIENDCHAT_V2.0
            </h1>
          </div>
          <div className="flex justify-between items-end">
            <p className="text-primary-dark text-xs font-bold uppercase tracking-widest">
              [STATUS: DECENTRALIZED_MESH_ACTIVE]
            </p>
            <div className="flex gap-2">
                <button
                onClick={() => window.location.reload()}
                className="p-2 border border-primary/30 hover:bg-primary/10 transition-colors"
                >
                <RefreshCw size={18} />
                </button>
                <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold hover:bg-primary-dark transition-all active:translate-y-0.5"
                >
                <Plus size={18} /> NEW_ROOM
                </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="relative border border-primary/30 focus-within:border-primary transition-colors bg-black">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-dark" size={18} />
                    <input
                    type="text"
                    placeholder="QUERY_ACTIVE_NODES..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-primary placeholder:text-primary/20 focus:outline-none"
                    />
                </div>

                <div className="space-y-4">
                {filteredRooms.length === 0 ? (
                    <div className="border border-primary/10 bg-black/50 py-12 text-center">
                        <Activity size={32} className="mx-auto mb-4 opacity-20" />
                        <p className="text-primary-dark text-sm">[NO_BROADCASTS_DETECTED]</p>
                    </div>
                ) : (
                    filteredRooms.map(room => (
                    <div
                        key={room.id}
                        onClick={() => onJoinRoom(room)}
                        className="group border border-primary/20 bg-black hover:border-primary transition-all p-4 cursor-pointer relative overflow-hidden"
                    >
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight mb-1 group-hover:terminal-glow">
                                    {'>'} {room.name}
                                </h3>
                                <p className="text-[10px] text-primary-dark uppercase">Node: {room.hostPeerId.slice(0, 16)}...</p>
                            </div>
                            {room.isPrivate && <Lock size={16} className="text-primary animate-pulse" />}
                        </div>
                        <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-primary-dark pt-4 border-t border-primary/5">
                            <span>UP_SINCE: {new Date(room.createdAt).toLocaleTimeString()}</span>
                            <span className="group-hover:text-primary">EXECUTE_JOIN {'>>'}</span>
                        </div>
                        <div className="absolute inset-y-0 left-0 w-1 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                    </div>
                    ))
                )}
                </div>
            </div>

            <div className="space-y-6">
                <div className="border border-primary/20 bg-black p-6">
                    <div className="flex items-center gap-2 mb-6 border-b border-primary/20 pb-4 text-primary-dark">
                        <Hash size={18} />
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em]">Join_by_code</h2>
                    </div>
                    <form onSubmit={handleJoinByCode} className="space-y-4">
                        <input
                            type="text"
                            placeholder="INPUT_CODE_HERE..."
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            className="w-full bg-surface-light border border-primary/20 p-3 text-primary text-xs focus:border-primary focus:outline-none transition-all placeholder:text-primary/10"
                        />
                        <button
                            type="submit"
                            disabled={isSearchingCode}
                            className="w-full py-3 bg-primary text-black font-bold uppercase text-xs hover:bg-primary-dark transition-all disabled:opacity-30"
                        >
                            {isSearchingCode ? 'SCANNING...' : 'ESTABLISH_LINK'}
                        </button>
                    </form>
                </div>

                <div className="border border-primary/20 bg-black p-6">
                    <div className="flex items-center gap-2 mb-4 text-primary-dark">
                        <Key size={16} />
                        <h3 className="text-[10px] font-bold uppercase tracking-widest">Self_peer_id</h3>
                    </div>
                    <div className="bg-surface-light p-3 border border-primary/10 font-mono text-[9px] break-all text-primary select-all">
                        {peerId}
                    </div>
                    <p className="mt-4 text-[9px] text-primary-dark leading-relaxed uppercase opacity-60">Share this ID to allow direct node connections.</p>
                </div>
            </div>
        </div>

        {isCreating && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <form onSubmit={handleCreateRoom} className="bg-surface border border-primary p-8 md:p-10 w-full max-w-md shadow-[0_0_50px_rgba(0,255,65,0.15)] animate-in zoom-in duration-200">
              <h2 className="text-2xl font-bold mb-8 terminal-glow">{'>'} INITIALIZE_SPACE</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-primary-dark uppercase tracking-widest mb-2">Space_name</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full bg-black border border-primary/30 p-4 text-primary focus:border-primary focus:outline-none transition-all"
                    placeholder="ENTER_NAME..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-primary-dark uppercase tracking-widest mb-2">Access_key [OPTIONAL]</label>
                  <input
                    type="password"
                    value={newRoomPassword}
                    onChange={(e) => setNewRoomPassword(e.target.value)}
                    className="w-full bg-black border border-primary/30 p-4 text-primary focus:border-primary focus:outline-none transition-all"
                    placeholder="PROTECT_DATA..."
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-10">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-4 border border-primary/30 hover:bg-primary/5 text-primary text-xs font-bold transition-all"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-4 bg-primary text-black text-xs font-bold hover:bg-primary-dark transition-all"
                >
                  EXECUTE
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
