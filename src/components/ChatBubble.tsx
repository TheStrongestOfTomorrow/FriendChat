import React, { useState, useEffect } from 'react';
import { ChatMessage } from '../types/chat';
import { Check, CheckCheck, Download, File, Play, Lock, Smile, Trash2 } from 'lucide-react';

interface ChatBubbleProps {
  msg: ChatMessage;
  isMe: boolean;
  onReaction?: (msgId: string, emoji: string) => void;
  onDelete?: (msgId: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const ChatBubble: React.FC<ChatBubbleProps> = ({ msg, isMe, onReaction, onDelete }) => {
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    return () => {
      if ((msg.type === 'file' || msg.type === 'voice-note') && msg.content.startsWith('blob:')) {
        URL.revokeObjectURL(msg.content);
      }
    };
  }, [msg.content, msg.type]);

  const renderContent = () => {
      if (msg.type === 'file' && msg.fileMetadata) {
          const isImage = msg.fileMetadata.type.startsWith('image/');
          return (
              <div className="space-y-2">
                  {isImage ? (
                      <img src={msg.content} className="rounded-lg max-w-full shadow-sm" alt="Shared" />
                  ) : (
                      <div className="flex items-center gap-3 p-3 bg-black/5 rounded-xl border border-black/5 shadow-inner">
                          <File size={40} className="text-whatsapp-darkGreen" />
                          <div className="flex-1 min-w-0">
                              <p className="text-3xl font-black truncate">{msg.fileMetadata.name}</p>
                              <p className="text-3xl text-gray-900 uppercase font-black tracking-widest">{(msg.fileMetadata.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <a href={msg.content} download={msg.fileMetadata.name} className="p-2 bg-whatsapp-green text-white rounded-full shadow-md hover:scale-110 transition-transform">
                              <Download size={40} />
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
                      <Play size={32} fill="white" />
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
    <div className="relative group flex flex-col mb-4">
        <div className={`${isMe ? 'bubble-sent' : 'bubble-received'} animate-in fade-in slide-in-from-bottom-2 duration-300 relative`}>
          {!isMe && <p className="text-3xl font-black text-whatsapp-darkGreen mb-1.5 uppercase tracking-widest flex items-center gap-1">
              {msg.senderName}
              {msg.isPrivate && <Lock size={24} className="opacity-100" />}
          </p>}
          <div className={`text-3xl ${isDecryptionError ? 'italic text-red-500 font-black opacity-100' : 'text-black'}`}>
              {renderContent()}
          </div>

          <div className="flex items-center justify-end gap-1.5 mt-1.5">
              <span className="text-3xl font-black text-gray-900 opacity-100 uppercase">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isMe && (
                  <span className={`transition-colors ${msg.deliveryStatus === 'seen' ? 'text-whatsapp-blue' : 'text-gray-600'}`}>
                      {msg.deliveryStatus === 'seen' ? <CheckCheck size={40} className="stroke-[3px]" /> : <Check size={40} className="stroke-[3px]" />}
                  </span>
              )}
          </div>

          {/* Reactions Display */}
          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
              <div className="absolute -bottom-4 left-2 flex gap-1 bg-white rounded-full px-2 py-0.5 shadow-md border border-gray-100 z-10">
                  {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <div key={emoji} className="flex items-center gap-1">
                          <span className="text-2xl">{emoji}</span>
                          <span className="text-xl font-black text-gray-900">{users.length}</span>
                      </div>
                  ))}
              </div>
          )}

          {/* Reaction and Delete Triggers */}
          <div className="absolute -right-12 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="p-2 text-gray-400 hover:text-whatsapp-green transition-colors"
            >
              <Smile size={32} />
            </button>
            {isMe && (
              <button
                onClick={() => {
                  if (window.confirm('Delete message?')) {
                    onDelete?.(msg.id);
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={32} />
              </button>
            )}
          </div>

          {showPicker && (
            <div className="absolute -right-2 top-10 flex gap-2 bg-white p-2 rounded-2xl shadow-2xl border border-gray-100 z-[100] animate-in zoom-in duration-200">
                {COMMON_EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => {
                            onReaction?.(msg.id, emoji);
                            setShowPicker(false);
                        }}
                        className="text-4xl hover:scale-125 transition-transform p-1"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
          )}
        </div>
    </div>
  );
};
