import React, { useState, useRef, useEffect } from 'react';
import { Room, ChatMessage, PeerUser } from '../types/chat';
import { Send, User, MessageSquare, Shield, File, X, Info, Users, ArrowLeft } from 'lucide-react';
import { sendFile } from '../utils/fileTransfer';
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
  const [showSidebar, setShowSidebar] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedUser]);

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

  const currentMessages = messages.filter(m => {
    if (selectedUser) {
      return (m.isPrivate && ((m.senderId === peerId && m.receiverId === selectedUser.peerId) || (m.senderId === selectedUser.peerId && m.receiverId === peerId)));
    }
    return !m.isPrivate;
  });

  return (
    <div className="flex h-screen bg-surface font-body overflow-hidden">
      {/* Sidebar - Tonal Layering */}
      <aside className={`transition-all duration-300 ease-in-out bg-surface-container-low border-r border-transparent flex flex-col ${showSidebar ? 'w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-8 pb-6">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-bold text-sm mb-10"
          >
            <ArrowLeft size={16} /> Exit Room
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
              <MessageSquare size={20} className="text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold truncate text-on-surface">{room.name}</h2>
          </div>
          <p className="text-xs font-mono text-on-surface-variant opacity-50 px-1">ID: {room.id.slice(0, 12)}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">Participants</h3>
            <span className="px-2 py-0.5 bg-surface-container-high rounded text-[10px] font-bold">{users.length + 1}</span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedUser(null)}
              className={`w-full flex items-center gap-4 p-4 rounded-md transition-all ${!selectedUser ? 'bg-surface-container-lowest shadow-sm' : 'hover:bg-surface-container-high'}`}
            >
              <div className={`w-2 h-2 rounded-full ${!selectedUser ? 'bg-secondary' : 'bg-on-surface-variant/30'}`}></div>
              <span className={`font-bold text-sm ${!selectedUser ? 'text-on-surface' : 'text-on-surface-variant'}`}>Global Forum</span>
            </button>

            {users.map(user => (
              <button
                key={user.peerId}
                onClick={() => setSelectedUser(user)}
                className={`w-full flex items-center gap-4 p-4 rounded-md transition-all ${selectedUser?.peerId === user.peerId ? 'bg-surface-container-lowest shadow-sm' : 'hover:bg-surface-container-high'}`}
              >
                <div className="relative">
                  <div className={`w-2 h-2 rounded-full ${selectedUser?.peerId === user.peerId ? 'bg-primary' : 'bg-secondary/40'}`}></div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm truncate ${selectedUser?.peerId === user.peerId ? 'text-on-surface' : 'text-on-surface-variant'}`}>{user.name}</span>
                    {user.peerId === room.hostPeerId && <Shield size={12} className="text-secondary" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-surface-container-low">
          <div className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-md shadow-sm border border-primary/5">
            <div className="w-10 h-10 btn-gradient rounded-full flex items-center justify-center font-bold text-white text-lg">
              {userName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">{userName}</p>
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Connected</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area - Airy and Editorial */}
      <main className="flex-1 flex flex-col relative bg-surface">
        <header className="h-20 border-b border-surface-container-low px-8 flex justify-between items-center glass-morphism sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-surface-container-low rounded-md transition-colors lg:hidden"
            >
              <Users size={20} className="text-on-surface-variant" />
            </button>
            <div>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-0.5">Focus</span>
              <h2 className="font-display font-bold text-xl text-primary">
                {selectedUser ? `Dialogue with ${selectedUser.name}` : 'Global Conversation' }
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
                {[...users.slice(0, 3)].map((u, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                        {u.name[0].toUpperCase()}
                    </div>
                ))}
                {users.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-surface flex items-center justify-center text-[10px] font-bold text-primary">
                        +{users.length - 3}
                    </div>
                )}
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-10 space-y-12">
          {currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
              <Info size={48} className="mb-4 text-on-surface-variant" />
              <p className="text-xl font-display font-bold text-on-surface-variant">Clean Ledger</p>
              <p className="text-sm">Initiate the first entry in this decentralized stream.</p>
            </div>
          ) : (
            currentMessages.map((msg, index) => {
                const isMe = msg.senderId === peerId;
                const prevMsg = currentMessages[index - 1];
                const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId;

                return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        {showHeader && (
                            <div className="flex items-center gap-3 mb-3 px-1">
                                <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{msg.senderName}</span>
                                <span className="text-[10px] font-bold text-on-surface-variant/40">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        )}
                        <div className={`px-6 py-4 rounded-lg shadow-sm leading-relaxed ${
                          isMe
                            ? 'bg-primary text-white font-medium'
                            : 'bg-surface-container-lowest text-on-surface border border-primary/5'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                )
            })
          )}
        </div>

        {uploadProgress !== null && (
          <div className="mx-8 mb-4 p-4 bg-surface-container-lowest border border-primary/20 rounded-lg animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                    <File size={20} className="text-primary" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 text-on-surface-variant">
                        <span>Streaming File Data</span>
                        <span className="text-primary">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full btn-gradient transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                </div>
            </div>
          </div>
        )}

        <footer className="p-8 bg-surface sticky bottom-0 border-t border-surface-container-low">
          <form onSubmit={handleSend} className="relative flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-md transition-all active:scale-90"
              title="Share File"
            >
              <File size={22} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex-1 relative">
                <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedUser ? `Message ${selectedUser.name}...` : "Contribute to the stream..."}
                className="w-full bg-surface-container-high border-none rounded-md py-4 pl-6 pr-14 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/5 transition-all"
                />
                <button
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-primary text-white rounded-md hover:bg-primary-container disabled:opacity-20 transition-all shadow-md active:scale-90"
                >
                <Send size={18} />
                </button>
            </div>
          </form>
        </footer>
      </main>
    </div>
  );
};
