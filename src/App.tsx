import { useState, useEffect } from 'react';
import { usePeer } from './hooks/usePeer';
import { Lobby } from './components/Lobby';
import { ChatRoom } from './components/ChatRoom';
import { Room } from './types/chat';
import { updateRoomHeartbeat } from './utils/gun';
import { Lock } from 'lucide-react';

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
    connectToPeer,
    broadcastMessage,
    sendPrivateMessage,
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
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRoom && passwordInput === currentRoom.passwordHash) {
      joinRoomAction(currentRoom);
    } else {
      alert('Wrong password!');
    }
  };

  if (!isNameSet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6 font-body">
        <div className="bg-surface-container-lowest p-12 rounded-lg w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="mb-12 text-center">
            <h1 className="font-display text-5xl font-extrabold tracking-tight text-primary mb-4">
                FriendChat
            </h1>
            <p className="text-on-surface-variant font-bold uppercase tracking-[0.3em] text-xs">Architectural P2P Ledger</p>
          </div>
          <form onSubmit={() => setIsNameSet(true)} className="space-y-8">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Identity Tag</label>
              <input
                autoFocus
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-surface-container-high border-none rounded-md px-6 py-5 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all text-lg font-medium shadow-inner"
                placeholder="Declare your name..."
              />
            </div>
            <button
              type="submit"
              className="w-full btn-gradient hover:opacity-90 text-white font-extrabold py-5 rounded-md transition-all shadow-xl active:scale-95 text-lg uppercase tracking-widest"
            >
              Initialize Connection
            </button>
          </form>
          <div className="mt-12 text-center opacity-40">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Zero Server Intermediation Guaranteed</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticating && currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6 font-body">
        <div className="bg-surface-container-lowest p-12 rounded-lg w-full max-w-lg shadow-2xl animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-8 mx-auto">
            <Lock size={32} className="text-secondary" />
          </div>
          <h2 className="font-display text-3xl font-bold mb-4 text-center text-on-surface">Private Vault</h2>
          <p className="text-on-surface-variant text-center mb-8 font-medium">This conversation is encrypted and password-protected.</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <input
              autoFocus
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-surface-container-high border-none rounded-md px-6 py-5 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all text-lg shadow-inner"
              placeholder="Enter cryptographic key..."
            />
            <div className="flex gap-4">
                <button
                type="button"
                onClick={() => { setIsAuthenticating(false); setCurrentRoom(null); }}
                className="flex-1 bg-surface-container-high hover:bg-surface-container-low py-4 rounded-md font-bold text-on-surface transition-colors"
                >
                Retreat
                </button>
                <button
                type="submit"
                className="flex-1 btn-gradient py-4 rounded-md font-extrabold text-white shadow-lg transition-transform active:scale-95 uppercase tracking-widest"
                >
                Decrypt
                </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      {currentRoom ? (
        <ChatRoom
          room={currentRoom}
          peerId={peerId}
          userName={userName}
          messages={messages}
          users={users}
          onSendMessage={broadcastMessage}
          onSendPrivateMessage={sendPrivateMessage}
          connections={connections}
        />
      ) : (
        <Lobby onJoinRoom={handleJoinRoom} peerId={peerId} />
      )}
    </div>
  );
}

export default App;
