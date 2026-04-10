import { useState, useEffect } from 'react';
import { usePeer } from './hooks/usePeer';
import { Lobby } from './components/Lobby';
import { ChatRoom } from './components/ChatRoom';
import { Room } from './types/chat';
import { updateRoomHeartbeat } from './utils/gun';

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

  // Heartbeat for room hosting
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
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
          <h1 className="text-3xl font-bold text-center mb-8 text-white bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
            Welcome to FriendChat
          </h1>
          <form onSubmit={() => setIsNameSet(true)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Choose your name</label>
              <input
                autoFocus
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
                placeholder="Enter your name..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition duration-200 shadow-lg shadow-blue-500/20"
            >
              Start Chatting
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isAuthenticating && currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
          <h2 className="text-xl font-bold mb-4">Room Password Protected</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              autoFocus
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
              placeholder="Enter password..."
            />
            <div className="flex gap-3">
                <button
                type="button"
                onClick={() => { setIsAuthenticating(false); setCurrentRoom(null); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 rounded-xl"
                >
                Cancel
                </button>
                <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-xl font-bold"
                >
                Join
                </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
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
