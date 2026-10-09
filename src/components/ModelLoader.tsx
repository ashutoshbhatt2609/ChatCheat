import React from 'react';
import { Download, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export interface LoadingProgress {
  stage: 'downloading' | 'loading' | 'ready' | 'error';
  progress: number;
  message: string;
}

export interface ModelLoaderProps {
  progress: LoadingProgress;
  onSelectModel: (id: string) => void;
  currentModel: string | null;
}

const MODELS = [
  { id: 'phi-4-mini', name: 'Phi-3.5 Mini', size: '~2.2 GB', desc: 'Best reasoning, 128K context' },
  { id: 'qwen3-1.7b', name: 'Qwen 2.5 (1.5B)', size: '~1.2 GB', desc: 'Lightweight & fast' },
];

/**
 * Component for selecting and loading an LLM model into WebLLM.
 */
export const ModelLoader: React.FC<ModelLoaderProps> = ({ progress, onSelectModel, currentModel }) => {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 w-full max-w-md mx-auto">
      <div className="mb-4">
        <label htmlFor="model-select" className="block text-sm font-medium text-slate-300 mb-2">
          Select AI Model
        </label>
        <select
          id="model-select"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:opacity-50"
          value={currentModel || ''}
          onChange={(e) => onSelectModel(e.target.value)}
          disabled={progress.stage === 'downloading' || progress.stage === 'loading'}
        >
          <option value="" disabled>Choose a model...</option>
          {MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.size}) - {model.desc}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        {progress.stage === 'ready' && (
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium bg-green-400/10 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span>Model is loaded and ready to use!</span>
          </div>
        )}

        {progress.stage === 'error' && (
          <div className="flex flex-col gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-5 h-5" />
              <span>Failed to load model</span>
            </div>
            <p className="text-xs text-red-300 opacity-90">{progress.message}</p>
            <button 
              onClick={() => currentModel && onSelectModel(currentModel)}
              className="mt-1 self-start px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-300 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {(progress.stage === 'downloading' || progress.stage === 'loading') && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                {progress.stage === 'downloading' ? 'Downloading model...' : 'Loading model into memory...'}
              </span>
              <span className="text-green-400 font-medium">
                {Math.round(progress.progress)}%
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
              <div 
                className="bg-green-500 h-2.5 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${Math.max(0, Math.min(100, progress.progress))}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <p className="text-xs text-slate-400 truncate" title={progress.message}>
              {progress.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
