import React, { useState, useEffect } from 'react';
import {
  Sliders,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  RefreshCw,
  Play,
  Zap,
  Bookmark,
  Building2,
  Sparkles,
  History,
  Shield,
  Layers,
  ArrowRight,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Smartphone,
  Mail,
  Check,
  X,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  AdaptiveThresholdProfile,
  UserFeedback,
  FeedbackActionType,
  ThresholdAdjustmentEvent,
} from '../types';
import { FeedbackTestSuiteReport } from '../lib/feedback/feedbackTestSuite';
import { safeFetchJson } from '../lib/apiHelper';

interface SampleJobRole {
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  matchScore: number;
  matchPercentage: number;
  verdict: string;
  matchedSkills: string[];
  missingSkills: string[];
  salarySnippet?: string;
  category: string;
}

const SAMPLE_JOB_ROLES: SampleJobRole[] = [
  {
    jobId: 'job-citadel-01',
    jobTitle: 'Quantitative Research Intern (ML & Distributed Systems)',
    companyName: 'Citadel Securities',
    location: 'New York, NY / Hybrid',
    matchScore: 0.94,
    matchPercentage: 94,
    verdict: 'EXCEPTIONAL_MATCH',
    matchedSkills: ['C++', 'PyTorch', 'Distributed Systems', 'Stochastic Calculus'],
    missingSkills: ['FPGA/Verilog'],
    salarySnippet: '$125/hr + Sign-on',
    category: 'Quantitative Finance / AI',
  },
  {
    jobId: 'job-openai-02',
    jobTitle: 'AI Research Intern (Core Model Alignment & Post-Training)',
    companyName: 'OpenAI',
    location: 'San Francisco, CA',
    matchScore: 0.89,
    matchPercentage: 89,
    verdict: 'STRONG_MATCH',
    matchedSkills: ['PyTorch', 'Transformer Architecture', 'Python', 'RLHF'],
    missingSkills: ['CUDA C++'],
    salarySnippet: '$110/hr + Relocation',
    category: 'Frontier AI Research',
  },
  {
    jobId: 'job-stripe-03',
    jobTitle: 'Software Engineering Intern (Infrastructure & Core Rails)',
    companyName: 'Stripe',
    location: 'San Francisco, CA / Seattle, WA',
    matchScore: 0.76,
    matchPercentage: 76,
    verdict: 'MODERATE_MATCH',
    matchedSkills: ['Distributed Systems', 'Go', 'PostgreSQL'],
    missingSkills: ['Ruby on Rails', 'Karat API Screen'],
    salarySnippet: '$68/hr + Housing',
    category: 'Fintech Infrastructure',
  },
  {
    jobId: 'job-spamcorp-04',
    jobTitle: 'Manual Data Entry & Unpaid Cold-Calling Intern',
    companyName: 'SpamCorp Marketing',
    location: 'Unpaid / On-Site Nowhere',
    matchScore: 0.74,
    matchPercentage: 74,
    verdict: 'LOW_RELEVANCE',
    matchedSkills: ['Spreadsheets'],
    missingSkills: ['CS Degree', 'Algorithms', 'AI/ML'],
    salarySnippet: 'Unpaid / Commission Only',
    category: 'Low-Signal / Outdated',
  },
];

export const FeedbackLoopStudio: React.FC = () => {
  const candidateId = 'alex-rivera-stanford';
  const [profile, setProfile] = useState<AdaptiveThresholdProfile | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);
  
  // Test suite state
  const [testReport, setTestReport] = useState<FeedbackTestSuiteReport | null>(null);
  const [testRunning, setTestRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'simulator' | 'preview' | 'affinities' | 'history' | 'tests'>('simulator');
  const [previewRole, setPreviewRole] = useState<SampleJobRole>(SAMPLE_JOB_ROLES[0]);
  const [streakSimulating, setStreakSimulating] = useState<boolean>(false);

  // Fetch initial profile and history
  const loadProfileAndHistory = async () => {
    setLoading(true);
    try {
      const pRes = await safeFetchJson<AdaptiveThresholdProfile>(`/api/feedback/profile/${candidateId}`);
      if (pRes.ok && pRes.data) setProfile(pRes.data);

      const hRes = await safeFetchJson<UserFeedback[]>(`/api/feedback/history?candidateId=${candidateId}&limit=20`);
      if (hRes.ok && hRes.data) setFeedbackHistory(hRes.data);
    } catch (err) {
      console.error('Failed to load feedback profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileAndHistory();
  }, []);

  // Submit action feedback
  const handleFeedbackAction = async (job: SampleJobRole, action: FeedbackActionType, source: 'web_ui' | 'telegram_inline' | 'email_link' = 'web_ui') => {
    setActionLoading(`${job.jobId}-${action}`);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        feedbackRecord: UserFeedback;
        profile: AdaptiveThresholdProfile;
        thresholdChanged: boolean;
        message: string;
      }>('/api/feedback/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          jobId: job.jobId,
          jobTitle: job.jobTitle,
          companyName: job.companyName,
          matchScore: job.matchScore,
          action,
          feedbackSource: source,
          reason: action === 'IRRELEVANT' ? 'Marked irrelevant by candidate via studio' : undefined,
        }),
      });

      if (res.ok && res.data && res.data.success) {
        setProfile(res.data.profile);
        setFeedbackHistory((prev) => [res.data.feedbackRecord, ...prev.slice(0, 19)]);
        setLastNotification({
          message: res.data.message,
          type: res.data.thresholdChanged ? 'warning' : action === 'APPLIED' ? 'success' : 'info',
        });
      }
    } catch (err: any) {
      console.error('Feedback submission error', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Automated 5-streak skip simulation
  const handleSimulateFiveSkips = async () => {
    setStreakSimulating(true);
    setLastNotification({
      message: 'Running 5 consecutive skip simulation to trigger adaptive threshold bump (+5%)...',
      type: 'info',
    });

    for (let i = 1; i <= 5; i++) {
      await new Promise((r) => setTimeout(r, 350));
      const simulatedJob: SampleJobRole = {
        jobId: `sim-batch-skip-${Date.now()}-${i}`,
        jobTitle: `Generic Backend Role #${i}`,
        companyName: `MidTier Tech ${i}`,
        location: 'Remote',
        matchScore: 0.76,
        matchPercentage: 76,
        verdict: 'MODERATE_MATCH',
        matchedSkills: ['Java', 'SQL'],
        missingSkills: ['Distributed Systems'],
        category: 'Simulated Stream',
      };
      await handleFeedbackAction(simulatedJob, 'SKIPPED', 'web_ui');
    }
    setStreakSimulating(false);
  };

  // Reset profile to baseline
  const handleResetProfile = async () => {
    try {
      const res = await safeFetchJson<{ success: boolean; profile: AdaptiveThresholdProfile }>(`/api/feedback/reset/${candidateId}`, {
        method: 'POST',
      });
      if (res.ok && res.data && res.data.profile) {
        setProfile(res.data.profile);
        setFeedbackHistory([]);
        setLastNotification({
          message: 'Adaptive threshold successfully reset to baseline 75% (0.75).',
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Failed to reset profile', err);
    }
  };

  // Run test suite
  const handleRunTestSuite = async () => {
    setTestRunning(true);
    try {
      const reportRes = await safeFetchJson<FeedbackTestSuiteReport>('/api/feedback/test-suite', { method: 'POST' });
      if (reportRes.ok && reportRes.data) {
        setTestReport(reportRes.data);
        // Refresh live profile state after test suite runs
        await loadProfileAndHistory();
      }
    } catch (err) {
      console.error('Failed to run feedback test suite', err);
    } finally {
      setTestRunning(false);
    }
  };

  const currentThresholdPct = profile ? Math.round(profile.currentThreshold * 100) : 75;
  const baselineThresholdPct = profile ? Math.round(profile.baselineThreshold * 100) : 75;
  const thresholdDelta = currentThresholdPct - baselineThresholdPct;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black tracking-widest uppercase rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Phase 12 Engine
              </span>
              <span className="text-xs font-semibold text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                Personalized Alert Tuning & Feedback Loop
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Adaptive Threshold Tuning & User Feedback Loop
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Dynamically tunes alert thresholds based on candidate actions (<code className="text-emerald-400 font-mono">[Applied]</code>, <code className="text-slate-300 font-mono">[Skipped]</code>, <code className="text-rose-400 font-mono">[Irrelevant]</code>). Prevents alert fatigue via automatic consecutive-skip threshold escalation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadProfileAndHistory}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/60 transition-all flex items-center gap-2 shadow-sm"
              title="Refresh profile state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              Sync
            </button>
            <button
              onClick={handleResetProfile}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/30 transition-all flex items-center gap-2"
              title="Reset threshold to baseline 75%"
            >
              <Sliders className="w-3.5 h-3.5" />
              Reset to 75%
            </button>
            <button
              onClick={handleRunTestSuite}
              disabled={testRunning}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2"
            >
              <Play className={`w-3.5 h-3.5 ${testRunning ? 'animate-spin' : 'fill-white'}`} />
              {testRunning ? 'Running Tests...' : 'Run Phase 12 Tests (6)'}
            </button>
          </div>
        </div>

        {/* Live Notification Banner */}
        {lastNotification && (
          <div
            className={`mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn ${
              lastNotification.type === 'warning'
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                : lastNotification.type === 'success'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-indigo-950/30 border-indigo-500/40 text-indigo-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 shrink-0" />
              <span>{lastNotification.message}</span>
            </div>
            <button
              onClick={() => setLastNotification(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Stats / Metrics Bar */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Metric 1: Current Adaptive Threshold */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Alert Threshold</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-black text-white">{currentThresholdPct}%</div>
            {thresholdDelta !== 0 && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                  thresholdDelta > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                }`}
              >
                {thresholdDelta > 0 ? `+${thresholdDelta}%` : `${thresholdDelta}%`}
                {thresholdDelta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Baseline: <strong className="text-slate-300">{baselineThresholdPct}%</strong></span>
            <span>Range: <strong className="text-slate-300">50% – 95%</strong></span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${((currentThresholdPct - 50) / 45) * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Consecutive Skip Streak */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Skip Streak (Auto-Bump)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-white">{profile?.consecutiveSkipStreak || 0}</div>
            <span className="text-xs text-slate-400 font-semibold">/ 5 in a row</span>
          </div>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-all ${
                  (profile?.consecutiveSkipStreak || 0) >= step
                    ? 'bg-amber-400 shadow-sm shadow-amber-500/50'
                    : 'bg-slate-800'
                }`}
                title={`Skip step ${step}`}
              />
            ))}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>5 skips = <strong className="text-amber-300">+5% Threshold</strong></span>
            {(profile?.consecutiveSkipStreak || 0) >= 3 && (
              <span className="text-amber-400 font-semibold animate-pulse">Escalating soon</span>
            )}
          </div>
        </div>

        {/* Metric 3: Total Interactions Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate Telemetry</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{profile?.totalInteractions || 0}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
              <div className="text-xs font-bold text-emerald-400">{profile?.appliedCount || 0}</div>
              <div className="text-[10px] text-slate-400">Applied</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <div className="text-xs font-bold text-slate-300">{profile?.skippedCount || 0}</div>
              <div className="text-[10px] text-slate-400">Skipped</div>
            </div>
            <div className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30">
              <div className="text-xs font-bold text-rose-400">{profile?.irrelevantCount || 0}</div>
              <div className="text-[10px] text-slate-400">Irrelevant</div>
            </div>
          </div>
        </div>

        {/* Metric 4: Score Means (Applied vs Skipped) */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Empirical Score Means</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-2 mt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Applied Mean (μ):</span>
              <strong className="text-emerald-400 font-mono font-bold">
                {profile && profile.averageAppliedScore > 0 ? `${Math.round(profile.averageAppliedScore * 100)}%` : 'N/A'}
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Skipped Mean (μ):</span>
              <strong className="text-slate-300 font-mono font-bold">
                {profile && profile.averageSkippedScore > 0 ? `${Math.round(profile.averageSkippedScore * 100)}%` : 'N/A'}
              </strong>
            </div>
            <div className="pt-1 border-t border-slate-800 text-[11px] text-slate-400 truncate">
              {profile?.lastAdjustmentReason || 'Baseline calibrated'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'simulator'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Interactive Feedback Simulator
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Telegram & Email Inline Buttons Preview
          </button>

          <button
            onClick={() => setActiveTab('affinities')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'affinities'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Company & Skill Affinities
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Tuning Audit Log ({profile?.tuningLog?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'tests'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Automated Test Suite (6)
          </button>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE FEEDBACK SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Action Helper Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Live Candidate Interaction Test Bench
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate candidate responses to test adaptive calibration rules, streak threshold escalations, and negative signal penalties.
              </p>
            </div>
            <button
              onClick={handleSimulateFiveSkips}
              disabled={streakSimulating}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-950/50 flex items-center gap-2 shrink-0 transition-all"
            >
              <Flame className={`w-4 h-4 ${streakSimulating ? 'animate-bounce' : ''}`} />
              {streakSimulating ? 'Simulating 5 Skips...' : 'Simulate 5 Consecutive Skips (+5% Bump)'}
            </button>
          </div>

          {/* Sample Job Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SAMPLE_JOB_ROLES.map((job) => {
              const meetsThreshold = job.matchScore >= (profile?.currentThreshold || 0.75);
              return (
                <div
                  key={job.jobId}
                  className={`p-6 rounded-2xl border transition-all duration-300 ${
                    meetsThreshold
                      ? 'bg-slate-900/90 border-emerald-500/40 shadow-xl shadow-emerald-950/20'
                      : 'bg-slate-900/50 border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                          {job.category}
                        </span>
                        {meetsThreshold ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Alert Triggered
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center gap-1">
                            <Filter className="w-3 h-3" /> Filtered by Threshold
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-white leading-snug">{job.jobTitle}</h4>
                      <p className="text-xs font-semibold text-slate-300 mt-0.5">{job.companyName} • {job.location}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-black ${meetsThreshold ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {job.matchPercentage}%
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Match Score</div>
                    </div>
                  </div>

                  {/* Matched & Missing Skills */}
                  <div className="space-y-2 mb-6">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] font-bold text-emerald-400 mr-1">Matched:</span>
                      {job.matchedSkills.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-[11px] rounded-md font-medium">
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                    {job.missingSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[11px] font-bold text-amber-400 mr-1">Gaps:</span>
                        {job.missingSkills.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] rounded-md font-medium">
                            ⚡ {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 1-Click Interactive Feedback Buttons */}
                  <div className="pt-4 border-t border-slate-800/80">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      Submit Candidate Feedback:
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => handleFeedbackAction(job, 'APPLIED')}
                        disabled={actionLoading !== null}
                        className="px-2.5 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:text-white" />
                        <span>Applied</span>
                      </button>

                      <button
                        onClick={() => handleFeedbackAction(job, 'SKIPPED')}
                        disabled={actionLoading !== null}
                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1"
                      >
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span>Skip</span>
                      </button>

                      <button
                        onClick={() => handleFeedbackAction(job, 'IRRELEVANT')}
                        disabled={actionLoading !== null}
                        className="px-2.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1"
                      >
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>Irrelevant</span>
                      </button>

                      <button
                        onClick={() => handleFeedbackAction(job, 'SAVED')}
                        disabled={actionLoading !== null}
                        className="px-2.5 py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1"
                      >
                        <Bookmark className="w-4 h-4 text-indigo-400" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TELEGRAM & EMAIL INLINE BUTTONS PREVIEW */}
      {activeTab === 'preview' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Role selector */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Preview Role:</span>
            {SAMPLE_JOB_ROLES.map((r) => (
              <button
                key={r.jobId}
                onClick={() => setPreviewRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  previewRole.jobId === r.jobId
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {r.companyName} ({r.matchPercentage}%)
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Telegram Client Preview */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Telegram Client Mockup</h4>
                    <p className="text-[10px] text-slate-400">Inline Callback Buttons</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Bot API 7.0+
                </span>
              </div>

              {/* Message Bubble */}
              <div className="bg-[#182533] p-4 rounded-2xl rounded-tl-sm border border-slate-700/60 text-xs text-slate-200 space-y-2.5 font-sans leading-relaxed shadow-lg">
                <div className="font-bold text-sky-400">
                  🎯 HIGH MATCH SCOUT ALERT: {previewRole.matchPercentage}% 🌟
                </div>
                <div>
                  🏢 <b>{previewRole.companyName}</b> — <i>{previewRole.jobTitle}</i>
                </div>
                <div className="text-slate-300 font-mono text-[11px]">
                  📍 {previewRole.location}
                </div>
                <div className="text-slate-400">
                  📊 Match Verdict: <code className="text-emerald-400 font-mono">{previewRole.verdict}</code>
                </div>
                <div className="border-t border-slate-700/60 pt-2 text-[11px]">
                  <div className="text-emerald-400 font-semibold mb-0.5">✅ Matched Skills:</div>
                  <div className="text-slate-300 font-mono">{previewRole.matchedSkills.join(', ')}</div>
                </div>
                <div className="text-[11px]">
                  <div className="text-amber-400 font-semibold mb-0.5">⚠️ Gap Areas to Prepare:</div>
                  <div className="text-slate-300 font-mono">{previewRole.missingSkills.join(', ')}</div>
                </div>
              </div>

              {/* Telegram Inline Buttons (Actionable in UI) */}
              <div className="mt-3 space-y-2">
                <a
                  href={`https://boards.greenhouse.io/${previewRole.companyName.toLowerCase().replace(/\s+/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-[#2b5278] hover:bg-[#32618e] text-white text-xs font-bold rounded-xl text-center block shadow-md transition-all"
                >
                  🚀 Apply to {previewRole.companyName}
                </a>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleFeedbackAction(previewRole, 'APPLIED', 'telegram_inline')}
                    className="py-2 bg-[#1b3d2f] hover:bg-[#235340] border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    ✅ Applied
                  </button>

                  <button
                    onClick={() => handleFeedbackAction(previewRole, 'SKIPPED', 'telegram_inline')}
                    className="py-2 bg-[#252f3d] hover:bg-[#2d3a4b] border border-slate-600 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    ⏭️ Skip
                  </button>

                  <button
                    onClick={() => handleFeedbackAction(previewRole, 'IRRELEVANT', 'telegram_inline')}
                    className="py-2 bg-[#3b1c1c] hover:bg-[#4d2424] border border-rose-500/40 text-rose-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    🚫 Irrelevant
                  </button>
                </div>
              </div>
            </div>

            {/* Responsive HTML Email Preview */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Email Client Mockup</h4>
                    <p className="text-[10px] text-slate-400">1-Click Feedback Action Bar</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Responsive Dark HTML
                </span>
              </div>

              {/* Email Body Card */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">
                      AI Internship Scout • Alert
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">{previewRole.companyName}</h3>
                    <p className="text-xs text-slate-300">{previewRole.jobTitle}</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-center">
                    <div className="text-lg font-black leading-none">{previewRole.matchPercentage}%</div>
                    <div className="text-[9px] uppercase font-bold mt-0.5">Match</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div>📍 <strong>Location:</strong> {previewRole.location}</div>
                  <div>💰 <strong>Comp:</strong> {previewRole.salarySnippet || '$75/hr'}</div>
                </div>

                {/* Direct Apply CTA */}
                <a
                  href={`https://boards.greenhouse.io/${previewRole.companyName.toLowerCase().replace(/\s+/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-xs font-bold rounded-xl text-center block shadow-md"
                >
                  🚀 Apply to {previewRole.companyName} Immediately →
                </a>

                {/* Email Feedback Action Bar */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    ⚡ Quick Feedback (Calibrates Future Alert Thresholds)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleFeedbackAction(previewRole, 'APPLIED', 'email_link')}
                      className="py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-lg transition-all"
                    >
                      ✅ Applied
                    </button>
                    <button
                      onClick={() => handleFeedbackAction(previewRole, 'SKIPPED', 'email_link')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all"
                    >
                      ⏭️ Skip
                    </button>
                    <button
                      onClick={() => handleFeedbackAction(previewRole, 'IRRELEVANT', 'email_link')}
                      className="py-1.5 px-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-semibold rounded-lg transition-all"
                    >
                      🚫 Irrelevant
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPANY & SKILL AFFINITIES */}
      {activeTab === 'affinities' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Affinity Heatmap */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    Learned Company Affinities
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Reinforces companies user applies to; heavily penalizes companies marked irrelevant.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {profile && Object.entries(profile.companyAffinity).map(([company, affVal]) => {
                  const affinity = Number(affVal) || 0;
                  const isPositive = affinity >= 0;
                  return (
                    <div key={company} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">{company}</div>
                        <div className="text-[10px] text-slate-400">
                          {isPositive ? 'Positive Preference Weight' : 'Negative Filter Penalty'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                            isPositive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {isPositive ? `+${Math.round(affinity * 100)}%` : `${Math.round(affinity * 100)}%`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skill Affinity Multipliers */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    Skill & Domain Weights
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Learned from matched skills in successfully applied positions.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {profile && Object.entries(profile.skillAffinity).map(([skill, wVal]) => {
                  const weight = Number(wVal) || 0;
                  return (
                    <div key={skill} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">{skill}</div>
                        <div className="text-[10px] text-slate-400">High-Priority Technical Competency</div>
                      </div>

                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                        +{Math.round(weight * 100)}% Weight
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TUNING AUDIT LOG */}
      {activeTab === 'history' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  Adaptive Threshold Adjustment Audit Log
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete historical record of every threshold adjustment event, reason, and trigger context.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {profile?.tuningLog?.length || 0} events logged
              </span>
            </div>

            {(!profile?.tuningLog || profile.tuningLog.length === 0) ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No threshold adjustment events recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {profile.tuningLog.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          event.triggerAction === 'APPLIED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : event.triggerAction === 'IRRELEVANT'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {event.triggerAction}
                        </span>
                        <span className="font-bold text-white">{event.jobContext?.companyName || 'Scout Invariant'}</span>
                        <span className="text-slate-400">• {event.jobContext?.jobTitle}</span>
                      </div>
                      <p className="text-slate-300">{event.reason}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-200">
                          {Math.round(event.previousThreshold * 100)}% → <strong className="text-emerald-400">{Math.round(event.newThreshold * 100)}%</strong>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: AUTOMATED TEST SUITE */}
      {activeTab === 'tests' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Phase 12 Verification Test Suite Runner
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Validates feedback ingestion, 5-streak threshold escalation invariant, negative company penalties, and serialization.
                </p>
              </div>

              <button
                onClick={handleRunTestSuite}
                disabled={testRunning}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2"
              >
                <Play className={`w-3.5 h-3.5 ${testRunning ? 'animate-spin' : 'fill-white'}`} />
                {testRunning ? 'Executing Test Bench...' : 'Run All 6 Tests'}
              </button>
            </div>

            {testReport ? (
              <div className="space-y-4">
                {/* Summary bar */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-300">Status:</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      testReport.failedCount === 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}>
                      {testReport.passedCount} / {testReport.totalTests} Passed
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Total Duration: <strong>{testReport.totalDurationMs}ms</strong> • Avg: <strong>{testReport.averageLatencyMs}ms/test</strong>
                  </div>
                </div>

                {/* Test Result Cards */}
                <div className="space-y-3">
                  {testReport.results.map((r) => (
                    <div
                      key={r.id}
                      className={`p-4 rounded-xl border transition-all ${
                        r.passed
                          ? 'bg-emerald-950/10 border-emerald-500/30'
                          : 'bg-rose-950/20 border-rose-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {r.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span className="text-xs font-mono font-bold text-slate-400">[{r.id}]</span>
                          <span className="text-xs font-bold text-white">{r.name}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">{r.durationMs}ms</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-slate-800/60">
                        <div>
                          <span className="text-slate-500 font-semibold">Expected: </span>
                          <span className="text-slate-300">{r.expected}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold">Actual: </span>
                          <span className={r.passed ? 'text-emerald-300' : 'text-rose-300 font-bold'}>{r.actual}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Click "Run All 6 Tests" above to verify the Phase 12 Feedback Loop & Adaptive Threshold Tuning Engine.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
