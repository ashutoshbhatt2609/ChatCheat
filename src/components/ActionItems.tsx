import React from 'react';
import { Calendar, User, ListTodo } from 'lucide-react';

export interface ActionItem {
  task: string;
  assignee: string;
  deadline: string | null;
  urgency: 'high' | 'medium' | 'low';
}

export interface ActionItemsProps {
  items: ActionItem[];
  isLoading: boolean;
}

export const ActionItems: React.FC<ActionItemsProps> = ({ items, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3 w-full">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4 animate-pulse">
            <div className="h-4 w-3/4 bg-slate-700 rounded mb-3"></div>
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-slate-700 rounded-full"></div>
              <div className="h-5 w-24 bg-slate-700 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 border-dashed p-8 text-center w-full">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 mb-3">
          <ListTodo className="w-5 h-5 text-slate-500" />
        </div>
        <p className="text-sm text-slate-400">No action items found in this conversation.</p>
      </div>
    );
  }

  const urgencyConfig = {
    high: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', dot: 'bg-red-500', label: 'High' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', dot: 'bg-yellow-500', label: 'Med' },
    low: { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', dot: 'bg-green-500', label: 'Low' },
  };

  // Sort: high > medium > low
  const sortedItems = [...items].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.urgency] - order[b.urgency];
  });

  return (
    <div className="space-y-3 w-full">
      {sortedItems.map((item, idx) => {
        const conf = urgencyConfig[item.urgency];
        
        return (
          <div key={idx} className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors group">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-slate-200 leading-snug flex-1">
                {item.task}
              </p>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider whitespace-nowrap ${conf.bg} ${conf.color} border ${conf.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`}></span>
                {conf.label}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/50 px-2.5 py-1 rounded-full border border-slate-700/50">
                <User className="w-3.5 h-3.5" />
                <span className="font-medium text-slate-300">{item.assignee}</span>
              </div>
              
              {item.deadline && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/50 px-2.5 py-1 rounded-full border border-slate-700/50">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{item.deadline}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
