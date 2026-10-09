import React from 'react';
import { Cloud, Trash2 } from 'lucide-react';

export interface Conversation {
  id: string;
  name: string;
  platform: string;
  messageCount: number;
  createdAt: Date;
  /** Exists in the signed-in user's cloud storage (may not be on this device yet). */
  inCloud?: boolean;
}

export interface ConversationHistoryProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function groupLabel(date: Date, now = new Date()): 'Today' | 'Yesterday' | 'Earlier' {
  const diff = (startOfDay(now) - startOfDay(date)) / 86400000;
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return 'Earlier';
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations, activeId, onSelect, onDelete,
}) => {
  if (conversations.length === 0) {
    return <p className="px-3 py-6 text-center text-xs text-zinc-500">No conversations yet</p>;
  }

  const groups = (['Today', 'Yesterday', 'Earlier'] as const)
    .map((label) => ({ label, items: conversations.filter((c) => groupLabel(c.createdAt) === label) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.label} aria-label={g.label}>
          <h2 className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{g.label}</h2>
          <ul>
            {g.items.map((conv) => {
              const active = conv.id === activeId;
              return (
                <li key={conv.id} className="group relative">
                  <button
                    onClick={() => onSelect(conv.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full text-left rounded-lg px-3 py-2 pr-9 text-[13px] truncate flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500/60 ${
                      active ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-800/60'
                    }`}
                  >
                    {active && <span className="w-1 h-4 rounded-full bg-orange-500 flex-shrink-0" aria-hidden="true" />}
                    <span className="truncate">{conv.name}</span>
                    <span className="text-[10px] text-zinc-500 flex-shrink-0">{conv.messageCount}</span>
                    {conv.inCloud && <Cloud className="w-3 h-3 text-zinc-500 flex-shrink-0" aria-label="Synced" />}
                  </button>
                  <button
                    onClick={() => onDelete(conv.id)}
                    aria-label={`Delete ${conv.name}`}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-700 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
