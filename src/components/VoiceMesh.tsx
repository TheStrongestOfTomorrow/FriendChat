import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, User } from 'lucide-react';

interface VoiceMeshProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  onToggleVoice: () => void;
  users: { peerId: string, name: string }[];
}

export const VoiceMesh: React.FC<VoiceMeshProps> = ({
  localStream,
  remoteStreams,
  onToggleVoice,
  users
}) => {
  return (
    <div className="flex flex-col items-center gap-8 w-full">
        <div className="flex flex-wrap justify-center gap-6">
            <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-whatsapp-green rounded-full flex items-center justify-center text-white shadow-lg relative">
                    <User size={20} />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 text-whatsapp-green shadow-sm border border-whatsapp-green/20">
                        {localStream ? <Mic size={24} /> : <MicOff size={24} className="text-red-500" />}
                    </div>
                </div>
                <span className="text-lg font-black uppercase tracking-widest opacity-100">You</span>
            </div>

            {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
                const user = users.find(u => u.peerId === peerId);
                return (
                    <div key={peerId} className="flex flex-col items-center gap-3 animate-in zoom-in duration-500">
                        <div className="w-16 h-16 bg-whatsapp-green rounded-full flex items-center justify-center text-white shadow-lg relative ring-4 ring-whatsapp-green/20 animate-pulse">
                            <User size={20} />
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 text-whatsapp-green shadow-sm">
                                <Volume2 size={24} />
                            </div>
                        </div>
                        <span className="text-lg font-black uppercase tracking-widest opacity-100 truncate max-w-[80px]">
                            {user?.name || 'Friend'}
                        </span>
                        <RemoteAudio stream={stream} />
                    </div>
                );
            })}
        </div>

        <button
            onClick={onToggleVoice}
            className={`px-10 py-5 rounded-full flex items-center gap-3 font-black transition-all uppercase tracking-[0.3em] text-lg shadow-2xl ${
                localStream
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-whatsapp-green text-white hover:bg-whatsapp-darkGreen'
            }`}
        >
            {localStream ? <MicOff size={20} /> : <Mic size={20} />}
            {localStream ? 'Turn Off Mic' : 'Turn On Mic'}
        </button>
    </div>
  );
};

const RemoteAudio: React.FC<{ stream: MediaStream }> = ({ stream }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    useEffect(() => {
        if (audioRef.current) audioRef.current.srcObject = stream;
    }, [stream]);
    return <audio ref={audioRef} autoPlay className="hidden" />;
};
