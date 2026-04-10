import { useState, useEffect } from 'react';
import { usePeer } from './hooks/usePeer';
import { Lobby } from './components/Lobby';
import { ChatRoom } from './components/ChatRoom';
import { Room } from './types/chat';
import { updateRoomHeartbeat, deleteRoom } from './utils/gun';
import { MessageCircle, CheckCircle, Lock } from 'lucide-react';

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
      alert('Wrong password!');
    }
  };

  const handleStopRoom = () => {
    if (currentRoom && (currentRoom.hostPeerId === peerId || managerId === peerId)) {
      if (window.confirm('STOP_ROOM: This will kick everyone. Continue?')) {
          stopRoom();
          // Only original host can delete blueprint, others just clear live room
          if (currentRoom.originalHostId === peerId) {
              deleteRoom(currentRoom.id);
          }
      }
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setIsRoomClosed(false);
    window.location.href = window.location.origin + window.location.pathname;
  };

  if (!isNameSet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-6 font-sans">
        <div className="bg-white rounded-xl shadow-2xl p-8 md:p-12 w-full max-w-md text-center border-t-8 border-whatsapp-green">
          <div className="w-20 h-20 bg-whatsapp-green rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-lg">
            <MessageCircle size={40} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Welcome</h1>
          <p className="text-gray-500 mb-8 uppercase tracking-widest text-[10px] font-bold">P2P Secure Messenger</p>
          <form onSubmit={() => setIsNameSet(true)} className="space-y-6">
            <input
              autoFocus
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-lg p-4 text-center text-lg font-bold"
              placeholder="Your Name..."
            />
            <button
              type="submit"
              className="w-full bg-whatsapp-green text-white font-bold py-4 rounded-xl shadow-lg hover:bg-whatsapp-darkGreen transition-all active:scale-95 uppercase tracking-widest text-sm"
            >
              Start Chatting
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isRoomClosed) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-whatsapp-bg p-6">
            <div className="bg-white p-12 rounded-2xl shadow-2xl text-center max-w-sm border-t-8 border-whatsapp-teal">
                <CheckCircle size={64} className="text-whatsapp-teal mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Room Offline</h2>
                <p className="text-gray-500 mb-8 font-medium">The host has closed this link.</p>
                <button onClick={handleLeaveRoom} className="w-full bg-whatsapp-teal text-white font-bold py-4 rounded-xl shadow-lg">Return to Lobby</button>
            </div>
        </div>
    );
  }

  if (isAuthenticating && currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-whatsapp-bg p-6">
        <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md text-center border-t-8 border-whatsapp-darkGreen">
          <div className="w-16 h-16 bg-whatsapp-teal/10 rounded-full flex items-center justify-center mb-6 mx-auto text-whatsapp-teal">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Private Vault</h2>
          <p className="text-gray-500 mb-8 text-sm font-medium">Enter the decryption key.</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              autoFocus
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-lg p-4 text-center font-mono"
              placeholder="Password..."
            />
            <div className="flex gap-4">
                <button type="button" onClick={() => { setIsAuthenticating(false); setCurrentRoom(null); }} className="flex-1 py-3 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Abort</button>
                <button type="submit" className="flex-1 bg-whatsapp-teal text-white font-bold py-3 rounded-lg shadow-lg uppercase tracking-widest text-[10px]">Unlock</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-whatsapp-bg overflow-hidden font-sans">
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
