import React, { useState } from 'react';
import {
  Search,
  Bell,
  RefreshCw,
  Sparkles,
  Zap,
  Terminal,
  ExternalLink,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  UserCheck,
  Plus,
} from 'lucide-react';
import { DatabaseStats, User as UserType } from '../../types';
import { MainNavTab } from './AppSidebar';
import { CandidateProfile } from '../../lib/candidatePresets';

interface TopNavbarProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefreshData: () => void;
  refreshing: boolean;
  stats: DatabaseStats | null;
  currentUser: UserType | null;
  onOpenOnboarding: () => void;
  activeCandidate?: CandidateProfile;
  onOpenAddResume?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  onRefreshData,
  refreshing,
  stats,
  currentUser,
  onOpenOnboarding,
  activeCandidate,
  onOpenAddResume,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'overview':
        return { title: 'Command Center', subtitle: 'Live Qualified Internship Matches & Scoring' };
      case 'preferences':
        return { title: 'Target Preferences', subtitle: 'Target Roles, Locations, Tiers & Thresholds' };
      case 'resume':
        return { title: 'Resume Intelligence', subtitle: 'Modular Vector Embeddings & Delta Updates' };
      case 'hiring-insights':
        return { title: 'Hiring Analytics', subtitle: 'Historical Hiring Velocity & Pass-Through Predictor' };
      case 'alerts':
        return { title: 'Alerts & Channels', subtitle: 'Real-time Telegram Webhooks & Email Dispatch' };
      case 'feedback':
        return { title: 'Adaptive Feedback', subtitle: 'Interview Outcome Tracking & Weight Calibration' };
      case 'dev-sandbox':
        return { title: 'Developer Sandbox & System Tools', subtitle: 'Phase 1–15 Test Suite, Concurrency Benchmark & Vector Bench' };
      default:
        return { title: 'Dashboard', subtitle: 'AI Internship Scout' };
    }
  };

  const { title, subtitle } = getPageTitle();

  const mockNotifications = [
    {
      id: 'notif-1',
      title: 'High Match Dispatched to Telegram (96%)',
      desc: 'Quantitative Research Intern @ Citadel Securities',
      time: '12m ago',
      type: 'high-match',
    },
    {
      id: 'notif-2',
      title: 'New Stated JD Ingested from Greenhouse',
      desc: 'Systems Engineer Intern @ OpenAI',
      time: '34m ago',
      type: 'scrape',
    },
    {
      id: 'notif-3',
      title: 'Resume Sub-Vector Delta Applied',
      desc: 'Added Triton GPU Kernel skill • +6.2% score uplift',
      time: '1h ago',
      type: 'resume',
    },
  ];

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left: Dynamic Title & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden sm:flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">InternAtlas</span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-sm font-bold text-white tracking-tight">{title}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium truncate">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search matching jobs, companies, skills..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-12 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls: Active Candidate Pill, Ingestion Status, Refresh Button, Notifications, Dev Tool Trigger */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Active Candidate Badge / Switcher */}
        {activeCandidate && (
          <button
            onClick={() => onSelectTab('resume')}
            className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-[11px] text-indigo-200 transition-all cursor-pointer shadow-sm group"
            title="Click to view or switch candidate resume"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white group-hover:text-indigo-200 truncate max-w-[130px]">
              {activeCandidate.name}
            </span>
            <span className="text-[10px] text-indigo-400 font-medium">
              ({activeCandidate.school.split(' ')[0]})
            </span>
          </button>
        )}

        {/* ATS Live Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">4 ATS Feeds Active</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-400 font-mono">
            {stats?.jobsCount ? `${stats.jobsCount} Indexed` : 'Auto-Sync'}
          </span>
        </div>

        {/* Refresh / Re-evaluate Match Button */}
        <button
          onClick={onRefreshData}
          disabled={refreshing}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          title="Refresh match scores & ATS feeds"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Notifications & Dispatches"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Live Dispatches & Alerts</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 rounded">
                    3 New
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {mockNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all text-left"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200 mb-0.5">
                      <span className="truncate">{n.title}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{n.desc}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    onSelectTab('alerts');
                  }}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Configure Telegram Bot &rarr;
                </button>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-300"
                >
                  Dismiss All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Dev Sandbox Button */}
        <button
          onClick={() => onSelectTab('dev-sandbox')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
            activeTab === 'dev-sandbox'
              ? 'bg-cyan-600/30 text-cyan-200 border-cyan-500/50'
              : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-800'
          }`}
          title="Open Developer Sandbox & Phase Labs"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Dev Sandbox</span>
        </button>
      </div>
    </header>
  );
};
