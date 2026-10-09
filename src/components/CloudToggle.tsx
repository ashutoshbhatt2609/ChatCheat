import React from 'react';
import { Cloud } from 'lucide-react';

export interface CloudToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/**
 * Explicit opt-in for cloud AI. Cloud mode sends the chat text to Google's Gemini API
 * (through this app's own server), so it is off by default and clearly disclosed.
 */
export const CloudToggle: React.FC<CloudToggleProps> = ({ enabled, onChange }) => (
  <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 w-full max-w-md mx-auto mb-4">
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-green-500 focus:ring-2 focus:ring-green-500"
      />
      <span>
        <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Cloud className="w-4 h-4 text-green-400" aria-hidden="true" />
          Use cloud AI (Google Gemini) — no download
        </span>
        <span className="block text-xs text-slate-400 mt-1">
          {enabled
            ? 'On: the chat text you analyze is sent to Google Gemini via this app’s server. Turn off to keep everything on this device. Google may use free-tier requests to improve its products.'
            : 'Off: chats stay on this device. Turn on for fast, high-quality AI without downloading a model. This sends chat text to Google (free tier: may be used to improve Google products).'}
        </span>
      </span>
    </label>
  </div>
);
