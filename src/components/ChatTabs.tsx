import React from 'react';
import { MessageSquare, Layout, Phone } from 'lucide-react';

interface ChatTabsProps {
  activeTab: 'CHATS' | 'WALL' | 'CALL';
  onTabChange: (tab: 'CHATS' | 'WALL' | 'CALL') => void;
}

export const ChatTabs: React.FC<ChatTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-whatsapp-teal text-white flex border-b border-whatsapp-darkGreen">
      <button
        onClick={() => onTabChange('CHATS')}
        className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${activeTab === 'CHATS' ? 'border-b-4 border-white opacity-100' : 'opacity-60'}`}
      >
        <MessageSquare size={20} />
        <span className="text-xs font-bold uppercase tracking-wider">Chats</span>
      </button>
      <button
        onClick={() => onTabChange('WALL')}
        className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${activeTab === 'WALL' ? 'border-b-4 border-white opacity-100' : 'opacity-60'}`}
      >
        <Layout size={20} />
        <span className="text-xs font-bold uppercase tracking-wider">Wall</span>
      </button>
      <button
        onClick={() => onTabChange('CALL')}
        className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${activeTab === 'CALL' ? 'border-b-4 border-white opacity-100' : 'opacity-60'}`}
      >
        <Phone size={20} />
        <span className="text-xs font-bold uppercase tracking-wider">Call</span>
      </button>
    </div>
  );
};
