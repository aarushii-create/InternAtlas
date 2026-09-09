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
import { computeCandidateMatches } from './lib/candidateScorer';

const INITIAL_TENANTS: TenantContext[] = [
  {
    tenantId: 'tenant-alex-rivera',
    tenantName: 'Alex Rivera (Stanford CS)',
    userEmail: 'alex.rivera@stanford.edu',
  },
  {
    tenantId: 'tenant-jordan-chen',
    tenantName: 'Jordan Chen (UC Berkeley EECS)',
    userEmail: 'jordan.chen@berkeley.edu',
  },
  {
    tenantId: 'tenant-custom',
    tenantName: 'Custom Candidate Workspace',
    userEmail: 'user@internatlas.ai',
  },
];

export default function App() {
  const [currentTenant, setCurrentTenant] = useState<TenantContext>(INITIAL_TENANTS[0]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [activeTab, setActiveTab] = useState<MainNavTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  // Active Candidate Profile State (Dynamic Custom / Preset Resumes)
  const [activeCandidate, setActiveCandidate] = useState<CandidateProfile>(getActiveCandidateProfile());

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<DashboardOverviewPayload | null>(null);
  const [rawMatches, setRawMatches] = useState<ProductionJobMatch[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);

  // Auth & Onboarding State
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchStats();
    restoreSession();
    fetchDashboardOverview();
  }, []);

  // When active candidate changes, dynamically re-score and recalibrate the matches!
  const handleSelectCandidate = (newCandidate: CandidateProfile) => {
    setActiveCandidate(newCandidate);
    setActiveCandidateProfile(newCandidate.id);

    if (rawMatches.length > 0) {
      const rescored = computeCandidateMatches(newCandidate, rawMatches);
      setDashboardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          topMatches: rescored,
          resumeComponentsSummary: {
            totalSubVectors: 768,
            primaryTrack: newCandidate.primaryTrack,
            skillsCount: newCandidate.skills.length,
            experienceCount: newCandidate.experience?.length || 1,
            deltaVersion: 'v2.4-calibrated',
            lastUpdated: new Date().toISOString(),
          },
        };
      });
    }
  };

  const fetchStats = async () => {
    try {
      const res = await safeFetchJson<DatabaseStats>('/api/db/stats');
      if (res.ok && res.data) {
        setStats(res.data);
      }
    } catch {
      // Quietly ignore transient errors
    }
  };

  const fetchDashboardOverview = async () => {
    try {
      setLoadingDashboard(true);
      const res = await fetch('/api/dashboard/overview');
      if (res.ok) {
        const payload: DashboardOverviewPayload = await res.json();
        setRawMatches(payload.topMatches || []);

        // Calibrate matches for active candidate
        const candidateProfile = getActiveCandidateProfile();
        setActiveCandidate(candidateProfile);
        const calibratedMatches = computeCandidateMatches(candidateProfile, payload.topMatches || []);

        setDashboardData({
          ...payload,
          topMatches: calibratedMatches,
          resumeComponentsSummary: {
            totalSubVectors: 768,
            primaryTrack: candidateProfile.primaryTrack,
            skillsCount: candidateProfile.skills.length,
            experienceCount: candidateProfile.experience?.length || 1,
            deltaVersion: 'v2.4-calibrated',
            lastUpdated: new Date().toISOString(),
          },
        });

        if (payload.targetParameters) {
          setUserPreferences(payload.targetParameters);
        }
      }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationStatus: newStatus }),
      });
      if (res.ok) {
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            topMatches: prev.topMatches.map((m) =>
              m.jobId === jobId ? { ...m, applicationStatus: newStatus } : m
            ),
          };
        });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const restoreSession = async () => {
    const token = localStorage.getItem('scout_jwt_token');
    if (!token) {
      autoLoginSeedUser('alex.rivera@stanford.edu', 'password123');
      return;
    }

    try {
      const res = await safeFetchJson<{ user: UserType; preferences: UserPreferences }>('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && res.data) {
        const data = res.data;
        setAuthToken(token);
        setCurrentUser(data.user);
        setUserPreferences(data.preferences);

        const matchingTenant = INITIAL_TENANTS.find((t) => t.tenantId === data.user.tenantId);
        if (matchingTenant) {
          setCurrentTenant(matchingTenant);
        }
      } else {
        localStorage.removeItem('scout_jwt_token');
        autoLoginSeedUser('alex.rivera@stanford.edu', 'password123');
      }
    } catch {
      // Quietly ignore transient errors
    }
  };

  const autoLoginSeedUser = async (email: string, password: string) => {
    try {
      const res = await safeFetchJson<{ token: string; user: UserType }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok && res.data) {
        const data = res.data;
        localStorage.setItem('scout_jwt_token', data.token);
        setAuthToken(data.token);
        setCurrentUser(data.user);
      }
    } catch {
      // Quietly ignore transient errors
    }
  };

  const handleAuthSuccess = (token: string, user: UserType) => {
    setAuthToken(token);
    setCurrentUser(user);
    const matchingTenant = INITIAL_TENANTS.find((t) => t.tenantId === user.tenantId);
    if (matchingTenant) {
      setCurrentTenant(matchingTenant);
    }
    fetchStats();
    fetchDashboardOverview();
  };

  const handleLogout = () => {
    localStorage.removeItem('scout_jwt_token');
    setAuthToken(null);
    setCurrentUser(null);
    setUserPreferences(undefined);
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
        availableTenants={INITIAL_TENANTS}
        onSelectTenant={(t) => setCurrentTenant(t)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
        onLogout={handleLogout}
        matchesCount={dashboardData?.topMatches?.length || 28}
        unreadAlertsCount={3}
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
          activeCandidate={activeCandidate}
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
                activeCandidate={activeCandidate}
              />
            )}

            {activeTab === 'preferences' && (
              <TargetPreferencesView
                initialPreferences={userPreferences}
                onSaved={() => {
                  fetchDashboardOverview();
                  fetchStats();
                }}
              />
            )}

            {activeTab === 'resume' && (
              <ResumeIntelligenceView
                activeCandidate={activeCandidate}
                onSelectCandidate={handleSelectCandidate}
                currentUser={currentUser}
                authToken={authToken}
              />
            )}

            {activeTab === 'hiring-insights' && (
              <HiringInsightsDashboard />
            )}

            {activeTab === 'alerts' && (
              <AlertingStudio currentPreferences={userPreferences} />
            )}

            {activeTab === 'feedback' && (
              <FeedbackLoopStudio />
            )}

            {activeTab === 'dev-sandbox' && (
              <DevSandboxView />
            )}
          </div>
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
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
                fetchDashboardOverview();
                fetchStats();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
