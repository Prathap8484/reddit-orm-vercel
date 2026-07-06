import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck, Download, Settings, X, Check,
  MessageSquare, ThumbsUp, Calendar, ArrowRight,
  ExternalLink, Inbox, AlertTriangle, RefreshCw,
  ChevronDown, Loader2, CheckCircle2, Search,
  SlidersHorizontal, Tag, Globe, Zap, Smartphone, Clock
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
//  SETTINGS PANEL (Slide-out drawer for configuration)
// ═══════════════════════════════════════════════════════════════════════

function SettingsPanel({ isOpen, onClose, config, onSave }) {
  const [local, setLocal] = useState(config);
  const panelRef = useRef(null);

  useEffect(() => {
    if (isOpen) setLocal(config);
  }, [isOpen, config]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0F1422] border-l border-gray-800/60 z-[70] animate-slide-in-right flex flex-col shadow-2xl shadow-black/50"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/10 p-2.5 rounded-xl">
              <SlidersHorizontal className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-100">Pipeline Configuration</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage scraping rules & AI prompts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* Target Keywords */}
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              Target Keywords
            </label>
            <p className="text-xs text-gray-500 -mt-1">Comma-separated keywords the cron job uses for Reddit search.</p>
            <textarea
              rows={3}
              value={local.keywords}
              onChange={(e) => setLocal({ ...local, keywords: e.target.value })}
              placeholder="samsung galaxy, galaxy s24, galaxy z fold, one ui..."
              className="w-full bg-[#1A2032] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 placeholder-gray-600 text-gray-200 resize-none transition-colors"
            />
          </div>

          {/* Subreddit List */}
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              Subreddit Watchlist
            </label>
            <p className="text-xs text-gray-500 -mt-1">One subreddit per line. The harvest job will scrape these.</p>
            <textarea
              rows={4}
              value={local.subreddits}
              onChange={(e) => setLocal({ ...local, subreddits: e.target.value })}
              placeholder={"samsung\nGalaxyS24\nAndroid\nsmartphones\nPickAnAndroidForMe"}
              className="w-full bg-[#1A2032] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 placeholder-gray-600 text-gray-200 font-mono resize-none transition-colors"
            />
          </div>

          {/* Negative Prompt */}
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Negative Prompt / Exclusions
            </label>
            <p className="text-xs text-gray-500 -mt-1">Phrases to exclude from AI draft responses.</p>
            <textarea
              rows={3}
              value={local.negativePrompt}
              onChange={(e) => setLocal({ ...local, negativePrompt: e.target.value })}
              placeholder="Do not mention competitors by name, avoid pricing claims, no warranty promises..."
              className="w-full bg-[#1A2032] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 placeholder-gray-600 text-gray-200 resize-none transition-colors"
            />
          </div>

          {/* API Passcode */}
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              API Passcode
            </label>
            <input
              type="password"
              value={local.passcode}
              onChange={(e) => setLocal({ ...local, passcode: e.target.value })}
              placeholder="Enter app password if configured..."
              className="w-full bg-[#1A2032] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 placeholder-gray-600 text-gray-200 transition-colors"
            />
          </div>
        </div>

        {/* Panel Footer */}
        <div className="px-6 py-4 border-t border-gray-800/60 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-purple-600/15 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> Save Config
          </button>
        </div>
      </div>
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  MOCK DATA
// ═══════════════════════════════════════════════════════════════════════

const mockLeads = [
  {
    id: 'm1',
    title: 'Should I upgrade from S23 Ultra to S26?',
    subreddit: 'GalaxyS26',
    priorityScore: 85,
    theme: 'Upgrade consideration',
    device: 's26',
    date: new Date().toISOString(),
    upvotes: 45,
    comments: 12,
    drafted_comment: "Battery degradation on older phones is brutal. I was actually weighing similar options recently and ended up grabbing the S26 last month mainly for the battery efficiency on the new chip. The only real downside is the fingerprint sensor can be finicky with thick screen protectors. Happy to answer any questions."
  },
  {
    id: 'm2',
    title: 'Looking for a solid mid-range phone, is A37 worth it?',
    subreddit: 'smartphones',
    priorityScore: 75,
    theme: 'Purchase advice',
    device: 'a37',
    date: new Date(Date.now() - 86400000).toISOString(),
    upvotes: 23,
    comments: 8,
    drafted_comment: "The A37 is a fantastic mid-range option right now. Samsung really nailed the balance between screen quality and battery life this year. I've been using it for a few weeks and the 120Hz AMOLED makes a huge difference compared to older A-series models. Just make sure to get a case, the back can be a bit slippery."
  },
  {
    id: 'm3',
    title: 'A57 vs Pixel 8a? Which one takes better photos?',
    subreddit: 'PickAnAndroidForMe',
    priorityScore: 65,
    theme: 'Camera comparison',
    device: 'a57',
    date: new Date(Date.now() - 172800000).toISOString(),
    upvotes: 112,
    comments: 41,
    drafted_comment: "I tested both extensively before settling on the A57. While the Pixel has slightly better point-and-shoot reliability for moving subjects, the A57's ultrawide lens is noticeably sharper and the video stabilization is a step up. Plus, the overall battery life on the A57 blows the Pixel out of the water in my experience."
  },
  {
    id: 'm4',
    title: 'What are the main differences between S26 and S26 Ultra?',
    subreddit: 'samsung',
    priorityScore: 80,
    theme: 'Feature comparison',
    device: 's26',
    date: new Date().toISOString(),
    upvotes: 89,
    comments: 26,
    drafted_comment: "The main differences come down to the S-Pen, camera zoom, and physical size. I went with the base S26 because the Ultra was just too unwieldy for one-handed use. Unless you absolutely need the 10x optical zoom or the stylus for note-taking, the regular S26 gives you 95% of the experience in a much more comfortable form factor."
  },
  {
    id: 'm5',
    title: 'Is the A37 getting the new One UI update?',
    subreddit: 'Android',
    priorityScore: 45,
    theme: 'Software updates',
    device: 'a37',
    date: new Date(Date.now() - 259200000).toISOString(),
    upvotes: 15,
    comments: 4,
    drafted_comment: "Yes, Samsung confirmed the A37 is on the rollout list for the latest One UI. They've really improved their software support recently, offering 4 years of OS updates for the A-series which is honestly better than what most other Android manufacturers are doing at this price point."
  }
];

// ═══════════════════════════════════════════════════════════════════════
//  APPROVAL CARD (Individual lead review card in the feed)
// ═══════════════════════════════════════════════════════════════════════

function ApprovalCard({ lead, index, onApprove }) {
  const draftContent = lead.drafted_comment || lead.reason || '';
  const [draft, setDraft] = useState(draftContent);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    // Simulate a Google Sheets append action
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsApproving(false);
    setIsApproved(true);
    if (onApprove) onApprove(lead.id);
  };

  if (isApproved) {
    return (
      <div
        className="bg-emerald-900/15 border border-emerald-500/20 rounded-2xl p-5 animate-fade-in-up"
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <div className="flex items-center gap-3 text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold text-sm">Approved & queued for Google Sheets</span>
          <span className="ml-auto text-xs text-emerald-500/60 font-mono">{lead.id}</span>
        </div>
      </div>
    );
  }

  // Priority badge colors
  const pColor =
    lead.priorityScore >= 70 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
    lead.priorityScore >= 40 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
    'text-gray-400 bg-gray-500/10 border-gray-500/20';

  const formattedDate = lead.date
    ? new Date(lead.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  return (
    <div
      className="card-glow bg-[#111827] border border-gray-800/70 rounded-2xl overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {/* ── Card Header ────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              {lead.subreddit && (
                <span className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/15 px-2.5 py-1 rounded-lg shrink-0">
                  r/{lead.subreddit}
                </span>
              )}
              <span className={`text-xs font-bold border px-2.5 py-1 rounded-lg shrink-0 ${pColor}`}>
                ⚡ {lead.priorityScore}
              </span>
              {lead.theme && (
                <span className="text-xs text-gray-500 font-medium bg-gray-800/40 px-2 py-1 rounded-lg truncate">
                  {lead.theme}
                </span>
              )}
            </div>
            <h3 className="font-bold text-[15px] text-gray-100 leading-snug pr-2">
              {lead.title || 'Untitled Post'}
            </h3>
          </div>
          {lead.link && (
            <a
              href={lead.link}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-2 rounded-lg bg-gray-800/50 hover:bg-purple-600/15 text-gray-500 hover:text-purple-400 transition-all"
              title="Open on Reddit"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* ── Metadata Row ───────────────────────────────────── */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <ThumbsUp className="w-3.5 h-3.5 text-amber-500/70" />
            <span className="font-semibold text-gray-300">{lead.upvotes ?? '–'}</span>
            upvotes
          </span>
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500/70" />
            <span className="font-semibold text-gray-300">{lead.comments ?? '–'}</span>
            comments
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-500/70" />
            {formattedDate}
          </span>
          {lead.phone && (
            <span className="text-gray-600 ml-auto font-mono text-[11px] truncate max-w-[120px]">
              {lead.phone}
            </span>
          )}
        </div>
      </div>

      {/* ── E-E-A-T Draft Review Section ──────────────────── */}
      <div className="px-5 pb-4">
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-purple-400/80 uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          E-E-A-T Optimized Draft Response
        </label>
        <textarea
          rows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="AI-generated response draft will appear here for your review..."
          className="w-full bg-[#0B0F19] border border-gray-800/60 focus:border-purple-500/30 rounded-xl px-4 py-3 text-sm focus:outline-none text-gray-300 font-mono leading-relaxed resize-none transition-colors placeholder-gray-600"
        />
      </div>

      {/* ── Action Footer ─────────────────────────────────── */}
      <div className="px-5 pb-5">
        <button
          onClick={handleApprove}
          disabled={isApproving}
          className="relative w-full font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2.5 approve-pulse bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-emerald-800 disabled:to-emerald-700 disabled:cursor-wait text-white shadow-lg shadow-emerald-600/15 hover:shadow-emerald-500/25"
        >
          {isApproving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Appending to Google Sheets…
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Approve & Append to Google Sheets
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  SKELETON LOADING CARDS
// ═══════════════════════════════════════════════════════════════════════

function SkeletonCard() {
  return (
    <div className="bg-[#111827] border border-gray-800/50 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="shimmer h-5 w-20 rounded-lg" />
        <div className="shimmer h-5 w-12 rounded-lg" />
      </div>
      <div className="shimmer h-5 w-3/4 rounded-lg" />
      <div className="flex gap-4">
        <div className="shimmer h-4 w-20 rounded" />
        <div className="shimmer h-4 w-24 rounded" />
        <div className="shimmer h-4 w-28 rounded" />
      </div>
      <div className="shimmer h-24 w-full rounded-xl" />
      <div className="shimmer h-12 w-full rounded-xl" />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════

function EmptyState({ onRefresh }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
      <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-6 rounded-3xl mb-6 border border-purple-500/10">
        <Inbox className="w-12 h-12 text-purple-400/60" />
      </div>
      <h2 className="text-xl font-bold text-gray-200 mb-2">Inbox Zero</h2>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
        No pending approvals. The backend cron job hasn't harvested any leads yet, or all leads have been approved.
      </p>
      <p className="text-xs text-gray-600 max-w-sm mb-6 font-mono">
        Run <code className="bg-gray-800 px-2 py-0.5 rounded text-purple-400">node harvest.mjs</code> and{' '}
        <code className="bg-gray-800 px-2 py-0.5 rounded text-purple-400">node ai-filter.mjs</code> to populate the queue.
      </p>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 bg-purple-600/15 hover:bg-purple-600/25 text-purple-400 border border-purple-500/20 hover:border-purple-500/40 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
      >
        <RefreshCw className="w-4 h-4" /> Refresh Queue
      </button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD — APPROVAL INBOX
// ═══════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all'); // all | high | medium | low
  const [modelFilter, setModelFilter] = useState('all'); // all | s26 | a37 | a57
  const [approvedIds, setApprovedIds] = useState(new Set());
  const [stats, setStats] = useState({ total: 0, scored: 0, harvested: 0 });
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem('orm-settings');
      return stored ? JSON.parse(stored) : {
        keywords: 'samsung galaxy, galaxy s24, galaxy z fold, one ui',
        subreddits: 'samsung\nGalaxyS24\nAndroid\nsmartphones\nPickAnAndroidForMe',
        negativePrompt: '',
        passcode: '',
      };
    } catch {
      return {
        keywords: '',
        subreddits: '',
        negativePrompt: '',
        passcode: '',
      };
    }
  });

  // Persist config
  const saveConfig = useCallback((newConfig) => {
    setConfig(newConfig);
    try { localStorage.setItem('orm-settings', JSON.stringify(newConfig)); } catch {}
  }, []);

  // Fetch leads from the API
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/leads', {
        headers: {
          'x-app-password': config.passcode || '',
        },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Failed to fetch leads');
      const data = await response.json();
      setLeads(data.leads || []);
      setStats(data.counts || { total: 0, scored: 0, harvested: 0 });
    } catch (err) {
      setError(err.message);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [config.passcode]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Filters ──
  const filteredLeads = leads
    .filter(l => !approvedIds.has(l.id))
    .filter(l => {
      // STRICT FILTERING: Must have a valid drafted comment
      return l.drafted_comment && l.drafted_comment.trim().length > 0;
    })
    .filter(l => {
      if (filterPriority === 'high') return l.priorityScore >= 70;
      if (filterPriority === 'medium') return l.priorityScore >= 40 && l.priorityScore < 70;
      if (filterPriority === 'low') return l.priorityScore < 40;
      return true;
    })
    .filter(l => {
      // Model filter — checks phone, title, theme, and reason fields for device mentions
      if (modelFilter === 'all') return true;
      const haystack = [
        l.phone, l.title, l.theme, l.reason, l.device
      ].filter(Boolean).join(' ').toLowerCase();
      if (modelFilter === 's26') return haystack.includes('s26') || haystack.includes('galaxy s26');
      if (modelFilter === 'a37') return haystack.includes('a37') || haystack.includes('galaxy a37');
      if (modelFilter === 'a57') return haystack.includes('a57') || haystack.includes('galaxy a57');
      return true;
    })
    .filter(l => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (l.title || '').toLowerCase().includes(q) ||
        (l.subreddit || '').toLowerCase().includes(q) ||
        (l.theme || '').toLowerCase().includes(q) ||
        (l.reason || '').toLowerCase().includes(q)
      );
    });

  const handleApprove = (id) => {
    setApprovedIds(prev => new Set([...prev, id]));
  };

  const pendingCount = leads.filter(l => !approvedIds.has(l.id)).length;

  // CSV export
  const handleExport = () => {
    if (filteredLeads.length === 0) return;
    const headers = ['Title', 'Link', 'Subreddit', 'Upvotes', 'Comments', 'Date', 'Priority', 'Theme', 'Draft'];
    const rows = filteredLeads.map(l => [
      `"${(l.title || '').replace(/"/g, '""')}"`,
      l.link || '',
      l.subreddit || '',
      l.upvotes ?? '',
      l.comments ?? '',
      l.date || '',
      l.priorityScore || '',
      l.theme || '',
      `"${(l.reason || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `approved-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#050810] text-gray-100 font-sans flex flex-col">

      {/* ═════════════════════════════════════════════════════════════ */}
      {/*  TOP HEADER BAR                                              */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <header className="glass-panel sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-600 to-purple-500 p-2.5 rounded-xl text-white font-black text-sm shadow-lg shadow-purple-500/20">
            S
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight tracking-tight">Samsung ORM</h1>
            <p className="text-[11px] text-gray-500 font-medium">Approval Inbox</p>
          </div>
        </div>

        {/* Center Stats */}
        <div className="hidden md:flex items-center gap-4 bg-[#0F1422]/80 px-5 py-2 rounded-2xl border border-gray-800/40 text-xs font-medium">
          <span className="text-gray-400">
            Pending: <strong className="text-amber-400 ml-1">{pendingCount}</strong>
          </span>
          <span className="w-px h-4 bg-gray-800" />
          <span className="text-gray-400">
            Approved: <strong className="text-emerald-400 ml-1">{approvedIds.size}</strong>
          </span>
          <span className="w-px h-4 bg-gray-800" />
          <span className="text-gray-400">
            Harvested: <strong className="text-purple-400 ml-1">{stats.harvested || leads.length}</strong>
          </span>
          <span className="w-px h-4 bg-gray-800" />
          <span className="text-gray-400">
            AI Scored: <strong className="text-blue-400 ml-1">{stats.scored || 0}</strong>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center gap-1.5 bg-gray-800/60 hover:bg-gray-700 px-3.5 py-2 rounded-xl font-semibold text-gray-300 transition-all text-xs border border-gray-700/40"
            title="Refresh feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-gray-800/60 hover:bg-gray-700 px-3.5 py-2 rounded-xl font-semibold text-gray-300 transition-all text-xs border border-gray-700/40"
            title="Export visible leads as CSV"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => { /* TODO: wire to backend scraping pipeline */ }}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl font-bold text-white transition-all text-xs shadow-lg shadow-purple-600/20 hover:shadow-purple-700/30"
            title="Trigger the scraping pipeline to find new leads"
          >
            🔍 Find New Leads
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="bg-purple-600/15 hover:bg-purple-600/25 text-purple-400 border border-purple-500/25 hover:border-purple-500/40 p-2.5 rounded-xl font-semibold transition-all"
            title="Pipeline settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/*  FILTER BAR                                                  */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <div className="sticky top-[62px] z-40 glass-panel border-t-0 px-6 py-3 flex flex-col gap-3">
        {/* Row 1: Search + Count */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by title, subreddit, or topic…"
              className="w-full bg-[#0F1422] border border-gray-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-purple-500/40 placeholder-gray-600 text-gray-200 transition-colors"
            />
          </div>

          {/* Count indicator */}
          <span className="text-xs text-gray-500 ml-auto shrink-0">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Row 2: Model Filter Segment Control */}
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-purple-400/70 shrink-0" />
          <div className="flex items-center gap-1.5 bg-[#0B0F19] p-1 rounded-xl border border-gray-800/40">
            {[
              { key: 'all', label: 'All Models' },
              { key: 's26', label: 'Galaxy S26' },
              { key: 'a37', label: 'Galaxy A37' },
              { key: 'a57', label: 'Galaxy A57' },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setModelFilter(m.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  modelFilter === m.key
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Priority Filter Chips (kept inline) */}
          <div className="flex items-center gap-1.5 ml-auto">
            {[
              { key: 'all', label: 'All', color: 'text-gray-300' },
              { key: 'high', label: '⚡ High', color: 'text-emerald-400' },
              { key: 'medium', label: '◉ Medium', color: 'text-amber-400' },
              { key: 'low', label: '○ Low', color: 'text-gray-400' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterPriority(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  filterPriority === f.key
                    ? 'bg-purple-600/15 text-purple-400 border-purple-500/30'
                    : 'bg-transparent text-gray-500 border-gray-800/40 hover:border-gray-700 hover:text-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/*  MAIN FEED — PENDING APPROVALS                               */}
      {/*                                                               */}
      {/*  BACKEND REMINDER (for Python pipeline / harvest.mjs):        */}
      {/*  The duckduckgo-search implementation MUST include the        */}
      {/*  `time='w'` parameter to restrict results to the last week.   */}
      {/*  This ensures only recent, high-intent leads appear in the    */}
      {/*  Approval Inbox. Example:                                     */}
      {/*    results = ddgs.text(query, time='w')                       */}
      {/*  See also: harvest.mjs — ensure &t=w is appended to search.   */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">

          {/* ── Task 2: Recency Badge ────────────────────────────── */}
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-purple-600/10 via-blue-600/8 to-transparent border border-purple-500/15 rounded-xl px-4 py-2.5 animate-fade-in-up">
            <Clock className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-xs font-semibold text-purple-300/90 tracking-wide">
              Showing High-Intent Leads from the Last 7 Days
            </span>
            <span className="ml-auto text-[10px] text-gray-600 font-mono">time=w</span>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-900/15 border border-red-500/25 rounded-2xl p-5 flex items-start gap-3 animate-fade-in-up">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400 mb-1">Failed to load leads</p>
                <p className="text-xs text-red-400/70">{error}</p>
                <button
                  onClick={fetchLeads}
                  className="mt-3 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && leads.length === 0 && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {/* Empty State */}
          {!loading && !error && filteredLeads.length === 0 && (
            <EmptyState onRefresh={fetchLeads} />
          )}

          {/* Lead Cards Feed */}
          {filteredLeads.map((lead, idx) => (
            <ApprovalCard
              key={lead.id}
              lead={lead}
              index={idx}
              onApprove={handleApprove}
            />
          ))}

          {/* End-of-feed indicator */}
          {!loading && filteredLeads.length > 0 && (
            <div className="text-center py-8 text-xs text-gray-600 flex flex-col items-center gap-2">
              <div className="w-8 h-px bg-gray-800" />
              End of queue — {filteredLeads.length} pending approval{filteredLeads.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </main>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/*  SETTINGS PANEL (Slide-out)                                  */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSave={saveConfig}
      />
    </div>
  );
}
