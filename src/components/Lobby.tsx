import React, { useState, useEffect } from 'react';
import { Room } from '../types/chat';
import { subscribeToRooms, announceRoom } from '../utils/gun';
import { nanoid } from 'nanoid';
import { RefreshCw, Lock, Plus, Search } from 'lucide-react';
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
      passwordHash: newRoomPassword, // Simple for demo, should be hashed
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">FriendChat Lobby</h1>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition text-white"
          >
            <Plus size={20} /> Create Room
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search rooms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateRoom} className="bg-gray-900 border border-gray-700 p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Room</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Room Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                  placeholder="Cool hangout spot"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password (Optional)</label>
                <input
                  type="password"
                  value={newRoomPassword}
                  onChange={(e) => setNewRoomPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                  placeholder="Leave empty for public room"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No rooms found. Be the first to create one!
          </div>
        ) : (
          filteredRooms.map(room => (
            <div
              key={room.id}
              onClick={() => onJoinRoom(room)}
              className="bg-gray-800 border border-gray-700 p-5 rounded-xl hover:border-blue-500 transition cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold group-hover:text-blue-400">{room.name}</h3>
                {room.isPrivate && <Lock size={16} className="text-yellow-500" />}
              </div>
              <p className="text-sm text-gray-400">Host ID: {room.hostPeerId.slice(0, 8)}...</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <span>Created {new Date(room.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
