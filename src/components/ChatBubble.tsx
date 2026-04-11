import React from 'react';
import { ChatMessage } from '../types/chat';
import { Check, CheckCheck, Download, File, Play, Lock } from 'lucide-react';

interface ChatBubbleProps {
  msg: ChatMessage;
  isMe: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ msg, isMe }) => {
  const renderContent = () => {
      if (msg.type === 'file' && msg.fileMetadata) {
          const isImage = msg.fileMetadata.type.startsWith('image/');
          return (
              <div className="space-y-2">
                  {isImage ? (
                      <img src={msg.content} className="rounded-lg max-w-full shadow-sm" alt="Shared" />
                  ) : (
                      <div className="flex items-center gap-3 p-3 bg-black/5 rounded-xl border border-black/5 shadow-inner">
                          <File size={24} className="text-whatsapp-teal" />
                          <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{msg.fileMetadata.name}</p>
                              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">{(msg.fileMetadata.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <a href={msg.content} download={msg.fileMetadata.name} className="p-2 bg-whatsapp-green text-white rounded-full shadow-md hover:scale-110 transition-transform">
                              <Download size={14} />
                          </a>
                      </div>
                  )}
              </div>
          );
      }
      if (msg.type === 'voice-note') {
          return (
              <div className="flex items-center gap-3 py-1 pr-2">
                  <div className="w-10 h-10 bg-whatsapp-green rounded-full flex items-center justify-center text-white shadow-md">
                      <Play size={20} fill="white" />
                  </div>
                  <div className="flex-1">
                    <audio src={msg.content} controls className="h-8 w-full max-w-[180px] brightness-90 grayscale contrast-125" />
                  </div>
              </div>
          );
      }
      return <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>;
  };

  const isDecryptionError = msg.content === '[DECRYPTION_FAILED]' || msg.content === '[DECRYPTION_ERROR]';

  return (
    <div className={`${isMe ? 'bubble-sent' : 'bubble-received'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {!isMe && <p className="text-[10px] font-black text-whatsapp-teal mb-1.5 uppercase tracking-widest flex items-center gap-1">
          {msg.senderName}
          {msg.isPrivate && <Lock size={8} className="opacity-40" />}
      </p>}
      <div className={`text-sm ${isDecryptionError ? 'italic text-red-500 font-bold opacity-70' : 'text-gray-800'}`}>
          {renderContent()}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-1.5">
          <span className="text-[9px] font-bold text-gray-400 opacity-60 uppercase">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && (
              <span className={`transition-colors ${msg.deliveryStatus === 'seen' ? 'text-whatsapp-blue' : 'text-gray-300'}`}>
                  {msg.deliveryStatus === 'seen' ? <CheckCheck size={14} className="stroke-[3px]" /> : <Check size={14} className="stroke-[3px]" />}
              </span>
          )}
      </div>
    </div>
  );
};
