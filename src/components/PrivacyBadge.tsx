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
          100% Local · Your chats never leave this device
        </span>
        <span className="text-xs font-medium text-slate-300 sm:hidden">
          Local Mode
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
            This app uses WebLLM to run AI models entirely within your browser.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
            <li>Your chats are never uploaded anywhere</li>
            <li>Only the model files are downloaded once (Hugging Face / GitHub), then cached</li>
            <li>Processing happens on your device's GPU</li>
            <li>Your chat logs remain completely private</li>
          </ul>
        </div>
      )}
    </div>
  );
};
