import { useState, useEffect } from 'react';
import { usePeer } from './hooks/usePeer';
import { Lobby } from './components/Lobby';
import { ChatRoom } from './components/ChatRoom';
import { Room } from './types/chat';
import { updateRoomHeartbeat, deleteRoom } from './utils/gun';
import { Terminal, Lock, XCircle } from 'lucide-react';

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
    stopRoom,
    toggleVoice,
    localStream,
    remoteStreams,
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

  const handleJoinRoom = (room: Room) => {
    if (room.blacklist && room.blacklist[peerId]) {
        alert('NODE_REJECTED: PEER_ID_IN_BLACKLIST');
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
      alert('DECRYPT_FAILURE: INCORRECT_KEY');
    }
  };

  const handleStopRoom = () => {
    if (currentRoom && currentRoom.hostPeerId === peerId) {
      stopRoom();
      deleteRoom(currentRoom.id);
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setIsRoomClosed(false);
    window.location.reload();
  };

  if (!isNameSet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6 font-mono text-primary">
        <div className="bg-black border-2 border-primary/40 p-10 md:p-16 w-full max-w-lg shadow-[0_0_80px_rgba(0,255,65,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 animate-pulse"></div>
          <div className="mb-12 text-center">
            <Terminal size={48} className="mx-auto mb-6 text-primary" />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter terminal-glow mb-4">
                FRIENDCHAT_SYS
            </h1>
            <p className="text-primary-dark font-bold uppercase tracking-[0.4em] text-[10px]">{'>'} DECENTRALIZED_P2P_MESH_BOOTING...</p>
          </div>
          <form onSubmit={() => setIsNameSet(true)} className="space-y-10">
            <div>
              <label className="block text-[10px] font-bold text-primary-dark uppercase tracking-widest mb-4">{'>'} IDENTIFY_USER</label>
              <input
                autoFocus
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-zinc-950 border-b-2 border-primary/20 p-4 text-primary focus:border-primary focus:outline-none transition-all text-lg font-bold placeholder:text-primary/10"
                placeholder="Declare_name..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-black font-extrabold py-5 hover:bg-primary-dark transition-all shadow-[0_0_20px_rgba(0,255,65,0.3)] active:scale-[0.98] uppercase tracking-widest text-sm"
            >
              INITIALIZE_CONNECTION
            </button>
          </form>
          <div className="mt-16 text-center opacity-20">
            <p className="text-[8px] font-bold uppercase tracking-widest leading-relaxed">System_secured_via_webrtc_datachannels<br/>End_to_end_encryption_active</p>
          </div>
        </div>
      </div>
    );
  }

  if (isRoomClosed) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-6 font-mono text-primary">
            <div className="bg-black border border-red-500/50 p-12 w-full max-w-md shadow-[0_0_40px_rgba(239,68,68,0.1)] text-center">
                <XCircle size={64} className="text-red-500 mx-auto mb-6 animate-pulse" />
                <h2 className="text-2xl font-bold mb-4 uppercase tracking-tighter text-red-500">Node_Terminated</h2>
                <p className="text-primary-dark text-xs mb-8 uppercase tracking-wide">The host has closed this link or connection was dropped by the mesh.</p>
                <button
                    onClick={handleLeaveRoom}
                    className="w-full border border-primary/30 py-4 font-bold hover:bg-primary/10 transition-all text-xs tracking-widest"
                >
                    RETURN_TO_BASE
                </button>
            </div>
        </div>
    );
  }

  if (isAuthenticating && currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6 font-mono text-primary text-sm">
        <div className="bg-black border border-primary/30 p-12 w-full max-w-md shadow-2xl">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mb-8 mx-auto">
            <Lock size={28} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-center uppercase tracking-tighter terminal-glow">Secure_Vault</h2>
          <p className="text-primary-dark text-center mb-10 text-[10px] uppercase font-bold tracking-widest">Input_decryption_key_for_node_access</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <input
              autoFocus
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-zinc-950 border border-primary/20 p-4 text-primary focus:border-primary focus:outline-none transition-all placeholder:text-primary/10"
              placeholder="Enter_cryptographic_key..."
            />
            <div className="flex gap-4">
                <button
                type="button"
                onClick={() => { setIsAuthenticating(false); setCurrentRoom(null); }}
                className="flex-1 border border-primary/20 py-4 font-bold hover:bg-primary/5 transition-all text-[10px] tracking-widest"
                >
                ABORT
                </button>
                <button
                type="submit"
                className="flex-1 bg-primary text-black font-extrabold py-4 hover:bg-primary-dark transition-all shadow-lg text-[10px] tracking-widest"
                >
                EXECUTE_JOIN
                </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-mono">
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
          onSendMessage={broadcastMessage}
          onSendPrivateMessage={sendPrivateMessage}
          onSendReaction={sendReaction}
          onBroadcastTyping={broadcastTyping}
          onToggleVoice={toggleVoice}
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
