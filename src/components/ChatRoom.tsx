import React, { useState, useRef, useEffect } from 'react';
import { Room, ChatMessage, PeerUser, PresenceStatus, WallMessage } from '../types/chat';
import { Send, User, Shield, File, Info, Users, ArrowLeft, Power, Copy, Check, Smile, Download, Terminal, Mic, ShieldAlert, Paperclip, MoreVertical, Monitor, Video, Phone, Radio, Activity, SendHorizontal, Share2, Save, Crown } from 'lucide-react';
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

  const isOriginalHost = room.originalHostId === peerId;
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

  const handleSaveSpace = () => {
      saveSpaceBlueprint({
          id: room.id,
          name: room.name,
          inviteCode: room.hostPeerId,
          originalHostId: room.originalHostId,
          createdAt: room.createdAt
      });
      alert('SPACE_SAVED: Blueprint stored in your history.');
  };

  const copyInvite = () => {
      const url = `${window.location.origin}${window.location.pathname}?invite=${room.hostPeerId}`;
      navigator.clipboard.writeText(url);
      alert('LINK_COPIED: Send this to your friends on WhatsApp!');
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
          <div className="bg-whatsapp-blue text-white p-3 text-center text-xs font-black uppercase tracking-widest animate-bounce relative z-[60]">
              {promotionMessage}
              <button onClick={onClearPromotion} className="ml-4 underline">DISMISS</button>
          </div>
      )}

      <header className="bg-whatsapp-darkGreen text-white p-4 shadow-md flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onLeave} className="p-1 hover:bg-white/10 rounded-full">
            <ArrowLeft size={24} />
          </button>
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-whatsapp-darkGreen font-bold text-xl relative">
            {room.name[0]}
            {isOriginalHost && <Crown size={12} className="absolute -top-1 -right-1 text-yellow-500 fill-yellow-500" />}
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight truncate max-w-[120px]">{room.name}</h2>
            <p className="text-[10px] opacity-70">Invite Code: {room.hostPeerId.slice(0, 8)}...</p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
            <button onClick={copyInvite} className="p-2 bg-whatsapp-teal rounded-full text-white shadow-sm hover:scale-110 transition-transform" title="Copy WhatsApp Link">
                <Share2 size={20} />
            </button>
            <button onClick={() => onToggleVoice(room.id)} className={`p-2 rounded-full ${localStream ? 'bg-whatsapp-green text-white' : 'hover:bg-white/10 text-white'}`} title="Voice Call">
                <Phone size={20} />
            </button>
            <div className="relative">
                <button onClick={() => setShowStatusMenu(!showStatusMenu)} className="p-2 hover:bg-white/10 rounded-full">
                    <MoreVertical size={20} />
                </button>
                {showStatusMenu && (
                    <div className="absolute right-0 top-12 bg-white text-gray-800 shadow-xl rounded-md py-2 w-48 border border-gray-200 z-50 overflow-hidden">
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
                            <Save size={14}/> Save Space
                        </button>
                        <button onClick={copyInvite} className="w-full text-left px-4 py-3 hover:bg-gray-100 text-xs text-whatsapp-teal font-black uppercase tracking-widest">Copy Link</button>
                        {isManager && (
                            <button onClick={onStopRoom} className="w-full text-left px-4 py-3 hover:bg-gray-100 text-xs text-red-500 font-black uppercase tracking-widest">Terminate Live</button>
                        )}
                    </div>
                )}
            </div>
        </div>
      </header>

      <ChatTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-hidden relative flex flex-col">
        {activeTab === 'CHATS' && (
            <div className="flex flex-1 overflow-hidden">
                <aside className={`bg-white border-r border-gray-200 ${selectedUser ? 'hidden md:block' : 'w-full md:w-80'} overflow-y-auto scrollbar-hide`}>
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-whatsapp-teal text-sm uppercase tracking-widest leading-none">Friends ({users.length + 1})</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        <button
                            onClick={() => setSelectedUser(null)}
                            className={`w-full p-4 flex items-center gap-4 transition-colors ${!selectedUser ? 'bg-whatsapp-gray border-l-4 border-whatsapp-teal' : 'hover:bg-gray-50'}`}
                        >
                            <div className="w-12 h-12 bg-whatsapp-teal rounded-full flex items-center justify-center text-white font-bold text-xl">E</div>
                            <div className="text-left flex-1">
                                <p className="font-bold text-gray-800">Everyone</p>
                                <p className="text-xs text-gray-500 truncate font-medium">Public Community Chat</p>
                            </div>
                        </button>
                        {users.map(u => (
                            <button
                                key={u.peerId}
                                onClick={() => setSelectedUser(u)}
                                className={`w-full p-4 flex items-center gap-4 transition-colors ${selectedUser?.peerId === u.peerId ? 'bg-whatsapp-gray border-l-4 border-whatsapp-teal' : 'hover:bg-gray-50'}`}
                            >
                                <div className="relative">
                                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold uppercase text-xl">
                                        {u.name[0]}
                                        {u.peerId === managerId && <Shield size={10} className="absolute -top-1 -right-1 text-whatsapp-blue fill-whatsapp-blue" />}
                                    </div>
                                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${u.status === 'Online' ? 'bg-whatsapp-green' : u.status === 'Busy' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className="font-bold text-gray-800 truncate">{u.name}</p>
                                        <span className="text-[10px] text-gray-400 uppercase tracking-tighter font-bold">{u.status}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate font-medium">Tap to chat private</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); onSendPing(u.peerId); }} className="p-2 text-whatsapp-teal hover:bg-whatsapp-green/10 rounded-full" title="Ping Friend">
                                    <Radio size={20} />
                                </button>
                            </button>
                        ))}
                    </div>
                </aside>

                <main className={`flex-1 flex flex-col bg-[#e5ddd5] ${!selectedUser && 'hidden md:flex'}`}>
                    {selectedUser && (
                        <div className="bg-whatsapp-gray p-3 border-b border-gray-200 flex items-center gap-3 md:hidden">
                            <button onClick={() => setSelectedUser(null)} className="text-whatsapp-teal"><ArrowLeft size={24}/></button>
                            <span className="font-bold text-gray-800">{selectedUser.name}</span>
                            <span className="ml-auto text-[10px] text-whatsapp-teal font-black bg-whatsapp-green/10 px-2 py-1 rounded">E2EE WHISPER</span>
                        </div>
                    )}

                    <div ref={scrollRef} className="chat-scroll p-4 flex flex-col overflow-x-hidden">
                        {currentMessages.map(m => (
                            <ChatBubble key={m.id} msg={m} isMe={m.senderId === peerId} />
                        ))}
                        {typingUsers.size > 0 && Array.from(typingUsers).filter(u => u !== userName).length > 0 && (
                            <div className="text-[10px] italic text-gray-500 bg-white/80 px-2 py-1 rounded w-fit self-start mb-2 shadow-sm">
                                {Array.from(typingUsers).filter(u => u !== userName).join(', ')} is typing...
                            </div>
                        )}
                    </div>

                    <footer className="bg-whatsapp-gray p-3 flex items-center gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
                        <button onClick={() => fileInputRef.current?.click()} className="text-gray-500 p-2 hover:bg-gray-200 rounded-full"><Paperclip size={24} /></button>
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
                                className="w-full bg-white rounded-full px-4 py-3 text-sm shadow-sm"
                            />
                        </form>
                        {input.trim() ? (
                            <button onClick={handleSend} className="bg-whatsapp-teal text-white p-3 rounded-full shadow-md active:scale-95"><Send size={20} /></button>
                        ) : (
                            <VoiceRecorder onSend={handleVoiceNote} />
                        )}
                    </footer>
                </main>
            </div>
        )}

        {activeTab === 'WALL' && (
            <div className="flex-1 flex flex-col bg-white">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-whatsapp-teal text-center uppercase tracking-[0.2em] leading-none">The Wall</h3>
                    <p className="text-[10px] text-gray-400 text-center uppercase font-black mt-1">Shared forever across the mesh</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                    {wallPosts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                            <Info size={48} className="mb-4 text-whatsapp-teal" />
                            <p className="font-bold uppercase tracking-widest">No wall posts yet</p>
                        </div>
                    ) : wallPosts.map(post => (
                        <div key={post.id} className="bg-whatsapp-lightGreen/10 p-4 rounded-lg border-l-4 border-whatsapp-teal shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-whatsapp-teal text-xs uppercase tracking-wider">{post.senderName}</span>
                                <span className="text-[9px] text-gray-400 font-bold">{new Date(post.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-gray-800 text-sm whitespace-pre-wrap">{post.content}</p>
                        </div>
                    ))}
                </div>
                <footer className="p-4 bg-gray-50 border-t border-gray-200 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))]">
                    <form onSubmit={handleWallPost} className="flex gap-2">
                        <input
                            type="text"
                            value={wallInput}
                            onChange={(e) => setWallInput(e.target.value)}
                            placeholder="Share something with everyone..."
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm shadow-inner"
                        />
                        <button type="submit" className="bg-whatsapp-teal text-white p-3 rounded-lg shadow-md active:scale-95"><SendHorizontal size={24}/></button>
                    </form>
                </footer>
            </div>
        )}

        {activeTab === 'CALL' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-whatsapp-darkGreen text-white text-center">
                <div className="w-32 h-32 bg-whatsapp-green rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_50px_rgba(37,211,102,0.4)]">
                    <Radio size={64} />
                </div>
                <h3 className="text-2xl font-bold mb-2 uppercase tracking-tighter">Independent Mesh Voice</h3>
                <p className="text-sm opacity-70 mb-8 max-w-xs leading-relaxed font-medium">Serverless resilient calling. Your privacy is guaranteed by P2P protocols.</p>
                <VoiceMesh localStream={localStream} remoteStreams={remoteStreams} onToggleVoice={() => onToggleVoice(room.id)} users={users} />
            </div>
        )}
      </div>

      {uploadProgress !== null && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-8 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center border-t-8 border-whatsapp-teal">
                  <Activity size={48} className="mx-auto mb-6 text-whatsapp-teal animate-bounce" />
                  <h4 className="font-bold text-gray-800 mb-2 uppercase tracking-widest text-sm">Streaming Data</h4>
                  <p className="text-xs text-gray-400 mb-6 font-bold">Memory-optimized low-RAM transfer</p>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4 border border-gray-200 shadow-inner">
                      <div className="h-full bg-whatsapp-green transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="text-3xl font-black text-whatsapp-teal">{Math.round(uploadProgress)}%</p>
                  <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-red-50 text-red-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-red-100 shadow-sm active:scale-95 transition-all">Abort Transfer</button>
              </div>
          </div>
      )}
    </div>
  );
};
