import React, { useState, useRef } from 'react';
import { Mic, X, Send } from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);
        chunks.current = [];

        mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
        mediaRecorder.current.onstop = () => {
            const blob = new Blob(chunks.current, { type: 'audio/webm' });
            onSend(blob);
            stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.current.start();
        setIsRecording(true);
    } catch (e) {
        alert('Could not access microphone.');
    }
  };

  const stop = () => {
    if (mediaRecorder.current && isRecording) {
        mediaRecorder.current.stop();
        setIsRecording(false);
    }
  };

  return (
    <button
      onMouseDown={start}
      onMouseUp={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white scale-125 animate-pulse' : 'text-gray-500 hover:bg-gray-100'}`}
    >
      <Mic size={24} />
    </button>
  );
};
