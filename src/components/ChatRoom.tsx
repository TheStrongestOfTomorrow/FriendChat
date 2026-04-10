import React, { useState, useRef, useEffect } from 'react';
import { Room, ChatMessage, PeerUser } from '../types/chat';
import { Send, User, MessageSquare, Shield, File, X } from 'lucide-react';
import { sendFile, FileReceiver } from '../utils/fileTransfer';
import { DataConnection } from 'peerjs';

interface ChatRoomProps {
  room: Room;
  peerId: string;
  userName: string;
  messages: ChatMessage[];
  users: PeerUser[];
  onSendMessage: (content: string) => void;
  onSendPrivateMessage: (targetId: string, content: string) => void;
  connections: Map<string, DataConnection>;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  room,
  peerId,
  userName,
  messages,
  users,
  onSendMessage,
  onSendPrivateMessage,
  connections
}) => {
  const [input, setInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<PeerUser | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (selectedUser) {
      onSendPrivateMessage(selectedUser.peerId, input);
    } else {
      onSendMessage(input);
    }
    setInput('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (selectedUser) {
        const conn = connections.get(selectedUser.peerId);
        if (conn) {
            setUploadProgress(0);
            await sendFile(conn, file, (p) => setUploadProgress(p));
            setUploadProgress(null);
            onSendPrivateMessage(selectedUser.peerId, `Sent file: ${file.name}`);
        }
    } else {
        // Broadcast file to everyone
        setUploadProgress(0);
        let count = 0;
        for (const conn of connections.values()) {
            await sendFile(conn, file);
            count++;
            setUploadProgress((count / connections.size) * 100);
        }
        setUploadProgress(null);
        onSendMessage(`Shared file: ${file.name}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-500" />
            {room.name}
          </h2>
          <p className="text-xs text-gray-500 mt-1">Host: {room.hostPeerId.slice(0, 8)}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Users</h3>
          <div className="space-y-2">
            <div
              onClick={() => setSelectedUser(null)}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${!selectedUser ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-400'}`}
            >
              <Shield size={18} />
              <span className="font-medium">Global Chat</span>
            </div>
            {users.map(user => (
              <div
                key={user.peerId}
                onClick={() => setSelectedUser(user)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${selectedUser?.peerId === user.peerId ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-400'}`}
              >
                <User size={18} />
                <span className="font-medium truncate">{user.name}</span>
                {user.peerId === room.hostPeerId && <Shield size={14} className="text-yellow-500" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">
              {userName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-gray-500">You</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
          <div>
            <span className="text-gray-400">Chatting in </span>
            <span className="font-bold">{selectedUser ? `DM with ${selectedUser.name}` : 'Global' }</span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.filter(m => {
            if (selectedUser) {
              return (m.isPrivate && ((m.senderId === peerId && m.receiverId === selectedUser.peerId) || (m.senderId === selectedUser.peerId && m.receiverId === peerId)));
            }
            return !m.isPrivate;
          }).map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === peerId ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${msg.senderId === peerId ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-xs text-gray-500">{msg.senderName}</span>
                  <span className="text-[10px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`px-4 py-2 rounded-2xl ${
                  msg.senderId === peerId
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-gray-800 text-gray-100 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {uploadProgress !== null && (
          <div className="absolute bottom-24 left-4 right-4 bg-gray-800 border border-blue-500/50 p-3 rounded-lg flex items-center gap-3">
            <File className="text-blue-500" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Sending file...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="p-4 bg-gray-900 border-t border-gray-800">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            >
              <File size={20} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedUser ? `Message ${selectedUser.name}...` : "Type a message..."}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
