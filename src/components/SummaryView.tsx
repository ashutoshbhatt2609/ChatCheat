import React, { useState } from 'react';
import { AlignLeft, CheckCircle2, Clock, FileText, LayoutList } from 'lucide-react';

interface TimelineEvent {
  time: string;
  event: string;
}

export interface SummaryData {
  tldr: string;
  keyPoints: string[];
  timeline: TimelineEvent[];
}

export interface SummaryViewProps {
  summary: SummaryData | null;
  isLoading: boolean;
}

type TabType = 'tldr' | 'points' | 'timeline';

export const SummaryView: React.FC<SummaryViewProps> = ({ summary, isLoading }) => {
  const [activeTab, setActiveTab] = useState<TabType>('tldr');

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full animate-pulse">
        <div className="flex gap-4 mb-6 border-b border-slate-700 pb-2">
          <div className="h-6 w-20 bg-slate-700 rounded"></div>
          <div className="h-6 w-24 bg-slate-700 rounded"></div>
          <div className="h-6 w-20 bg-slate-700 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-slate-700 rounded"></div>
          <div className="h-4 w-5/6 bg-slate-700 rounded"></div>
          <div className="h-4 w-4/6 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 mb-4">
          <FileText className="w-6 h-6 text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-300 mb-2">No Summary Available</h3>
        <p className="text-sm text-slate-500">Import a chat to generate an AI summary.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden w-full">
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('tldr')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'tldr' 
              ? 'border-green-500 text-green-400 bg-slate-800/50' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          <AlignLeft className="w-4 h-4" />
          TL;DR
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'points' 
              ? 'border-green-500 text-green-400 bg-slate-800/50' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          <LayoutList className="w-4 h-4" />
          Key Points
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'timeline' 
              ? 'border-green-500 text-green-400 bg-slate-800/50' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Timeline
        </button>
      </div>

      <div className="p-6 min-h-[200px]">
        {activeTab === 'tldr' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Brief Overview</h4>
            <p className="text-slate-300 leading-relaxed">
              {summary.tldr}
            </p>
          </div>
        )}

        {activeTab === 'points' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Important Takeaways</h4>
            <ul className="space-y-3">
              {summary.keyPoints.map((point, idx) => (
                <li key={idx} className="flex gap-3 text-slate-300 items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Chronological Events</h4>
            <div className="relative border-l-2 border-slate-700 ml-3 pl-6 space-y-6">
              {summary.timeline.map((item, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-800 border-2 border-green-500 ring-4 ring-slate-800" />
                  <div className="mb-1 text-xs font-medium text-green-400">{item.time}</div>
                  <div className="text-sm text-slate-300">{item.event}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
