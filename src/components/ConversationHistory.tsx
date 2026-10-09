import React from 'react';
import { MessageSquare, MessageCircle, FileText, Trash2 } from 'lucide-react';

export interface Conversation {
  id: string;
  name: string;
  platform: string;
  messageCount: number;
  createdAt: Date;
}

export interface ConversationHistoryProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'whatsapp': return <MessageCircle className="w-4 h-4 text-green-500" />;
    case 'telegram': return <MessageSquare className="w-4 h-4 text-blue-400" />;
    case 'discord': return <FileText className="w-4 h-4 text-indigo-400" />;
    default: return <MessageSquare className="w-4 h-4 text-slate-400" />;
  }
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'mo ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'm ago';
  return 'Just now';
};

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations, activeId, onSelect, onDelete
}) => {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-slate-500">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-2">
      {conversations.map((conv) => {
        const isActive = conv.id === activeId;
        
        return (
          <div
            key={conv.id}
            className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
              isActive 
                ? 'bg-slate-800 border border-slate-700' 
                : 'hover:bg-slate-800/50 border border-transparent'
            }`}
            onClick={() => onSelect(conv.id)}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex-shrink-0 bg-slate-900 p-1.5 rounded-md">
                {getPlatformIcon(conv.platform)}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${isActive ? 'text-slate-200' : 'text-slate-300'}`}>
                  {conv.name}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{conv.messageCount} msgs</span>
                  <span>•</span>
                  <span>{formatTimeAgo(conv.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              className={`p-1.5 rounded-md text-slate-500 hover:bg-slate-700 hover:text-red-400 transition-colors ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              aria-label="Delete conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
