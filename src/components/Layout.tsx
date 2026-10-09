import React, { useState } from 'react';
import { Menu, Plus, PanelLeftClose, Sparkles, X } from 'lucide-react';

export const Logo: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect x="2" y="2" width="28" height="28" rx="9" fill="#f97316" />
    <path d="M9 11.5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-5l-4 3.5v-3.5a3 3 0 0 1-2-2.8z" fill="#18181b" />
    <path d="m12.5 14 2.2 2.2L19.5 12" stroke="#f97316" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export interface LayoutProps {
  children: React.ReactNode;
  /** History list rendered inside the sidebar. */
  history: React.ReactNode;
  /** Shortcuts under "New chat" (e.g. sample chat). */
  nav?: React.ReactNode;
  /** Bottom of sidebar: settings / account. */
  account: React.ReactNode;
  /** Left side of the top bar (engine picker). */
  topLeft: React.ReactNode;
  /** Right side of the top bar. */
  topRight?: React.ReactNode;
  onNewChat: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, history, nav, account, topLeft, topRight, onNewChat }) => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const newChat = () => {
    onNewChat();
    setOpen(false);
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans flex p-0 md:p-3 gap-3 overflow-hidden">
      {open && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        aria-label="Sidebar"
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 flex-shrink-0 flex-col bg-zinc-900 md:rounded-2xl border border-zinc-800
          ${collapsed ? 'md:hidden' : 'md:flex'} ${open ? 'flex' : 'hidden'}`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-semibold tracking-tight">ChatCheat</span>
          </div>
          <button
            onClick={() => (open ? setOpen(false) : setCollapsed(true))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            aria-label="Close sidebar"
          >
            {open ? <X className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={newChat}
            className="w-full flex items-center justify-between rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-medium text-sm px-3.5 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> New chat
            </span>
          </button>
          {nav && <nav className="mt-3 space-y-0.5">{nav}</nav>}
        </div>

        <div className="mt-3 flex-1 overflow-y-auto px-2 pb-2">{history}</div>

        <div className="border-t border-zinc-800 p-3">{account}</div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 min-w-0 flex flex-col bg-zinc-900 md:rounded-2xl border border-zinc-800 overflow-hidden">
        <header className="flex-shrink-0 h-14 px-3 md:px-4 flex items-center justify-between gap-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => (collapsed ? setCollapsed(false) : setOpen(true))}
              className={`p-2 -ml-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/60 ${
                collapsed ? '' : 'md:hidden'
              }`}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            {topLeft}
          </div>
          <div className="flex items-center gap-2">{topRight}</div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          <div className="max-w-3xl mx-auto">{children}</div>
        </main>

        <footer className="flex-shrink-0 py-2.5 px-4 text-center text-[11px] text-zinc-500 border-t border-zinc-800/60">
          <Sparkles className="inline w-3 h-3 mr-1 -mt-0.5 text-orange-500" aria-hidden="true" />
          ChatCheat can make mistakes. Check important info. Chats stay on this device unless you sign in or use cloud AI.
        </footer>
      </div>
    </div>
  );
};
