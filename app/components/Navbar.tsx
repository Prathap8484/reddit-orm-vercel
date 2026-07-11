'use client';

import { useState, useEffect } from 'react';

export default function Navbar({ rightContent }: { rightContent?: React.ReactNode }) {
  const [pathname, setPathname] = useState('/');

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-14 px-5 bg-[#0b0f19]/85 backdrop-blur-md border-b border-white/10 shadow-md">
      
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-violet-500 text-white font-bold text-base rounded-lg shadow-lg shadow-violet-500/20">
          S
        </div>
        <div>
          <div className="text-white font-bold text-[15px] leading-tight tracking-wide">Samsung ORM</div>
          <div className="text-slate-400 text-[11px] font-medium tracking-wide">Agency Intelligence</div>
        </div>
      </div>

      {/* Unified Navigation - Center */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1 bg-white/5 px-1.5 py-1.5 rounded-full border border-white/10 shadow-inner">
        <a 
          href="/" 
          className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 ${
            pathname === '/' 
              ? 'bg-white/10 text-white shadow-sm' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Core Tools
        </a>
        <a 
          href="/dashboard" 
          className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 ${
            pathname === '/dashboard' 
              ? 'bg-white/10 text-white shadow-sm' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Analytics Dashboard
        </a>
      </div>

      {/* Page Specific Actions - Right */}
      <div className="flex items-center gap-2 ml-auto">
        {rightContent}
      </div>

    </header>
  );
}
