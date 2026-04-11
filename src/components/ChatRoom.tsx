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
  onToggleVoice,
  onToggleScreenShare,
  onUpdateStatus,
  onSendPing,
  onStopRoom,
  onLeave,
  connections
}) => {
  const [input, setInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<PeerUser | null>(null);
  const [activeTab, setActiveTab] = useState<'CHATS' | 'WALL' | 'CALL'>('CHATS');
  const [wallPosts, setWallPosts] = useState<WallMessage[]>([]);
  const [wallInput, setWallInput] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallFileInputRef = useRef<HTMLInputElement>(null);

  const isHost = room.hostPeerId === peerId || room.originalHostId === peerId;
  const isManager = managerId === peerId || room.hostPeerId === peerId;

  useEffect(() => {
    const unsub = subscribeToWall(room.id, setWallPosts);
    return () => unsub();
  }, [room.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedUser, activeTab, typingUsers]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (selectedUser) onSendPrivateMessage(selectedUser.peerId, input);
    else onSendMessage(input);
    setInput('');
  };

  const handleVoiceNote = async (blob: Blob) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          const base64 = reader.result as string;
          if (selectedUser) onSendPrivateMessage(selectedUser.peerId, base64, 'voice-note');
          else onSendMessage(base64, 'voice-note');
      };
      reader.readAsDataURL(blob);
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

  const handleWallImage = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
          postToWall(room.id, {
              id: Math.random().toString(36).substr(2, 9),
              senderName: userName,
              content: reader.result as string,
              timestamp: Date.now(),
              type: 'image'
          });
      };
      reader.readAsDataURL(file);
  };

  const handleSaveSpace = () => {
      saveSpaceBlueprint({
          id: room.id,
          name: room.name,
          inviteCode: room.hostPeerId,
          originalHostId: room.originalHostId,
          createdAt: room.createdAt
      });
      alert('Group saved to your list.');
  };

  const handleBlacklist = (targetId: string) => {
      if (window.confirm('REMOVE FRIEND FROM ROOM?')) {
          blacklistUser(room.id, targetId);
          const conn = connections.get(targetId);
          if (conn) conn.close();
      }
  };

  const copyInvite = () => {
      const url = `${window.location.origin}${window.location.pathname}?invite=${room.hostPeerId}`;
      navigator.clipboard.writeText(url);
      alert('Copied link for WhatsApp!');
  };

  const currentMessages = messages.filter(m => {
    if (selectedUser) {
      return (m.isPrivate && ((m.senderId === peerId && m.receiverId === selectedUser.peerId) || (m.senderId === selectedUser.peerId && m.receiverId === peerId)));
    }
    return !m.isPrivate;
  });

  return (
    <div className="main-container bg-whatsapp-bg font-sans overflow-hidden">
      {promotionMessage && (
          <div className="bg-whatsapp-blue text-white p-3 text-center text-xs font-black uppercase tracking-widest animate-in slide-in-from-top duration-300 relative z-[60] shadow-lg">
              {promotionMessage}
              <button onClick={onClearPromotion} className="ml-4 border border-white/30 px-2 py-0.5 rounded hover:bg-white/10 transition-colors">OK</button>
          </div>
      )}

      <header className="bg-whatsapp-darkGreen text-white p-4 shadow-md flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onLeave} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-whatsapp-darkGreen font-bold text-xl relative shadow-inner">
            {room.name[0]}
            {room.originalHostId === peerId && <Crown size={14} className="absolute -top-1 -right-1 text-yellow-400 fill-yellow-400 drop-shadow-md" />}
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight truncate max-w-[120px]">{room.name}</h2>
            <p className="text-[10px] opacity-70 font-bold uppercase tracking-tighter">Online Group</p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
            <button onClick={copyInvite} className="p-2 bg-whatsapp-teal rounded-full text-white shadow-sm hover:scale-110 active:scale-95 transition-all" title="Copy link">
                <Share2 size={20} />
            </button>
            <button onClick={() => onToggleVoice(room.id)} className={`p-2 rounded-full transition-all ${localStream ? 'bg-whatsapp-green text-white shadow-lg' : 'hover:bg-white/10 text-white'}`} title="Voice call">
                <Phone size={20} />
            </button>
            <div className="relative">
                <button onClick={() => setShowStatusMenu(!showStatusMenu)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <MoreVertical size={20} />
                </button>
                {showStatusMenu && (
                    <div className="absolute right-0 top-12 bg-white text-gray-800 shadow-2xl rounded-xl py-2 w-48 border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                        {(['Online', 'Busy', 'Away'] as PresenceStatus[]).map(s => (
                            <button
                                key={s}
                                onClick={() => { onUpdateStatus(room.id, s); setShowStatusMenu(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm flex items-center gap-2 font-medium"
                            >
                                <span className={`w-2 h-2 rounded-full ${s === 'Online' ? 'bg-whatsapp-green' : s === 'Busy' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                                {s}
                            </button>
                        ))}
                        <div className="border-t border-gray-100 my-1"></div>
                        <button onClick={handleSaveSpace} className="w-full text-left px-4 py-3 hover:bg-gray-100 text-xs text-whatsapp-teal font-black uppercase tracking-widest flex items-center gap-2">
                            <Save size={14}/> Save Group
                        </button>
                        <button onClick={copyInvite} className="w-full text-left px-4 py-3 hover:bg-gray-100 text-xs text-whatsapp-teal font-black uppercase tracking-widest">Copy link for WhatsApp</button>
                        {isManager && (
                            <button onClick={onStopRoom} className="w-full text-left px-4 py-3 hover:bg-gray-100 text-xs text-red-500 font-black uppercase tracking-widest">Stop Room</button>
                        )}
                    </div>
                )}
            </div>
        </div>
      </header>

      <ChatTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-hidden relative flex flex-col transition-all duration-300">
        {activeTab === 'CHATS' && (
            <div className="flex flex-1 overflow-hidden animate-in slide-in-from-left duration-300">
                <aside className={`bg-white border-r border-gray-200 ${selectedUser ? 'hidden md:block' : 'w-full md:w-80'} overflow-y-auto scrollbar-hide shadow-inner`}>
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                        <h3 className="font-bold text-whatsapp-teal text-sm uppercase tracking-widest leading-none">Friends ({users.length + 1})</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        <button
                            onClick={() => setSelectedUser(null)}
                            className={`w-full p-4 flex items-center gap-4 transition-colors ${!selectedUser ? 'bg-whatsapp-gray border-l-4 border-whatsapp-teal' : 'hover:bg-gray-50'}`}
                        >
                            <div className="w-12 h-12 bg-whatsapp-teal rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm">E</div>
                            <div className="text-left flex-1">
                                <p className="font-bold text-gray-800">Everyone</p>
                                <p className="text-xs text-gray-500 truncate font-medium">Group Chat</p>
                            </div>
                        </button>
                        {users.map(u => (
                            <div key={u.peerId} className="group relative">
                                <button
                                    onClick={() => setSelectedUser(u)}
                                    className={`w-full p-4 flex items-center gap-4 transition-colors ${selectedUser?.peerId === u.peerId ? 'bg-whatsapp-gray border-l-4 border-whatsapp-teal' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold uppercase text-xl shadow-inner border border-white">{u.name[0]}</div>
                                        <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${u.status === 'Online' ? 'bg-whatsapp-green' : u.status === 'Busy' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-gray-800 truncate">{u.name}</p>
                                            <span className="text-[9px] text-gray-400 uppercase tracking-widest font-black">{u.status}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 truncate font-medium flex items-center gap-1">
                                            {u.peerId === managerId && <Shield size={10} className="text-whatsapp-blue fill-whatsapp-blue" />}
                                            {u.peerId === managerId ? 'Manager' : 'Tap to chat private'}
                                        </p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); onSendPing(u.peerId); }} className="p-2 text-whatsapp-teal hover:bg-whatsapp-green/10 rounded-full transition-colors" title="Ping Friend">
                                        <Radio size={18} />
                                    </button>
                                </button>
                                {isHost && u.peerId !== peerId && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleBlacklist(u.peerId); }}
                                        className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Kick user"
                                    >
                                        <ShieldAlert size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </aside>

                <main className={`flex-1 flex flex-col bg-[#e5ddd5] ${!selectedUser && 'hidden md:flex'}`}>
                    {selectedUser && (
                        <div className="bg-whatsapp-gray p-3 border-b border-gray-200 flex items-center gap-3 md:hidden z-10 shadow-sm">
                            <button onClick={() => setSelectedUser(null)} className="text-whatsapp-teal"><ArrowLeft size={24}/></button>
                            <span className="font-bold text-gray-800">{selectedUser.name}</span>
                            <span className="ml-auto text-[10px] text-whatsapp-teal font-black bg-whatsapp-green/10 px-2 py-1 rounded border border-whatsapp-green/20 uppercase tracking-tighter">Private Chat</span>
                        </div>
                    )}

                    <div ref={scrollRef} className="chat-scroll p-4 flex flex-col overflow-x-hidden scroll-smooth">
                        {currentMessages.map(m => (
                            <ChatBubble key={m.id} msg={m} isMe={m.senderId === peerId} />
                        ))}
                        {typingUsers.size > 0 && Array.from(typingUsers).filter(u => u !== userName).length > 0 && (
                            <div className="text-[10px] italic text-gray-500 bg-white/80 px-3 py-1 rounded-full w-fit self-start mb-2 shadow-sm border border-black/5 animate-pulse">
                                {Array.from(typingUsers).filter(u => u !== userName).join(', ')} is typing...
                            </div>
                        )}
                    </div>

                    <footer className="bg-whatsapp-gray p-3 flex items-center gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-black/5">
                        <button onClick={() => fileInputRef.current?.click()} className="text-gray-500 p-2 hover:bg-gray-200 rounded-full transition-colors"><Paperclip size={24} /></button>
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
                        <form onSubmit={handleSend} className="flex-1">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => { setInput(e.target.value); onBroadcastTyping(); }}
                                placeholder="Type a message..."
                                className="w-full bg-white rounded-full px-5 py-3 text-sm shadow-sm border-none focus:ring-2 focus:ring-whatsapp-green/20"
                            />
                        </form>
                        {input.trim() ? (
                            <button onClick={handleSend} className="bg-whatsapp-teal text-white p-3.5 rounded-full shadow-lg active:scale-95 transition-all"><Send size={20} /></button>
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
                    <h3 className="font-bold text-whatsapp-teal text-center uppercase tracking-[0.2em] leading-none">The Wall</h3>
                    <p className="text-[10px] text-gray-400 text-center uppercase font-black mt-1">Class Board</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide bg-gray-50 shadow-inner">
                    {wallPosts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                            <Info size={48} className="mb-4 text-whatsapp-teal" />
                            <p className="font-bold uppercase tracking-widest">Nothing here yet</p>
                        </div>
                    ) : wallPosts.map(post => (
                        <div key={post.id} className="bg-white p-5 rounded-2xl border-l-8 border-whatsapp-teal shadow-md animate-in fade-in duration-500">
                            <div className="flex justify-between items-start mb-3">
                                <span className="font-black text-whatsapp-teal text-[10px] uppercase tracking-wider">{post.senderName}</span>
                                <span className="text-[9px] text-gray-400 font-bold">{new Date(post.timestamp).toLocaleString()}</span>
                            </div>
                            {post.type === 'image' ? (
                                <img src={post.content} className="rounded-xl w-full border border-black/5 shadow-sm" alt="Post" />
                            ) : (
                                <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
                            )}
                        </div>
                    ))}
                </div>
                <footer className="p-4 bg-gray-50 border-t border-gray-200 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))] shadow-lg">
                    <div className="max-w-4xl mx-auto flex items-center gap-2">
                        <button onClick={() => wallFileInputRef.current?.click()} className="p-3 text-whatsapp-teal hover:bg-whatsapp-teal/10 rounded-full transition-colors">
                            <ImageIcon size={24} />
                        </button>
                        <input type="file" ref={wallFileInputRef} className="hidden" accept="image/*" onChange={handleWallImage} />
                        <form onSubmit={handleWallPost} className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={wallInput}
                                onChange={(e) => setWallInput(e.target.value)}
                                placeholder="Post to board..."
                                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm shadow-inner focus:ring-2 focus:ring-whatsapp-green/10"
                            />
                            <button type="submit" className="bg-whatsapp-teal text-white p-3 rounded-xl shadow-md active:scale-95 transition-all"><SendHorizontal size={24}/></button>
                        </form>
                    </div>
                </footer>
            </div>
        )}

        {activeTab === 'CALL' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-whatsapp-darkGreen text-white text-center animate-in zoom-in duration-300">
                <div className="w-40 h-40 bg-whatsapp-green rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_60px_rgba(37,211,102,0.4)] border-4 border-white/20">
                    <Radio size={80} />
                </div>
                <h3 className="text-3xl font-black mb-2 uppercase tracking-tighter italic">Voice Call</h3>
                <p className="text-sm opacity-80 mb-8 max-w-xs leading-relaxed font-bold">Everyone connects to everyone. Resilient calling.</p>
                <VoiceMesh localStream={localStream} remoteStreams={remoteStreams} onToggleVoice={() => onToggleVoice(room.id)} users={users} />
            </div>
        )}
      </div>

      {uploadProgress !== null && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-8 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl p-10 w-full max-w-sm shadow-2xl text-center border-t-8 border-whatsapp-teal relative overflow-hidden">
                  <Activity size={48} className="mx-auto mb-6 text-whatsapp-teal animate-bounce" />
                  <h4 className="font-black text-gray-800 mb-2 uppercase tracking-widest text-sm italic">Sending Data</h4>
                  <p className="text-xs text-gray-400 mb-8 font-bold uppercase tracking-widest opacity-60 italic">Low-RAM Protocol Active</p>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-4 border border-gray-200 shadow-inner p-0.5">
                      <div className="h-full bg-whatsapp-green rounded-full transition-all duration-300 shadow-sm" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="text-4xl font-black text-whatsapp-teal tracking-tighter">{Math.round(uploadProgress)}%</p>
                  <button onClick={() => window.location.reload()} className="mt-10 px-8 py-3 bg-red-50 text-red-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100 shadow-sm active:scale-95 hover:bg-red-100 transition-all">Cancel Transfer</button>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-whatsapp-green/10 animate-pulse"></div>
              </div>
          </div>
      )}
    </div>
  );
};
