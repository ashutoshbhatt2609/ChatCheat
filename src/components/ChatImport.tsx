import React, { useCallback, useState } from 'react';
import { Upload, FileText, ClipboardPaste, MessageSquare, Loader2, MessageCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { SAMPLE_CHAT } from '../sampleChat';

export interface ChatImportProps {
  onImport: (text: string, fileName?: string) => void;
  isProcessing: boolean;
}

/**
 * Component for importing chat logs via drag-and-drop, file select, or pasting text.
 */
export const ChatImport: React.FC<ChatImportProps> = ({ onImport, isProcessing }) => {
  const [pasteText, setPasteText] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          onImport(text, file.name);
        }
      };
      reader.readAsText(file);
    }
  }, [onImport]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/json': ['.json'],
      'text/csv': ['.csv']
      
    },
    disabled: isProcessing,
    multiple: false
  });

  const handlePasteSubmit = () => {
    if (pasteText.trim()) {
      onImport(pasteText.trim(), 'Pasted Chat');
      setPasteText('');
    }
  };

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onImport(text, 'Clipboard Paste');
      }
    } catch (err) {
      console.error('Failed to read clipboard text: ', err);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer
          ${isDragActive ? 'border-green-500 bg-green-500/10' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex justify-center mb-4 text-slate-400">
          {isProcessing ? (
            <Loader2 className="w-12 h-12 animate-spin text-green-500" />
          ) : (
            <Upload className="w-12 h-12" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">
          {isProcessing ? 'Processing Chat Log...' : isDragActive ? 'Drop your file here' : 'Drag & Drop Chat Export'}
        </h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
          Support for .txt, .json, .csv files from major messaging platforms. Data is processed locally.
        </p>
        
        {!isProcessing && (
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 rounded-full text-xs text-slate-400 border border-slate-700">
              <MessageCircle className="w-3 h-3 text-green-500" /> WhatsApp
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 rounded-full text-xs text-slate-400 border border-slate-700">
              <MessageSquare className="w-3 h-3 text-blue-400" /> Telegram
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 rounded-full text-xs text-slate-400 border border-slate-700">
              <FileText className="w-3 h-3 text-indigo-400" /> Discord
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 rounded-full text-xs text-slate-400 border border-slate-700">
              <MessageSquare className="w-3 h-3 text-red-400" /> Slack
            </span>
          </div>
        )}
      </div>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-slate-700"></div>
        <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">or</span>
        <div className="flex-grow border-t border-slate-700"></div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 focus-within:ring-2 focus-within:ring-green-500/50 transition-all">
        <div className="flex justify-between items-center mb-3">
          <label htmlFor="paste-area" className="text-sm font-medium text-slate-300">
            Paste Raw Text
          </label>
          <button
            onClick={handleClipboardPaste}
            disabled={isProcessing}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 bg-slate-900 rounded border border-slate-700 hover:border-slate-600 disabled:opacity-50"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            From Clipboard
          </button>
        </div>
        <textarea
          id="paste-area"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          disabled={isProcessing}
          placeholder="Paste conversation text here (e.g., [10:24 AM] Alice: Hello team...)"
          className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-green-500/50 disabled:opacity-50"
        />
        <div className="mt-3 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onImport(SAMPLE_CHAT, 'Sample Chat')}
            disabled={isProcessing}
            className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Try sample chat
          </button>
          <button
            onClick={handlePasteSubmit}
            disabled={!pasteText.trim() || isProcessing}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Process Text
          </button>
        </div>
      </div>
    </div>
  );
};
