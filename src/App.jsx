import React, { useState } from 'react';
import { 
  FileText, Search, Filter, ShieldCheck, 
  ChevronRight, Download, Settings, Layers, 
  MessageSquare, ThumbsUp, Calendar, ArrowRight 
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('studio');
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState('reddit');

  // Realistic template data showing correct dark theme colors
  const quickTemplates = [
    { title: "Price caveat", text: "Nobody pays launch price for Samsung tbh..." },
    { title: "Spec caution", text: "Specs on paper mean nothing until real w..." },
    { title: "Comparison", text: "S24 FE literally cheaper and has a bette..." },
    { title: "Camera caution", text: "Portraits overprocess af, faces look pl..." }
  ];

  const angles = ["Battery", "Display", "Software updates", "Camera", "Price/value", "Reliability", "Samsung ecosystem"];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 font-sans flex flex-col">
      {/* --- TOP FIXED HEADER --- */}
      <header className="border-b border-gray-800 bg-[#111827] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2.5 rounded-xl text-white font-bold shadow-lg shadow-purple-500/20">S</div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Samsung ORM</h1>
            <p className="text-xs text-gray-400">Comment Generator & Intent Engine</p>
          </div>
        </div>
        
        {/* Real-time stats engine */}
        <div className="flex items-center gap-6 text-xs font-medium">
          <div className="flex gap-4 bg-[#1F2937] px-4 py-2 rounded-xl border border-gray-800">
            <span className="text-gray-400">Posted: <strong className="text-purple-400 ml-1">0</strong></span>
            <span className="text-gray-400">To Review: <strong className="text-amber-400 ml-1">0</strong></span>
            <span className="text-gray-400">Drafted: <strong className="text-blue-400 ml-1">0</strong></span>
            <span className="text-gray-400">Daily Goal: <strong className="text-emerald-400 ml-1">0/10</strong></span>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg font-semibold text-gray-200 transition-all text-xs">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-3 py-2 rounded-lg font-semibold transition-all text-xs">
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN LAYOUT HOUSING --- */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 1. LEFT SIDEBAR: COLLAPSIBLE HISTORY */}
        <aside className={`${isHistoryOpen ? 'w-64' : 'w-16'} bg-[#0F1422] border-r border-gray-800/60 transition-all duration-300 flex flex-col p-4 relative`}>
          <div className="flex items-center justify-between mb-4">
            {isHistoryOpen && <span className="text-xs font-bold uppercase tracking-wider text-gray-400">History</span>}
            <button 
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 ml-auto text-gray-400"
            >
              <ChevronRight className={`w-4 h-4 transform transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {isHistoryOpen && (
            <>
              <button 
                onClick={() => setActiveTab('finder')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-all shadow-md shadow-purple-600/10 mb-4">
                + New Scrape
              </button>
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-gray-800 rounded-xl bg-[#0B0F19]/40">
                <FileText className="w-8 h-8 text-gray-600 mb-2" />
                <p className="text-xs text-gray-400">No recent leads found yet.</p>
              </div>
            </>
          )}
        </aside>

        {/* 2. CENTER CONSOLE: THE EXECUTIVE WORKSPACE */}
        <main className="flex-1 bg-[#0B0F19] p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* COMPACT SEGMENTED NAVIGATION TAB BAR */}
          <div className="bg-[#111827] p-1 rounded-xl border border-gray-800 max-w-xl mx-auto w-full flex">
            <button 
              onClick={() => setActiveTab('studio')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'studio' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Comment Studio
            </button>
            <button 
              onClick={() => setActiveTab('finder')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'finder' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Search className="w-3.5 h-3.5" /> Lead Finder
            </button>
            <button 
              onClick={() => setActiveTab('filter')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'filter' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Filter className="w-3.5 h-3.5" /> AI Filter Engine
            </button>
          </div>

          {/* STEP 1: POLITE DATA ACQUISITION LAYER */}
          {activeTab === 'finder' && (
            <section className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-500/10 text-purple-400 p-2 rounded-lg text-xs font-bold">01</div>
                <h2 className="font-bold text-sm text-gray-200">Where is the target thread?</h2>
              </div>
              
              <div className="flex gap-3 mb-4">
                <button 
                  onClick={() => setSelectedPlatform('reddit')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border flex items-center gap-2 transition-all ${selectedPlatform === 'reddit' ? 'bg-purple-600/10 text-purple-400 border-purple-500/40' : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-700'}`}
                >
                  🤖 Reddit Link
                </button>
                <button 
                  onClick={() => setSelectedPlatform('quora')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border flex items-center gap-2 transition-all ${selectedPlatform === 'quora' ? 'bg-purple-600/10 text-purple-400 border-purple-500/40' : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-700'}`}
                >
                  🔍 Quora Query
                </button>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Paste the public platform thread URL here..." 
                  className="flex-1 bg-[#1F2937] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/60 placeholder-gray-500 text-gray-200"
                />
                <button 
                  onClick={() => setActiveTab('studio')}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-purple-600/10">
                  Fetch Data
                </button>
              </div>
            </section>
          )}

          {/* STEP 2 & 3: GOVERNANCE & PRODUCTION-READY REVIEW OVERVIEW */}
          {activeTab === 'studio' && (
            <section className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/10 text-purple-400 p-2 rounded-lg text-xs font-bold">02</div>
                  <h2 className="font-bold text-sm text-gray-200">Audit Desk & Response Pipeline</h2>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
                  SYSTEM STATE: ACCEPTED
                </span>
              </div>

              {/* Structured Metric Display - Mirrors your 6 columns */}
              <div className="grid grid-cols-3 gap-3 bg-[#0B0F19] p-3 rounded-xl border border-gray-800/60 text-xs">
                <div className="flex flex-col gap-1"><span className="text-gray-500">Upvotes</span><span className="font-bold text-gray-200 flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5 text-amber-500" /> 142</span></div>
                <div className="flex flex-col gap-1"><span className="text-gray-500">Comments</span><span className="font-bold text-gray-200 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-blue-500" /> 28 replies</span></div>
                <div className="flex flex-col gap-1"><span className="text-gray-500">Published Date</span><span className="font-bold text-gray-200 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-purple-500" /> 2026-07-05</span></div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Raw Context Input</label>
                <textarea 
                  rows={3}
                  placeholder="Target conversation text body will auto-populate right here..."
                  className="w-full bg-[#1F2937] border border-gray-800 rounded-xl p-4 text-sm focus:outline-none placeholder-gray-500 text-gray-300"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> E-E-A-T Optimized AI Response Draft (Column C)
                </label>
                <textarea 
                  rows={5}
                  placeholder="Claude's functional structured output draft will compile inside this workspace container..."
                  className="w-full bg-[#1F2937] border border-purple-500/20 rounded-xl p-4 text-sm focus:outline-none focus:border-purple-500/40 text-gray-200 font-mono leading-relaxed"
                />
              </div>

              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 mt-2">
                Approve Response & Append to Google Sheets CSV <ArrowRight className="w-4 h-4" />
              </button>
            </section>
          )}

          {/* AI FILTER ENGINE VIEW */}
          {activeTab === 'filter' && (
            <section className="bg-[#111827] border border-gray-800/80 rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center text-center gap-4">
              <div className="bg-purple-900/30 p-4 rounded-full mb-2">
                <Filter className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-200">AI Filter Engine</h2>
              <p className="text-sm text-gray-400 max-w-md">
                Configure filtering rules, keyword inclusion/exclusion, and sentiment thresholds to automatically qualify leads before they reach the Comment Studio.
              </p>
              <div className="grid grid-cols-2 gap-4 w-full mt-6 max-w-lg text-left">
                <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-800">
                  <h3 className="text-sm font-bold text-gray-200 mb-1">Keywords</h3>
                  <p className="text-xs text-gray-500">Manage required and excluded terms</p>
                </div>
                <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-800">
                  <h3 className="text-sm font-bold text-gray-200 mb-1">Sentiment</h3>
                  <p className="text-xs text-gray-500">Adjust emotional thresholds</p>
                </div>
              </div>
              <button className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-purple-600/10">
                Save Filter Configuration
              </button>
            </section>
          )}
        </main>

        {/* 3. RIGHT SIDEBAR: DARK MODE COMPLIANT TOOLS */}
        <aside className="w-72 bg-[#0F1422] border-l border-gray-800/60 p-4 flex flex-col gap-6 overflow-y-auto">
          
          {/* FIXED: The blinding white boxes are now beautiful translucent dark containers */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" /> Quick Templates
            </h3>
            <div className="flex flex-col gap-2">
              {quickTemplates.map((template, idx) => (
                <div 
                  key={idx} 
                  className="bg-[#161B26] border border-gray-800/80 hover:border-purple-500/30 rounded-xl p-3 cursor-pointer transition-all flex flex-col gap-1 group"
                >
                  <span className="text-xs font-bold text-purple-400 group-hover:text-purple-300 transition-colors">{template.title}</span>
                  <span className="text-xs text-gray-400 line-clamp-1">{template.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Polished Interactive Angle Coverage Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Angle Coverage</h3>
            <div className="flex flex-wrap gap-1.5">
              {angles.map((angle, idx) => (
                <span 
                  key={idx} 
                  className="bg-[#1F2937] hover:bg-purple-600/10 hover:text-purple-400 border border-gray-800 hover:border-purple-500/20 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 cursor-pointer transition-all flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {angle}
                </span>
              ))}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
