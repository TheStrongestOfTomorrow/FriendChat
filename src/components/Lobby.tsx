import React, { useState, useEffect } from 'react';
import { Room } from '../types/chat';
import { subscribeToRooms, announceRoom, getRoomByCode } from '../utils/gun';
import { nanoid } from 'nanoid';
import { RefreshCw, Lock, Plus, Search, Globe, Hash, Key } from 'lucide-react';

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
      name: newRoomName,
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
      alert('Room with this code not found or offline.');
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      <div className="max-w-6xl mx-auto p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="font-display text-5xl font-extrabold tracking-tight text-primary mb-2">
              FriendChat
            </h1>
            <p className="text-on-surface-variant font-medium">Decentralized P2P Chat</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button
              onClick={() => window.location.reload()}
              className="p-3 bg-surface-container-high rounded-md hover:bg-surface-container-low transition-colors"
            >
              <RefreshCw size={22} className="text-secondary" />
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 btn-gradient rounded-md text-white font-bold shadow-lg transition-transform active:scale-95"
            >
              <Plus size={20} /> Create Room
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <section className="lg:col-span-2">
                <div className="relative group mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary" size={20} />
                    <input
                    type="text"
                    placeholder="Search active rooms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface-container-high border-none rounded-lg py-5 pl-14 pr-6 text-on-surface text-lg focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRooms.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-surface-container-low rounded-lg border-2 border-dashed border-primary/10">
                    <Globe size={40} className="text-secondary opacity-30 mb-4" />
                    <p className="text-xl font-display font-bold text-on-surface-variant mb-1">No Public Rooms</p>
                    <p className="text-on-surface-variant opacity-70 text-sm">Create one or join by code.</p>
                    </div>
                ) : (
                    filteredRooms.map(room => (
                    <div
                        key={room.id}
                        onClick={() => onJoinRoom(room)}
                        className="bg-surface-container-lowest p-6 rounded-lg hover:bg-white transition-all cursor-pointer group shadow-sm hover:shadow-md border border-primary/5"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-display text-xl font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                                {room.name}
                            </h3>
                            {room.isPrivate && <Lock size={16} className="text-secondary" />}
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-container-high text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                            <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                            <span className="text-primary group-hover:translate-x-1 transition-transform">Join &rarr;</span>
                        </div>
                    </div>
                    ))
                )}
                </div>
            </section>

            <aside className="space-y-8">
                <div className="bg-surface-container-low p-8 rounded-lg border border-primary/5">
                    <div className="flex items-center gap-3 mb-6">
                        <Hash className="text-primary" size={24} />
                        <h2 className="font-display text-xl font-bold text-on-surface">Join by Code</h2>
                    </div>
                    <form onSubmit={handleJoinByCode} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Enter room code..."
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            className="w-full bg-white border-none rounded-md px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20 shadow-sm"
                        />
                        <button
                            type="submit"
                            disabled={isSearchingCode}
                            className="w-full py-3 btn-gradient text-white font-bold rounded-md shadow-md disabled:opacity-50"
                        >
                            {isSearchingCode ? 'Searching...' : 'Join Room'}
                        </button>
                    </form>
                </div>

                <div className="bg-primary/5 p-8 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-3 mb-4 text-primary">
                        <Key size={20} />
                        <h3 className="font-bold uppercase tracking-widest text-xs">Your Connection Code</h3>
                    </div>
                    <div className="bg-white p-4 rounded border border-primary/10 font-mono text-xs break-all text-on-surface-variant select-all">
                        {peerId}
                    </div>
                    <p className="mt-4 text-[10px] text-on-surface-variant leading-relaxed">Share this code with friends so they can join your private room directly.</p>
                </div>
            </aside>
        </div>

        {isCreating && (
          <div className="fixed inset-0 glass-morphism flex items-center justify-center p-4 z-50">
            <form onSubmit={handleCreateRoom} className="bg-surface-container-lowest p-10 rounded-lg w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
              <h2 className="font-display text-3xl font-bold mb-8 text-primary">Create Room</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Room Name</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full bg-surface-container-low rounded-md px-5 py-4 text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Enter room name..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Password (Optional)</label>
                  <input
                    type="password"
                    value={newRoomPassword}
                    onChange={(e) => setNewRoomPassword(e.target.value)}
                    className="w-full bg-surface-container-low rounded-md px-5 py-4 text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Protect your room..."
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-10">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-6 py-4 bg-surface-container-high hover:bg-surface-container-low text-on-surface font-bold rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 btn-gradient text-white font-bold rounded-md shadow-lg transition-transform active:scale-95"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
