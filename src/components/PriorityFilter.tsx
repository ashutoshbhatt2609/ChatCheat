import React, { useState } from 'react';
import { AtSign, GitMerge, HelpCircle, CalendarClock, ChevronDown, ChevronRight, User } from 'lucide-react';

export interface Priorities {
  mentions: { from: string; message: string }[];
  decisions: string[];
  questions: string[];
  deadlines: { item: string; date: string }[];
}

export interface PriorityFilterProps {
  priorities: Priorities | null;
  username: string;
  onUsernameChange: (name: string) => void;
  isLoading: boolean;
}

export const PriorityFilter: React.FC<PriorityFilterProps> = ({ priorities, username, onUsernameChange, isLoading }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('mentions');

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const renderSection = (
    id: string,
    title: string,
    icon: React.ReactNode,
    count: number,
    content: React.ReactNode,
    colorClass: string
  ) => {
    const isExpanded = expandedSection === id;
    
    return (
      <div className="border border-slate-700 bg-slate-800 rounded-xl overflow-hidden mb-3">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-3.5 bg-slate-800 hover:bg-slate-750 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${colorClass}`}>
              {icon}
            </div>
            <span className="font-medium text-slate-200 text-sm">{title}</span>
            {count > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-700 text-xs font-semibold text-slate-300">
                {count}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>
        
        {isExpanded && (
          <div className="p-4 bg-slate-800/50 border-t border-slate-700">
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-slate-700 rounded w-full"></div>
                <div className="h-3 bg-slate-700 rounded w-5/6"></div>
              </div>
            ) : count === 0 ? (
              <p className="text-sm text-slate-500 text-center py-2">Nothing found in this section.</p>
            ) : (
              content
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-6 bg-slate-800 border border-slate-700 rounded-xl p-4">
        <label htmlFor="username" className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
          Find mentions for user
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-600 rounded-lg bg-slate-900 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            placeholder="Your name or handle..."
          />
        </div>
      </div>

      <div className="space-y-0">
        {renderSection(
          'mentions',
          '@Mentions',
          <AtSign className="w-4 h-4" />,
          priorities?.mentions?.length || 0,
          <div className="space-y-3">
            {priorities?.mentions.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="font-semibold text-blue-400">{m.from}: </span>
                <span className="text-slate-300">{m.message}</span>
              </div>
            ))}
          </div>,
          'bg-blue-500/10 text-blue-400'
        )}

        {renderSection(
          'decisions',
          'Decisions Made',
          <GitMerge className="w-4 h-4" />,
          priorities?.decisions?.length || 0,
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
            {priorities?.decisions.map((d, i) => <li key={i}>{d}</li>)}
          </ul>,
          'bg-purple-500/10 text-purple-400'
        )}

        {renderSection(
          'questions',
          'Open Questions',
          <HelpCircle className="w-4 h-4" />,
          priorities?.questions?.length || 0,
          <ul className="space-y-3">
            {priorities?.questions.map((q, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300 items-start">
                <span className="text-amber-500 font-bold">?</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>,
          'bg-amber-500/10 text-amber-400'
        )}

        {renderSection(
          'deadlines',
          'Deadlines',
          <CalendarClock className="w-4 h-4" />,
          priorities?.deadlines?.length || 0,
          <div className="space-y-3">
            {priorities?.deadlines.map((d, i) => (
              <div key={i} className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-300">{d.item}</span>
                <span className="text-red-400 font-medium whitespace-nowrap ml-4">{d.date}</span>
              </div>
            ))}
          </div>,
          'bg-red-500/10 text-red-400'
        )}
      </div>
    </div>
  );
};
