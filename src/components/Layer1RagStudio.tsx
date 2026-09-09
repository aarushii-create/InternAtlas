import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Sliders,
  Play,
  Layers,
  FileText,
  Building2,
  GraduationCap,
  Briefcase,
  Zap,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Tag,
  BookOpen,
} from 'lucide-react';
import { Job, Resume, Layer1EvaluationResult, Layer1SkillMatch } from '../types';
import { Layer1TestSuiteReport } from '../lib/rag/layer1TestSuite';
import { HybridWeights, DEFAULT_HYBRID_WEIGHTS } from '../lib/rag/layer1Engine';

interface Layer1RagStudioProps {
  currentResume?: Resume;
  onRefreshJobs?: () => void;
}

export function Layer1RagStudio({ currentResume, onRefreshJobs }: Layer1RagStudioProps) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [evaluationResult, setEvaluationResult] = useState<Layer1EvaluationResult | null>(null);
  const [batchResults, setBatchResults] = useState<Layer1EvaluationResult[]>([]);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isBatchEvaluating, setIsBatchEvaluating] = useState<boolean>(false);
  const [weights, setWeights] = useState<HybridWeights>(DEFAULT_HYBRID_WEIGHTS);
  const [activeSubTab, setActiveSubTab] = useState<'single' | 'batch' | 'weights' | 'tests'>('single');
  const [testReport, setTestReport] = useState<Layer1TestSuiteReport | null>(null);

  // Fetch all resumes and jobs
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
      console.error('Failed to load Layer 1 studio data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Run single evaluation
  const handleRunEvaluation = async () => {
    if (!selectedResumeId || !selectedJobId) return;
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/rag/layer1/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          jobId: selectedJobId,
          weights,
        }),
      });

      if (res.ok) {
        const data: Layer1EvaluationResult = await res.json();
        setEvaluationResult(data);
      }
    } catch (err) {
      console.error('Layer 1 evaluation failed:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Run batch evaluation across all active jobs
  const handleRunBatchEvaluation = async () => {
    if (!selectedResumeId) return;
    setIsBatchEvaluating(true);
    try {
      const res = await fetch('/api/rag/layer1/batch-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          weights,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBatchResults(data.evaluations || []);
      }
    } catch (err) {
      console.error('Batch evaluation failed:', err);
    } finally {
      setIsBatchEvaluating(false);
    }
  };

  // Run test suite
  const handleRunTestSuite = async () => {
    try {
      const res = await fetch('/api/rag/layer1/test-suite', {
        method: 'POST',
      });
      if (res.ok) {
        const data: Layer1TestSuiteReport = await res.json();
        setTestReport(data);
      }
    } catch (err) {
      console.error('Test suite run failed:', err);
    }
  };

  // Auto evaluate when selection changes or on initial load
  useEffect(() => {
    if (selectedResumeId && selectedJobId) {
      handleRunEvaluation();
    }
  }, [selectedResumeId, selectedJobId, weights]);

  const selectedResume = resumes.find((r) => r.id === selectedResumeId);
  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
    if (score >= 0.6) return 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40';
    if (score >= 0.4) return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/40';
  };

  const getCategoryBadgeColor = (cat: Layer1SkillMatch['category']) => {
    switch (cat) {
      case 'core_language':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'framework':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'distributed_systems':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'database':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ai_ml':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      case 'tools_devops':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border border-cyan-800/40 rounded-3xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Phase 6: Layer 1 RAG Engine
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
              Stated Requirement Matching Engine
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl mt-1">
              Deterministic hybrid search comparing candidate resume offerings vs. direct stated JD requirements using 768-dim vector embeddings, synonym expansion, and skill gap analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
              <span>{isEvaluating ? 'Evaluating...' : 'Re-Evaluate Match'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
        {/* Resume Selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select Candidate Resume:</span>
          </label>
          <select
            value={selectedResumeId}
            onChange={(e) => setSelectedResumeId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer font-medium"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title || 'Candidate Resume'} ({r.parsedData?.education?.[0]?.institution || 'Student'})
              </option>
            ))}
          </select>
        </div>

        {/* Job Selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Target Job Description:</span>
          </label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer font-medium"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.company} - {j.title} ({j.location})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('single')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'single'
              ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Single Job Match Evaluation</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('batch');
            if (batchResults.length === 0) handleRunBatchEvaluation();
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'batch'
              ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Batch Ranking ({jobs.length} Jobs)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('weights')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'weights'
              ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Hybrid Search Tuner</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('tests');
            if (!testReport) handleRunTestSuite();
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'tests'
              ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Layer 1 Test Suite (6 Tests)</span>
        </button>
      </div>

      {/* View 1: Single Job Match Evaluation */}
      {activeSubTab === 'single' && evaluationResult && (
        <div className="space-y-6">
          {/* Top Score Summary Banner */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Raw Layer 1 Score */}
            <div className="md:col-span-1 p-4 bg-slate-950 border border-cyan-900/40 rounded-2xl text-center space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Layer 1 Baseline Fit
              </span>
              <div className="text-4xl font-black text-cyan-400">
                {evaluationResult.layer1Percentage}%
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Score: <strong className="text-slate-200">{evaluationResult.layer1Score}</strong> / 1.0
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="md:col-span-3 grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Vector Cosine Sim</span>
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-bold text-slate-100">
                  {(evaluationResult.vectorSimilarity * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  768-dim dense embedding
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Required Skills Hit</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400">
                  {evaluationResult.matchedRequiredSkills.length} /{' '}
                  {evaluationResult.matchedRequiredSkills.length + evaluationResult.missingRequiredSkills.length}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {(evaluationResult.requiredSkillsRatio * 100).toFixed(0)}% coverage ratio
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Preferred Skills Hit</span>
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xl font-bold text-blue-400">
                  {evaluationResult.matchedPreferredSkills.length} /{' '}
                  {Math.max(1, evaluationResult.matchedPreferredSkills.length + evaluationResult.missingPreferredSkills.length)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {(evaluationResult.preferredSkillsRatio * 100).toFixed(0)}% bonus fit
                </div>
              </div>
            </div>
          </div>

          {/* AI Explanation Banner */}
          <div className="p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-2xl flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-bold text-cyan-200">Layer 1 Evaluation Synthesis:</div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {evaluationResult.evaluationSummary}
              </p>
            </div>
          </div>

          {/* Skills Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matched Required Skills */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Matched Required Skills ({evaluationResult.matchedRequiredSkills.length})</span>
                </h3>
                <span className="text-[11px] font-mono text-emerald-400">Verified in Resume</span>
              </div>

              {evaluationResult.matchedRequiredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {evaluationResult.matchedRequiredSkills.map((skill) => {
                    const detail = evaluationResult.skillBreakdown.find((s) => s.skill === skill);
                    return (
                      <div
                        key={skill}
                        className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{skill}</span>
                        {detail && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getCategoryBadgeColor(detail.category)}`}>
                            {detail.category}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No required skills matched.</p>
              )}

              {/* Matched Preferred */}
              {evaluationResult.matchedPreferredSkills.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Matched Preferred Skills ({evaluationResult.matchedPreferredSkills.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluationResult.matchedPreferredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs font-medium"
                      >
                        + {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Missing Required Skills */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Missing Required Skills ({evaluationResult.missingRequiredSkills.length})</span>
                </h3>
                <span className="text-[11px] font-mono text-rose-400">Skill Gap Action Required</span>
              </div>

              {evaluationResult.missingRequiredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {evaluationResult.missingRequiredSkills.map((skill) => {
                    const detail = evaluationResult.skillBreakdown.find((s) => s.skill === skill);
                    return (
                      <div
                        key={skill}
                        className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>{skill}</span>
                        {detail && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getCategoryBadgeColor(detail.category)}`}>
                            {detail.category}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>100% of stated required skills are satisfied!</span>
                </div>
              )}

              {/* Missing Preferred */}
              {evaluationResult.missingPreferredSkills.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-400">
                    Missing Preferred Skills ({evaluationResult.missingPreferredSkills.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluationResult.missingPreferredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Education & Experience Fit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-8 h-8 text-cyan-400 p-1.5 bg-slate-950 rounded-xl border border-slate-800" />
                <div>
                  <div className="text-xs font-semibold text-slate-300">Education Alignment</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Candidate: <strong className="text-slate-200">{evaluationResult.educationFit.candidateEducation}</strong>
                  </div>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                evaluationResult.educationFit.meetsRequirement ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {evaluationResult.educationFit.meetsRequirement ? 'Meets Stated Bar' : 'Partial Fit'}
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Briefcase className="w-8 h-8 text-indigo-400 p-1.5 bg-slate-950 rounded-xl border border-slate-800" />
                <div>
                  <div className="text-xs font-semibold text-slate-300">Experience Requirement</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Required: <strong className="text-slate-200">{evaluationResult.experienceFit.requiredYears} yrs</strong> | Candidate: <strong className="text-slate-200">{evaluationResult.experienceFit.candidateYears} yrs</strong>
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                Intern Eligible
              </span>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Batch Ranking Across Active Jobs */}
      {activeSubTab === 'batch' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Ranked Job Fits for {selectedResume?.title || 'Candidate'}</span>
            </h3>
            <button
              onClick={handleRunBatchEvaluation}
              disabled={isBatchEvaluating}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBatchEvaluating ? 'animate-spin' : ''}`} />
              <span>Re-Rank All Jobs</span>
            </button>
          </div>

          <div className="space-y-2">
            {batchResults.map((item, index) => (
              <div
                key={item.jobId || index}
                onClick={() => {
                  if (item.jobId) setSelectedJobId(item.jobId);
                  setEvaluationResult(item);
                  setActiveSubTab('single');
                }}
                className="p-4 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-mono text-xs font-bold flex items-center justify-center">
                    #{index + 1}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {item.company} — {item.jobTitle}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="text-emerald-400">
                        {item.matchedRequiredSkills.length} Matched: {item.matchedRequiredSkills.slice(0, 3).join(', ')}
                        {item.matchedRequiredSkills.length > 3 && ` +${item.matchedRequiredSkills.length - 3} more`}
                      </span>
                      {item.missingRequiredSkills.length > 0 && (
                        <span className="text-rose-400">
                          | Missing: {item.missingRequiredSkills.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="text-right">
                    <div className="text-lg font-black text-cyan-400">
                      {item.layer1Percentage}%
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Sim: {(item.vectorSimilarity * 100).toFixed(0)}%
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 3: Hybrid Search Tuner */}
      {activeSubTab === 'weights' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Hybrid Search Weight Configurator
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Tune the mathematical balance between semantic dense vector similarity and deterministic lexical keyword matching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slider 1: Vector Cosine Weight */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">1. Vector Cosine Similarity</span>
                <span className="font-mono text-cyan-400 font-bold">{weights.vectorWeight * 100}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.vectorWeight}
                onChange={(e) => setWeights({ ...weights, vectorWeight: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500"
              />
              <p className="text-[11px] text-slate-400">
                Dense semantic embedding alignment across full JD context.
              </p>
            </div>

            {/* Slider 2: Required Skills Weight */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">2. Stated Required Skills Coverage</span>
                <span className="font-mono text-emerald-400 font-bold">{weights.requiredSkillWeight * 100}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.requiredSkillWeight}
                onChange={(e) => setWeights({ ...weights, requiredSkillWeight: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500"
              />
              <p className="text-[11px] text-slate-400">
                Exact and synonym match ratio for must-have technologies.
              </p>
            </div>

            {/* Slider 3: Preferred Skills Weight */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">3. Preferred Skills Bonus</span>
                <span className="font-mono text-blue-400 font-bold">{weights.preferredSkillWeight * 100}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={weights.preferredSkillWeight}
                onChange={(e) => setWeights({ ...weights, preferredSkillWeight: parseFloat(e.target.value) })}
                className="w-full accent-blue-500"
              />
              <p className="text-[11px] text-slate-400">
                Bonus credit for nice-to-have frameworks and tools.
              </p>
            </div>

            {/* Slider 4: Education & Exp */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">4. Education & Experience Fit</span>
                <span className="font-mono text-purple-400 font-bold">{weights.educationExpWeight * 100}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.3"
                step="0.05"
                value={weights.educationExpWeight}
                onChange={(e) => setWeights({ ...weights, educationExpWeight: parseFloat(e.target.value) })}
                className="w-full accent-purple-500"
              />
              <p className="text-[11px] text-slate-400">
                Baseline degree alignment and internship experience check.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setWeights(DEFAULT_HYBRID_WEIGHTS)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Reset to Recommended Defaults (45% / 40% / 10% / 5%)
            </button>
          </div>
        </div>
      )}

      {/* View 4: Test Suite */}
      {activeSubTab === 'tests' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Layer 1 RAG Engine Unit & Integration Test Suite
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifies dense vector cosine embeddings, synonym matching, missing skill extraction, and score normalization.
              </p>
            </div>

            <button
              onClick={handleRunTestSuite}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rerun Suite</span>
            </button>
          </div>

          {testReport && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center gap-4 text-xs text-slate-300 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-emerald-400 font-bold">
                  Passed: {testReport.passedCount} / {testReport.totalTests}
                </span>
                <span>Total Time: {testReport.totalDurationMs}ms</span>
                <span>Avg Latency: {testReport.averageLatencyMs}ms / test</span>
              </div>

              <div className="space-y-2">
                {testReport.results.map((test) => (
                  <div
                    key={test.id}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            test.passed
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {test.passed ? 'PASS' : 'FAIL'}
                        </span>
                        <span className="text-slate-300 font-bold">{test.id}: {test.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Expected: {JSON.stringify(test.expected)} | Actual: {JSON.stringify(test.actual)}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{test.durationMs}ms</span>
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
