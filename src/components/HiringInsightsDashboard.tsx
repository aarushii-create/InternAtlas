import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  Calendar,
  Zap,
  BarChart3,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Award,
  Layers,
  Cpu,
  ChevronRight,
  Shield,
  Activity,
  ArrowUpRight,
  Briefcase,
  Building,
  Sliders,
  Play,
  Check,
  X,
  PieChart,
  Sparkles,
} from 'lucide-react';
import {
  HistoricalHiringInsightsReport,
  HiringAnalyticsQueryFilters,
  SkillFrequencyMetric,
  ApplicationWindowLifespan,
  CompanyHiringMetric,
  RoleHiringInsight,
  VelocityHeatmapCell,
} from '../types';
import { HiringAnalyticsSuiteSummary } from '../lib/analytics/hiringAnalyticsTestSuite';

export const HiringInsightsDashboard: React.FC = () => {
  const [report, setReport] = useState<HistoricalHiringInsightsReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<number>(180);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'velocity' | 'skills' | 'lifespan' | 'companies' | 'roles' | 'tests'>('velocity');

  // Skill category filter
  const [selectedSkillCategory, setSelectedSkillCategory] = useState<string>('ALL');

  // Heatmap hover state
  const [hoveredCell, setHoveredCell] = useState<VelocityHeatmapCell | null>(null);

  // Test suite execution
  const [testSummary, setTestSummary] = useState<HiringAnalyticsSuiteSummary | null>(null);
  const [runningTests, setRunningTests] = useState<boolean>(false);

  // Fetch report
  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedCompany !== 'ALL') params.append('company', selectedCompany);
      if (selectedRoleCategory !== 'ALL') params.append('roleCategory', selectedRoleCategory);
      if (selectedTier !== 'ALL') params.append('tier', selectedTier);
      if (selectedTimeWindow !== 180) params.append('timeWindowDays', selectedTimeWindow.toString());

      const res = await fetch(`/api/analytics/hiring-patterns?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch report: ${res.statusText}`);
      }
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Error loading hiring patterns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedCompany, selectedRoleCategory, selectedTier, selectedTimeWindow]);

  // Run test suite
  const handleRunTests = async () => {
    try {
      setRunningTests(true);
      const res = await fetch('/api/analytics/test-suite', { method: 'POST' });
      if (!res.ok) throw new Error('Test suite execution failed');
      const data = await res.json();
      setTestSummary(data);
    } catch (err: any) {
      console.error('Test run failed:', err);
    } finally {
      setRunningTests(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-full border border-indigo-500/40 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                Phase 14 Hiring Intelligence
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                Live Aggregate Engine
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              Historical Hiring Pattern Insights Dashboard
            </h1>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Macro hiring intelligence & lifecycle dynamics gathered across <span className="text-indigo-300 font-semibold">450+ tech & quant internship cycles</span>. Analyze posting drop velocity heatmaps, role-specific skills demand, and time-to-close urgency decay curves.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('tests');
                handleRunTests();
              }}
              disabled={runningTests}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${runningTests ? 'animate-spin' : ''}`} />
              <span>Run 6-Test Suite</span>
            </button>
          </div>
        </div>

        {/* Global Metric Counter Strip */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-indigo-500/20">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                Postings Analyzed
              </div>
              <div className="text-xl font-bold text-white mt-1">{report.totalJobsAnalyzed}</div>
              <div className="text-[10px] text-slate-400">across {report.totalCompaniesAnalyzed} companies</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Peak Drop Day
              </div>
              <div className="text-base font-bold text-emerald-300 mt-1 truncate">
                {report.postingVelocity.peakDropDay.split(' ')[0]}
              </div>
              <div className="text-[10px] text-slate-400">Tuesday/Wednesday Surge</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Peak Drop Time
              </div>
              <div className="text-base font-bold text-cyan-300 mt-1 truncate">
                10:00 AM EST
              </div>
              <div className="text-[10px] text-slate-400">09:00 - 11:30 AM Wave</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                Avg Days to Close
              </div>
              <div className="text-xl font-bold text-amber-300 mt-1">
                {report.applicationLifespans.overallAverageDays}d
              </div>
              <div className="text-[10px] text-slate-400">Median: {report.applicationLifespans.overallMedianDays} days</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Quant Fast-Close
              </div>
              <div className="text-xl font-bold text-rose-300 mt-1">12-16d</div>
              <div className="text-[10px] text-rose-400/80">95% Rolling Review</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                #1 Rising Skill
              </div>
              <div className="text-base font-bold text-purple-300 mt-1 truncate">
                CUDA / GPU Kernels
              </div>
              <div className="text-[10px] text-purple-400">+64% YoY Growth</div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Filter Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
            <Filter className="w-4 h-4 text-indigo-400" />
            <span>Query Filters:</span>
          </div>

          {/* Company Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-500">Company:</span>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">All Target Companies</option>
              <option value="Citadel Securities" className="bg-slate-900 text-slate-200">Citadel Securities</option>
              <option value="Jane Street" className="bg-slate-900 text-slate-200">Jane Street</option>
              <option value="Two Sigma" className="bg-slate-900 text-slate-200">Two Sigma</option>
              <option value="Hudson River Trading (HRT)" className="bg-slate-900 text-slate-200">Hudson River Trading (HRT)</option>
              <option value="OpenAI" className="bg-slate-900 text-slate-200">OpenAI</option>
              <option value="Anthropic" className="bg-slate-900 text-slate-200">Anthropic</option>
              <option value="Databricks" className="bg-slate-900 text-slate-200">Databricks</option>
              <option value="Stripe" className="bg-slate-900 text-slate-200">Stripe</option>
              <option value="Palantir Technologies" className="bg-slate-900 text-slate-200">Palantir Technologies</option>
              <option value="Snowflake" className="bg-slate-900 text-slate-200">Snowflake</option>
              <option value="Ramp" className="bg-slate-900 text-slate-200">Ramp</option>
              <option value="Google" className="bg-slate-900 text-slate-200">Google</option>
              <option value="Microsoft" className="bg-slate-900 text-slate-200">Microsoft</option>
              <option value="Apple" className="bg-slate-900 text-slate-200">Apple</option>
              <option value="Amazon" className="bg-slate-900 text-slate-200">Amazon</option>
              <option value="Meta" className="bg-slate-900 text-slate-200">Meta</option>
              <option value="Goldman Sachs" className="bg-slate-900 text-slate-200">Goldman Sachs</option>
              <option value="Salesforce" className="bg-slate-900 text-slate-200">Salesforce</option>
            </select>
          </div>

          {/* Role Category Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-500">Role:</span>
            <select
              value={selectedRoleCategory}
              onChange={(e) => setSelectedRoleCategory(e.target.value)}
              className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">All Role Categories</option>
              <option value="Systems & Infrastructure" className="bg-slate-900 text-slate-200">Systems & Infrastructure</option>
              <option value="AI / Machine Learning" className="bg-slate-900 text-slate-200">AI / Machine Learning</option>
              <option value="Quantitative Finance & Low Latency" className="bg-slate-900 text-slate-200">Quantitative Finance & Low Latency</option>
              <option value="Fullstack & Backend" className="bg-slate-900 text-slate-200">Fullstack & Backend</option>
              <option value="Data Engineering & Analytics" className="bg-slate-900 text-slate-200">Data Engineering & Analytics</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-500">Tier:</span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">All Company Tiers</option>
              <option value="Tier 1 AI Labs" className="bg-slate-900 text-slate-200">Tier 1 AI Labs</option>
              <option value="Tier 1 Quant/HFT" className="bg-slate-900 text-slate-200">Tier 1 Quant / HFT</option>
              <option value="High-Growth Unicorn" className="bg-slate-900 text-slate-200">High-Growth Unicorn</option>
              <option value="FAANG / Big Tech" className="bg-slate-900 text-slate-200">FAANG / Big Tech</option>
              <option value="Enterprise SaaS" className="bg-slate-900 text-slate-200">Enterprise SaaS</option>
            </select>
          </div>

          {/* Time Window */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-500">Window:</span>
            <select
              value={selectedTimeWindow}
              onChange={(e) => setSelectedTimeWindow(Number(e.target.value))}
              className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer"
            >
              <option value={180} className="bg-slate-900 text-slate-200">All-Time (180 Days)</option>
              <option value={90} className="bg-slate-900 text-slate-200">Last 90 Days</option>
              <option value={30} className="bg-slate-900 text-slate-200">Last 30 Days</option>
            </select>
          </div>
        </div>

        {(selectedCompany !== 'ALL' || selectedRoleCategory !== 'ALL' || selectedTier !== 'ALL' || selectedTimeWindow !== 180) && (
          <button
            onClick={() => {
              setSelectedCompany('ALL');
              setSelectedRoleCategory('ALL');
              setSelectedTier('ALL');
              setSelectedTimeWindow(180);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer underline"
          >
            <X className="w-3 h-3" />
            Reset Filters
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('velocity')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'velocity'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>1. Posting Velocity & Drop Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'skills'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>2. Skills Demand Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('lifespan')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'lifespan'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>3. Lifespan & Application Window</span>
        </button>

        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'companies'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>4. Company Profiles & Fast-Track</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>5. Role Category Insights</span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'tests'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-emerald-300" />
          <span>6. Verification Test Bench</span>
        </button>
      </div>

      {loading && !report && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-300 text-sm font-semibold">Aggregating historical hiring lifecycle metrics...</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: POSTING VELOCITY & 7X24 HEATMAP MATRIX                             */}
          {/* ========================================================================= */}
          {activeTab === 'velocity' && (
            <div className="space-y-6">
              {/* Velocity Summary Callout */}
              <div className="bg-gradient-to-r from-indigo-950/50 via-slate-900 to-indigo-950/50 border border-indigo-500/30 rounded-2xl p-5 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-300 border border-indigo-500/30 shrink-0">
                    <Zap className="w-6 h-6 text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Recruiter Drop Velocity & Timing Intelligence</span>
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[11px] rounded-full font-mono">
                        {report.postingVelocity.weekdayVsWeekendRatio}
                      </span>
                    </h3>
                    <p className="text-slate-300 text-xs mt-1.5 leading-relaxed">
                      {report.postingVelocity.velocityInsightSummary}
                    </p>
                  </div>
                </div>
              </div>

              {/* 7x24 Heatmap Matrix */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      7-Day x 24-Hour Job Drop Heatmap Matrix
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Visualizing exact timestamps when new tech & quant requisitions enter ATS boards
                    </p>
                  </div>

                  {/* Heatmap Legend */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>Low</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 rounded bg-slate-950 border border-slate-800"></div>
                      <div className="w-3.5 h-3.5 rounded bg-indigo-950 border border-indigo-900"></div>
                      <div className="w-3.5 h-3.5 rounded bg-indigo-800"></div>
                      <div className="w-3.5 h-3.5 rounded bg-indigo-600"></div>
                      <div className="w-3.5 h-3.5 rounded bg-cyan-400"></div>
                    </div>
                    <span>Surge Peak</span>
                  </div>
                </div>

                {/* Heatmap Grid */}
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[720px]">
                    {/* Hour Labels Header */}
                    <div className="grid grid-cols-[80px_repeat(24,_1fr)] gap-1 mb-2 text-[10px] text-slate-500 font-mono">
                      <div className="text-right pr-2">Day / Hr</div>
                      {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} className="text-center">
                          {h % 3 === 0 ? `${h}h` : '·'}
                        </div>
                      ))}
                    </div>

                    {/* Day Rows */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayShort, dayIdx) => {
                      const dayCells = report.postingVelocity.heatmapMatrix.filter((c) => c.dayIndex === dayIdx);

                      return (
                        <div key={dayIdx} className="grid grid-cols-[80px_repeat(24,_1fr)] gap-1 mb-1 items-center">
                          <div className="text-xs font-semibold text-slate-400 text-right pr-2 font-mono">
                            {dayShort}
                          </div>

                          {dayCells.map((cell) => {
                            // Determine cell background
                            let bgClass = 'bg-slate-950 border-slate-900';
                            if (cell.count > 0) {
                              if (cell.intensity > 0.8) bgClass = 'bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-400/40';
                              else if (cell.intensity > 0.55) bgClass = 'bg-indigo-500 text-white';
                              else if (cell.intensity > 0.3) bgClass = 'bg-indigo-700 text-indigo-100';
                              else if (cell.intensity > 0.1) bgClass = 'bg-indigo-900/80 text-indigo-300';
                              else bgClass = 'bg-indigo-950/40 text-slate-500';
                            }

                            return (
                              <div
                                key={cell.hour}
                                onMouseEnter={() => setHoveredCell(cell)}
                                onMouseLeave={() => setHoveredCell(null)}
                                className={`h-8 rounded flex items-center justify-center text-[10px] border transition-all cursor-pointer hover:scale-110 hover:z-20 hover:ring-2 hover:ring-white ${bgClass}`}
                              >
                                {cell.count > 0 ? cell.count : ''}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Heatmap Tooltip info */}
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  {hoveredCell ? (
                    <div className="flex items-center gap-2 text-indigo-300 font-medium">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span>
                        {hoveredCell.dayName} at {hoveredCell.hourLabel}:{' '}
                        <strong className="text-white">{hoveredCell.count} job postings dropped</strong> (Intensity: {(hoveredCell.intensity * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500">Hover over any matrix cell to inspect specific hourly drop volume.</span>
                  )}
                  <span className="text-slate-400 text-[11px]">Timezone: Eastern Standard Time (EST)</span>
                </div>
              </div>

              {/* Day of Week Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
                {report.postingVelocity.dayOfWeekDistribution.map((d) => (
                  <div
                    key={d.dayIndex}
                    className={`rounded-xl p-3 border transition-all ${
                      d.dayName === 'Tuesday' || d.dayName === 'Wednesday'
                        ? 'bg-indigo-950/40 border-indigo-500/40 shadow-md'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{d.dayName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {d.percentage}%
                      </span>
                    </div>
                    <div className="text-lg font-extrabold text-indigo-300 mt-1">{d.count} drops</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Peak: <strong className="text-slate-200">{d.peakHourLabel}</strong>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, d.percentage * 3.5)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 24-Hour Velocity Curve */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  24-Hour Intraday Drop Curve
                </h3>

                <div className="grid grid-cols-6 sm:grid-cols-12 lg:grid-cols-24 gap-1 items-end h-32 pt-6">
                  {report.postingVelocity.hourlyDistribution.map((h) => {
                    const isPeak = h.hour >= 9 && h.hour <= 12;
                    return (
                      <div key={h.hour} className="flex flex-col items-center gap-1 h-full justify-end group">
                        <div
                          className={`w-full rounded-t transition-all ${
                            isPeak
                              ? 'bg-gradient-to-t from-indigo-600 to-cyan-400 group-hover:brightness-125'
                              : 'bg-slate-800 group-hover:bg-slate-700'
                          }`}
                          style={{ height: `${Math.max(8, h.percentage * 6.5)}%` }}
                          title={`${h.label}: ${h.count} jobs (${h.percentage}%)`}
                        ></div>
                        <span className="text-[9px] text-slate-500 font-mono">{h.hour}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SKILLS DEMAND MATRIX & RANKINGS                                    */}
          {/* ========================================================================= */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              {/* Category selector pills */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                {['ALL', 'Languages', 'Systems & Backend', 'AI & ML', 'Data & Cloud', 'Quantitative & Math'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedSkillCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedSkillCategory === cat
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Skills Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(selectedSkillCategory === 'ALL'
                  ? report.skillsDemand.topOverallSkills
                  : report.skillsDemand.skillsByCategory[selectedSkillCategory] || []
                ).map((skillMetric, idx) => (
                  <div
                    key={skillMetric.skill}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500 font-bold">#{idx + 1}</span>
                            <h4 className="text-base font-bold text-white">{skillMetric.skill}</h4>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">{skillMetric.category}</span>
                        </div>

                        {/* Trend badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border ${
                            skillMetric.trendDirection === 'RISING'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : skillMetric.trendDirection === 'EMERGING'
                              ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <TrendingUp className="w-3 h-3" />
                          {skillMetric.growthRateYearOverYear}
                        </span>
                      </div>

                      {/* Frequency Metric */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Listed Frequency</span>
                          <span className="text-sm font-bold text-indigo-300">{skillMetric.frequencyPercentage}%</span>
                          <span className="text-[10px] text-slate-500 block">({skillMetric.occurrenceCount} mentions)</span>
                        </div>

                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Mandatory Bar</span>
                          <span className="text-sm font-bold text-cyan-300">{skillMetric.mandatoryRatePercentage}%</span>
                          <span className="text-[10px] text-slate-500 block">strict requirement</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-950 h-2 rounded-full mt-3 overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, skillMetric.frequencyPercentage)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Tier Distribution summary */}
                    <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-500">Highest Demand in:</span>
                      {skillMetric.tierDistribution.slice(0, 2).map((td) => (
                        <span key={td.tier} className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-medium">
                          {td.tier.split('/')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: LIFESPAN & APPLICATION WINDOWS                                     */}
          {/* ========================================================================= */}
          {activeTab === 'lifespan' && (
            <div className="space-y-6">
              {/* Urgency overview cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.applicationLifespans.tierLifespans.map((tierData) => {
                  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                  if (tierData.urgencyLevel === 'CRITICAL_IMMEDIATE') badgeColor = 'bg-rose-950/60 text-rose-300 border-rose-500/40';
                  else if (tierData.urgencyLevel === 'HIGH_ROLLING') badgeColor = 'bg-amber-950/60 text-amber-300 border-amber-500/40';
                  else if (tierData.urgencyLevel === 'MODERATE') badgeColor = 'bg-blue-950/60 text-blue-300 border-blue-500/40';

                  return (
                    <div
                      key={tierData.tier}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-base font-bold text-white">{tierData.tier}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                            {tierData.urgencyLevel.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Lifespan Metric Banner */}
                        <div className="mt-4 bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Average Open Window</span>
                            <span className="text-2xl font-black text-indigo-300">{tierData.averageDaysOpen} days</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Median (P50)</span>
                            <span className="text-xl font-bold text-cyan-300">{tierData.medianDaysOpen} days</span>
                          </div>
                        </div>

                        {/* Percentiles Strip */}
                        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                          <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-500 block">P25 (Early Fill)</span>
                            <span className="text-xs font-bold text-slate-200">{tierData.p25DaysOpen}d</span>
                          </div>
                          <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-500 block">P75 Window</span>
                            <span className="text-xs font-bold text-slate-200">{tierData.p75DaysOpen}d</span>
                          </div>
                          <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-500 block">P90 Outer</span>
                            <span className="text-xs font-bold text-slate-200">{tierData.p90DaysOpen}d</span>
                          </div>
                        </div>
                      </div>

                      {/* Actionable Lead Time Recommendation */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Target Application Window:</span>
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          Within {tierData.recommendedApplicationLeadTimeDays} days of drop
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fastest vs Longest Open Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fastest Closing */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2 mb-4">
                    <Flame className="w-4 h-4 text-rose-400" />
                    Fastest Closing Requisitions (Urgent Rolling Pipeline)
                  </h4>
                  <div className="space-y-2">
                    {report.applicationLifespans.fastestClosingCompanies.map((c, idx) => (
                      <div
                        key={c.company}
                        className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between hover:border-rose-500/40 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono text-slate-500 font-bold">#{idx + 1}</span>
                          <div>
                            <span className="text-xs font-bold text-white block">{c.company}</span>
                            <span className="text-[10px] text-slate-400">{c.tier}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-rose-400">{c.avgDays} days avg</span>
                          <span className="text-[10px] text-rose-400/70 block">Rolling OA Threshold</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Longest Open */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Standard Open Windows (Batch Review Portals)
                  </h4>
                  <div className="space-y-2">
                    {report.applicationLifespans.longestOpenCompanies.map((c, idx) => (
                      <div
                        key={c.company}
                        className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between hover:border-cyan-500/40 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono text-slate-500 font-bold">#{idx + 1}</span>
                          <div>
                            <span className="text-xs font-bold text-white block">{c.company}</span>
                            <span className="text-[10px] text-slate-400">{c.tier}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-cyan-400">{c.avgDays} days avg</span>
                          <span className="text-[10px] text-slate-500 block">Batch Seasonal Waves</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: COMPANY PROFILES & FAST-TRACK INTELLIGENCE                         */}
          {/* ========================================================================= */}
          {activeTab === 'companies' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.companyHiringMetrics.map((companyMetric) => (
                  <div
                    key={companyMetric.companyId}
                    className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-base font-bold text-white">{companyMetric.companyName}</h4>
                          <span className="text-[11px] text-indigo-400 font-semibold">{companyMetric.tier}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-950 text-slate-300 text-[10px] font-mono rounded-full border border-slate-800">
                          {companyMetric.industry.split('/')[0]}
                        </span>
                      </div>

                      {/* Key stats row */}
                      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Avg Posting Lifespan</span>
                          <span className="text-sm font-black text-white">{companyMetric.averagePostingLifespanDays} days</span>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Peak Drop Time</span>
                          <span className="text-xs font-bold text-cyan-300">{companyMetric.peakPostingDay} {companyMetric.peakPostingTime}</span>
                        </div>
                      </div>

                      {/* Assessment Format & Rate */}
                      <div className="mt-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">OA Format:</span>
                          <span className="font-semibold text-slate-200 truncate max-w-[170px]">{companyMetric.oaPlatform}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Est. Pay:</span>
                          <span className="font-mono text-emerald-300 font-bold">{companyMetric.estimatedHourlyRateUsd}</span>
                        </div>
                      </div>

                      {/* Top Skills Required */}
                      <div className="mt-3">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Most Frequent Skills</span>
                        <div className="flex flex-wrap gap-1">
                          {companyMetric.topSkills.map((ts) => (
                            <span key={ts.skill} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded-md font-medium">
                              {ts.skill} ({ts.percentage}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Fast Track Notice */}
                    <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-indigo-300/90 leading-snug">
                      <span className="font-semibold text-white block mb-0.5">Recruiter Intel:</span>
                      {companyMetric.fastTrackNotice}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: ROLE CATEGORY INSIGHTS                                             */}
          {/* ========================================================================= */}
          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {report.roleInsights.map((role) => (
                <div
                  key={role.roleCategory}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-base font-bold text-white">{role.roleCategory}</h4>
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-full border border-indigo-500/30">
                        {role.jobCount} Jobs
                      </span>
                    </div>

                    <div className="mt-4 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Average Open Window:</span>
                        <span className="font-bold text-white">{role.avgLifespanDays} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Peak Posting Surge:</span>
                        <span className="font-bold text-cyan-300">{role.peakPostingSeason}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Match Complexity:</span>
                        <span className="font-bold text-amber-300">{role.avgMatchDifficulty}</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Top Languages</span>
                      <div className="flex flex-wrap gap-1">
                        {role.topLanguages.map((l) => (
                          <span key={l} className="px-2 py-0.5 bg-slate-800 text-slate-200 text-xs rounded-md font-mono">
                            {l}
                          </span>
                        ))}
                      </div>

                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block pt-1">Key Frameworks & Tech</span>
                      <div className="flex flex-wrap gap-1">
                        {role.topFrameworks.map((f) => (
                          <span key={f} className="px-2 py-0.5 bg-indigo-950/60 text-indigo-300 text-xs rounded-md font-mono border border-indigo-800/60">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: AUTOMATED TEST BENCH                                               */}
          {/* ========================================================================= */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      Historical Hiring Pattern Analytics Test Suite
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Runs 6 automated invariant and aggregation verification routines validating matrix completeness, percentile monotonicity, and query filtering.
                    </p>
                  </div>

                  <button
                    onClick={handleRunTests}
                    disabled={runningTests}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play className={`w-4 h-4 ${runningTests ? 'animate-spin' : ''}`} />
                    <span>{runningTests ? 'Executing Tests...' : 'Execute All 6 Tests'}</span>
                  </button>
                </div>

                {testSummary && (
                  <div className="mt-6 space-y-4">
                    {/* Summary badge */}
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between ${
                        testSummary.allPassed
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {testSummary.allPassed ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-6 h-6 text-rose-400" />
                        )}
                        <div>
                          <span className="text-sm font-bold block">
                            {testSummary.allPassed
                              ? 'All 6 Analytics Invariants Passed Successfully'
                              : 'Test Suite Failures Detected'}
                          </span>
                          <span className="text-xs opacity-80">
                            {testSummary.passedCount} of {testSummary.totalTests} tests passed in {testSummary.totalDurationMs}ms
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Test cases list */}
                    <div className="space-y-3">
                      {testSummary.results.map((test) => (
                        <div
                          key={test.id}
                          className="bg-slate-950 border border-slate-800 rounded-xl p-4 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                  test.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {test.passed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-white">{test.name}</h4>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                                    {test.category}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{test.details}</p>
                              </div>
                            </div>

                            <span className="text-[11px] font-mono text-slate-500 font-semibold shrink-0">
                              {test.durationMs}ms
                            </span>
                          </div>

                          {/* Metrics block */}
                          {test.metrics && (
                            <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                              {Object.entries(test.metrics).map(([key, val]) => (
                                <div key={key} className="bg-slate-900 p-2 rounded border border-slate-800">
                                  <span className="text-slate-500 block truncate">{key}</span>
                                  <span className="text-slate-200 font-mono font-semibold truncate block">
                                    {Array.isArray(val) ? val.join(', ') : String(val)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
