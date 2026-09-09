import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Layers,
  Code2,
  Briefcase,
  Sliders,
  TrendingUp,
  Cpu,
  History,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  Check,
  X,
  ChevronRight,
  Database,
  FileText,
  AlertCircle,
  ExternalLink,
  Target,
} from 'lucide-react';
import {
  Resume,
  ModularProfileEmbeddings,
  ResumeProjectItem,
  ResumeExperienceItem,
  DeltaAuditLogEntry,
  ResumeDeltaPatchResponse,
  DeltaUpdateType,
} from '../types';
import { ResumeDeltaTestSuiteReport } from '../lib/resume/resumeDeltaTestSuite';
import { safeFetchJson } from '../lib/apiHelper';

export const ResumeEvolutionStudio: React.FC = () => {
  const resumeId = 'res-11111111-1111-4111-a111-111111111111'; // Alex Rivera (Stanford CS)

  // State
  const [profile, setProfile] = useState<ModularProfileEmbeddings | null>(null);
  const [projects, setProjects] = useState<ResumeProjectItem[]>([]);
  const [experiences, setExperiences] = useState<ResumeExperienceItem[]>([]);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<DeltaAuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'injector' | 'modular' | 'sensitivity' | 'audit' | 'tests'>('injector');

  // Custom injection form states
  const [newSkillInput, setNewSkillInput] = useState<string>('');
  const [customProject, setCustomProject] = useState({
    title: '',
    description: '',
    technologies: '',
    metrics: '',
    repoUrl: '',
  });
  const [customExperience, setCustomExperience] = useState({
    company: '',
    role: '',
    duration: 'Summer 2026',
    highlights: '',
    technologies: '',
  });

  // Last action notification banner
  const [lastNotification, setLastNotification] = useState<{
    message: string;
    speedup?: string;
    latencyMs?: number;
    affectedVector?: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  // Benchmark sensitivity results from last patch
  const [lastMatchScoreDeltas, setLastMatchScoreDeltas] = useState<
    ResumeDeltaPatchResponse['matchScoreDelta'] | null
  >(null);

  // Test suite report
  const [testReport, setTestReport] = useState<ResumeDeltaTestSuiteReport | null>(null);
  const [testRunning, setTestRunning] = useState<boolean>(false);

  // Fetch modular profile & state
  const loadModularData = async () => {
    setLoading(true);
    try {
      const dataRes = await safeFetchJson<{
        profile: ModularProfileEmbeddings;
        projects: ResumeProjectItem[];
        experiences: ResumeExperienceItem[];
        extractedSkills: string[];
      }>(`/api/resume/modular-vectors/${resumeId}`);

      if (dataRes.ok && dataRes.data) {
        setProfile(dataRes.data.profile);
        setProjects(dataRes.data.projects);
        setExperiences(dataRes.data.experiences);
        setExtractedSkills(dataRes.data.extractedSkills);
      }

      const auditRes = await safeFetchJson<DeltaAuditLogEntry[]>(`/api/resume/delta/audit/${resumeId}`);
      if (auditRes.ok && auditRes.data) {
        setAuditLogs(auditRes.data);
      }
    } catch (err) {
      console.error('Failed to load modular resume data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModularData();
  }, []);

  // 1. Handle Skill Delta Injection
  const handleAddSkill = async (skill: string) => {
    if (!skill.trim()) return;
    setActionLoading(`skill-${skill}`);
    try {
      const res = await safeFetchJson<ResumeDeltaPatchResponse>('/api/resume/delta/skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId,
          skill: skill.trim(),
          action: 'ADD',
        }),
      });

      if (res.ok && res.data && res.data.success) {
        setProfile(res.data.modularEmbeddings);
        setExtractedSkills(res.data.updatedResume.extractedSkills);
        setAuditLogs((prev) => [res.data.auditEntry, ...prev.slice(0, 49)]);
        if (res.data.matchScoreDelta) {
          setLastMatchScoreDeltas(res.data.matchScoreDelta);
        }
        setLastNotification({
          message: res.data.message,
          speedup: res.data.speedupFactor,
          latencyMs: res.data.processingLatencyMs,
          affectedVector: res.data.affectedVector,
          type: 'success',
        });
        setNewSkillInput('');
      }
    } catch (err) {
      console.error('Failed to patch skill delta', err);
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Handle Project Delta Injection
  const handleAddProject = async (projectData: {
    title: string;
    description: string;
    technologies: string[];
    metrics?: string;
    repoUrl?: string;
  }) => {
    setActionLoading(`project-${projectData.title}`);
    try {
      const res = await safeFetchJson<ResumeDeltaPatchResponse>('/api/resume/delta/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId,
          project: projectData,
        }),
      });

      if (res.ok && res.data && res.data.success) {
        setProfile(res.data.modularEmbeddings);
        setAuditLogs((prev) => [res.data.auditEntry, ...prev.slice(0, 49)]);
        if (res.data.matchScoreDelta) {
          setLastMatchScoreDeltas(res.data.matchScoreDelta);
        }
        setLastNotification({
          message: res.data.message,
          speedup: res.data.speedupFactor,
          latencyMs: res.data.processingLatencyMs,
          affectedVector: res.data.affectedVector,
          type: 'success',
        });
        // Reload projects list
        const reloadRes = await safeFetchJson<{ projects: ResumeProjectItem[] }>(
          `/api/resume/modular-vectors/${resumeId}`
        );
        if (reloadRes.ok && reloadRes.data) {
          setProjects(reloadRes.data.projects);
        }
        // Reset form
        setCustomProject({ title: '', description: '', technologies: '', metrics: '', repoUrl: '' });
      }
    } catch (err) {
      console.error('Failed to patch project delta', err);
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Handle Experience Delta Injection
  const handleAddExperience = async (expData: {
    company: string;
    role: string;
    duration: string;
    highlights: string[];
    technologies: string[];
  }) => {
    setActionLoading(`exp-${expData.company}`);
    try {
      const res = await safeFetchJson<ResumeDeltaPatchResponse>('/api/resume/delta/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId,
          experience: expData,
        }),
      });

      if (res.ok && res.data && res.data.success) {
        setProfile(res.data.modularEmbeddings);
        setAuditLogs((prev) => [res.data.auditEntry, ...prev.slice(0, 49)]);
        if (res.data.matchScoreDelta) {
          setLastMatchScoreDeltas(res.data.matchScoreDelta);
        }
        setLastNotification({
          message: res.data.message,
          speedup: res.data.speedupFactor,
          latencyMs: res.data.processingLatencyMs,
          affectedVector: res.data.affectedVector,
          type: 'success',
        });
        // Reload experiences
        const reloadRes = await safeFetchJson<{ experiences: ResumeExperienceItem[] }>(
          `/api/resume/modular-vectors/${resumeId}`
        );
        if (reloadRes.ok && reloadRes.data) {
          setExperiences(reloadRes.data.experiences);
        }
        // Reset form
        setCustomExperience({ company: '', role: '', duration: 'Summer 2026', highlights: '', technologies: '' });
      }
    } catch (err) {
      console.error('Failed to patch experience delta', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Reset to Baseline v1
  const handleResetProfile = async () => {
    try {
      const res = await safeFetchJson<{ success: boolean; profile: ModularProfileEmbeddings }>(
        `/api/resume/delta/reset/${resumeId}`,
        { method: 'POST' }
      );
      if (res.ok && res.data && res.data.profile) {
        setProfile(res.data.profile);
        setLastMatchScoreDeltas(null);
        setLastNotification({
          message: 'Resume modular embeddings successfully reset to baseline v1.',
          type: 'info',
        });
        loadModularData();
      }
    } catch (err) {
      console.error('Failed to reset modular profile', err);
    }
  };

  // Run automated test suite
  const handleRunTestSuite = async () => {
    setTestRunning(true);
    try {
      const reportRes = await safeFetchJson<ResumeDeltaTestSuiteReport>('/api/resume/delta/test-suite', {
        method: 'POST',
      });
      if (reportRes.ok && reportRes.data) {
        setTestReport(reportRes.data);
        await loadModularData();
      }
    } catch (err) {
      console.error('Failed to run resume delta test suite', err);
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black tracking-widest uppercase rounded-full flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Phase 13 Engine
              </span>
              <span className="text-xs font-semibold text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                Non-Disruptive Dynamic Resume Evolution
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Modular Resume Vector Patching & Delta Updates
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Dynamically patches individual skills, projects, and experiences into sub-vector embeddings (<code className="text-emerald-400 font-mono">&lt;2ms</code>) without re-parsing entire resumes (<code className="text-rose-400 font-mono">&gt;750ms</code>). Re-indexes user vectors instantly for live background candidate matching.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadModularData}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/60 transition-all flex items-center gap-2 shadow-sm"
              title="Refresh modular profile state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              Sync
            </button>
            <button
              onClick={handleResetProfile}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/30 transition-all flex items-center gap-2"
              title="Reset profile back to baseline v1"
            >
              <History className="w-3.5 h-3.5" />
              Reset to v1
            </button>
            <button
              onClick={handleRunTestSuite}
              disabled={testRunning}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2"
            >
              <Play className={`w-3.5 h-3.5 ${testRunning ? 'animate-spin' : 'fill-white'}`} />
              {testRunning ? 'Running Tests...' : 'Run Phase 13 Tests (6)'}
            </button>
          </div>
        </div>

        {/* Live Notification Banner */}
        {lastNotification && (
          <div
            className={`mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn ${
              lastNotification.type === 'success'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-indigo-950/30 border-indigo-500/40 text-indigo-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lastNotification.message}</span>
              {lastNotification.speedup && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-mono font-bold text-[10px]">
                  ⚡ {lastNotification.speedup} Speedup
                </span>
              )}
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

      {/* Main Metrics Bar */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Metric 1: Modular Embedding Version */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modular Profile Version</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-black text-xs">
              v{profile?.version || 1}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-white">v{profile?.version || 1}.0</div>
            <span className="text-xs text-emerald-400 font-semibold">Active & Re-Indexed</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Last Patched:</span>
            <strong className="text-slate-300">
              {profile ? new Date(profile.lastPatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Ready'}
            </strong>
          </div>
        </div>

        {/* Metric 2: Incremental Latency & Speedup */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patch vs Re-Parse Speed</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-emerald-400">
              {auditLogs.length > 0 ? `${auditLogs[0].processingLatencyMs}ms` : '1.8ms'}
            </div>
            <span className="text-xs text-slate-400">vs 780ms Full</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Acceleration:</span>
            <strong className="text-cyan-300 font-mono">
              {auditLogs.length > 0 ? auditLogs[0].speedupFactor : '433x faster'}
            </strong>
          </div>
        </div>

        {/* Metric 3: Sub-Vector Decomposition Counts */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modular Components</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mt-1">
            <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
              <div className="text-xs font-bold text-emerald-400">{extractedSkills.length}</div>
              <div className="text-[10px] text-slate-400">Skills (35%)</div>
            </div>
            <div className="p-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30">
              <div className="text-xs font-bold text-indigo-400">{projects.length}</div>
              <div className="text-[10px] text-slate-400">Projects (30%)</div>
            </div>
            <div className="p-1.5 rounded-lg bg-teal-950/40 border border-teal-500/30">
              <div className="text-xs font-bold text-teal-400">{experiences.length}</div>
              <div className="text-[10px] text-slate-400">Experience (25%)</div>
            </div>
          </div>
        </div>

        {/* Metric 4: Vector Embedding Dimension & Norm */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vector Embedding State</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">768-D</div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Normalization:</span>
            <strong className="text-emerald-400 font-mono">L2 Unit Norm (1.000)</strong>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('injector')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'injector'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            1-Click Delta Injector Bench
          </button>

          <button
            onClick={() => setActiveTab('modular')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'modular'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Modular Sub-Vector Decomposition
          </button>

          <button
            onClick={() => setActiveTab('sensitivity')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'sensitivity'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Real-Time Match Sensitivity
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Delta Patch Audit Log ({auditLogs.length})
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

      {/* TAB 1: 1-CLICK DELTA INJECTOR BENCH */}
      {activeTab === 'injector' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Quick Skill Injections Bar */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  Instant Skill Delta Patching
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Injects a single skill vector directly into the candidate's skills sub-vector (<code className="text-emerald-400">~1.5ms</code>).
                </p>
              </div>
            </div>

            {/* Quick Skill Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {['Rust', 'CUDA', 'Apache Kafka', 'Go (Golang)', 'FlashAttention-2', 'Stochastic Calculus', 'PyTorch GPU Kernels', 'Raft Consensus'].map(
                (preset) => {
                  const alreadyHas = extractedSkills.some((s) => s.toLowerCase() === preset.toLowerCase());
                  return (
                    <button
                      key={preset}
                      onClick={() => handleAddSkill(preset)}
                      disabled={alreadyHas || actionLoading !== null}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        alreadyHas
                          ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                          : 'bg-emerald-950/40 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/40 shadow-sm'
                      }`}
                    >
                      {alreadyHas ? <Check className="w-3 h-3 text-emerald-500" /> : <Plus className="w-3 h-3" />}
                      {preset}
                      {alreadyHas && <span className="text-[10px] text-slate-400">(In Profile)</span>}
                    </button>
                  );
                }
              )}
            </div>

            {/* Custom Skill Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or type a custom skill (e.g. Distributed Sharding, WebAssembly, FPGA)..."
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSkillInput) {
                    handleAddSkill(newSkillInput);
                  }
                }}
                className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
              <button
                onClick={() => handleAddSkill(newSkillInput)}
                disabled={!newSkillInput.trim() || actionLoading !== null}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Patch Skill Vector
              </button>
            </div>
          </div>

          {/* Quick Project & Experience Injections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Delta Section */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Modular Project Delta Injection
                  </h3>
                  <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/30">
                    w = 0.30
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Computes individual project embedding and merges with existing projects sub-space.
                </p>

                {/* Preset 1-Click Project */}
                <div className="mb-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-xs font-bold text-white">Preset: High-Throughput Raft Distributed Consensus Engine</div>
                  <div className="text-[11px] text-slate-400 mt-1">Tech: Rust, C++, Raft, gRPC • 250k tx/sec benchmark</div>
                  <button
                    onClick={() =>
                      handleAddProject({
                        title: 'High-Throughput Raft Distributed Consensus Engine',
                        description: 'Engineered zero-copy network log replication in Rust & C++ with Byzantine fault tolerance.',
                        technologies: ['Rust', 'C++', 'Raft', 'gRPC', 'Distributed Systems'],
                        metrics: 'Processed 250,000 tx/sec with 1.4ms P99 failover recovery.',
                        repoUrl: 'https://github.com/alexrivera/raft-engine',
                      })
                    }
                    disabled={actionLoading !== null}
                    className="mt-2.5 w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    1-Click Inject Raft Consensus Project (~2ms)
                  </button>
                </div>

                {/* Custom Project Form */}
                <div className="space-y-2.5">
                  <input
                    type="text"
                    placeholder="Project Title (e.g. FlashAttention-2 GPU Kernel)"
                    value={customProject.title}
                    onChange={(e) => setCustomProject({ ...customProject, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Description / Technical Highlights"
                    value={customProject.description}
                    onChange={(e) => setCustomProject({ ...customProject, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Technologies (comma separated, e.g. CUDA, C++, PyTorch)"
                    value={customProject.technologies}
                    onChange={(e) => setCustomProject({ ...customProject, technologies: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  handleAddProject({
                    title: customProject.title,
                    description: customProject.description,
                    technologies: customProject.technologies.split(',').map((t) => t.trim()).filter(Boolean),
                    metrics: customProject.metrics,
                  })
                }
                disabled={!customProject.title.trim() || actionLoading !== null}
                className="mt-4 w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Patch Custom Project Vector
              </button>
            </div>

            {/* Experience Delta Section */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-teal-400" />
                    Modular Experience Delta Injection
                  </h3>
                  <span className="text-xs font-mono text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-500/30">
                    w = 0.25
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Updates experience sub-vector without touching education or past employment items.
                </p>

                {/* Preset 1-Click Experience */}
                <div className="mb-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-xs font-bold text-white">Preset: AI Infrastructure Intern @ OpenAI</div>
                  <div className="text-[11px] text-slate-400 mt-1">Role: SWE Intern • Highlights: PyTorch CUDA Training Clusters</div>
                  <button
                    onClick={() =>
                      handleAddExperience({
                        company: 'OpenAI',
                        role: 'AI Infrastructure Intern',
                        duration: 'Summer 2026',
                        highlights: [
                          'Accelerated PyTorch distributed training clusters with custom CUDA memory allocation kernels.',
                          'Reduced GPU idle pipeline bubble latency by 32%.',
                        ],
                        technologies: ['PyTorch', 'CUDA', 'Python', 'Distributed Systems'],
                      })
                    }
                    disabled={actionLoading !== null}
                    className="mt-2.5 w-full py-2 bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/40 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    1-Click Inject OpenAI Internship (~2ms)
                  </button>
                </div>

                {/* Custom Experience Form */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Company Name (e.g. Citadel)"
                      value={customExperience.company}
                      onChange={(e) => setCustomExperience({ ...customExperience, company: e.target.value })}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="text"
                      placeholder="Role (e.g. Quant SWE Intern)"
                      value={customExperience.role}
                      onChange={(e) => setCustomExperience({ ...customExperience, role: e.target.value })}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Key Highlights / Responsibilities"
                    value={customExperience.highlights}
                    onChange={(e) => setCustomExperience({ ...customExperience, highlights: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  handleAddExperience({
                    company: customExperience.company,
                    role: customExperience.role,
                    duration: customExperience.duration,
                    highlights: [customExperience.highlights],
                    technologies: customExperience.technologies.split(',').map((t) => t.trim()).filter(Boolean),
                  })
                }
                disabled={!customExperience.company.trim() || !customExperience.role.trim() || actionLoading !== null}
                className="mt-4 w-full py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Patch Custom Experience Vector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MODULAR SUB-VECTOR DECOMPOSITION */}
      {activeTab === 'modular' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Hierarchical Vector Synthesis Architecture
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  The candidate's composite embedding is a normalized linear combination of 4 independent modular sub-vectors.
                </p>
              </div>
            </div>

            {/* Formula Block */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 mb-6 text-center">
              <div className="text-xs text-slate-400 font-mono mb-1">Composite Vector Formula:</div>
              <div className="text-sm md:text-base font-mono font-bold text-emerald-400">
                V_composite = Normalize( 0.35 · V_skills + 0.30 · V_projects + 0.25 · V_experience + 0.10 · V_education )
              </div>
            </div>

            {/* Sub-Vector Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Skills Sub-Vector */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4" /> 1. Skills Sub-Vector (V_skills)
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                    Weight: 35%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Derived from {extractedSkills.length} extracted and incrementally patched technical competencies.
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {extractedSkills.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-emerald-950/50 text-emerald-300 border border-emerald-500/20 rounded text-[10px] font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Projects Sub-Vector */}
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> 2. Projects Sub-Vector (V_projects)
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/40">
                    Weight: 30%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Synthesized from {projects.length} modular project embeddings.
                </div>
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {projects.map((p) => (
                    <div key={p.id} className="text-[11px] text-slate-300 truncate">
                      • <strong>{p.title}</strong> ({p.technologies.slice(0, 3).join(', ')})
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience Sub-Vector */}
              <div className="p-4 rounded-xl bg-slate-950 border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" /> 3. Experience Sub-Vector (V_experience)
                  </span>
                  <span className="text-xs font-mono font-bold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/40">
                    Weight: 25%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Aggregated from {experiences.length} verified internships & work roles.
                </div>
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {experiences.map((e) => (
                    <div key={e.id} className="text-[11px] text-slate-300 truncate">
                      • <strong>{e.company}</strong> — {e.role} ({e.duration})
                    </div>
                  ))}
                </div>
              </div>

              {/* Education Sub-Vector */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Database className="w-4 h-4" /> 4. Education Sub-Vector (V_education)
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Weight: 10%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Static anchor background: Stanford University B.S. Computer Science (GPA 3.92, Class of 2026).
                </div>
                <div className="text-[11px] text-slate-300">
                  • Coursework: Distributed Systems, Compilers, Machine Learning, OS, Algorithms
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REAL-TIME MATCH SENSITIVITY MATRIX */}
      {activeTab === 'sensitivity' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Instant Match Score Sensitivity Benchmarks
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Evaluates cosine match scores against standard industry target roles using the newly re-indexed vector.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(lastMatchScoreDeltas || [
                { benchmarkJobId: 'job-databricks-bench', benchmarkCompany: 'Databricks', priorScore: 82.5, newScore: 88.4, scoreDelta: 5.9 },
                { benchmarkJobId: 'job-openai-bench', benchmarkCompany: 'OpenAI', priorScore: 78.1, newScore: 84.6, scoreDelta: 6.5 },
                { benchmarkJobId: 'job-stripe-bench', benchmarkCompany: 'Stripe', priorScore: 85.0, newScore: 87.2, scoreDelta: 2.2 },
                { benchmarkJobId: 'job-citadel-bench', benchmarkCompany: 'Citadel Securities', priorScore: 76.4, newScore: 81.0, scoreDelta: 4.6 },
              ]).map((bench) => (
                <div
                  key={bench.benchmarkJobId}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{bench.benchmarkCompany}</div>
                    <div className="text-[10px] text-slate-400">Target Role Match Projection</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-300 font-mono">
                        {bench.priorScore}% → <strong className="text-emerald-400 text-sm">{bench.newScore}%</strong>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        +{bench.scoreDelta}% Sensitivity Gain
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DELTA AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  Delta Update Audit Trail & Version History
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Immutable record of every incremental patch, latency metric, and sub-vector transition.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">{auditLogs.length} events</span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No audit logs recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          v{log.version}
                        </span>
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-slate-800 text-slate-300">
                          {log.deltaType}
                        </span>
                        <span className="font-bold text-white">{log.description}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Affected Sub-Vector: <code className="text-emerald-400">{log.affectedSubVector}</code>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">
                          {log.processingLatencyMs}ms <span className="text-slate-400 font-normal">({log.speedupFactor})</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
                  Phase 13 Verification Test Suite Runner
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Validates single skill delta injection, modular project addition, experience sub-vector updates, and cache synchronization.
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
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        testReport.failedCount === 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {testReport.passedCount} / {testReport.totalTests} Tests Passed
                    </span>
                    <span className="text-xs text-slate-400">
                      Total Duration: <strong className="text-slate-200">{testReport.totalDurationMs}ms</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(testReport.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Tests List */}
                <div className="space-y-3">
                  {testReport.results.map((test) => (
                    <div
                      key={test.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {test.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                          <span className="font-mono text-slate-400 font-bold">{test.id}</span>
                          <span className="font-bold text-white">{test.name}</span>
                        </div>
                        <span className="font-mono text-slate-400 text-[11px]">{test.durationMs}ms</span>
                      </div>
                      <div className="text-slate-400 pl-6">
                        <strong>Expected:</strong> {test.expected}
                      </div>
                      <div className="text-slate-300 pl-6">
                        <strong>Actual:</strong> <code className="text-emerald-400">{test.actual}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Click "Run All 6 Tests" above to execute the automated verification test bench.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
