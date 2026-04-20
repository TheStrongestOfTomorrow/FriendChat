import React from 'react';
import { MessageSquare, Layout, Phone } from 'lucide-react';

interface ChatTabsProps {
  active: 'CHATS' | 'WALL' | 'CALL';
  onChange: (tab: 'CHATS' | 'WALL' | 'CALL') => void;
}

export const ChatTabs: React.FC<ChatTabsProps> = ({ active, onChange }) => {
  return (
    <div className="bg-whatsapp-green text-white flex border-b border-whatsapp-darkGreen shrink-0 relative">
      <button
        onClick={() => onChange('CHATS')}
        className={`flex-1 py-4 flex flex-col items-center gap-1.5 transition-all relative z-10 ${active === 'CHATS' ? 'opacity-100' : 'opacity-100 hover:opacity-75'}`}
      >
        <MessageSquare size={20} className={active === 'CHATS' ? 'animate-bounce' : ''} />
        <span className="text-lg font-black uppercase tracking-[0.2em]">Chats</span>
      </button>
      <button
        onClick={() => onChange('WALL')}
        className={`flex-1 py-4 flex flex-col items-center gap-1.5 transition-all relative z-10 ${active === 'WALL' ? 'opacity-100' : 'opacity-100 hover:opacity-75'}`}
      >
        <Layout size={20} className={active === 'WALL' ? 'animate-pulse' : ''} />
        <span className="text-lg font-black uppercase tracking-[0.2em]">The Wall</span>
      </button>
      <button
        onClick={() => onChange('CALL')}
        className={`flex-1 py-4 flex flex-col items-center gap-1.5 transition-all relative z-10 ${active === 'CALL' ? 'opacity-100' : 'opacity-100 hover:opacity-75'}`}
      >
        <Phone size={20} className={active === 'CALL' ? 'animate-pulse' : ''} />
        <span className="text-lg font-black uppercase tracking-[0.2em]">Group Call</span>
      </button>

      {/* Animated Indicator */}
      <div
        className="absolute bottom-0 h-1 bg-white transition-all duration-300 ease-in-out"
        style={{
            width: '33.33%',
            left: active === 'CHATS' ? '0%' : active === 'WALL' ? '33.33%' : '66.66%'
        }}
      />
    </div>
  );
};
