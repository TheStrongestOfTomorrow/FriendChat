import { useState, useEffect } from 'react';
import { usePeer } from './hooks/usePeer';
import { Lobby } from './components/Lobby';
import { ChatRoom } from './components/ChatRoom';
import { Room } from './types/chat';
import { updateRoomHeartbeat, deleteRoom } from './utils/gun';
import { MessageCircle, CheckCircle, Lock, ShieldCheck, Zap } from 'lucide-react';

function App() {
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('chat-username') || '';
  });
  const [isNameSet, setIsNameSet] = useState(!!userName);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const {
    peerId,
    messages,
    users,
    typingUsers,
    isRoomClosed,
    setIsRoomClosed,
    connectToPeer,
    broadcastMessage,
    sendPrivateMessage,
    sendReaction,
    broadcastTyping,
    updateStatus,
    sendPing,
    stopRoom,
    toggleVoice,
    toggleScreenShare,
    localStream,
    remoteStreams,
    isScreenSharing,
    myStatus,
    managerId,
    promotionMessage,
    setPromotionMessage,
    setHostId,
    setRoomId,
    connections
  } = usePeer(userName);

  useEffect(() => {
    if (userName) {
      localStorage.setItem('chat-username', userName);
    }
  }, [userName]);

  useEffect(() => {
    if (currentRoom && currentRoom.hostPeerId === peerId) {
      const interval = setInterval(() => {
        updateRoomHeartbeat(currentRoom.id);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentRoom, peerId]);

  useEffect(() => {
      if (currentRoom) {
          setHostId(currentRoom.hostPeerId);
          setRoomId(currentRoom.id);
      } else {
          setRoomId(null);
      }
  }, [currentRoom]);

  const handleJoinRoom = (room: Room) => {
    if (room.blacklist && room.blacklist[peerId]) {
        alert('Access Denied: You are blacklisted from this room.');
        return;
    }

    if (room.isPrivate) {
      setCurrentRoom(room);
      setIsAuthenticating(true);
    } else {
      joinRoomAction(room);
    }
  };

  const joinRoomAction = (room: Room) => {
    if (room.hostPeerId !== peerId) {
      connectToPeer(room.hostPeerId);
    }
    setCurrentRoom(room);
    setIsAuthenticating(false);
    setIsRoomClosed(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRoom && passwordInput === currentRoom.passwordHash) {
      joinRoomAction(currentRoom);
    } else {
      alert('Error: Wrong password!');
    }
  };

  const handleStopRoom = () => {
    if (currentRoom && (currentRoom.hostPeerId === peerId || managerId === peerId)) {
      if (window.confirm('STOP ROOM: This will kick everyone. Continue?')) {
          stopRoom();
          if (currentRoom.originalHostId === peerId) {
              deleteRoom(currentRoom.id);
          }
      }
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setIsRoomClosed(false);
    setRoomId(null);
    window.location.href = window.location.origin + window.location.pathname;
  };

  if (!isNameSet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-6 font-sans selection:bg-whatsapp-green selection:text-white">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 md:p-20 w-full max-w-xl text-center border-t-[12px] border-whatsapp-green relative overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-700">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-whatsapp-green/20 to-transparent animate-pulse"></div>

          <div className="relative z-10">
              <div className="w-24 h-24 bg-whatsapp-green rounded-[2rem] flex items-center justify-center text-white mx-auto mb-10 shadow-2xl shadow-whatsapp-green/40 rotate-12 hover:rotate-0 transition-transform duration-500 group">
                <MessageCircle size={48} className="group-hover:scale-110 transition-transform" />
              </div>
              <h1 className="text-5xl font-black text-gray-800 mb-2 tracking-tighter uppercase italic">FriendChat</h1>
              <p className="text-gray-400 mb-12 uppercase tracking-[0.4em] text-[10px] font-black opacity-60">Private Messenger</p>

              <form onSubmit={() => setIsNameSet(true)} className="space-y-10">
                <div className="relative">
                    <label className="block text-[10px] font-black text-whatsapp-teal uppercase tracking-[0.3em] mb-4 text-left leading-none ml-2">Your Name</label>
                    <input
                    autoFocus
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl p-5 text-center text-2xl font-black shadow-inner focus:bg-white focus:ring-4 focus:ring-whatsapp-green/10 transition-all placeholder:text-gray-200"
                    placeholder="..."
                    />
                </div>
                <button
                type="submit"
                className="w-full bg-whatsapp-darkGreen text-white font-black py-6 rounded-2xl shadow-2xl hover:bg-whatsapp-teal transition-all active:scale-95 uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3"
                >
                <ShieldCheck size={20} /> Start Chatting
                </button>
              </form>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 opacity-20">
              <div className="flex items-center gap-2 font-black text-[9px] uppercase tracking-widest"><Lock size={12}/> Locked & Private</div>
              <div className="flex items-center gap-2 font-black text-[9px] uppercase tracking-widest"><Zap size={12}/> Direct Chat</div>
          </div>

          <MessageCircle size={300} className="absolute bottom-[-100px] left-[-100px] text-whatsapp-green opacity-[0.03] -rotate-12 pointer-events-none" />
        </div>
      </div>
    );
  }

  if (isRoomClosed) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-whatsapp-bg p-6 font-sans">
            <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl text-center max-w-md border-t-8 border-red-500 animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500 shadow-inner">
                    <CheckCircle size={64} className="animate-pulse" />
                </div>
                <h2 className="text-3xl font-black text-gray-800 mb-4 uppercase tracking-tighter italic">Room Closed</h2>
                <p className="text-gray-500 mb-10 font-bold uppercase tracking-widest text-[10px]">The host has closed this link.</p>
                <button onClick={handleLeaveRoom} className="w-full bg-whatsapp-teal text-white font-black py-5 rounded-2xl shadow-xl hover:bg-whatsapp-darkGreen transition-all uppercase tracking-widest text-xs">Go Back</button>
            </div>
        </div>
    );
  }

  if (isAuthenticating && currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-whatsapp-bg p-6 font-sans">
        <div className="bg-white p-10 md:p-16 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center border-t-8 border-whatsapp-darkGreen animate-in fade-in duration-300">
          <div className="w-20 h-20 bg-whatsapp-teal/10 rounded-full flex items-center justify-center mb-8 mx-auto text-whatsapp-teal shadow-inner border border-whatsapp-teal/10">
            <Lock size={40} />
          </div>
          <h2 className="text-3xl font-black text-gray-800 mb-2 uppercase tracking-tighter italic">Private Room</h2>
          <p className="text-gray-400 mb-12 text-[10px] font-black uppercase tracking-widest">Type password to enter</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-8">
            <input
              autoFocus
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl p-5 text-center font-mono text-xl shadow-inner focus:bg-white focus:ring-4 focus:ring-whatsapp-green/10 transition-all"
              placeholder="..."
            />
            <div className="flex gap-4">
                <button type="button" onClick={() => { setIsAuthenticating(false); setCurrentRoom(null); }} className="flex-1 py-4 text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] hover:text-red-500 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-whatsapp-teal text-white font-black py-4 rounded-2xl shadow-xl hover:bg-whatsapp-darkGreen transition-all uppercase tracking-[0.2em] text-[10px]">Join</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-whatsapp-bg overflow-hidden font-sans selection:bg-whatsapp-green selection:text-white">
      {currentRoom ? (
        <ChatRoom
          room={currentRoom}
          peerId={peerId}
          userName={userName}
          messages={messages}
          users={users}
          typingUsers={typingUsers}
          localStream={localStream}
          remoteStreams={remoteStreams}
          myStatus={myStatus}
          isScreenSharing={isScreenSharing}
          managerId={managerId}
          promotionMessage={promotionMessage}
          onClearPromotion={() => setPromotionMessage(null)}
          onSendMessage={broadcastMessage}
          onSendPrivateMessage={sendPrivateMessage}
          onSendReaction={sendReaction}
          onBroadcastTyping={broadcastTyping}
          onUpdateStatus={updateStatus}
          onSendPing={sendPing}
          onToggleVoice={toggleVoice}
          onToggleScreenShare={toggleScreenShare}
          onStopRoom={handleStopRoom}
          onLeave={handleLeaveRoom}
          connections={connections}
        />
      ) : (
        <Lobby onJoinRoom={handleJoinRoom} peerId={peerId} />
      )}
    </div>
  );
}

export default App;
