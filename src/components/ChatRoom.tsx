import React, { useState, useRef, useEffect } from 'react';
import { Room, ChatMessage, PeerUser } from '../types/chat';
import { Send, User, Shield, File, Info, Users, ArrowLeft, Power, Copy, Check, Smile, Download, Terminal, Mic, ShieldAlert } from 'lucide-react';
import { sendFile } from '../utils/fileTransfer';
import { DataConnection } from 'peerjs';
import { VoiceMesh } from './VoiceMesh';
import { blacklistUser } from '../utils/gun';

interface ChatRoomProps {
  room: Room;
  peerId: string;
  userName: string;
  messages: ChatMessage[];
  users: PeerUser[];
  typingUsers: Set<string>;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  onSendMessage: (content: string, type?: 'text' | 'file', metadata?: any) => void;
  onSendPrivateMessage: (targetId: string, content: string, type?: 'text' | 'file', metadata?: any) => void;
  onSendReaction: (messageId: string, emoji: string) => void;
  onBroadcastTyping: () => void;
  onToggleVoice: (roomId: string) => void;
  onStopRoom: () => void;
  onLeave: () => void;
  connections: Map<string, DataConnection>;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  room,
  peerId,
  userName,
  messages,
  users,
  typingUsers,
  localStream,
  remoteStreams,
  onSendMessage,
  onSendPrivateMessage,
  onSendReaction,
  onBroadcastTyping,
  onToggleVoice,
  onStopRoom,
  onLeave,
  connections
}) => {
  const [input, setInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<PeerUser | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [copied, setCopied] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏'];
  const isHost = room.hostPeerId === peerId;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedUser, typingUsers]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    onBroadcastTyping();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    const localUrl = URL.createObjectURL(file);
    const metadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
    };

    if (selectedUser) {
        const conn = connections.get(selectedUser.peerId);
        if (conn) {
            await sendFile(conn, file, (p) => setUploadProgress(p));
            onSendPrivateMessage(selectedUser.peerId, localUrl, 'file', metadata);
        }
    } else {
        let count = 0;
        for (const conn of connections.values()) {
            await sendFile(conn, file);
            count++;
            setUploadProgress((count / connections.size) * 100);
        }
        onSendMessage(localUrl, 'file', metadata);
    }
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBlacklist = (targetId: string) => {
      if (window.confirm('REVOKE_ACCESS_AND_BLACKLIST_PEER?')) {
          blacklistUser(room.id, targetId);
          // In a real app, the host would also send a "kick" message or just disconnect
          const conn = connections.get(targetId);
          if (conn) conn.close();
      }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.hostPeerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentMessages = messages.filter(m => {
    if (selectedUser) {
      return (m.isPrivate && ((m.senderId === peerId && m.receiverId === selectedUser.peerId) || (m.senderId === selectedUser.peerId && m.receiverId === peerId)));
    }
    return !m.isPrivate;
  });

  const renderMessageContent = (msg: ChatMessage) => {
      if (msg.type === 'file' && msg.fileMetadata) {
          const isImage = msg.fileMetadata.type.startsWith('image/');
          const isVideo = msg.fileMetadata.type.startsWith('video/');

          return (
              <div className="space-y-3">
                  {isImage && (
                      <img src={msg.content} alt={msg.fileMetadata.name} className="max-w-full rounded border border-primary/20" />
                  )}
                  {isVideo && (
                      <video src={msg.content} controls className="max-w-full rounded border border-primary/20" />
                  )}
                  <div className="flex items-center gap-3 p-3 bg-black border border-primary/10 rounded">
                      <File size={16} className="text-primary-dark shrink-0" />
                      <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate text-primary uppercase">{msg.fileMetadata.name}</p>
                          <p className="text-[9px] font-bold text-primary-dark opacity-50 uppercase tracking-tighter">
                              {(msg.fileMetadata.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                      </div>
                      <a
                        href={msg.content}
                        download={msg.fileMetadata.name}
                        className="p-2 hover:bg-primary/10 rounded text-primary"
                      >
                        <Download size={16} />
                      </a>
                  </div>
              </div>
          );
      }
      return <p className="whitespace-pre-wrap break-all">{msg.content}</p>;
  };

  return (
    <div className="flex h-screen bg-surface font-mono overflow-hidden chat-container text-primary">
      {/* SIDEBAR */}
      <aside className={`transition-all duration-300 ease-in-out bg-black border-r border-primary/20 flex flex-col ${showSidebar ? 'w-full md:w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 md:p-8">
          <button
            onClick={onLeave}
            className="flex items-center gap-2 text-primary-dark hover:text-primary transition-colors font-bold text-[10px] mb-8 uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> [DISCONNECT]
          </button>

          <div className="flex items-center gap-3 mb-2">
            <Terminal size={24} className="text-primary" />
            <h2 className="text-xl font-bold truncate terminal-glow uppercase">{room.name}</h2>
          </div>

          <div className="flex items-center gap-2 mt-4 bg-zinc-900/50 p-2 border border-primary/5">
            <span className="text-[9px] font-bold text-primary-dark uppercase">Node:</span>
            <p className="text-[9px] font-mono text-primary truncate flex-1">{room.hostPeerId}</p>
            <button onClick={copyCode} className="p-1 hover:text-white transition-colors">
                {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide">
          <h3 className="text-[9px] font-bold text-primary-dark uppercase tracking-[0.3em] mb-6 px-2">[NODES_IN_MESH]</h3>

          <div className="space-y-1">
            <button
              onClick={() => { setSelectedUser(null); if (window.innerWidth < 768) setShowSidebar(false); }}
              className={`w-full flex items-center gap-3 p-4 transition-all border ${!selectedUser ? 'border-primary/40 bg-primary/5 text-primary' : 'border-transparent text-primary-dark hover:bg-zinc-900'}`}
            >
              <div className={`w-1 h-1 rounded-full ${!selectedUser ? 'bg-primary shadow-[0_0_8px_#00FF41]' : 'bg-primary-dark/20'}`}></div>
              <span className="font-bold text-[11px] uppercase tracking-wider">Public_Stream</span>
            </button>

            {users.map(user => (
              <div key={user.peerId} className="group flex items-center">
                <button
                    onClick={() => { setSelectedUser(user); if (window.innerWidth < 768) setShowSidebar(false); }}
                    className={`flex-1 flex items-center gap-3 p-4 transition-all border ${selectedUser?.peerId === user.peerId ? 'border-primary/40 bg-primary/5 text-primary' : 'border-transparent text-primary-dark hover:bg-zinc-900'}`}
                >
                    <div className={`w-1 h-1 rounded-full ${selectedUser?.peerId === user.peerId ? 'bg-primary shadow-[0_0_8px_#00FF41]' : 'bg-primary-dark/40'}`}></div>
                    <span className="font-bold text-[11px] uppercase tracking-wider truncate">{user.name}</span>
                    {user.peerId === room.hostPeerId && <Shield size={10} className="text-primary-dark" />}
                </button>
                {isHost && user.peerId !== peerId && (
                    <button
                        onClick={() => handleBlacklist(user.peerId)}
                        className="p-4 text-red-900 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        title="BLACKLIST_NODE"
                    >
                        <ShieldAlert size={14} />
                    </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-primary/10">
          {isHost && (
            <button
                onClick={onStopRoom}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-950/30 text-red-500 border border-red-900/50 font-bold text-[10px] hover:bg-red-500 hover:text-black transition-all mb-6 uppercase tracking-tighter"
            >
                <Power size={14} /> Terminate_Room
            </button>
          )}
          <div className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-primary/10">
            <div className="w-8 h-8 bg-primary text-black flex items-center justify-center font-bold text-xs">
              {userName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate uppercase">{userName}</p>
              <p className="text-[8px] font-bold text-primary-dark uppercase tracking-widest">Self_Node</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`flex-1 flex flex-col relative bg-black ${showSidebar && window.innerWidth < 768 ? 'hidden' : 'flex'}`}>
        <header className="h-20 border-b border-primary/20 px-6 md:px-8 flex justify-between items-center bg-black/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 text-primary hover:bg-primary/10 border border-primary/20 md:hidden"
            >
              <Users size={18} />
            </button>
            <div>
              <span className="text-[9px] font-bold text-primary-dark uppercase tracking-[0.2em] block mb-0.5">Active_Stream</span>
              <h2 className="font-bold text-sm md:text-base text-primary uppercase tracking-tight">
                {selectedUser ? `>> Secure_Link: ${selectedUser.name}` : '>> Public_Mesh' }
                {selectedUser && <span className="ml-2 text-[10px] text-primary-dark animate-pulse">[E2EE_ACTIVE]</span>}
              </h2>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-8 py-8 space-y-10 scrollbar-hide">
          {currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
              <Info size={32} className="mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">[IDLE_STREAM: AWAITING_INPUT]</p>
            </div>
          ) : (
            currentMessages.map((msg, index) => {
                const isMe = msg.senderId === peerId;
                const prevMsg = currentMessages[index - 1];
                const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId;

                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        {showHeader && (
                            <div className="flex items-center gap-3 mb-3 px-1">
                                <span className="text-[10px] font-bold text-primary-dark uppercase tracking-tighter">{msg.senderName}</span>
                                <span className="text-[8px] font-bold text-primary-dark/40">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                        )}
                        <div className="relative group/msg">
                            <div className={`px-5 py-3 border leading-relaxed text-sm ${
                            isMe
                                ? 'bg-primary/5 border-primary/40 text-primary'
                                : 'bg-zinc-900 border-primary/10 text-primary-dark'
                            }`}>
                            {renderMessageContent(msg)}
                            </div>

                            <button
                                onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                                className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-8' : '-right-8'} p-1 opacity-0 group-hover/msg:opacity-100 transition-opacity text-primary-dark hover:text-primary`}
                            >
                                <Smile size={14} />
                            </button>

                            {showEmojiPicker === msg.id && (
                                <div className="absolute z-20 top-[-45px] left-0 bg-black border border-primary/30 p-1 flex gap-1 animate-in slide-in-from-bottom-2 duration-200">
                                    {emojis.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => { onSendReaction(msg.id, emoji); setShowEmojiPicker(null); }}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-primary/20 text-sm"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                    <button
                                        key={emoji}
                                        onClick={() => onSendReaction(msg.id, emoji)}
                                        className={`flex items-center gap-1.5 px-2 py-0.5 text-[9px] border ${
                                            userIds.includes(peerId)
                                                ? 'bg-primary border-primary text-black font-bold'
                                                : 'bg-black border-primary/20 text-primary-dark'
                                        }`}
                                    >
                                        <span>{emoji}</span>
                                        <span>{userIds.length}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                      </div>
                    </div>
                )
            })
          )}
          {typingUsers.size > 0 && Array.from(typingUsers).filter(u => u !== userName).length > 0 && (
            <div className="flex items-center gap-2 text-[9px] font-bold text-primary-dark italic animate-pulse">
                {'>'} {Array.from(typingUsers).filter(u => u !== userName).join(', ')} IS_TRANSMITTING...
            </div>
          )}
        </div>

        {uploadProgress !== null && (
          <div className="mx-6 md:mx-8 mb-4 p-4 bg-black border border-primary/30 relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
                <div className="flex-1">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest mb-2">
                        <span>DATA_TRANSFER_IN_PROGRESS</span>
                        <span className="terminal-glow">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="h-1 bg-zinc-900 overflow-hidden border border-primary/10">
                        <div className="h-full bg-primary shadow-[0_0_10px_#00FF41] transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                </div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full bg-primary/5 animate-pulse pointer-events-none"></div>
          </div>
        )}

        <VoiceMesh localStream={localStream} remoteStreams={remoteStreams} onToggleVoice={() => onToggleVoice(room.id)} users={users} />

        <footer className="p-6 md:p-8 bg-black border-t border-primary/20">
          <form onSubmit={handleSend} className="relative flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-primary-dark hover:text-primary border border-primary/10 hover:border-primary/40 transition-all"
              title="ATTACH_FILE"
            >
              <File size={20} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            <div className="flex-1 relative">
                <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder={selectedUser ? `MESSAGE_${selectedUser.name.toUpperCase()}...` : "BROADCAST_TO_MESH..."}
                className="w-full bg-black border border-primary/20 p-4 text-primary text-sm focus:border-primary focus:outline-none transition-all placeholder:text-primary/10"
                />
                <button
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 disabled:opacity-10 transition-all"
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
