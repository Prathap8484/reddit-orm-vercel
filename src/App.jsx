import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Link as LinkIcon } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('studio');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [activeAngles, setActiveAngles] = useState(['Battery Life']);

  // Mock Metadata mimicking CSV structure
  const metadata = {
    title: "S21 is dying by 2PM. Is the S26 battery actually better?",
    url: "https://reddit.com/r/GalaxyS26/comments/xyz123/...",
    upvotes: 142,
    comments: 67,
    date: "2026-07-05 14:30:00"
  };

  const angles = ['Battery Life', 'Camera Quality', 'Price/Value', 'Software Updates', 'Durability'];

  const toggleAngle = (angle) => {
    setActiveAngles(prev => 
      prev.includes(angle) ? prev.filter(a => a !== angle) : [...prev, angle]
    );
  };

  return (
    <div className="min-h-screen bg-[#050810] text-gray-200 flex flex-col font-sans">
      {/* HEADER */}
      <header className="h-14 border-b border-white/10 bg-[#0B0F19] flex items-center px-4 shrink-0">
        <div className="text-xl font-bold bg-purple-600 text-white w-8 h-8 rounded-lg flex items-center justify-center mr-3">S</div>
        <div>
          <div className="font-bold text-sm text-white leading-tight">Samsung ORM</div>
          <div className="text-xs text-slate-400">Executive Cockpit</div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT SIDEBAR: History (Collapsible) */}
        <aside 
          className={`transition-all duration-300 ease-in-out border-r border-white/10 bg-[#0B0F19]/50 flex flex-col relative z-20 ${
            leftSidebarOpen ? 'w-64' : 'w-0 border-r-0'
          }`}
        >
          {leftSidebarOpen && (
            <div className="p-4 flex-1 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-white">History</span>
                <button className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded">+ New</button>
              </div>
              <input 
                type="text" 
                placeholder="Search history..." 
                className="w-full bg-[#1E2330] border border-white/10 rounded-md px-3 py-2 text-sm mb-4 outline-none focus:border-purple-500 transition-colors text-white"
              />
              <div className="text-xs text-slate-500 text-center mt-10">No recent history</div>
            </div>
          )}
        </aside>

        {/* SIDEBAR TOGGLE BUTTON */}
        <button 
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className="absolute z-30 top-4 bg-purple-600 text-white rounded-full p-1 shadow-lg border border-purple-400 hover:bg-purple-500 transition-all"
          style={{ left: leftSidebarOpen ? '244px' : '16px' }}
          title="Toggle Sidebar"
        >
          {leftSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* CENTER CONSOLE */}
        <main className="flex-1 flex flex-col h-full overflow-hidden p-6 relative bg-gradient-to-b from-[#0B0F19]/20 to-[#050810]">
          
          {/* FIX 1: Top Navigation (Segmented Control) */}
          <div className="flex justify-center mb-6 shrink-0 pt-2">
            <div className="bg-[#1E2330] p-1 rounded-full flex gap-1 border border-white/5 shadow-inner">
              {['studio', 'leads', 'filter'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeTab === tab 
                      ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab === 'studio' && 'Comment Studio'}
                  {tab === 'leads' && 'Lead Finder'}
                  {tab === 'filter' && 'AI Filter Studio'}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'studio' && (
            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full gap-5 overflow-y-auto pb-4">
              
              {/* FIX 2: Linear Center Console - TOP (URL Input) */}
              <div className="bg-[#1E2330] border border-white/10 rounded-xl p-4 shrink-0 shadow-sm">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Source URL</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="url" 
                      placeholder="Paste Reddit URL here..." 
                      className="w-full bg-[#0B0F19] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-purple-500 transition-colors placeholder-slate-600"
                      defaultValue={metadata.url}
                    />
                  </div>
                  <button className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                    Fetch Context
                  </button>
                </div>
              </div>

              {/* FIX 2: Linear Center Console - MIDDLE (Native Data Card Preview) */}
              <div className="bg-[#1E2330] border border-purple-500/20 rounded-xl p-5 shrink-0 shadow-[0_4px_20px_rgba(139,92,246,0.05)]">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <h2 className="text-lg font-semibold text-white leading-snug pr-4">{metadata.title}</h2>
                  <span className="bg-white/5 text-xs px-2 py-1 rounded text-slate-400 whitespace-nowrap border border-white/5">{metadata.date}</span>
                </div>
                <div className="flex gap-8 text-sm">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Upvotes</span>
                    <span className="text-amber-400 font-semibold mt-1">{metadata.upvotes}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Comments</span>
                    <span className="text-blue-400 font-semibold mt-1">{metadata.comments}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Target Lead</span>
                    <span className="text-emerald-400 font-semibold mt-1">Accept</span>
                  </div>
                </div>
              </div>

              {/* FIX 2: Linear Center Console - BOTTOM (Action Area & Export) */}
              <div className="flex-1 min-h-[220px] flex flex-col bg-[#0B0F19]/80 border border-white/10 rounded-xl overflow-hidden shadow-sm relative">
                <div className="px-4 py-2 border-b border-white/5 bg-[#1E2330]/50 flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">E-E-A-T Comment Draft</span>
                  <span className="text-xs text-purple-400 flex items-center gap-1"><CheckCircle2 size={12}/> Ready for review</span>
                </div>
                <textarea 
                  className="flex-1 w-full bg-transparent p-5 text-gray-200 outline-none resize-none placeholder-slate-600 leading-relaxed text-[15px]"
                  placeholder="Draft your E-E-A-T response here..."
                  defaultValue={"Battery degradation on older phones is brutal. I was actually weighing similar options recently and ended up grabbing the S26 last month, mainly because I needed reliable battery life for travel. The efficiency on the newer chip has been holding up pretty well so far.\n\nThe only real downside I've noticed is that the fingerprint sensor can be a bit finicky if you're using a thicker glass screen protector. Happy to answer any specific questions if it helps."}
                />
                
                {/* Approve & Export Button */}
                <div className="bg-[#1E2330] border-t border-white/5 p-4 flex justify-between items-center">
                  <span className="text-xs text-slate-500">All E-E-A-T rules passed</span>
                  <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-10 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all flex items-center gap-2">
                    Approve & Export
                  </button>
                </div>
              </div>

            </div>
          )}

          {activeTab !== 'studio' && (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Select 'Comment Studio' for the executive workflow view.
            </div>
          )}

        </main>

        {/* RIGHT SIDEBAR: Utilities */}
        <aside className="w-72 border-l border-white/10 bg-[#0B0F19]/50 flex flex-col p-5 overflow-y-auto shrink-0 z-10">
          
          {/* FIX 3: Muted Dark-Mode Utilities (Quick Templates) */}
          <div className="mb-8">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Templates</h3>
            <div className="space-y-2">
              {['Soft Pitch (Battery)', 'Comparison (Camera)', 'Upgrade Advice'].map((tpl, i) => (
                <button 
                  key={i}
                  className="w-full text-left bg-[#1E2330] border border-purple-500/30 hover:border-purple-400 text-gray-200 px-4 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
                >
                  {tpl}
                </button>
              ))}
            </div>
          </div>

          {/* FIX 3: Angle Coverage (Interactive Pills) */}
          <div>
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Angle Coverage</h3>
            <div className="flex flex-wrap gap-2">
              {angles.map(angle => {
                const isActive = activeAngles.includes(angle);
                return (
                  <button
                    key={angle}
                    onClick={() => toggleAngle(angle)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all border ${
                      isActive 
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                        : 'bg-[#1E2330] border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
                    }`}
                  >
                    {isActive && <CheckCircle2 size={12} strokeWidth={3} />}
                    {angle}
                  </button>
                );
              })}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
