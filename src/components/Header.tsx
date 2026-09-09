import React from 'react';
import { Database, ShieldCheck, Cpu, Sparkles, User, LogIn, Sliders, RefreshCw, Lock, CheckCircle2 } from 'lucide-react';
import { TenantContext, DatabaseStats, User as UserType } from '../types';
import { CostGuardBadge } from './CostGuardBadge';

interface HeaderProps {
  currentTenant: TenantContext;
  availableTenants: TenantContext[];
  onSelectTenant: (tenant: TenantContext) => void;
  stats: DatabaseStats | null;
  onRefreshStats: () => void;
  currentUser: UserType | null;
  authToken: string | null;
  onOpenAuthModal: () => void;
  onOpenOnboarding: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTenant,
  availableTenants,
  onSelectTenant,
  stats,
  onRefreshStats,
  currentUser,
  authToken,
  onOpenAuthModal,
  onOpenOnboarding,
  onLogout,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Brand Logo & App Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  AI Internship Scout
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Phase 2: Auth & Onboarding
                </span>
              </div>
              <p className="text-xs text-slate-400">
                JWT Auth &bull; Zod Validation &bull; Target Preference Onboarding &bull; Multi-Tenant Security
              </p>
            </div>
          </div>

          {/* Right Controls: Auth Profile, Onboarding Launcher, Multi-Tenant Switcher */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* User Profile / Auth Button */}
            {currentUser && authToken ? (
              <div className="flex items-center space-x-2 bg-slate-950 border border-indigo-500/30 rounded-xl p-1.5 pl-2.5">
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={currentUser.fullName}
                  className="w-6 h-6 rounded-lg object-cover border border-indigo-500/40"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-200 block leading-tight">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono block leading-tight">
                    JWT Active
                  </span>
                </div>

                <button
                  onClick={onOpenOnboarding}
                  title="Configure Onboarding Target Criteria"
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  <Sliders className="w-3 h-3" />
                  <span className="hidden sm:inline">Target Criteria</span>
                </button>

                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            )}

            {/* Database Engine Status Badge */}
            <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300 hidden sm:inline">Engine:</span>
              <span className="text-emerald-400 font-mono font-medium">pgvector (768d)</span>
              <button
                onClick={onRefreshStats}
                title="Refresh DB Stats"
                className="text-slate-400 hover:text-white transition-colors ml-0.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* API Cost & Rate Limiting Guardian Badge */}
            <CostGuardBadge />

            {/* Multi-Tenant Switcher */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={currentTenant.tenantId}
                onChange={(e) => {
                  const found = availableTenants.find((t) => t.tenantId === e.target.value);
                  if (found) onSelectTenant(found);
                }}
                className="bg-transparent font-medium text-indigo-300 focus:outline-none cursor-pointer border-none p-0 text-xs"
              >
                {availableTenants.map((t) => (
                  <option key={t.tenantId} value={t.tenantId} className="bg-slate-900 text-slate-100">
                    {t.tenantName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Database Metrics Bar */}
        {stats && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Users:</span>
              <span className="text-slate-200 font-mono font-semibold">{stats.usersCount}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Resumes:</span>
              <span className="text-slate-200 font-mono font-semibold">{stats.resumesCount}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Preferences:</span>
              <span className="text-slate-200 font-mono font-semibold">{stats.preferencesCount}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Jobs:</span>
              <span className="text-slate-200 font-mono font-semibold">{stats.jobsCount}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Matches:</span>
              <span className="text-slate-200 font-mono font-semibold">{stats.matchesCount}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Notifications:</span>
              <span className="text-slate-200 font-mono font-semibold">{stats.notificationsCount}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
