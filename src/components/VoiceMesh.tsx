import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

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
    <div className="flex flex-wrap gap-4 p-4 bg-black border-t border-green-900/30">
        <button
            onClick={onToggleVoice}
            className={`p-4 rounded-md flex items-center gap-3 font-mono font-bold transition-all ${
                localStream
                ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
            }`}
        >
            {localStream ? <Mic size={20} /> : <MicOff size={20} />}
            {localStream ? 'VOICE: ACTIVE' : 'VOICE: OFF'}
        </button>

        <div className="flex gap-2 items-center overflow-x-auto">
            {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
                const user = users.find(u => u.peerId === peerId);
                return (
                    <div key={peerId} className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-green-500/20 rounded-md animate-pulse">
                        <Volume2 size={14} className="text-green-500" />
                        <span className="text-[10px] font-mono text-green-500 uppercase tracking-tighter">
                            {user?.name || 'Peer'}: {peerId.slice(0, 4)}
                        </span>
                        <RemoteAudio stream={stream} />
                    </div>
                );
            })}
        </div>
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
