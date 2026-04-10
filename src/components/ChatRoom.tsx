import React, { useState, useRef, useEffect } from 'react';
import { Room, ChatMessage, PeerUser } from '../types/chat';
import { Send, User, MessageSquare, Shield, File, X, Info, Users, ArrowLeft, Power, Copy, Check, Smile, Download } from 'lucide-react';
import { sendFile } from '../utils/fileTransfer';
import { DataConnection } from 'peerjs';

interface ChatRoomProps {
  room: Room;
  peerId: string;
  userName: string;
  messages: ChatMessage[];
  users: PeerUser[];
  typingUsers: Set<string>;
  onSendMessage: (content: string, type?: 'text' | 'file', metadata?: any) => void;
  onSendPrivateMessage: (targetId: string, content: string, type?: 'text' | 'file', metadata?: any) => void;
  onSendReaction: (messageId: string, emoji: string) => void;
  onBroadcastTyping: () => void;
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
  onSendMessage,
  onSendPrivateMessage,
  onSendReaction,
  onBroadcastTyping,
  onStopRoom,
  onLeave,
  connections
}) => {
  const [input, setInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<PeerUser | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
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

  const typingDisplay = Array.from(typingUsers).filter(u => u !== userName);

  const renderMessageContent = (msg: ChatMessage) => {
      if (msg.type === 'file' && msg.fileMetadata) {
          const isImage = msg.fileMetadata.type.startsWith('image/');
          const isVideo = msg.fileMetadata.type.startsWith('video/');

          return (
              <div className="space-y-3">
                  {isImage && (
                      <img src={msg.content} alt={msg.fileMetadata.name} className="max-w-full rounded-lg shadow-sm border border-primary/10" />
                  )}
                  {isVideo && (
                      <video src={msg.content} controls className="max-w-full rounded-lg shadow-sm border border-primary/10" />
                  )}
                  <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-md border border-primary/5">
                      <File size={20} className="text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate text-on-surface">{msg.fileMetadata.name}</p>
                          <p className="text-[10px] font-bold text-on-surface-variant opacity-50 uppercase tracking-widest">
                              {(msg.fileMetadata.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                      </div>
                      <a
                        href={msg.content}
                        download={msg.fileMetadata.name}
                        className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-primary"
                      >
                        <Download size={18} />
                      </a>
                  </div>
              </div>
          );
      }
      return <p className="whitespace-pre-wrap">{msg.content}</p>;
  };

  return (
    <div className="flex h-screen bg-surface font-body overflow-hidden">
      <aside className={`transition-all duration-300 ease-in-out bg-surface-container-low border-r border-transparent flex flex-col ${showSidebar ? 'w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-8 pb-6">
          <button
            onClick={onLeave}
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
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs font-mono text-on-surface-variant opacity-50 truncate flex-1">Code: {room.hostPeerId}</p>
            <button onClick={copyCode} className="p-1 hover:bg-surface-container-high rounded transition-colors text-primary">
                {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
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

        <div className="p-6 bg-surface-container-low space-y-4">
          {isHost && (
            <button
                onClick={onStopRoom}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-md font-bold text-sm hover:bg-red-100 transition-colors mb-2"
            >
                <Power size={16} /> Stop Room
            </button>
          )}
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

      <main className="flex-1 flex flex-col relative bg-surface">
        <header className="h-20 border-b border-surface-container-low px-8 flex justify-between items-center glass-morphism sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-surface-container-low rounded-md transition-colors"
            >
              <Users size={20} className="text-on-surface-variant" />
            </button>
            <div>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-0.5">Stream</span>
              <h2 className="font-display font-bold text-xl text-primary">
                {selectedUser ? `Dialogue with ${selectedUser.name}` : 'Global Conversation' }
              </h2>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-10 space-y-12">
          {currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
              <Info size={48} className="mb-4 text-on-surface-variant" />
              <p className="text-xl font-display font-bold text-on-surface-variant">Clean Slate</p>
              <p className="text-sm">Start the conversation below.</p>
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
                        <div className="relative group/msg">
                            <div className={`px-6 py-4 rounded-lg shadow-sm leading-relaxed ${
                            isMe
                                ? 'bg-primary text-white font-medium'
                                : 'bg-surface-container-lowest text-on-surface border border-primary/5'
                            }`}>
                            {renderMessageContent(msg)}
                            </div>

                            <button
                                onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                                className={`absolute top-0 ${isMe ? '-left-8' : '-right-8'} p-1 bg-white rounded-full shadow-sm border border-primary/10 opacity-0 group-hover/msg:opacity-100 transition-opacity text-on-surface-variant hover:text-primary`}
                            >
                                <Smile size={14} />
                            </button>

                            {showEmojiPicker === msg.id && (
                                <div className={`absolute z-20 top-[-40px] ${isMe ? 'left-0' : 'right-0'} bg-white p-1 rounded-full shadow-xl border border-primary/10 flex gap-1 animate-in zoom-in-50 duration-200`}>
                                    {emojis.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => { onSendReaction(msg.id, emoji); setShowEmojiPicker(null); }}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-primary/5 rounded-full transition-colors"
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
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                                            userIds.includes(peerId)
                                                ? 'bg-primary/10 border-primary/20 text-primary font-bold'
                                                : 'bg-surface-container-lowest border-primary/5 text-on-surface-variant'
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
          {typingDisplay.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold text-primary animate-pulse italic">
                <Users size={12} />
                {typingDisplay.join(', ')} {typingDisplay.length === 1 ? 'is' : 'are'} typing...
            </div>
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
                        <span>Transferring Data</span>
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
                onChange={handleInputChange}
                placeholder={selectedUser ? `Message ${selectedUser.name}...` : "Contribute..."}
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
