import React, { useState, useRef, useEffect } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';

/**
 * A badge component that indicates local processing and data privacy.
 * Features a popover with more details when clicked.
 */
export const PrivacyBadge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/50"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Lock className="w-4 h-4 text-green-400" />
        <span className="text-xs font-medium text-slate-300 hidden sm:inline-block">
          Local-first · Cloud AI is opt-in
        </span>
        <span className="text-xs font-medium text-slate-300 sm:hidden">
          Local-first
        </span>
        <span className="relative flex h-2 w-2 ml-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Privacy Information"
          className="absolute right-0 mt-2 w-72 p-4 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2 text-green-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-semibold text-sm">Privacy by design</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 focus:outline-none rounded"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-slate-300 mb-2">
            By default your chats are analyzed on this device.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
            <li>Default: rule-based analysis runs fully in your browser</li>
            <li>Optional local models (WebLLM) also run on-device</li>
            <li>Cloud AI (Google Gemini) is off until you switch it on; then chat text is sent to Google via this app&apos;s server, and nothing is stored there</li>
            <li>Local models download once (Hugging Face / GitHub), then are cached</li>
            <li>Saved chats live only in this browser; you can delete them any time</li>
          </ul>
        </div>
      )}
    </div>
  );
};
