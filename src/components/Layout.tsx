import React, { useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';
import { PrivacyBadge } from './PrivacyBadge';

export interface LayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, sidebar }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md z-30 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
            aria-label="Toggle menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="bg-green-500/10 p-1.5 rounded-lg border border-green-500/20">
              <Sparkles className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                ChatCheat
              </h1>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest hidden sm:block">
                What Did I Miss?
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <PrivacyBadge />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`
            fixed md:static inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col
            ${isMobileSidebarOpen ? 'translate-x-0 mt-16 h-[calc(100vh-4rem)]' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <div className="flex-1 overflow-y-auto py-2">
            <h2 className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              History
            </h2>
            {sidebar}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-5xl mx-auto pb-20">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 py-3 px-4 border-t border-slate-800 bg-slate-900 text-center z-20">
        <p className="text-xs text-slate-500 font-medium">
          Powered by WebLLM · 100% Local AI
        </p>
      </footer>
    </div>
  );
};
