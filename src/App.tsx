/**
 * InternAtlas (AI Internship Scout)
 * Refactored Modern SaaS Dashboard (Linear/Vercel/Supabase UI Standards)
 * Full Dynamic Multi-Candidate & Custom User Resume Ingestion Engine
 */

import React, { useState, useEffect } from 'react';
import { AppSidebar, MainNavTab } from './components/layout/AppSidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { CommandCenterView } from './components/dashboard/CommandCenterView';
import { TargetPreferencesView } from './components/dashboard/TargetPreferencesView';
import { ResumeIntelligenceView } from './components/dashboard/ResumeIntelligenceView';
import { HiringInsightsDashboard } from './components/HiringInsightsDashboard';
import { AlertingStudio } from './components/AlertingStudio';
import { FeedbackLoopStudio } from './components/FeedbackLoopStudio';
import { DevSandboxView } from './components/dashboard/DevSandboxView';
import { AuthModal } from './components/AuthModal';
import { OnboardingFlow } from './components/OnboardingFlow';
import {
  TenantContext,
  DatabaseStats,
  User as UserType,
  UserPreferences,
  DashboardOverviewPayload,
  ProductionJobMatch,
} from './types';
import { safeFetchJson } from './lib/apiHelper';
import {
  CandidateProfile,
  getActiveCandidateProfile,
  setActiveCandidateProfile,
} from './lib/candidatePresets';

export default function App() {
  const [currentTenant, setCurrentTenant] = useState<TenantContext>({
    tenantId: 'tenant-custom',
    tenantName: 'Workspace',
    userEmail: '',
  });
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [activeTab, setActiveTab] = useState<MainNavTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  // Active Candidate Profile State (Dynamic Custom / Preset Resumes)
  const [activeCandidate, setActiveCandidate] = useState<CandidateProfile>(getActiveCandidateProfile());

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<DashboardOverviewPayload | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);

  // Auth & Onboarding State
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(false);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (authToken) {
      fetchDashboardOverview(authToken);
      fetchStats(authToken);
    } else {
      setDashboardData(null);
      setLoadingDashboard(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    const refreshSession = async () => {
      const response = await safeFetchJson<{ token: string }>('/api/auth/me');
      if (response.status === 401) {
        handleLogout();
      } else if (response.ok && response.data?.token) {
        setAuthToken(response.data.token);
      }
    };
    const interval = window.setInterval(() => void refreshSession(), 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [authToken]);

  const handleSelectCandidate = (newCandidate: CandidateProfile) => {
    setActiveCandidate(newCandidate);
    setActiveCandidateProfile(newCandidate.id);
  };

  const fetchStats = async (token: string) => {
    try {
      const res = await safeFetchJson<DatabaseStats>('/api/db/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && res.data) {
        setStats(res.data);
      }
    } catch {
      // Quietly ignore transient errors
    }
  };

  const fetchDashboardOverview = async (token: string | null = authToken) => {
    if (!token) {
      setDashboardData(null);
      setLoadingDashboard(false);
      return;
    }

    try {
      setLoadingDashboard(true);
      const res = await fetch('/api/dashboard/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) handleLogout();
        throw new Error(`Dashboard request failed (${res.status})`);
      }
      const payload: DashboardOverviewPayload = await res.json();
      setDashboardData(payload);
      setUserPreferences(payload.targetParameters);
    } catch (err) {
      console.error('Failed to load dashboard overview:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleUpdateJobStatus = async (
    jobId: string,
    newStatus: ProductionJobMatch['applicationStatus']
  ) => {
    try {
      const res = await fetch(`/api/dashboard/match-status/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ applicationStatus: newStatus }),
      });
      if (!res.ok) {
        if (res.status === 401) handleLogout();
        throw new Error(`Application status update failed (${res.status})`);
      }
      setDashboardData((prev) => prev ? {
        ...prev,
        topMatches: prev.topMatches.map((match) =>
          match.jobId === jobId ? { ...match, applicationStatus: newStatus } : match
        ),
      } : prev);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const restoreSession = async () => {
    localStorage.removeItem('scout_jwt_token');
    try {
      const res = await safeFetchJson<{ token: string; user: UserType; preferences: UserPreferences }>('/api/auth/me');
      if (res.ok && res.data) {
        const data = res.data;
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setUserPreferences(data.preferences);
        setCurrentTenant({
          tenantId: data.user.tenantId,
          tenantName: `${data.user.fullName}'s Workspace`,
          userEmail: data.user.email,
        });
      } else {
        if (res.status === 401) {
          setAuthToken(null);
          setCurrentUser(null);
          setIsAuthModalOpen(true);
        } else {
          console.error('Session restore failed:', res.error || `HTTP ${res.status}`);
          setIsAuthModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Failed to restore the signed-in session:', error);
      setIsAuthModalOpen(true);
    }
  };

  const handleAuthSuccess = (token: string, user: UserType) => {
    setAuthToken(token);
    setCurrentUser(user);
    setCurrentTenant({
      tenantId: user.tenantId,
      tenantName: `${user.fullName}'s Workspace`,
      userEmail: user.email,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('scout_jwt_token');
    void fetch('/api/auth/logout', { method: 'POST' }).catch((error) => {
      console.error('Failed to clear the server session cookie:', error);
    });
    setAuthToken(null);
    setCurrentUser(null);
    setUserPreferences(undefined);
    setDashboardData(null);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex overflow-hidden antialiased">
      {/* 1. Left Collapsible Modern Sidebar */}
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentUser={currentUser}
        authToken={authToken}
        currentTenant={currentTenant}
        availableTenants={currentUser ? [currentTenant] : []}
        onSelectTenant={(t) => setCurrentTenant(t)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
        onLogout={handleLogout}
        matchesCount={dashboardData?.topMatches.length ?? 0}
        alertsSentTodayCount={dashboardData?.stats.alertsDispatchedToday ?? 0}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Persistent Top Navigation Bar */}
        <TopNavbar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          searchQuery={globalSearchQuery}
          onSearchChange={setGlobalSearchQuery}
          onRefreshData={fetchDashboardOverview}
          refreshing={loadingDashboard}
          stats={stats}
          currentUser={currentUser}
          onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* View Switching */}
            {activeTab === 'overview' && (
              <CommandCenterView
                data={dashboardData}
                loading={loadingDashboard}
                searchQuery={globalSearchQuery}
                onUpdateStatus={handleUpdateJobStatus}
                onOpenPreferences={() => setActiveTab('preferences')}
                onOpenResumeIntelligence={() => setActiveTab('resume')}
                onRefreshData={fetchDashboardOverview}
              />
            )}

            {activeTab === 'preferences' && (
              <TargetPreferencesView
                initialPreferences={userPreferences}
                authToken={authToken}
                onSaved={() => {
                  fetchDashboardOverview(authToken);
                  if (authToken) fetchStats(authToken);
                }}
              />
            )}

            {activeTab === 'resume' && (
              <ResumeIntelligenceView
                activeCandidate={activeCandidate}
                onSelectCandidate={handleSelectCandidate}
                currentUser={currentUser}
                authToken={authToken}
                onResumeSaved={() => fetchDashboardOverview(authToken)}
              />
            )}

            {activeTab === 'hiring-insights' && (
              <HiringInsightsDashboard />
            )}

            {activeTab === 'alerts' && (
              <AlertingStudio currentPreferences={userPreferences} />
            )}

            {activeTab === 'feedback' && (
              <FeedbackLoopStudio candidateId={currentUser?.id ?? ''} />
            )}

            {activeTab === 'dev-sandbox' && (
              <DevSandboxView
                currentTenant={currentTenant}
                currentUser={currentUser}
                authToken={authToken}
              />
            )}
          </div>
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          if (authToken) setIsAuthModalOpen(false);
        }}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Target Criteria Onboarding Modal */}
      {isOnboardingModalOpen && currentUser && authToken && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Target Criteria Configuration</h2>
              <button
                onClick={() => setIsOnboardingModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-3 py-1 bg-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>
            <OnboardingFlow
              user={currentUser}
              token={authToken}
              initialPreferences={userPreferences}
              onOnboardingComplete={(pref) => {
                setUserPreferences(pref);
                setIsOnboardingModalOpen(false);
                fetchDashboardOverview(authToken);
                if (authToken) fetchStats(authToken);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
