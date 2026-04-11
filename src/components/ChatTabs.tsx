import React from 'react';
import { MessageSquare, Layout, Phone } from 'lucide-react';

interface ChatTabsProps {
  activeTab: 'CHATS' | 'WALL' | 'CALL';
  onTabChange: (tab: 'CHATS' | 'WALL' | 'CALL') => void;
}

export const ChatTabs: React.FC<ChatTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-whatsapp-teal text-white flex border-b border-whatsapp-darkGreen shrink-0 relative">
      <button
        onClick={() => onTabChange('CHATS')}
        className={`flex-1 py-4 flex flex-col items-center gap-1.5 transition-all relative z-10 ${activeTab === 'CHATS' ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
      >
        <MessageSquare size={20} className={activeTab === 'CHATS' ? 'animate-bounce' : ''} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Chats</span>
      </button>
      <button
        onClick={() => onTabChange('WALL')}
        className={`flex-1 py-4 flex flex-col items-center gap-1.5 transition-all relative z-10 ${activeTab === 'WALL' ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
      >
        <Layout size={20} className={activeTab === 'WALL' ? 'animate-pulse' : ''} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">The Wall</span>
      </button>
      <button
        onClick={() => onTabChange('CALL')}
        className={`flex-1 py-4 flex flex-col items-center gap-1.5 transition-all relative z-10 ${activeTab === 'CALL' ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
      >
        <Phone size={20} className={activeTab === 'CALL' ? 'animate-pulse' : ''} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Group Call</span>
      </button>

      {/* Animated Indicator */}
      <div
        className="absolute bottom-0 h-1 bg-white transition-all duration-300 ease-in-out"
        style={{
            width: '33.33%',
            left: activeTab === 'CHATS' ? '0%' : activeTab === 'WALL' ? '33.33%' : '66.66%'
        }}
      />
    </div>
  );
};
