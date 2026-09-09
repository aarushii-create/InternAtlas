import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Building2,
  GraduationCap,
  Scale,
  Award,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Play,
  ArrowRight,
  Info,
  DollarSign,
  Calendar,
  Lock,
  Eye,
  Video,
  FileCode2,
  Target,
  Clock,
  BookOpen,
  Database,
} from 'lucide-react';
import { Job, Resume, Layer2EvaluationResult, Layer2Warning } from '../types';
import { Layer2TestSuiteReport } from '../lib/rag/layer2TestSuite';
import { CompanyVectorKnowledgeBase } from './rag/CompanyVectorKnowledgeBase';

interface Layer2RealityStudioProps {
  currentResume?: Resume;
  onRefreshJobs?: () => void;
}

export function Layer2RealityStudio({ currentResume, onRefreshJobs }: Layer2RealityStudioProps) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [evaluationResult, setEvaluationResult] = useState<Layer2EvaluationResult | null>(null);
  const [batchResults, setBatchResults] = useState<Layer2EvaluationResult[]>([]);
  const [batchAggregates, setBatchAggregates] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isBatchEvaluating, setIsBatchEvaluating] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'single' | 'batch' | 'knowledge-base' | 'tests'>('single');
  const [batchFilter, setBatchFilter] = useState<'all' | 'warnings' | 'downgraded' | 'boosted' | 'high_fit'>('all');
  const [testReport, setTestReport] = useState<Layer2TestSuiteReport | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  // Fetch resumes and jobs
  const fetchData = async () => {
    try {
      const [resumesRes, jobsRes] = await Promise.all([
        fetch('/api/resumes'),
        fetch('/api/jobs'),
      ]);

      if (resumesRes.ok) {
        const resumesData: Resume[] = await resumesRes.json();
        setResumes(resumesData);
        if (resumesData.length > 0 && !selectedResumeId) {
          const primary = resumesData.find((r) => r.isPrimary) || resumesData[0];
          setSelectedResumeId(primary.id);
        }
      }

      if (jobsRes.ok) {
        const jobsData: Job[] = await jobsRes.json();
        const activeJobs = jobsData.filter((j) => j.isActive);
        setJobs(activeJobs);
        if (activeJobs.length > 0 && !selectedJobId) {
          setSelectedJobId(activeJobs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load Layer 2 studio data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Run single evaluation
  const handleRunEvaluation = async (overrideJobId?: string, overrideResumeId?: string) => {
    const resId = overrideResumeId || selectedResumeId;
    const jId = overrideJobId || selectedJobId;
    if (!resId || !jId) return;

    setIsEvaluating(true);
    try {
      const res = await fetch('/api/rag/layer2/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: resId,
          jobId: jId,
        }),
      });

      if (res.ok) {
        const data: Layer2EvaluationResult = await res.json();
        setEvaluationResult(data);
      }
    } catch (err) {
      console.error('Layer 2 evaluation failed:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Run batch evaluation across all active jobs
  const handleRunBatchEvaluation = async () => {
    if (!selectedResumeId) return;
    setIsBatchEvaluating(true);
    try {
      const res = await fetch('/api/rag/layer2/batch-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: selectedResumeId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBatchResults(data.evaluations || []);
        setBatchAggregates(data.aggregates || null);
      }
    } catch (err) {
      console.error('Batch Layer 2 evaluation failed:', err);
    } finally {
      setIsBatchEvaluating(false);
    }
  };

  // Run automated test suite
  const handleRunTestSuite = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch('/api/rag/layer2/test-suite', {
        method: 'POST',
      });
      if (res.ok) {
        const data: Layer2TestSuiteReport = await res.json();
        setTestReport(data);
      }
    } catch (err) {
      console.error('Layer 2 test suite failed:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Auto-run evaluation when selecting first time
  useEffect(() => {
    if (selectedResumeId && selectedJobId && !evaluationResult) {
      handleRunEvaluation();
    }
  }, [selectedResumeId, selectedJobId]);

  // Filter batch results
  const filteredBatch = batchResults.filter((item) => {
    if (batchFilter === 'warnings') return item.specificWarnings.length > 0;
    if (batchFilter === 'downgraded') return item.alignmentDelta < -0.05;
    if (batchFilter === 'boosted') return item.alignmentDelta > 0.05;
    if (batchFilter === 'high_fit') return item.compositePercentage >= 75;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 p-6 border border-indigo-500/20 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5" />
                Phase 8: Layer 2 RAG Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Informal Company Reality Matching
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Company Reality & Unspoken Bar Evaluation
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Generic JDs hide informal interview reality. Layer 2 retrieves empirical company knowledge graphs to evaluate actual DSA difficulty bars, proctored OA risks (CodeSignal GCA 835+, HackerRank locks), recruiter GPA cutoffs, and ATS hotkeys.
            </p>
          </div>

          {/* Quick Subtab Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setActiveSubTab('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'single'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              Single Job Deep-Dive
            </button>
            <button
              onClick={() => {
                setActiveSubTab('batch');
                if (batchResults.length === 0) handleRunBatchEvaluation();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'batch'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Batch Reality Matrix
            </button>
            <button
              onClick={() => setActiveSubTab('knowledge-base')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'knowledge-base'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              RAG Vector Store & Bench
            </button>
            <button
              onClick={() => {
                setActiveSubTab('tests');
                if (!testReport) handleRunTestSuite();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'tests'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Verification Tests
            </button>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: SINGLE JOB DEEP DIVE */}
      {activeSubTab === 'single' && (
        <div className="space-y-6">
          {/* Controls Bar: Select Resume & Job */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Candidate Resume Profile
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value);
                  handleRunEvaluation(selectedJobId, e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title || 'Untitled Resume'} {r.isPrimary ? '★ (Primary)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Target Role & Company Profile
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  handleRunEvaluation(e.target.value, selectedResumeId);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.company} — {j.title} ({j.location})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                onClick={() => handleRunEvaluation()}
                disabled={isEvaluating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                {isEvaluating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Run Reality Bar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Preset Company Shortcuts */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Quick Archetypes:
            </span>
            {[
              { name: 'Jane Street', desc: 'Extreme DSA & OCaml/C++ Bar' },
              { name: 'Goldman Sachs', desc: 'Strict 3.4+ GPA Screen & HackerRank' },
              { name: 'Stripe', desc: 'CodeSignal GCA 835+ & Systems' },
              { name: 'Google', desc: 'Hard Graph/DP & Fast Velocity' },
              { name: 'Citadel', desc: 'Extreme Low-Latency & Ivy+ Bias' },
              { name: 'Meta', desc: 'Speed LeetCode & Hackathon Culture' },
            ].map((preset) => {
              const matchedJob = jobs.find((j) => j.company.toLowerCase().includes(preset.name.toLowerCase()));
              return (
                <button
                  key={preset.name}
                  onClick={() => {
                    if (matchedJob) {
                      setSelectedJobId(matchedJob.id);
                      handleRunEvaluation(matchedJob.id);
                    }
                  }}
                  disabled={!matchedJob}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-indigo-900/40 border border-slate-700 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-40"
                  title={preset.desc}
                >
                  <span className="font-semibold text-indigo-300">{preset.name}</span>
                  <span className="text-slate-500 ml-1 text-[11px]">({preset.desc.split(' ')[0]})</span>
                </button>
              );
            })}
          </div>

          {/* Evaluation Results Display */}
          {evaluationResult && (
            <div className="space-y-6">
              {/* Top Score Comparison Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. Layer 1 Stated Fit */}
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      Layer 1 Stated Fit
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">Raw JD Stated</span>
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-extrabold text-white">
                      {evaluationResult.layer1Percentage}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Keyword & vector match based purely on public job posting text.
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, evaluationResult.layer1Percentage)}%` }}
                    />
                  </div>
                </div>

                {/* 2. Layer 2 Informal Reality Fit */}
                <div className="bg-slate-900/90 p-4 rounded-xl border border-indigo-900/40 shadow-lg shadow-indigo-950/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                      Layer 2 Reality Fit
                    </span>
                    <span className="text-[11px] text-indigo-400 font-mono">Informal Bar</span>
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-extrabold text-indigo-300">
                      {evaluationResult.layer2Percentage}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Adjusted for DSA difficulty ({evaluationResult.dsaEvaluation.companyBarDifficulty}), OA platform, and unspoken filters.
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, evaluationResult.layer2Percentage)}%` }}
                    />
                  </div>
                </div>

                {/* 3. Alignment Delta (Adjustment) */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  evaluationResult.alignmentDelta < -0.10
                    ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                    : evaluationResult.alignmentDelta > 0.05
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      {evaluationResult.alignmentDelta < 0 ? (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      Alignment Delta
                    </span>
                    <span className="text-[11px] font-mono opacity-75">Adjustment</span>
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-extrabold flex items-center gap-1">
                      {evaluationResult.alignmentDelta >= 0 ? `+${evaluationResult.alignmentDeltaPercentage}%` : `${evaluationResult.alignmentDeltaPercentage}%`}
                    </div>
                    <div className="text-xs mt-1 opacity-80">
                      {evaluationResult.alignmentDelta < -0.15
                        ? 'Severe Reality Friction: High informal bar penalties'
                        : evaluationResult.alignmentDelta > 0.05
                        ? 'Advantage Boost: Strong systems/school alignment'
                        : 'Balanced: Stated JD closely mirrors reality bar'}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono opacity-60">
                    Delta = L2 ({evaluationResult.layer2Percentage}%) - L1 ({evaluationResult.layer1Percentage}%)
                  </div>
                </div>

                {/* 4. Final Composite Reality Match */}
                <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-4 rounded-xl border border-indigo-500/40 flex flex-col justify-between shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Composite Match
                    </span>
                    <span className="text-[11px] text-amber-300 font-mono">Final (40% L1 + 60% L2)</span>
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-extrabold text-amber-300">
                      {evaluationResult.compositePercentage}%
                    </div>
                    <div className="text-xs text-indigo-200 mt-1">
                      Weighted real-world student pass probability index.
                    </div>
                  </div>
                  <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-indigo-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, evaluationResult.compositePercentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Reality Check Summary Debrief */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Company Reality Debrief: {evaluationResult.company} ({evaluationResult.companyTier})</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {evaluationResult.industry}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {evaluationResult.realityCheckSummary}
                  </p>
                </div>
              </div>

              {/* Specific Warnings & Actionable Alerts */}
              {evaluationResult.specificWarnings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Specific Reality Warnings & Recruiter Barriers ({evaluationResult.specificWarnings.length})</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {evaluationResult.specificWarnings.map((warn) => (
                      <div
                        key={warn.id}
                        className={`p-4 rounded-xl border transition-all ${
                          warn.severity === 'critical'
                            ? 'bg-rose-950/25 border-rose-700/40 text-rose-200'
                            : warn.severity === 'warning'
                            ? 'bg-amber-950/20 border-amber-700/40 text-amber-200'
                            : 'bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            {warn.severity === 'critical' ? (
                              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                            ) : warn.severity === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <Info className="w-4 h-4 text-blue-400 shrink-0" />
                            )}
                            <h4 className="text-sm font-semibold">{warn.title}</h4>
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            warn.severity === 'critical'
                              ? 'bg-rose-900/60 text-rose-300 border border-rose-600/40'
                              : warn.severity === 'warning'
                              ? 'bg-amber-900/60 text-amber-300 border border-amber-600/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {warn.severity}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed opacity-90">{warn.message}</p>
                        {warn.recommendation && (
                          <div className="mt-2.5 pt-2 border-t border-white/10 text-xs flex items-start gap-1.5 opacity-95">
                            <span className="font-semibold text-indigo-300 shrink-0">Action:</span>
                            <span>{warn.recommendation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RAG Semantic Retrieval & Grounded Evidence Card */}
              {((evaluationResult.retrievedEvidence && evaluationResult.retrievedEvidence.length > 0) || evaluationResult.llmReasoning) && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/40 border border-indigo-500/30 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        RAG Grounded Company Evidence & LLM Reality Synthesis
                      </h4>
                    </div>
                    {evaluationResult.ragQuery && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 truncate max-w-xs">
                        Query: {evaluationResult.ragQuery}
                      </span>
                    )}
                  </div>

                  {evaluationResult.llmReasoning && (
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Deterministic Reality Reasoning
                        </span>
                        <div className="flex gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            evaluationResult.llmReasoning.oa_risk === 'high' || evaluationResult.llmReasoning.oa_risk === 'critical'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-700/40'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40'
                          }`}>
                            OA Risk: {evaluationResult.llmReasoning.oa_risk.toUpperCase()}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-700/40">
                            Visa: {evaluationResult.llmReasoning.visa_feasibility.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {evaluationResult.llmReasoning.reasoning_synthesis}
                      </p>

                      {evaluationResult.llmReasoning.evidence_citations && evaluationResult.llmReasoning.evidence_citations.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300">Citations: </span>
                          {evaluationResult.llmReasoning.evidence_citations.join('; ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Top Retrieved Chunks */}
                  {evaluationResult.retrievedEvidence && evaluationResult.retrievedEvidence.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Retrieved Empirical Knowledge Chunks ({evaluationResult.retrievedEvidence.length})
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {evaluationResult.retrievedEvidence.map((ev, idx) => (
                          <div
                            key={ev.chunkId || idx}
                            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                {ev.category}
                              </span>
                              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                                {(ev.similarityScore * 100).toFixed(1)}% Sim
                              </span>
                            </div>
                            <h5 className="font-semibold text-white truncate text-xs">{ev.title}</h5>
                            <p className="text-[11px] text-slate-300 line-clamp-3 font-mono">
                              "{ev.snippet}"
                            </p>
                            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 flex justify-between">
                              <span>Source: {ev.source}</span>
                              <span className="capitalize">{ev.confidence}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Two-Column Deep Inspection Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: Technical DSA Bar & OA Risk Profiling */}
                <div className="space-y-4">
                  {/* Technical & DSA Bar Card */}
                  <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <FileCode2 className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-sm font-semibold text-white">Informal Technical & DSA Bar</h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        evaluationResult.dsaEvaluation.companyBarDifficulty === 'Extreme'
                          ? 'bg-purple-950 text-purple-300 border border-purple-700/50'
                          : evaluationResult.dsaEvaluation.companyBarDifficulty === 'Hard'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700/50'
                          : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                      }`}>
                        {evaluationResult.dsaEvaluation.companyBarDifficulty} DSA Difficulty
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-400">Technical Depth Alignment Score</span>
                        <span className="font-mono font-bold text-indigo-300">
                          {(evaluationResult.dsaEvaluation.technicalAlignmentScore * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${evaluationResult.dsaEvaluation.technicalAlignmentScore * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-medium text-slate-400 block">Candidate Covered vs Uncovered Topics:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {evaluationResult.dsaEvaluation.candidateCoveredTopics.map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-xs flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {topic}
                          </span>
                        ))}
                        {evaluationResult.dsaEvaluation.uncoveredHardTopics.map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40 text-xs flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3 text-rose-400" />
                            {topic} (Missing)
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 space-y-1">
                      <div><span className="font-semibold text-slate-400">Live Format:</span> {evaluationResult.dsaEvaluation.liveCodingFormat}</div>
                      <div><span className="font-semibold text-slate-400">Core Focus:</span> {evaluationResult.dsaEvaluation.focusAreas}</div>
                    </div>
                  </div>

                  {/* Online Assessment (OA) Profiling & Pass Probability */}
                  <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-purple-400" />
                        <h4 className="text-sm font-semibold text-white">OA Assessment & Proctoring Profile</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-700/50">
                        {evaluationResult.oaEvaluation.platform}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <div className="text-[11px] text-slate-400">Time Limit</div>
                        <div className="text-lg font-bold text-white flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-4 h-4 text-indigo-400" />
                          {evaluationResult.oaEvaluation.durationMinutes} Minutes
                        </div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <div className="text-[11px] text-slate-400">Predicted Pass Rate</div>
                        <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                          <Target className="w-4 h-4 text-emerald-400" />
                          {(evaluationResult.oaEvaluation.predictedPassProbability * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-400 block">Proctoring Enforcement:</span>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className={`px-2 py-1 rounded flex items-center gap-1.5 ${
                          evaluationResult.oaEvaluation.webcamRequired
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Video className="w-3.5 h-3.5" />
                          {evaluationResult.oaEvaluation.webcamRequired ? 'Webcam Monitored' : 'No Webcam'}
                        </span>
                        <span className={`px-2 py-1 rounded flex items-center gap-1.5 ${
                          evaluationResult.oaEvaluation.screenRecording
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Eye className="w-3.5 h-3.5" />
                          {evaluationResult.oaEvaluation.screenRecording ? 'Screen Recorded' : 'No Screen Rec'}
                        </span>
                        <span className={`px-2 py-1 rounded flex items-center gap-1.5 ${
                          evaluationResult.oaEvaluation.copyPasteDisabled
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Lock className="w-3.5 h-3.5" />
                          {evaluationResult.oaEvaluation.copyPasteDisabled ? 'Copy-Paste Disabled' : 'Copy-Paste Allowed'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
                      <span className="font-semibold text-indigo-300 block mb-1">Tactical OA Prep Strategy:</span>
                      {evaluationResult.oaEvaluation.preparationGuide}
                    </div>
                  </div>
                </div>

                {/* Column 2: Unspoken Filters, ATS Hotkeys & Verified Pay */}
                <div className="space-y-4">
                  {/* Unspoken Recruiter Screening Filters */}
                  <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-sm font-semibold text-white">Unspoken Recruiter Screening Filters</h4>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">Behind-the-scenes</span>
                    </div>

                    {/* School Assessment */}
                    <div className="flex items-start justify-between gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div>
                        <div className="text-slate-400 font-semibold">Target University Tier</div>
                        <div className="text-slate-200 mt-0.5">
                          Candidate School: <span className="font-semibold text-white">{evaluationResult.filterEvaluation.targetSchoolAssessment.candidateSchool}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Recruiter Tier: {evaluationResult.filterEvaluation.targetSchoolAssessment.targetTierText}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
                        evaluationResult.filterEvaluation.targetSchoolAssessment.matched
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {evaluationResult.filterEvaluation.targetSchoolAssessment.matched ? 'Tier-1 Match' : 'Non-Target CS'}
                      </span>
                    </div>

                    {/* GPA Assessment */}
                    <div className="flex items-start justify-between gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div>
                        <div className="text-slate-400 font-semibold">GPA Transcript Cutoff Screen</div>
                        <div className="text-slate-200 mt-0.5">
                          Candidate GPA: <span className="font-semibold text-white">{evaluationResult.filterEvaluation.gpaAssessment.candidateGpa}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Required Bar: {evaluationResult.filterEvaluation.gpaAssessment.minimumRequiredText}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
                        evaluationResult.filterEvaluation.gpaAssessment.meetsCutoff
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                          : 'bg-rose-950 text-rose-300 border border-rose-800/40'
                      }`}>
                        {evaluationResult.filterEvaluation.gpaAssessment.meetsCutoff ? 'Passes GPA Screen' : 'Fails Cutoff'}
                      </span>
                    </div>

                    {/* Visa Sponsorship */}
                    <div className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-slate-400 font-semibold">International Visa Feasibility</div>
                      <div className="text-slate-200 mt-0.5 font-medium">
                        {evaluationResult.filterEvaluation.visaAssessment.note}
                      </div>
                    </div>
                  </div>

                  {/* ATS Hotkeys & Red Flags */}
                  <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h4 className="text-sm font-semibold text-white">ATS Hotkeys & Fatal Red Flags</h4>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">Resume Optimization</span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-medium text-slate-400 block">High-Value ATS Keywords:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {evaluationResult.matchedHotkeys.map((hk) => (
                          <span key={hk} className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {hk}
                          </span>
                        ))}
                        {evaluationResult.missingHotkeys.slice(0, 5).map((hk) => (
                          <span key={hk} className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs flex items-center gap-1">
                            +{hk} (Missing)
                          </span>
                        ))}
                      </div>
                    </div>

                    {evaluationResult.detectedRedFlags.length > 0 ? (
                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <span className="text-xs font-semibold text-rose-400 block">Recruiter Red Flags Detected:</span>
                        {evaluationResult.detectedRedFlags.map((flag) => (
                          <div key={flag} className="text-xs text-rose-300 bg-rose-950/40 p-2 rounded border border-rose-800/40 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-300 bg-emerald-950/30 p-2 rounded border border-emerald-800/30 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>No fatal recruiter red flags detected on candidate profile.</span>
                      </div>
                    )}
                  </div>

                  {/* Compensation & Timeline Card */}
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="text-slate-400 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verified Levels.fyi Pay</span>
                      </div>
                      <div className="text-sm font-bold text-white">
                        {evaluationResult.compensationContext.verifiedHourlyRate}
                      </div>
                      {evaluationResult.compensationContext.housingStipendMonthly && (
                        <div className="text-[11px] text-slate-400">
                          Housing: {evaluationResult.compensationContext.housingStipendMonthly}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Timeline & Velocity</span>
                      </div>
                      <div className="text-sm font-bold text-white">
                        Opens: {evaluationResult.applicationTimeline.typicalOpenDate}
                      </div>
                      <div className="text-[11px] text-indigo-300">
                        {evaluationResult.applicationTimeline.recruiterVelocity}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Plan Checklist */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-5 rounded-xl border border-indigo-500/20 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>Student Reality Action Plan (Before Applying)</span>
                </h4>
                <div className="space-y-2">
                  {evaluationResult.actionPlan.map((step, idx) => (
                    <div key={idx} className="text-xs text-slate-200 flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: BATCH REALITY MATRIX */}
      {activeSubTab === 'batch' && (
        <div className="space-y-6">
          {/* Batch Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-400 uppercase">Candidate Resume:</label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title || 'Untitled'} {r.isPrimary ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Filter View:</span>
              {[
                { id: 'all', label: 'All Jobs' },
                { id: 'warnings', label: 'Has Warnings' },
                { id: 'downgraded', label: 'Reality Downgrade (Delta < -5%)' },
                { id: 'boosted', label: 'Advantage Boost (Delta > +5%)' },
                { id: 'high_fit', label: 'High Reality Fit (75%+)' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setBatchFilter(btn.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    batchFilter === btn.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {btn.label}
                </button>
              ))}

              <button
                onClick={handleRunBatchEvaluation}
                disabled={isBatchEvaluating}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ml-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBatchEvaluating ? 'animate-spin' : ''}`} />
                <span>Re-Evaluate Matrix</span>
              </button>
            </div>
          </div>

          {/* Aggregates Header */}
          {batchAggregates && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Total Jobs Evaluated</div>
                <div className="text-2xl font-bold text-white mt-1">{batchResults.length}</div>
              </div>
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Average Delta Adjustment</div>
                <div className={`text-2xl font-bold mt-1 ${
                  batchAggregates.averageAlignmentDelta < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {batchAggregates.averageAlignmentDelta >= 0 ? `+${batchAggregates.averageAlignmentDeltaPercentage}%` : `${batchAggregates.averageAlignmentDeltaPercentage}%`}
                </div>
              </div>
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Total Reality Warnings Flagged</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{batchAggregates.totalWarningsGenerated}</div>
              </div>
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Downgraded vs Boosted Jobs</div>
                <div className="text-2xl font-bold text-indigo-300 mt-1">
                  <span className="text-rose-400">{batchAggregates.downgradedJobsCount}</span> / <span className="text-emerald-400">{batchAggregates.boostedJobsCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Matrix Table */}
          <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Company & Role</th>
                    <th className="py-3 px-3">Tier</th>
                    <th className="py-3 px-3 text-center">Layer 1 (JD)</th>
                    <th className="py-3 px-3 text-center">Layer 2 (Reality)</th>
                    <th className="py-3 px-3 text-center">Alignment Delta</th>
                    <th className="py-3 px-3 text-center">Final Composite</th>
                    <th className="py-3 px-4">Informal Barriers & Warnings</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredBatch.map((row) => {
                    const isDowngraded = row.alignmentDelta < -0.05;
                    const isBoosted = row.alignmentDelta > 0.05;

                    return (
                      <tr key={row.jobId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{row.company}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[220px]">{row.jobTitle}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {row.companyTier}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-medium text-slate-300">
                          {row.layer1Percentage}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-indigo-300">
                          {row.layer2Percentage}%
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                            isDowngraded
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                              : isBoosted
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {row.alignmentDelta >= 0 ? `+${row.alignmentDeltaPercentage}%` : `${row.alignmentDeltaPercentage}%`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold font-mono ${
                            row.compositePercentage >= 80
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                              : row.compositePercentage >= 65
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/50'
                              : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                          }`}>
                            {row.compositePercentage}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[320px]">
                            {row.specificWarnings.slice(0, 2).map((w) => (
                              <span
                                key={w.id}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/30 truncate max-w-[200px]"
                                title={w.message}
                              >
                                ⚠ {w.title}
                              </span>
                            ))}
                            {row.specificWarnings.length === 0 && (
                              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Clear of major friction
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedJobId(row.jobId || '');
                              setEvaluationResult(row);
                              setActiveSubTab('single');
                            }}
                            className="px-2.5 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium text-[11px] transition-all cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: RAG VECTOR KNOWLEDGE BASE & RETRIEVAL BENCH */}
      {activeSubTab === 'knowledge-base' && (
        <CompanyVectorKnowledgeBase />
      )}

      {/* SUBTAB 4: TEST SUITE & VERIFICATION */}
      {activeSubTab === 'tests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900/90 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Phase 8 Layer 2 RAG Verification Diagnostic Suite</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated test harness validating CompanyInsight lookups, informal bar downgrades, CodeSignal GCA profiling, GPA filters, and scoring invariants.
              </p>
            </div>

            <button
              onClick={handleRunTestSuite}
              disabled={isRunningTests}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
              <span>{isRunningTests ? 'Running Suite...' : 'Execute Test Suite'}</span>
            </button>
          </div>

          {testReport && (
            <div className="space-y-4">
              {/* Report Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Total Diagnostics</div>
                  <div className="text-2xl font-bold text-white mt-1">{testReport.totalTests}</div>
                </div>
                <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-900/30">
                  <div className="text-xs text-emerald-400">Passed Tests</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{testReport.passedCount}</div>
                </div>
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Execution Benchmark</div>
                  <div className="text-2xl font-bold text-indigo-300 mt-1">{testReport.totalDurationMs}ms</div>
                </div>
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Average Latency / Test</div>
                  <div className="text-2xl font-bold text-slate-200 mt-1">{testReport.averageLatencyMs}ms</div>
                </div>
              </div>

              {/* Individual Diagnostic Test Cases */}
              <div className="space-y-3">
                {testReport.results.map((test) => (
                  <div
                    key={test.id}
                    className={`p-4 rounded-xl border transition-all ${
                      test.passed
                        ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        : 'bg-rose-950/20 border-rose-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {test.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-400">{test.id}</span>
                            <span className="text-sm font-semibold text-white">{test.name}</span>
                          </div>
                          <div className="text-xs text-slate-300 mt-1">
                            <span className="text-slate-400 font-medium">Actual:</span> {test.actual}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-400 font-medium">Expected:</span> {test.expected}
                          </div>
                          {test.error && (
                            <div className="text-xs text-rose-400 mt-1 font-mono">{test.error}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-slate-400">{test.durationMs}ms</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          test.passed
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                            : 'bg-rose-950 text-rose-300 border border-rose-800/40'
                        }`}>
                          {test.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
