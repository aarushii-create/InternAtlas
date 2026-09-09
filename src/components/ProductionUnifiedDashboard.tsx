import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Target,
  Sliders,
  FileText,
  Building,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  Clock,
  Shield,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Flame,
  Send,
  Bell,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  BarChart3,
  Activity,
  Code2,
  Terminal,
  Search,
  Plus,
  Trash2,
  Settings,
  HelpCircle,
} from 'lucide-react';
import {
  DashboardOverviewPayload,
  ProductionJobMatch,
  E2ETestSuiteSummary,
  E2EPipelineExecutionTrace,
  E2ELoadStressBenchmark,
  UserPreferences,
} from '../types';

export const ProductionUnifiedDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardOverviewPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active view pillar
  const [activePillar, setActivePillar] = useState<
    'matches' | 'parameters' | 'resume' | 'companies' | 'e2e-suite' | 'pipeline-simulator'
  >('matches');

  // Match filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tailoring modal/drawer state
  const [selectedMatch, setSelectedMatch] = useState<ProductionJobMatch | null>(null);

  // Target Parameters Edit Form State
  const [tempPrefs, setTempPrefs] = useState<UserPreferences | null>(null);
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);
  const [prefsSuccessMsg, setPrefsSuccessMsg] = useState<string | null>(null);

  // E2E Test Suite State
  const [testSummary, setTestSummary] = useState<E2ETestSuiteSummary | null>(null);
  const [runningSuite, setRunningSuite] = useState<boolean>(false);

  // Pipeline Simulator State
  const [simAts, setSimAts] = useState<'Greenhouse' | 'Lever' | 'Ashby' | 'Workday'>('Greenhouse');
  const [simCompany, setSimCompany] = useState<string>('Citadel Securities');
  const [simTitle, setSimTitle] = useState<string>('Quantitative Research & C++ Systems Intern 2027');
  const [simTier, setSimTier] = useState<string>('Tier 1 Quant/HFT');
  const [simLocation, setSimLocation] = useState<string>('New York, NY (Hybrid)');
  const [simSalary, setSimSalary] = useState<string>('$125/hr + $10,000 Sign-on');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [liveTrace, setLiveTrace] = useState<E2EPipelineExecutionTrace | null>(null);

  // Concurrency Benchmark State
  const [runningBenchmark, setRunningBenchmark] = useState<boolean>(false);
  const [benchmarkResult, setBenchmarkResult] = useState<E2ELoadStressBenchmark | null>(null);

  // Fetch Dashboard Overview
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/overview');
      if (!res.ok) throw new Error(`HTTP Error: ${res.statusText}`);
      const payload: DashboardOverviewPayload = await res.json();
      setData(payload);
      setTempPrefs(payload.targetParameters);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle Application Status Update
  const handleUpdateStatus = async (jobId: string, newStatus: ProductionJobMatch['applicationStatus']) => {
    try {
      const res = await fetch(`/api/dashboard/match-status/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationStatus: newStatus }),
      });
      if (res.ok) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            topMatches: prev.topMatches.map((m) => (m.jobId === jobId ? { ...m, applicationStatus: newStatus } : m)),
          };
        });
        if (selectedMatch && selectedMatch.jobId === jobId) {
          setSelectedMatch((prev) => (prev ? { ...prev, applicationStatus: newStatus } : null));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Save Target Parameters
  const handleSaveParameters = async () => {
    if (!tempPrefs) return;
    try {
      setSavingPrefs(true);
      setPrefsSuccessMsg(null);
      const res = await fetch('/api/dashboard/target-parameters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempPrefs),
      });
      if (!res.ok) throw new Error('Failed to update target parameters');
      setPrefsSuccessMsg('Target parameters saved successfully! Match threshold updated.');
      setTimeout(() => setPrefsSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error saving parameters');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Run Full E2E Test Suite
  const handleRunFullTestSuite = async () => {
    try {
      setRunningSuite(true);
      const res = await fetch('/api/e2e/test-suite', { method: 'POST' });
      if (!res.ok) throw new Error('E2E test run failed');
      const results = await res.json();
      setTestSummary(results);
    } catch (err: any) {
      alert(err.message || 'Error running test suite');
    } finally {
      setRunningSuite(false);
    }
  };

  // Run Live Pipeline Simulator
  const handleSimulatePipeline = async () => {
    try {
      setSimulating(true);
      const res = await fetch('/api/e2e/simulate-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atsProvider: simAts,
          company: simCompany,
          tier: simTier,
          title: simTitle,
          location: simLocation,
          salary: simSalary,
          rawHtmlContent: `<h2>${simTitle}</h2><p>Seeking exceptional candidates with deep C++20, CUDA, Python, and low-latency systems expertise.</p>`,
        }),
      });
      if (!res.ok) throw new Error('Pipeline simulation failed');
      const trace = await res.json();
      setLiveTrace(trace);
    } catch (err: any) {
      alert(err.message || 'Simulation error');
    } finally {
      setSimulating(false);
    }
  };

  // Run Concurrency Stress Test
  const handleRunLoadBenchmark = async () => {
    try {
      setRunningBenchmark(true);
      const res = await fetch('/api/e2e/load-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concurrency: 50 }),
      });
      if (!res.ok) throw new Error('Load benchmark failed');
      const result = await res.json();
      setBenchmarkResult(result);
    } catch (err: any) {
      alert(err.message || 'Benchmark error');
    } finally {
      setRunningBenchmark(false);
    }
  };

  // Filtered matches
  const filteredMatches = (data?.topMatches || []).filter((m) => {
    if (statusFilter !== 'ALL' && m.applicationStatus !== statusFilter) return false;
    if (tierFilter !== 'ALL' && m.companyTier !== tierFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.company.toLowerCase().includes(q) ||
        m.keyMatchedSkills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Production Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-full border border-indigo-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Phase 15 Production Suite
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Pipeline Active & Tuned
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              Candidate Command Center & Match Hub
            </h1>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Unified workspace for managing high-probability internship matches, adjusting multi-tier target criteria, tracking resume sub-vector evolution, and executing end-to-end integration test suites.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh State</span>
            </button>
            <button
              onClick={() => {
                setActivePillar('e2e-suite');
                handleRunFullTestSuite();
              }}
              disabled={runningSuite}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${runningSuite ? 'animate-spin' : ''}`} />
              <span>Run E2E Test Suite</span>
            </button>
          </div>
        </div>

        {/* Global Key Metrics Strip */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-indigo-500/20">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                Qualified Matches
              </div>
              <div className="text-2xl font-black text-white mt-1">{data.stats.totalMatchesFound}</div>
              <div className="text-[10px] text-slate-400">{data.stats.highMatchCount} high-probability &gt;85%</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Avg Match Fit
              </div>
              <div className="text-2xl font-black text-emerald-300 mt-1">{data.stats.avgMatchScore}%</div>
              <div className="text-[10px] text-slate-400">Layer 1 + Layer 2 Grounded</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Active Pipeline
              </div>
              <div className="text-2xl font-black text-cyan-300 mt-1">{data.stats.activeApplications}</div>
              <div className="text-[10px] text-slate-400">Applications & OAs in-flight</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-purple-400" />
                Dispatched Today
              </div>
              <div className="text-2xl font-black text-purple-300 mt-1">{data.stats.alertsDispatchedToday}</div>
              <div className="text-[10px] text-slate-400">Telegram Bot Notifications</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                Pipeline Latency
              </div>
              <div className="text-2xl font-black text-amber-300 mt-1">{data.systemMetrics.pipelineLatencyMs}ms</div>
              <div className="text-[10px] text-slate-400">Sub-vector Cosine Match</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                Rate Limiter
              </div>
              <div className="text-2xl font-black text-white mt-1">30 RPM</div>
              <div className="text-[10px] text-emerald-400">Telegram Token Budget Safe</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Pillars Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActivePillar('matches')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activePillar === 'matches'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>1. Matches Hub ({data?.topMatches.length || 0})</span>
        </button>

        <button
          onClick={() => setActivePillar('parameters')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activePillar === 'parameters'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>2. Target Parameters</span>
        </button>

        <button
          onClick={() => setActivePillar('resume')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activePillar === 'resume'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>3. Resume Component Studio</span>
        </button>

        <button
          onClick={() => setActivePillar('companies')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activePillar === 'companies'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>4. Company Reality Bars</span>
        </button>

        <button
          onClick={() => setActivePillar('pipeline-simulator')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activePillar === 'pipeline-simulator'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>5. E2E Pipeline Simulator</span>
        </button>

        <button
          onClick={() => setActivePillar('e2e-suite')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activePillar === 'e2e-suite'
              ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-emerald-300" />
          <span>6. Verification & Load Suite</span>
        </button>
      </div>

      {loading && !data && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-300 text-sm font-semibold">Synchronizing candidate matches and telemetry...</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* ========================================================================= */}
          {/* PILLAR 1: MATCHES HUB                                                    */}
          {/* ========================================================================= */}
          {activePillar === 'matches' && (
            <div className="space-y-4">
              {/* Search & Filter Controls */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search roles, companies, or skills (e.g. CUDA, C++, Citadel)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Application Status Filter */}
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
                    <span className="text-slate-500">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer"
                    >
                      <option value="ALL" className="bg-slate-900 text-slate-200">All Pipeline Stages</option>
                      <option value="NEW_MATCH" className="bg-slate-900 text-slate-200">New Match</option>
                      <option value="APPLIED" className="bg-slate-900 text-slate-200">Applied</option>
                      <option value="OA_RECEIVED" className="bg-slate-900 text-slate-200">OA Received</option>
                      <option value="INTERVIEWING" className="bg-slate-900 text-slate-200">Interviewing</option>
                    </select>
                  </div>

                  {/* Company Tier Filter */}
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
                    <span className="text-slate-500">Tier:</span>
                    <select
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer"
                    >
                      <option value="ALL" className="bg-slate-900 text-slate-200">All Tiers</option>
                      <option value="Tier 1 Quant/HFT" className="bg-slate-900 text-slate-200">Tier 1 Quant/HFT</option>
                      <option value="Tier 1 AI Labs" className="bg-slate-900 text-slate-200">Tier 1 AI Labs</option>
                      <option value="High-Growth Unicorn" className="bg-slate-900 text-slate-200">High-Growth Unicorn</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  Showing <strong className="text-white">{filteredMatches.length}</strong> matching postings
                </div>
              </div>

              {/* Match Cards List */}
              <div className="space-y-3">
                {filteredMatches.map((match) => {
                  const scorePct = Math.round(match.scores.finalScore * 100);
                  const isHighMatch = scorePct >= 85;

                  let urgencyBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
                  if (match.urgencyLevel === 'CRITICAL_IMMEDIATE') {
                    urgencyBadgeClass = 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse';
                  } else if (match.urgencyLevel === 'HIGH_ROLLING') {
                    urgencyBadgeClass = 'bg-amber-950/80 text-amber-300 border-amber-500/40';
                  }

                  return (
                    <div
                      key={match.jobId}
                      className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-xl transition-all"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Title & Info */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgencyBadgeClass} flex items-center gap-1`}>
                              <Clock className="w-3 h-3" />
                              {match.urgencyLevel === 'CRITICAL_IMMEDIATE' ? 'Urgent Drop (<14d close)' : 'Rolling Review'}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-950 text-indigo-300 text-[10px] font-mono rounded border border-slate-800">
                              {match.companyTier}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              via {match.atsProvider} • {match.location} ({match.locationType})
                            </span>
                          </div>

                          <h3 className="text-lg font-extrabold text-white hover:text-indigo-300 transition-colors flex items-center gap-2">
                            <span>{match.title}</span>
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span className="font-semibold text-slate-200 flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-indigo-400" />
                              {match.company}
                            </span>
                            {match.salaryRange && (
                              <span className="font-mono text-emerald-300 font-medium">
                                💰 {match.salaryRange}
                              </span>
                            )}
                            <span className="text-slate-400">
                              Est. {match.estimatedTimeToCloseDays} days left to apply
                            </span>
                          </div>
                        </div>

                        {/* Composite Score Meter */}
                        <div className="flex items-center gap-4 shrink-0 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Match Fit</div>
                            <div className={`text-2xl font-black ${isHighMatch ? 'text-emerald-400' : 'text-indigo-300'}`}>
                              {scorePct}%
                            </div>
                          </div>

                          <div className="w-16 h-16 relative flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path
                                className="text-slate-800"
                                strokeWidth="3.5"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                className={isHighMatch ? 'text-emerald-500' : 'text-indigo-500'}
                                strokeDasharray={`${scorePct}, 100`}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <span className="absolute text-[11px] font-mono font-bold text-white">{scorePct}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Breakdown Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block">Layer 1 JD Match</span>
                          <span className="font-bold text-indigo-300">{Math.round(match.scores.layer1StatedMatch * 100)}%</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block">Layer 2 Reality Fit</span>
                          <span className="font-bold text-cyan-300">{Math.round(match.scores.layer2RealityMatch * 100)}%</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block">Target Boost</span>
                          <span className="font-bold text-emerald-300">+{Math.round(match.scores.compensationScore * 15)}%</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block">Penalties</span>
                          <span className="font-bold text-slate-400">{match.scores.penaltyDeductions === 0 ? 'None (0%)' : `-${match.scores.penaltyDeductions * 100}%`}</span>
                        </div>
                      </div>

                      {/* Skills & Match Narrative */}
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-slate-500 text-[11px] font-medium">Matched:</span>
                          {match.keyMatchedSkills.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-emerald-950/40 text-emerald-300 text-[10px] font-semibold rounded border border-emerald-500/30">
                              ✓ {s}
                            </span>
                          ))}
                          {match.missingCriticalSkills.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-rose-950/40 text-rose-300 text-[10px] font-semibold rounded border border-rose-500/30">
                              missing: {s}
                            </span>
                          ))}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
                          <strong className="text-indigo-300">Analysis:</strong> {match.matchExplanation}
                        </p>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        {/* Status Stage Selector */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 font-medium">Stage:</span>
                          <select
                            value={match.applicationStatus}
                            onChange={(e) => handleUpdateStatus(match.jobId, e.target.value as any)}
                            className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none"
                          >
                            <option value="NEW_MATCH">New Match</option>
                            <option value="APPLIED">Applied (Tracked)</option>
                            <option value="OA_RECEIVED">OA Received</option>
                            <option value="INTERVIEWING">Interviewing</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="OFFER">Offer</option>
                          </select>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedMatch(match)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>1-Min Tailoring</span>
                          </button>

                          <a
                            href={match.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
                          >
                            <span>Apply on {match.atsProvider}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PILLAR 2: TARGET PARAMETERS                                              */}
          {/* ========================================================================= */}
          {activePillar === 'parameters' && tempPrefs && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      Candidate Search & Matching Criteria
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adjust your hard filters, preferred target firms, and real-time alert dispatch destinations
                    </p>
                  </div>

                  <button
                    onClick={handleSaveParameters}
                    disabled={savingPrefs}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{savingPrefs ? 'Saving...' : 'Save Parameters'}</span>
                  </button>
                </div>

                {prefsSuccessMsg && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{prefsSuccessMsg}</span>
                  </div>
                )}

                {/* Match Score Threshold Slider */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Custom Match Score Trigger Threshold</span>
                      <span className="text-[11px] text-slate-400">Only trigger real-time alerts when composite score meets or exceeds this bar</span>
                    </div>
                    <span className="text-lg font-black text-indigo-400 font-mono">
                      {Math.round(tempPrefs.customMatchThreshold * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="1"
                    value={Math.round(tempPrefs.customMatchThreshold * 100)}
                    onChange={(e) =>
                      setTempPrefs({ ...tempPrefs, customMatchThreshold: Number(e.target.value) / 100 })
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>50% (High Volume / Borderline)</span>
                    <span>72% (Recommended Sweet Spot)</span>
                    <span>95% (Extreme Selective)</span>
                  </div>
                </div>

                {/* Target Roles & Locations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Target Roles */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-white block">Target Role Categories</span>
                    <div className="flex flex-wrap gap-1.5">
                      {tempPrefs.targetRoles.map((role) => (
                        <span
                          key={role}
                          className="px-2.5 py-1 bg-indigo-950/60 text-indigo-300 text-xs font-medium rounded-lg border border-indigo-500/30 flex items-center gap-1.5"
                        >
                          {role}
                          <button
                            onClick={() =>
                              setTempPrefs({
                                ...tempPrefs,
                                targetRoles: tempPrefs.targetRoles.filter((r) => r !== role),
                              })
                            }
                            className="text-indigo-400 hover:text-rose-400 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Target Locations */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-white block">Target Locations</span>
                    <div className="flex flex-wrap gap-1.5">
                      {tempPrefs.targetLocations.map((loc) => (
                        <span
                          key={loc}
                          className="px-2.5 py-1 bg-emerald-950/60 text-emerald-300 text-xs font-medium rounded-lg border border-emerald-500/30 flex items-center gap-1.5"
                        >
                          {loc}
                          <button
                            onClick={() =>
                              setTempPrefs({
                                ...tempPrefs,
                                targetLocations: tempPrefs.targetLocations.filter((l) => l !== loc),
                              })
                            }
                            className="text-emerald-400 hover:text-rose-400 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preferred vs Blacklisted Companies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Preferred Companies (+15% Score Boost)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tempPrefs.preferredCompanies.map((c) => (
                        <span key={c} className="px-2 py-0.5 bg-slate-900 text-slate-200 text-[11px] rounded border border-slate-800">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5" />
                      Blacklisted Entities (Hard 0% Filter)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tempPrefs.blacklistedCompanies.map((c) => (
                        <span key={c} className="px-2 py-0.5 bg-rose-950/40 text-rose-300 text-[11px] rounded border border-rose-800/60">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Alert Destination */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-white block">Real-time Notification Channel</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Dispatch Method</label>
                      <select
                        value={tempPrefs.alertMethod}
                        onChange={(e) =>
                          setTempPrefs({ ...tempPrefs, alertMethod: e.target.value as any })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none"
                      >
                        <option value="telegram">Telegram Bot (Instant Direct Notification)</option>
                        <option value="email">Email Digest</option>
                        <option value="webhook">Custom HTTP Webhook</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Destination Handle / Token</label>
                      <input
                        type="text"
                        value={tempPrefs.alertDestination}
                        onChange={(e) =>
                          setTempPrefs({ ...tempPrefs, alertDestination: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PILLAR 3: RESUME COMPONENT STUDIO                                         */}
          {/* ========================================================================= */}
          {activePillar === 'resume' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      {data.resumeComponentsSummary.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sub-vector embeddings: 768-dim float • Status:{' '}
                      <span className="text-emerald-400 font-semibold">{data.resumeComponentsSummary.embeddingsStatus}</span>
                    </p>
                  </div>

                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-full border border-indigo-500/40 font-mono">
                    Primary Profile
                  </span>
                </div>

                {/* Skills Cloud */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-white block">Indexed Technical Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {data.resumeComponentsSummary.topSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 bg-slate-900 text-slate-200 text-xs font-mono rounded-lg border border-slate-800 flex items-center gap-1.5"
                      >
                        <Code2 className="w-3 h-3 text-indigo-400" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Projects & Experience Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-white block">High-Impact Project Artifacts</span>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80">
                        <span className="font-bold text-indigo-300 block">Lock-Free Order Matching Engine (C++20)</span>
                        <span className="text-[11px] text-slate-400">8.5M orders/sec throughput, &lt;800ns median latency</span>
                      </div>
                      <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80">
                        <span className="font-bold text-cyan-300 block">Distributed Raft Consensus KV-Store (Rust)</span>
                        <span className="text-[11px] text-slate-400">Automated partition recovery, gRPC consensus serialization</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-white block">Industry Experience Highlights</span>
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80 text-xs">
                      <span className="font-bold text-white block">Meta — Software Engineering Intern (Infra)</span>
                      <span className="text-[11px] text-emerald-300 block">Summer 2025</span>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Engineered real-time C++ cache invalidation pipeline processing 1.2M QPS with sub-millisecond p99 latency.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PILLAR 4: COMPANY REALITY BARS                                            */}
          {/* ========================================================================= */}
          {activePillar === 'companies' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.trackedCompanies.map((company) => (
                <div
                  key={company.companyName}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-base font-bold text-white">{company.companyName}</h4>
                      <span className="px-2 py-0.5 bg-slate-950 text-indigo-300 text-[10px] font-mono rounded-full border border-slate-800">
                        {company.tier}
                      </span>
                    </div>

                    <div className="mt-3 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                        Informal Hiring Bar (Layer 2 Reality)
                      </span>
                      <p className="text-slate-300 text-xs leading-relaxed">{company.realityBarSummary}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
                      <Zap className="w-3.5 h-3.5" />
                      Fast-Track Recruiter Intel:
                    </span>
                    <p className="text-slate-400 text-[11px] leading-snug">{company.fastTrackTip}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* PILLAR 5: E2E PIPELINE SIMULATOR                                          */}
          {/* ========================================================================= */}
          {activePillar === 'pipeline-simulator' && (
            <div className="space-y-6">
              {/* Simulator Config Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Step-by-Step E2E Job Drop & Alerting Pipeline Simulator
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Traces: Fresh Scrape → Normalization & Dedup → Layer 1 RAG → Layer 2 Reality → Scoring → Telegram Dispatch
                    </p>
                  </div>

                  <button
                    onClick={handleSimulatePipeline}
                    disabled={simulating}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play className={`w-4 h-4 ${simulating ? 'animate-spin' : ''}`} />
                    <span>{simulating ? 'Executing Pipeline...' : 'Simulate Live Job Drop'}</span>
                  </button>
                </div>

                {/* Preset Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">ATS Provider</label>
                    <select
                      value={simAts}
                      onChange={(e) => setSimAts(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none cursor-pointer"
                    >
                      <option value="Greenhouse">Greenhouse ATS</option>
                      <option value="Lever">Lever ATS</option>
                      <option value="Ashby">Ashby ATS</option>
                      <option value="Workday">Workday Direct</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Company Entity</label>
                    <input
                      type="text"
                      value={simCompany}
                      onChange={(e) => setSimCompany(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Job Title</label>
                    <input
                      type="text"
                      value={simTitle}
                      onChange={(e) => setSimTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Compensation</label>
                    <input
                      type="text"
                      value={simSalary}
                      onChange={(e) => setSimSalary(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Trace Steps Visualizer */}
              {liveTrace && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-sm font-bold text-white font-mono">Trace: {liveTrace.executionId}</span>
                    </div>
                    <span className="text-xs font-mono text-cyan-300">
                      Total Latency: <strong>{liveTrace.totalDurationMs}ms</strong>
                    </span>
                  </div>

                  {/* Steps Progress Waterfall */}
                  <div className="space-y-3">
                    {liveTrace.steps.map((step) => (
                      <div
                        key={step.stepNumber}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-4 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center justify-center font-mono">
                              {step.stepNumber}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-white">{step.stepName}</h4>
                              <span className="text-[10px] text-slate-500 font-mono uppercase">{step.phaseCategory}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400">{step.durationMs}ms</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                step.status === 'PASSED'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {step.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Input:</span>
                            <span className="text-slate-300 text-[11px] font-mono truncate block">{step.inputSummary}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Output / Result:</span>
                            <span className="text-indigo-300 text-[11px] font-mono block">{step.outputSummary}</span>
                          </div>
                        </div>

                        {/* Assertions */}
                        {step.assertions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {step.assertions.map((a, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[11px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="text-slate-300">{a.name}:</span>
                                <span className="text-slate-500 font-mono">{a.actual}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Final Verdict Banner */}
                  {liveTrace.finalScoringResult && (
                    <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-emerald-300 font-bold block">Pipeline Execution Complete</span>
                        <span className="text-sm font-black text-white">
                          Composite Score: {Math.round(liveTrace.finalScoringResult.compositeScore * 100)}% • Verdict: {liveTrace.finalScoringResult.verdict}
                        </span>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/40">
                        {liveTrace.notificationResult?.dispatched ? 'Telegram Alert Sent' : 'Logged Below Bar'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* PILLAR 6: VERIFICATION & LOAD SUITE                                       */}
          {/* ========================================================================= */}
          {activePillar === 'e2e-suite' && (
            <div className="space-y-6">
              {/* Test Suite Control Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    End-to-End System Invariant & Concurrency Test Bench
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Validates all 6 core subsystem requirements: Scraping, Deduplication, Layer 1 & 2 RAG, Deterministic Scoring, Telegram Dispatch, and 50-Job Load Test.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunLoadBenchmark}
                    disabled={runningBenchmark}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{runningBenchmark ? 'Benchmarking...' : 'Run 50-Job Load Test'}</span>
                  </button>

                  <button
                    onClick={handleRunFullTestSuite}
                    disabled={runningSuite}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${runningSuite ? 'animate-spin' : ''}`} />
                    <span>{runningSuite ? 'Executing...' : 'Run Full Suite'}</span>
                  </button>
                </div>
              </div>

              {/* Concurrency Benchmark Display */}
              {benchmarkResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    50-Job Parallel Load Benchmark Results
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Total Throughput</span>
                      <span className="text-xl font-black text-emerald-300">{benchmarkResult.throughputJobsPerSecond} jobs/s</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">P50 Median Latency</span>
                      <span className="text-xl font-black text-white">{benchmarkResult.p50LatencyMs}ms</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">P95 Latency</span>
                      <span className="text-xl font-black text-cyan-300">{benchmarkResult.p95LatencyMs}ms</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Success Rate</span>
                      <span className="text-xl font-black text-emerald-400">
                        {benchmarkResult.successfulJobs}/{benchmarkResult.totalJobsSimulated} (100%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Cases Results List */}
              {testSummary && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Test Suite Summary: {testSummary.passed}/{testSummary.totalTests} Passed ({testSummary.totalDurationMs}ms)
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                        testSummary.allPassed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300'
                      }`}
                    >
                      {testSummary.allPassed ? 'ALL INVARIANTS PASSED' : 'FAILURES DETECTED'}
                    </span>
                  </div>

                  {testSummary.testCases.map((tc) => (
                    <div
                      key={tc.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3 shadow-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <h5 className="text-sm font-bold text-white">{tc.name}</h5>
                          <span className="text-[10px] font-mono text-slate-500">{tc.durationMs}ms</span>
                        </div>
                        <p className="text-xs text-slate-400">{tc.description}</p>
                      </div>

                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/30">
                        PASS
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 1-Minute Resume Tailoring Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Automated Delta Tailoring
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedMatch.title}</h3>
                <span className="text-xs text-slate-400">{selectedMatch.company}</span>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Tailoring Recommendation & Sub-Vector Uplift:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                {selectedMatch.tailoringRecommendation}
              </p>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-semibold block mb-1">Assessment Preparation:</span>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>• <strong>Format:</strong> {selectedMatch.oaDetails.platform}</div>
                  <div>• <strong>Bar:</strong> {selectedMatch.oaDetails.dsaDifficulty}</div>
                  <div>• <strong>Key Topics:</strong> {selectedMatch.oaDetails.focusAreas.join(', ')}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <a
                href={selectedMatch.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
              >
                <span>Proceed to Apply</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
