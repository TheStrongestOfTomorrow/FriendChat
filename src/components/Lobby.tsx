import React, { useState, useEffect } from 'react';
import { Room } from '../types/chat';
import { subscribeToRooms, announceRoom } from '../utils/gun';
import { nanoid } from 'nanoid';
import { RefreshCw, LucideLock, Plus, Search, Globe } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LobbyProps {
  onJoinRoom: (room: Room) => void;
  peerId: string;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinRoom, peerId }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');

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
            <p className="text-on-surface-variant font-medium">Decentralized P2P Conversations</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button
              onClick={() => window.location.reload()}
              className="p-3 bg-surface-container-high rounded-md hover:bg-surface-container-low transition-colors shadow-sm"
              title="Refresh Rooms"
            >
              <RefreshCw size={22} className="text-secondary" />
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 btn-gradient rounded-md text-white font-bold shadow-lg transition-transform active:scale-95"
            >
              <Plus size={20} /> New Room
            </button>
          </div>
        </header>

        <section className="mb-12">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary" size={20} />
            <input
              type="text"
              placeholder="Discover active rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-high border-none rounded-lg py-5 pl-14 pr-6 text-on-surface text-lg focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
            />
          </div>
        </section>

        {isCreating && (
          <div className="fixed inset-0 glass-morphism flex items-center justify-center p-4 z-50">
            <form onSubmit={handleCreateRoom} className="bg-surface-container-lowest p-10 rounded-lg w-full max-w-lg shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-200">
              <h2 className="font-display text-3xl font-bold mb-8 text-primary">Establish New Space</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Space Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full bg-surface-container-low rounded-md px-5 py-4 text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="e.g. Editorial Lounge"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Access Key (Optional)</label>
                  <input
                    type="password"
                    value={newRoomPassword}
                    onChange={(e) => setNewRoomPassword(e.target.value)}
                    className="w-full bg-surface-container-low rounded-md px-5 py-4 text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Leave blank for open access"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-10">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-6 py-4 bg-surface-container-high hover:bg-surface-container-low text-on-surface font-bold rounded-md transition-colors"
                >
                  Discard
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRooms.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-6">
                <Globe size={40} className="text-secondary opacity-30" />
              </div>
              <p className="text-2xl font-display font-bold text-on-surface-variant mb-2">The Ledger is Silent</p>
              <p className="text-on-surface-variant opacity-70">Be the first to announce a room to the network.</p>
            </div>
          ) : (
            filteredRooms.map(room => (
              <div
                key={room.id}
                onClick={() => onJoinRoom(room)}
                className="bg-surface-container-lowest p-8 rounded-lg hover:bg-white transition-all cursor-pointer group shadow-sm hover:shadow-xl border border-transparent hover:border-primary/10"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-primary/5 group-hover:bg-primary/10 rounded-md flex items-center justify-center transition-colors">
                    <Globe size={24} className="text-primary" />
                  </div>
                  {room.isPrivate && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary/10 text-secondary rounded-full">
                      <LucideLock size={14} className="font-bold" />
                      <span className="text-xs font-bold uppercase tracking-widest">Secured</span>
                    </div>
                  )}
                </div>
                <h3 className="font-display text-2xl font-bold text-on-surface mb-2 group-hover:text-primary transition-colors truncate">
                  {room.name}
                </h3>
                <p className="text-on-surface-variant font-medium text-sm mb-6">
                  Hash: <span className="font-mono text-xs opacity-60">{room.hostPeerId.slice(0, 16)}...</span>
                </p>
                <div className="pt-6 border-t border-surface-container-high flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {new Date(room.createdAt).toLocaleDateString()}
                  </span>
                  <div className="text-primary font-bold group-hover:translate-x-1 transition-transform">
                    Enter &rarr;
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
