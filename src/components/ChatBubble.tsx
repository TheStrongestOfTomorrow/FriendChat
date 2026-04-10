import React from 'react';
import { ChatMessage } from '../types/chat';
import { Check, CheckCheck, Download, File, Play } from 'lucide-react';

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
                      <img src={msg.content} className="rounded max-w-full" alt="Shared" />
                  ) : (
                      <div className="flex items-center gap-2 p-2 bg-black/5 rounded">
                          <File size={20} />
                          <span className="text-xs truncate max-w-[150px]">{msg.fileMetadata.name}</span>
                          <a href={msg.content} download={msg.fileMetadata.name} className="ml-auto p-1 bg-whatsapp-green text-white rounded">
                              <Download size={14} />
                          </a>
                      </div>
                  )}
              </div>
          );
      }
      if (msg.type === 'voice-note') {
          return (
              <div className="flex items-center gap-3 py-1">
                  <div className="w-10 h-10 bg-whatsapp-green rounded-full flex items-center justify-center text-white">
                      <Play size={18} fill="white" />
                  </div>
                  <audio src={msg.content} controls className="h-8 w-40" />
              </div>
          );
      }
      return <p className="whitespace-pre-wrap">{msg.content}</p>;
  };

  return (
    <div className={`${isMe ? 'bubble-sent' : 'bubble-received'}`}>
      {!isMe && <p className="text-[10px] font-bold text-whatsapp-teal mb-1">{msg.senderName}</p>}
      <div className="text-sm">
          {renderContent()}
      </div>
      <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[9px] text-gray-500">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && (
              <span className={`${msg.deliveryStatus === 'seen' ? 'text-whatsapp-blue' : 'text-gray-400'}`}>
                  {msg.deliveryStatus === 'seen' ? <CheckCheck size={12} /> : <Check size={12} />}
              </span>
          )}
      </div>
      {/* Reaction support would go here */}
    </div>
  );
};
