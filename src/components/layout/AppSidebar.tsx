import React from 'react';
import {
  Sparkles,
  Target,
  FileText,
  BarChart3,
  Bell,
  Activity,
  Sliders,
  Settings,
  Cpu,
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Terminal,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { TenantContext, User as UserType } from '../../types';

export type MainNavTab =
  | 'overview'
  | 'preferences'
  | 'resume'
  | 'hiring-insights'
  | 'alerts'
  | 'feedback'
  | 'dev-sandbox';

interface AppSidebarProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: UserType | null;
  authToken: string | null;
  currentTenant: TenantContext;
  availableTenants: TenantContext[];
  onSelectTenant: (tenant: TenantContext) => void;
  onOpenAuthModal: () => void;
  onOpenOnboarding: () => void;
  onLogout: () => void;
  matchesCount?: number;
  unreadAlertsCount?: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  currentUser,
  authToken,
  currentTenant,
  availableTenants,
  onSelectTenant,
  onOpenAuthModal,
  onOpenOnboarding,
  onLogout,
  matchesCount = 28,
  unreadAlertsCount = 3,
}) => {
  const navItems: {
    id: MainNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Command Center',
      icon: Sparkles,
      badge: matchesCount,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'preferences',
      label: 'Target Preferences',
      icon: Target,
    },
    {
      id: 'resume',
      label: 'Resume Intelligence',
      icon: FileText,
      badge: '98% Fit',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'hiring-insights',
      label: 'Hiring Analytics',
      icon: BarChart3,
      badge: 'Live',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      id: 'alerts',
      label: 'Alerts & Channels',
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'feedback',
      label: 'Adaptive Feedback',
      icon: Activity,
    },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-slate-950/90 border-r border-slate-800/80 transition-all duration-300 z-30 shrink-0 select-none ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white tracking-tight">InternAtlas</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                  PRO
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                AI Internship Scout
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {/* Workspace Nav Group */}
        <div>
          {!collapsed && (
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspace
            </div>
          )}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-400/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!collapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Developer Sandbox Section */}
        <div>
          {!collapsed && (
            <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Admin & Testing</span>
              <span className="text-[9px] text-cyan-400 font-mono">15 Phases</span>
            </div>
          )}
          <button
            onClick={() => onSelectTab('dev-sandbox')}
            title={collapsed ? 'Developer Sandbox & Tools' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
              activeTab === 'dev-sandbox'
                ? 'bg-cyan-600/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent hover:border-slate-800'
            }`}
          >
            <Terminal
              className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                activeTab === 'dev-sandbox' ? 'text-cyan-400' : 'text-slate-400'
              }`}
            />
            {!collapsed && (
              <div className="flex-1 text-left truncate flex flex-col">
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                  Dev Sandbox
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  E2E Tests, Benchmarks & Labs
                </span>
              </div>
            )}
            {!collapsed && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Target Criteria Quick Banner (when expanded) */}
      {!collapsed && (
        <div className="px-3 py-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Target Onboarding
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Stanford '26</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
              Refine role queries, location bounds, and minimum match threshold.
            </p>
            <button
              onClick={onOpenOnboarding}
              className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>Edit Onboarding Criteria</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Profile / Tenant Control */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
        {currentUser && authToken ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentUser.fullName}
                className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
              />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-200 block truncate">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {currentUser.email}
                  </span>
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="flex items-center gap-1.5 pt-1">
                {/* Multi-Tenant Switcher */}
                <select
                  value={currentTenant.tenantId}
                  onChange={(e) => {
                    const match = availableTenants.find((t) => t.tenantId === e.target.value);
                    if (match) onSelectTenant(match);
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {availableTenants.map((t) => (
                    <option key={t.tenantId} value={t.tenantId}>
                      {t.tenantName}
                    </option>
                  ))}
                </select>

                {/* Logout */}
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className={`w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
              collapsed ? 'px-0' : 'px-3'
            }`}
            title="Sign In / Register"
          >
            <LogIn className="w-4 h-4" />
            {!collapsed && <span>Sign In</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
