import React, { useState, useRef, useEffect } from 'react';
import { Room, ChatMessage, PeerUser, PresenceStatus, WallMessage } from '../types/chat';
import { Send, User, Shield, File, Info, Users, ArrowLeft, Power, Copy, Check, Smile, Download, Terminal, Mic, ShieldAlert, Paperclip, MoreVertical, Monitor, Video, Phone, Radio, Activity, SendHorizontal, Share2, Save, Crown, Image as ImageIcon } from 'lucide-react';
import { sendFile } from '../utils/fileTransfer';
import { DataConnection } from 'peerjs';
import { VoiceMesh } from './VoiceMesh';
import { blacklistUser, postToWall, subscribeToWall, saveSpaceBlueprint } from '../utils/gun';
import { ChatTabs } from './ChatTabs';
import { ChatBubble } from './ChatBubble';
import { VoiceRecorder } from './VoiceRecorder';

interface ChatRoomProps {
  room: Room;
  peerId: string;
  userName: string;
  messages: ChatMessage[];
  users: PeerUser[];
  typingUsers: Set<string>;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  myStatus: PresenceStatus;
  isScreenSharing: boolean;
  managerId: string;
  promotionMessage: string | null;
  onClearPromotion: () => void;
  onSendMessage: (content: string, type?: any, metadata?: any) => void;
  onSendPrivateMessage: (targetId: string, content: string, type?: any, metadata?: any) => void;
  onSendReaction: (messageId: string, emoji: string) => void;
  onBroadcastTyping: () => void;
  onToggleVoice: (roomId: string) => void;
  onToggleScreenShare: () => void;
  onUpdateStatus: (roomId: string, status: PresenceStatus) => void;
  onSendPing: (targetId: string) => void;
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
  myStatus,
  isScreenSharing,
  managerId,
  promotionMessage,
  onClearPromotion,
  onSendMessage,
  onSendPrivateMessage,
  onSendReaction,
  onBroadcastTyping,
  onUpdateStatus,
  onSendPing,
  onToggleVoice,
  onToggleScreenShare,
  onStopRoom,
  onLeave,
  connections
}) => {
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PeerUser | null>(null);
  const [activeTab, setActiveTab] = useState<'CHATS' | 'WALL' | 'CALL'>('CHATS');
  const [wallPosts, setWallPosts] = useState<WallMessage[]>([]);
  const [wallInput, setWallInput] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallFileInputRef = useRef<HTMLInputElement>(null);

  const currentMessages = messages.filter(m => {
      if (selectedUser) {
          return m.isPrivate && (
              (m.senderId === peerId && m.receiverId === selectedUser.peerId) ||
              (m.senderId === selectedUser.peerId && m.receiverId === peerId)
          );
      }
      return !m.isPrivate;
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages, typingUsers]);

  useEffect(() => {
    const unsub = subscribeToWall(room.id, (posts) => {
        setWallPosts(posts);
    });
    return () => unsub();
  }, [room.id]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (selectedUser) {
        onSendPrivateMessage(selectedUser.peerId, input);
    } else {
        onSendMessage(input);
    }
    setInput('');
    setShowEmojiPicker(false);
  };

  const handleVoiceNote = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      if (selectedUser) {
          onSendPrivateMessage(selectedUser.peerId, url, 'voice-note');
      } else {
          onSendMessage(url, 'voice-note');
      }
  };

  const handleWallPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallInput.trim()) return;
    postToWall(room.id, {
        id: Math.random().toString(36).substr(2, 9),
        senderName: userName,
        content: wallInput,
        timestamp: Date.now(),
        type: 'text'
    });
    setWallInput('');
  };

  const handleWallImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              postToWall(room.id, {
                  id: Math.random().toString(36).substr(2, 9),
                  senderName: userName,
                  content: ev.target?.result as string,
                  timestamp: Date.now(),
                  type: 'image'
              });
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-whatsapp-bg">
      <header className="bg-whatsapp-darkGreen text-white px-4 py-3 flex items-center gap-3 shadow-md shrink-0 z-20">
        <button onClick={onLeave} className="p-2 hover:bg-white/10 rounded-full"><ArrowLeft size={40}/></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-whatsapp-green rounded-full flex items-center justify-center text-white font-black text-2xl shadow-inner border-2 border-white/20">
              {room.name[0].toUpperCase()}
            </div>
            <div className="truncate">
                <h2 className="text-3xl font-black truncate uppercase tracking-tight">{room.name}</h2>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-2xl font-black uppercase tracking-widest opacity-90">Online Group</span>
                </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('invite', room.hostPeerId);
              navigator.clipboard.writeText(url.toString());
              alert('Invite Link Copied!');
          }} className="p-3 hover:bg-white/10 rounded-full transition-colors"><Share2 size={36}/></button>
          <button onClick={() => onToggleVoice(room.id)} className={`p-3 rounded-full transition-all ${localStream ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/10'}`}><Phone size={36}/></button>
          <div className="relative">
              <button onClick={() => setShowStatusMenu(!showStatusMenu)} className="p-3 hover:bg-white/10 rounded-full"><MoreVertical size={36}/></button>
              {showStatusMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl py-2 w-64 text-black z-50 animate-in fade-in zoom-in duration-200 border border-gray-100">
                      <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-xl font-black uppercase tracking-widest text-gray-900">Room Code</p>
                          <p className="text-xl font-mono truncate bg-gray-50 p-2 rounded mt-1">{room.hostPeerId}</p>
                      </div>
                      <button onClick={() => { saveSpaceBlueprint({ id: room.id, name: room.name, originalHostId: room.originalHostId, inviteCode: room.hostPeerId, createdAt: Date.now() }); alert("Group Saved!"); }} className="w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors font-black uppercase tracking-widest text-2xl">
                          <Save size={32}/> Save Group
                      </button>
                      {(room.hostPeerId === peerId || managerId === peerId) && (
                          <button onClick={onStopRoom} className="w-full px-4 py-4 text-left flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors font-black uppercase tracking-widest text-2xl">
                              <Power size={32}/> Close Room
                          </button>
                      )}
                      <button onClick={onLeave} className="w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors font-black uppercase tracking-widest text-2xl">
                          <ArrowLeft size={32}/> Exit Chat
                      </button>
                  </div>
              )}
          </div>
        </div>
      </header>

      <ChatTabs active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 flex overflow-hidden relative">
        {activeTab === 'CHATS' && (
            <div className="flex-1 flex overflow-hidden">
                <aside className="w-[380px] hidden md:flex flex-col bg-white border-r border-gray-100 shadow-xl z-10">
                    <div className="p-6 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-3xl font-black uppercase tracking-[0.2em] text-whatsapp-darkGreen flex items-center gap-2">
                            <Users size={32}/> Friends ({users.length})
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <button
                            onClick={() => setSelectedUser(null)}
                            className={`w-full p-5 flex items-center gap-4 transition-all ${!selectedUser ? 'bg-whatsapp-green/10 border-l-8 border-whatsapp-green shadow-inner' : 'hover:bg-gray-50 border-l-8 border-transparent'}`}
                        >
                            <div className="w-16 h-16 bg-whatsapp-green rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                                <Users size={36} />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-3xl uppercase tracking-tight">Group Chat</p>
                                <p className="text-2xl font-black text-whatsapp-darkGreen uppercase tracking-widest">Everyone</p>
                            </div>
                        </button>

                        {users.filter(u => u.peerId !== peerId).map(u => (
                            <button
                                key={u.peerId}
                                onClick={() => setSelectedUser(u)}
                                className={`w-full p-5 flex items-center gap-4 transition-all ${selectedUser?.peerId === u.peerId ? 'bg-whatsapp-green/10 border-l-8 border-whatsapp-green shadow-inner' : 'hover:bg-gray-50 border-l-8 border-transparent'}`}
                            >
                                <div className="relative">
                                    <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-500 font-black text-2xl border-2 border-white shadow-md">
                                        {u.name[0].toUpperCase()}
                                    </div>
                                    <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${u.status === 'Online' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-black text-3xl uppercase tracking-tight">{u.name}</p>
                                    <p className="text-2xl font-black text-gray-900 uppercase tracking-widest opacity-100">{u.status}</p>
                                </div>
                                {(room.hostPeerId === peerId || managerId === peerId) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Blacklist ${u.name}?`)) {
                                                blacklistUser(room.id, u.peerId);
                                                alert("User blacklisted. They will be removed on refresh.");
                                            }
                                        }}
                                        className="p-3 text-red-500 hover:bg-red-50 rounded-full"
                                    >
                                        <ShieldAlert size={28} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSendPing(u.peerId);
                                        alert("Pinged " + u.name + "!");
                                    }}
                                    className="p-3 text-whatsapp-green hover:bg-whatsapp-green/5 rounded-full"
                                >
                                    <Activity size={28} />
                                </button>
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="flex-1 flex flex-col bg-[#e5ddd5] relative">
                    {selectedUser && (
                        <div className="bg-white/90 backdrop-blur-md px-6 py-4 border-b border-black/5 flex items-center gap-4 z-10 shadow-sm animate-in slide-in-from-top duration-300">
                            <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 text-whatsapp-darkGreen"><ArrowLeft size={40}/></button>
                            <span className="font-black text-black text-4xl">{selectedUser.name}</span>
                            <span className="ml-auto text-3xl text-whatsapp-darkGreen font-black bg-whatsapp-green/10 px-3 py-1 rounded-full border border-whatsapp-green/20 uppercase tracking-tighter">Private Chat</span>
                        </div>
                    )}

                    <div ref={scrollRef} className="chat-scroll p-4 flex flex-col flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
                        {currentMessages.map(m => (
                            <ChatBubble key={m.id} msg={m} isMe={m.senderId === peerId} onReaction={onSendReaction} />
                        ))}
                        {typingUsers.size > 0 && Array.from(typingUsers).filter(u => u !== userName).length > 0 && (
                            <div className="text-3xl italic text-black bg-white/80 px-4 py-2 rounded-full w-fit self-start mb-4 shadow-md border border-black/5 animate-pulse font-black">
                                {Array.from(typingUsers).filter(u => u !== userName).join(', ')} is typing...
                            </div>
                        )}
                    </div>

                    <footer className="bg-whatsapp-gray p-4 flex items-center gap-3 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-black/5 z-10 shadow-lg">
                        <button onClick={() => fileInputRef.current?.click()} className="text-black p-3 hover:bg-gray-200 rounded-full transition-colors"><Paperclip size={40} /></button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                setUploadProgress(0);
                                const url = URL.createObjectURL(file);
                                const meta = { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified };
                                if (selectedUser) {
                                    onSendPrivateMessage(selectedUser.peerId, url, 'file', meta);
                                    await sendFile(connections.get(selectedUser.peerId)!, file, p => setUploadProgress(p));
                                } else {
                                    onSendMessage(url, 'file', meta);
                                    let count = 0;
                                    for(const c of connections.values()) {
                                        await sendFile(c, file);
                                        count++;
                                        setUploadProgress((count / connections.size) * 100);
                                    }
                                }
                                setUploadProgress(null);
                            }
                        }}/>

                        <div className="relative">
                            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-3 text-gray-900 hover:text-whatsapp-green transition-colors">
                                <Smile size={40} />
                            </button>
                            {showEmojiPicker && (
                                <div className="absolute bottom-full left-0 mb-6 flex gap-3 bg-white p-4 rounded-3xl shadow-2xl border border-gray-100 z-[100] animate-in slide-in-from-bottom-2 duration-200">
                                    {["😀", "😂", "❤️", "👍", "🙏", "🔥", "✨", "🚀", "🎉", "💯"].map(emoji => (
                                        <button key={emoji} onClick={() => { setInput(prev => prev + emoji); setShowEmojiPicker(false); }} className="text-5xl hover:scale-125 transition-transform p-1">{emoji}</button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSend} className="flex-1">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => { setInput(e.target.value); onBroadcastTyping(); }}
                                placeholder="Type a message..."
                                className="w-full bg-white rounded-full px-8 py-4 text-3xl shadow-inner border-none focus:ring-4 focus:ring-whatsapp-green/20 font-black"
                            />
                        </form>
                        {input.trim() ? (
                            <button onClick={handleSend} className="bg-whatsapp-green text-white p-4 rounded-full shadow-2xl active:scale-95 transition-all"><Send size={40} /></button>
                        ) : (
                            <VoiceRecorder onSend={handleVoiceNote} />
                        )}
                    </footer>
                </main>
            </div>
        )}

        {activeTab === 'WALL' && (
            <div className="flex-1 flex flex-col bg-white animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                    <h3 className="font-black text-whatsapp-darkGreen text-center uppercase tracking-[0.2em] leading-none text-4xl">The Wall</h3>
                    <p className="text-3xl text-gray-900 text-center uppercase font-black mt-1">Class Board</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide bg-gray-50 shadow-inner">
                    {wallPosts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-100">
                            <Info size={64} className="mb-6 text-whatsapp-darkGreen" />
                            <p className="font-black uppercase tracking-widest text-3xl">Nothing here yet</p>
                        </div>
                    ) : wallPosts.map(post => (
                        <div key={post.id} className="bg-white p-6 rounded-3xl border-l-[12px] border-whatsapp-teal shadow-xl animate-in fade-in duration-500">
                            <div className="flex justify-between items-start mb-4">
                                <span className="font-black text-whatsapp-darkGreen text-4xl uppercase tracking-wider">{post.senderName}</span>
                                <span className="text-2xl text-gray-900 font-black">{new Date(post.timestamp).toLocaleString()}</span>
                            </div>
                            {post.type === 'image' ? (
                                <img src={post.content} className="rounded-2xl w-full border border-black/5 shadow-md" alt="Post" />
                            ) : (
                                <p className="text-black text-4xl whitespace-pre-wrap leading-relaxed font-black">{post.content}</p>
                            )}
                        </div>
                    ))}
                </div>
                <footer className="p-6 bg-gray-50 border-t border-gray-200 shrink-0 pb-[max(20px,env(safe-area-inset-bottom))] shadow-lg">
                    <div className="max-w-4xl mx-auto flex items-center gap-4">
                        <button onClick={() => wallFileInputRef.current?.click()} className="p-4 text-whatsapp-darkGreen hover:bg-whatsapp-green/10 rounded-full transition-colors">
                            <ImageIcon size={48} />
                        </button>
                        <input type="file" ref={wallFileInputRef} className="hidden" accept="image/*" onChange={handleWallImage} />
                        <form onSubmit={handleWallPost} className="flex-1 flex gap-4">
                            <input
                                type="text"
                                value={wallInput}
                                onChange={(e) => setWallInput(e.target.value)}
                                placeholder="Post to board..."
                                className="flex-1 bg-white border border-gray-200 rounded-2xl px-6 py-4 text-3xl shadow-inner focus:ring-4 focus:ring-whatsapp-green/10 font-black"
                            />
                            <button type="submit" className="bg-whatsapp-green text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-all"><SendHorizontal size={48}/></button>
                        </form>
                    </div>
                </footer>
            </div>
        )}

        {activeTab === 'CALL' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-whatsapp-darkGreen text-white text-center animate-in zoom-in duration-300">
                <div className="w-48 h-48 bg-whatsapp-green rounded-full flex items-center justify-center mb-10 animate-pulse shadow-[0_0_80px_rgba(37,211,102,0.4)] border-8 border-white/20">
                    <Radio size={100} />
                </div>
                <h3 className="text-8xl font-black mb-4 uppercase tracking-tighter italic">Voice Call</h3>
                <p className="text-4xl opacity-100 mb-12 max-w-sm leading-relaxed font-black">Everyone connects to everyone. Resilient calling.</p>
                <VoiceMesh localStream={localStream} remoteStreams={remoteStreams} onToggleVoice={() => onToggleVoice(room.id)} users={users} />
            </div>
        )}
      </div>

      {uploadProgress !== null && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-10 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] p-16 w-full max-w-md shadow-[0_0_100px_rgba(0,0,0,0.5)] text-center border-t-[16px] border-whatsapp-teal relative overflow-hidden">
                  <Activity size={64} className="mx-auto mb-8 text-whatsapp-darkGreen animate-bounce" />
                  <h4 className="font-black text-black mb-4 uppercase tracking-widest text-4xl italic">Sending Data</h4>
                  <p className="text-3xl text-gray-900 mb-10 font-black uppercase tracking-widest opacity-100 italic">Low-RAM Protocol Active</p>
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden mb-6 border border-gray-200 shadow-inner p-1">
                      <div className="h-full bg-whatsapp-green rounded-full transition-all duration-300 shadow-sm" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="text-8xl font-black text-whatsapp-darkGreen tracking-tighter">{`${Math.round(uploadProgress)}%`}</p>
                  <button onClick={() => window.location.reload()} className="mt-12 px-10 py-4 bg-red-50 text-red-500 rounded-full text-3xl font-black uppercase tracking-widest border-2 border-red-100 shadow-md active:scale-95 hover:bg-red-100 transition-all">Cancel Transfer</button>
                  <div className="absolute bottom-0 left-0 w-full h-2 bg-whatsapp-green/10 animate-pulse"></div>
              </div>
          </div>
      )}
    </div>
  );
};
