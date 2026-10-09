import React, { useCallback, useState } from 'react';
import { ArrowUp, ClipboardPaste, FileText, Loader2, Paperclip, ShieldCheck, Upload, Wand2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Logo } from './Layout';
import { SAMPLE_CHAT } from '../sampleChat';

export interface ChatImportProps {
  onImport: (text: string, fileName?: string) => void;
  isProcessing: boolean;
  /** Short text under the composer describing where data goes. */
  privacyNote: string;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Welcome screen: centered heading, large composer (paste or drop), and quick-start cards. */
export const ChatImport: React.FC<ChatImportProps> = ({ onImport, isProcessing, privacyNote }) => {
  const [text, setText] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);

  const onDrop = useCallback(
    (files: File[]) => {
      setFileError(null);
      const file = files[0];
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        setFileError('That file is larger than 5 MB. Export a shorter range of the chat.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => typeof e.target?.result === 'string' && onImport(e.target.result, file.name);
      reader.onerror = () => setFileError('Could not read that file.');
      reader.readAsText(file);
    },
    [onImport],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected: () => setFileError('Unsupported file. Use a .txt, .json or .csv chat export.'),
    accept: { 'text/plain': ['.txt'], 'application/json': ['.json'], 'text/csv': ['.csv'] },
    disabled: isProcessing,
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  const submit = () => {
    if (text.trim() && !isProcessing) {
      onImport(text.trim(), 'Pasted Chat');
      setText('');
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t.trim()) onImport(t, 'Clipboard Paste');
      else setFileError('The clipboard is empty.');
    } catch {
      setFileError('Clipboard access was blocked. Paste into the box instead.');
    }
  };

  const card =
    'text-left rounded-xl border border-zinc-800 bg-zinc-800/30 p-4 hover:bg-zinc-800/60 hover:border-zinc-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/60 transition-colors';

  return (
    <section aria-labelledby="welcome" className="flex flex-col items-center pt-4 md:pt-10">
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-1.5 text-xs text-zinc-400">
        <ShieldCheck className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
        Local-first · you choose where analysis runs
      </span>

      <Logo className="w-12 h-12 mt-8" />
      <h2 id="welcome" className="mt-5 text-3xl md:text-4xl font-normal tracking-tight text-zinc-50 text-center">
        What did you miss?
      </h2>

      <div
        {...getRootProps()}
        className={`mt-8 w-full rounded-2xl border bg-zinc-900 transition-colors ${
          isDragActive ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-700 focus-within:border-zinc-500'
        }`}
      >
        <input {...getInputProps()} aria-label="Upload chat export" />
        <label htmlFor="chat-input" className="sr-only">Paste a chat conversation</label>
        <textarea
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
          disabled={isProcessing}
          placeholder={isDragActive ? 'Drop the file to analyze it…' : 'Paste a chat export here, or drop a file…'}
          className="w-full h-32 resize-none bg-transparent px-4 pt-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-60"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={open}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            >
              <Paperclip className="w-3.5 h-3.5" aria-hidden="true" /> Attach file
            </button>
            <button
              type="button"
              onClick={pasteFromClipboard}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            >
              <ClipboardPaste className="w-3.5 h-3.5" aria-hidden="true" /> Clipboard
            </button>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || isProcessing}
            aria-label="Analyze chat"
            className="grid place-items-center w-9 h-9 rounded-full bg-orange-500 text-zinc-950 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
          </button>
        </div>
        <div className="border-t border-zinc-800 px-4 py-2.5 text-xs text-zinc-500 rounded-b-2xl bg-zinc-900/60">{privacyNote}</div>
      </div>

      {fileError && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {fileError}
        </p>
      )}

      <div className="mt-6 w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button className={card} disabled={isProcessing} onClick={() => onImport(SAMPLE_CHAT, 'Sample Chat')}>
          <Wand2 className="w-4 h-4 text-orange-400" aria-hidden="true" />
          <span className="mt-3 block text-sm font-medium text-zinc-100">Try a sample chat</span>
          <span className="mt-1 block text-xs text-zinc-400">See a summary, action items and priorities in seconds.</span>
        </button>
        <button className={card} disabled={isProcessing} onClick={open}>
          <Upload className="w-4 h-4 text-orange-400" aria-hidden="true" />
          <span className="mt-3 block text-sm font-medium text-zinc-100">Upload an export</span>
          <span className="mt-1 block text-xs text-zinc-400">WhatsApp, Telegram, Slack, Discord (.txt, .json, .csv).</span>
        </button>
        <button className={card} disabled={isProcessing} onClick={pasteFromClipboard}>
          <FileText className="w-4 h-4 text-orange-400" aria-hidden="true" />
          <span className="mt-3 block text-sm font-medium text-zinc-100">Paste from clipboard</span>
          <span className="mt-1 block text-xs text-zinc-400">Copy a conversation, then catch up in one click.</span>
        </button>
      </div>
    </section>
  );
};
