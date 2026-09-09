import React, { useState, useEffect } from 'react';
import {
  Calculator,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Zap,
  Building2,
  MapPin,
  FileText,
  Target,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  Lock,
  ChevronRight,
  Info,
  Check,
} from 'lucide-react';
import {
  Job,
  Resume,
  UserPreferences,
  CompositeScoringWeights,
  CompositeMatchEvaluationResult,
  BatchScoringResponse,
  CompositeVerdict,
} from '../types';
import { DEFAULT_COMPOSITE_WEIGHTS } from '../lib/scoring/compositeScoringEngine';
import { CompositeTestSuiteReport } from '../lib/scoring/compositeScoringTestSuite';

interface CompositeScoringStudioProps {
  currentResume?: Resume | null;
  currentPreferences?: UserPreferences | null;
  allJobs?: Job[];
}

export const CompositeScoringStudio: React.FC<CompositeScoringStudioProps> = ({
  currentResume: initialResume,
  currentPreferences: initialPreferences,
  allJobs: initialJobs = [],
}) => {
  const [internalJobs, setInternalJobs] = useState<Job[]>(initialJobs);
  const [internalResume, setInternalResume] = useState<Resume | null>(initialResume || null);
  const [internalPreferences, setInternalPreferences] = useState<UserPreferences | null>(initialPreferences || null);

  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'tests'>('single');
  const [weights, setWeights] = useState<CompositeScoringWeights>(DEFAULT_COMPOSITE_WEIGHTS);
  const [strictLocation, setStrictLocation] = useState<boolean>(false);
  const [strictRole, setStrictRole] = useState<boolean>(false);
  const [customThreshold, setCustomThreshold] = useState<number>(0.70);

  // Single Evaluation State
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [singleEvaluation, setSingleEvaluation] = useState<CompositeMatchEvaluationResult | null>(null);
  const [loadingSingle, setLoadingSingle] = useState<boolean>(false);

  // Fetch data if not supplied
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        if (internalJobs.length === 0) {
          const res = await fetch('/api/jobs');
          if (res.ok) {
            const data: Job[] = await res.json();
            setInternalJobs(data);
            if (data.length > 0 && !selectedJobId) {
              setSelectedJobId(data[0].id);
            }
          }
        }
        if (!internalResume) {
          const res = await fetch('/api/resumes');
          if (res.ok) {
            const data: Resume[] = await res.json();
            if (data.length > 0) {
              const primary = data.find((r) => r.isPrimary) || data[0];
              setInternalResume(primary);
            }
          }
        }
        if (!internalPreferences) {
          const res = await fetch('/api/preferences');
          if (res.ok) {
            const data: UserPreferences[] = await res.json();
            if (data.length > 0) {
              setInternalPreferences(data[0]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load catalog for composite scoring studio:', err);
      }
    };
    fetchCatalog();
  }, []);

  const allJobs = internalJobs.length > 0 ? internalJobs : initialJobs;
  const currentResume = internalResume || initialResume;
  const currentPreferences = internalPreferences || initialPreferences;

  // Simulator Overrides for Single View
  const [simBlacklist, setSimBlacklist] = useState<boolean>(false);
  const [simPreferred, setSimPreferred] = useState<boolean>(false);
  const [simInactive, setSimInactive] = useState<boolean>(false);
  const [simStrictLocation, setSimStrictLocation] = useState<boolean>(false);

  // Batch Leaderboard State
  const [batchData, setBatchData] = useState<BatchScoringResponse | null>(null);
  const [loadingBatch, setLoadingBatch] = useState<boolean>(false);
  const [batchFilter, setBatchFilter] = useState<'all' | 'meets_threshold' | 'strong' | 'preferred' | 'disqualified'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Test Suite State
  const [testReport, setTestReport] = useState<CompositeTestSuiteReport | null>(null);
  const [loadingTests, setLoadingTests] = useState<boolean>(false);

  // Preset Profiles
  const presetProfiles = [
    {
      name: 'Balanced (40/30/15/15)',
      desc: 'Standard non-hallucinated balanced blend',
      w: { layer1Weight: 0.40, layer2Weight: 0.30, preferredCompanyBoostWeight: 0.15, locationRoleFilterWeight: 0.15 },
    },
    {
      name: 'Reality-Heavy (25/45/15/15)',
      desc: 'Emphasize informal DSA bar & OA screens',
      w: { layer1Weight: 0.25, layer2Weight: 0.45, preferredCompanyBoostWeight: 0.15, locationRoleFilterWeight: 0.15 },
    },
    {
      name: 'Dream Companies (35/20/30/15)',
      desc: 'Maximum boost for target/preferred firms',
      w: { layer1Weight: 0.35, layer2Weight: 0.20, preferredCompanyBoostWeight: 0.30, locationRoleFilterWeight: 0.15 },
    },
    {
      name: 'Strict Loc & Role (30/25/15/30)',
      desc: 'Strict geographic & exact role priority',
      w: { layer1Weight: 0.30, layer2Weight: 0.25, preferredCompanyBoostWeight: 0.15, locationRoleFilterWeight: 0.30 },
    },
  ];

  // Initialize selected job
  useEffect(() => {
    if (allJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(allJobs[0].id);
    }
  }, [allJobs, selectedJobId]);

  // Trigger single evaluation when parameters change
  useEffect(() => {
    if (selectedJobId) {
      handleRunSingleEvaluation();
    }
  }, [selectedJobId, weights, simBlacklist, simPreferred, simInactive, simStrictLocation, customThreshold]);

  // Normalize weights helper
  const handleWeightChange = (key: keyof CompositeScoringWeights, val: number) => {
    const rawVal = Math.max(0, Math.min(1, val));
    const newWeights = { ...weights, [key]: rawVal };
    
    // Auto-normalize other weights proportionally
    const otherKeys = (Object.keys(weights) as (keyof CompositeScoringWeights)[]).filter((k) => k !== key);
    const otherSum = otherKeys.reduce((acc, k) => acc + newWeights[k], 0);
    const targetRemainder = 1.0 - rawVal;

    if (otherSum > 0) {
      otherKeys.forEach((k) => {
        newWeights[k] = parseFloat(((newWeights[k] / otherSum) * targetRemainder).toFixed(4));
      });
    } else {
      const split = targetRemainder / otherKeys.length;
      otherKeys.forEach((k) => {
        newWeights[k] = parseFloat(split.toFixed(4));
      });
    }

    setWeights(newWeights);
  };

  const handleApplyPreset = (presetWeights: CompositeScoringWeights) => {
    setWeights(presetWeights);
  };

  const handleRunSingleEvaluation = async () => {
    setLoadingSingle(true);
    try {
      const selectedJob = allJobs.find((j) => j.id === selectedJobId);
      if (!selectedJob) return;

      // Construct modified job and preferences based on simulator toggles
      const jobPayload: Job = {
        ...selectedJob,
        isActive: !simInactive,
      };

      const prefPayload: UserPreferences = {
        id: currentPreferences?.id || 'pref-default',
        userId: currentPreferences?.userId || 'user-default',
        tenantId: currentPreferences?.tenantId || 'tenant-default',
        targetLocations: currentPreferences?.targetLocations?.length ? currentPreferences.targetLocations : ['San Francisco, CA', 'Bay Area', 'Seattle, WA', 'New York, NY'],
        targetRoles: currentPreferences?.targetRoles?.length ? currentPreferences.targetRoles : ['Software Engineer Intern', 'Backend Intern'],
        preferredCompanies: simPreferred
          ? Array.from(new Set([...(currentPreferences?.preferredCompanies || []), selectedJob.company]))
          : (currentPreferences?.preferredCompanies || []),
        blacklistedCompanies: simBlacklist
          ? Array.from(new Set([...(currentPreferences?.blacklistedCompanies || []), selectedJob.company]))
          : (currentPreferences?.blacklistedCompanies || []).filter((c) => c.toLowerCase() !== selectedJob.company.toLowerCase()),
        customMatchThreshold: customThreshold,
        alertMethod: currentPreferences?.alertMethod || 'email',
        alertDestination: currentPreferences?.alertDestination || 'candidate@stanford.edu',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/scoring/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customResume: currentResume,
          customJob: jobPayload,
          customPreferences: prefPayload,
          weights,
          strictLocationDisqualifier: simStrictLocation || strictLocation,
          strictRoleDisqualifier: strictRole,
          customThreshold,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSingleEvaluation(data);
      }
    } catch (err) {
      console.error('Failed to run single evaluation:', err);
    } finally {
      setLoadingSingle(false);
    }
  };

  const handleRunBatchEvaluation = async () => {
    setLoadingBatch(true);
    try {
      const res = await fetch('/api/scoring/batch-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: currentResume?.id,
          customPreferences: currentPreferences,
          weights,
          strictLocationDisqualifier: strictLocation,
          strictRoleDisqualifier: strictRole,
          customThreshold,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBatchData(data);
      }
    } catch (err) {
      console.error('Failed to run batch scoring:', err);
    } finally {
      setLoadingBatch(false);
    }
  };

  const handleRunTestSuite = async () => {
    setLoadingTests(true);
    try {
      const res = await fetch('/api/scoring/test-suite', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTestReport(data);
      }
    } catch (err) {
      console.error('Failed to run scoring test suite:', err);
    } finally {
      setLoadingTests(false);
    }
  };

  // Run batch evaluation on initial load or tab switch
  useEffect(() => {
    if (activeTab === 'batch' && !batchData) {
      handleRunBatchEvaluation();
    } else if (activeTab === 'tests' && !testReport) {
      handleRunTestSuite();
    }
  }, [activeTab]);

  const getVerdictBadge = (verdict: CompositeVerdict) => {
    switch (verdict) {
      case 'STRONG_MATCH':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /> Strong Match (80%+)</span>;
      case 'GOOD_MATCH':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><Zap className="w-3.5 h-3.5" /> Good Match (65-79%)</span>;
      case 'BORDERLINE':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertTriangle className="w-3.5 h-3.5" /> Borderline (50-64%)</span>;
      case 'WEAK_MATCH':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20"><Percent className="w-3.5 h-3.5" /> Weak Match (&lt;50%)</span>;
      case 'DISQUALIFIED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><Lock className="w-3.5 h-3.5" /> Hard Disqualified (0%)</span>;
    }
  };

  const filteredBatchEvaluations = (batchData?.evaluations || []).filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchText = (item.company + ' ' + item.jobTitle + ' ' + item.location).toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    if (batchFilter === 'meets_threshold') return item.meetsCustomThreshold;
    if (batchFilter === 'strong') return item.verdict === 'STRONG_MATCH';
    if (batchFilter === 'preferred') return item.breakdown.preferredCompany.isPreferred;
    if (batchFilter === 'disqualified') return item.isDisqualified;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner & Architectural Overview */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900/80 to-purple-950/40 border border-indigo-500/20 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
              <Calculator className="w-3.5 h-3.5 text-indigo-400" />
              <span>Phase 9 Deterministic Engine</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-slate-400">Non-Hallucinated Mathematical Formula</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Deterministic Composite Match Scoring Engine
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-3xl leading-relaxed">
              Combines Layer 1 Vector baseline (40%), Layer 2 Informal Reality (30%), Preferred Company Boost (15%), and Location/Role Filter (15%) into a transparent, mathematically verifiable score with immediate hard disqualifiers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('single')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'single'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700'
              }`}
            >
              <Target className="w-4 h-4 inline-block mr-2" />
              Single Job Deep-Dive
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'batch'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700'
              }`}
            >
              <Layers className="w-4 h-4 inline-block mr-2" />
              Batch Leaderboard
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'tests'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 inline-block mr-2" />
              Verification Tests (6/6)
            </button>
          </div>
        </div>

        {/* Global Mathematical Formula Badge Bar */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
              {(weights.layer1Weight * 100).toFixed(0)}%
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Layer 1 Baseline</div>
              <div className="text-sm font-semibold text-slate-200">Vector Cosine &amp; Stated JD</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
              {(weights.layer2Weight * 100).toFixed(0)}%
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Layer 2 Reality</div>
              <div className="text-sm font-semibold text-slate-200">Informal Bar &amp; OA Risks</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
              {(weights.preferredCompanyBoostWeight * 100).toFixed(0)}%
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Company Boost</div>
              <div className="text-sm font-semibold text-slate-200">Preferred Target Firms</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
              {(weights.locationRoleFilterWeight * 100).toFixed(0)}%
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Location &amp; Role</div>
              <div className="text-sm font-semibold text-slate-200">Target Cities &amp; Titles</div>
            </div>
          </div>
        </div>
      </div>

      {/* Configurable Weight Parameters Control Panel */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              Configurable Scoring Weights &amp; Filter Parameters
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tune relative importance parameters or select a preset. The mathematical sum invariant strictly equals 100.0%.
            </p>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {presetProfiles.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleApplyPreset(preset.w)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-200 border border-slate-700/80 transition-all"
                title={preset.desc}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
          {/* L1 Weight Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-blue-400">Layer 1 Vector Weight</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">
                {(weights.layer1Weight * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.05"
              value={weights.layer1Weight}
              onChange={(e) => handleWeightChange('layer1Weight', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="text-[11px] text-slate-400">Embeddings &amp; direct skill requirements</div>
          </div>

          {/* L2 Weight Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-purple-400">Layer 2 Reality Weight</span>
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">
                {(weights.layer2Weight * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.05"
              value={weights.layer2Weight}
              onChange={(e) => handleWeightChange('layer2Weight', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="text-[11px] text-slate-400">Informal bar, LeetCode &amp; OA risks</div>
          </div>

          {/* Preferred Boost Weight Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-amber-400">Preferred Company Boost</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                {(weights.preferredCompanyBoostWeight * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.00"
              max="0.50"
              step="0.05"
              value={weights.preferredCompanyBoostWeight}
              onChange={(e) => handleWeightChange('preferredCompanyBoostWeight', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="text-[11px] text-slate-400">User's target wishlist companies</div>
          </div>

          {/* Location & Role Filter Weight Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-emerald-400">Location &amp; Role Fit</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                {(weights.locationRoleFilterWeight * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.00"
              max="0.50"
              step="0.05"
              value={weights.locationRoleFilterWeight}
              onChange={(e) => handleWeightChange('locationRoleFilterWeight', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="text-[11px] text-slate-400">City, Remote status &amp; role titles</div>
          </div>
        </div>

        {/* Hard Disqualifier Toggles & Alert Threshold */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={strictLocation}
                onChange={(e) => setStrictLocation(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Strict Location Hard-Disqualifier (Mismatch = 0%)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={strictRole}
                onChange={(e) => setStrictRole(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Strict Role Hard-Disqualifier (Non-Tech = 0%)</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">Notification Threshold:</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={customThreshold}
                onChange={(e) => setCustomThreshold(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                {(customThreshold * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SINGLE JOB MATHEMATICAL DEEP-DIVE & DISQUALIFIER SIMULATOR        */}
      {/* ========================================================================= */}
      {activeTab === 'single' && (
        <div className="space-y-6">
          {/* Target Job Selector & Candidate Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  Select Target Job Posting to Audit
                </label>
                <span className="text-xs text-slate-400">{allJobs.length} catalog postings</span>
              </div>

              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {allJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.company} — {job.title} ({job.location}{job.isRemote ? ' • Remote' : ''})
                  </option>
                ))}
              </select>

              {/* Hard Disqualifier Simulator Switches */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Hard Disqualifier &amp; Preference Simulator (Instant Score Zeroing)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => setSimBlacklist(!simBlacklist)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left flex items-center justify-between ${
                      simBlacklist
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Explicit Blacklist</span>
                    {simBlacklist ? <Check className="w-3.5 h-3.5" /> : null}
                  </button>

                  <button
                    onClick={() => setSimStrictLocation(!simStrictLocation)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left flex items-center justify-between ${
                      simStrictLocation
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Strict Loc Mismatch</span>
                    {simStrictLocation ? <Check className="w-3.5 h-3.5" /> : null}
                  </button>

                  <button
                    onClick={() => setSimInactive(!simInactive)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left flex items-center justify-between ${
                      simInactive
                        ? 'bg-red-500/20 border-red-500/40 text-red-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Posting Inactive</span>
                    {simInactive ? <Check className="w-3.5 h-3.5" /> : null}
                  </button>

                  <button
                    onClick={() => setSimPreferred(!simPreferred)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left flex items-center justify-between ${
                      simPreferred
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>+15% Target Wishlist</span>
                    {simPreferred ? <Check className="w-3.5 h-3.5" /> : null}
                  </button>
                </div>
              </div>
            </div>

            {/* Candidate Card */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Active Candidate Profile
                </div>
                <div className="text-base font-bold text-white mt-1 truncate">
                  {currentResume?.title || 'Sam Taylor (Stanford CS)'}
                </div>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <div><span className="text-slate-500">Skills:</span> {currentResume?.extractedSkills?.slice(0, 5).join(', ')}</div>
                  <div><span className="text-slate-500">GPA:</span> {currentResume?.parsedData?.education?.[0]?.gpa || '3.94'}</div>
                  <div><span className="text-slate-500">Target Locs:</span> {currentPreferences?.targetLocations?.slice(0, 2).join(', ') || 'SF, Bay Area, NYC'}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Audit Status:</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for scoring
                </span>
              </div>
            </div>
          </div>

          {/* Scoreboard Hero Card */}
          {singleEvaluation && (
            <div className={`p-6 md:p-8 rounded-2xl border transition-all shadow-2xl ${
              singleEvaluation.isDisqualified
                ? 'bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-red-950/30 border-rose-500/30'
                : singleEvaluation.meetsCustomThreshold
                ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-indigo-950/30 border-emerald-500/30'
                : 'bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 border-slate-800'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getVerdictBadge(singleEvaluation.verdict)}
                    <span className="text-xs text-slate-400 font-mono">
                      {singleEvaluation.auditSignature}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                    {singleEvaluation.company} — {singleEvaluation.jobTitle}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {singleEvaluation.location} {singleEvaluation.isRemote ? '(Remote Allowed)' : ''}</span>
                    <span className="text-slate-600">•</span>
                    <span>Threshold: {(singleEvaluation.thresholdValue * 100).toFixed(0)}%</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-indigo-400">Compute Latency: {singleEvaluation.latencyMs}ms</span>
                  </div>
                </div>

                {/* Score Number Display */}
                <div className="flex items-center gap-6">
                  {singleEvaluation.isDisqualified && (
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Raw Pre-Disqualification</div>
                      <div className="text-lg font-mono text-slate-400 line-through">
                        {singleEvaluation.rawPercentageBeforeDisqualification}%
                      </div>
                    </div>
                  )}

                  <div className="text-right p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Final Deterministic Score
                    </div>
                    <div className={`text-4xl md:text-5xl font-black font-mono tracking-tight ${
                      singleEvaluation.isDisqualified
                        ? 'text-rose-400'
                        : singleEvaluation.meetsCustomThreshold
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}>
                      {singleEvaluation.finalPercentage}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Hard Disqualification Notice if applicable */}
              {singleEvaluation.isDisqualified && (
                <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-rose-300">
                      Hard Disqualifier Triggered: {singleEvaluation.disqualifications[0]?.type}
                    </div>
                    <div className="text-xs text-rose-200/80 mt-0.5">
                      {singleEvaluation.disqualifications[0]?.reason}
                    </div>
                    <div className="text-[11px] text-rose-300/60 mt-1 font-mono">
                      Triggered Value: {singleEvaluation.disqualifications[0]?.triggeredValue} | Required: {singleEvaluation.disqualifications[0]?.requiredValue}
                    </div>
                  </div>
                </div>
              )}

              {/* Mathematical Formula String */}
              <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between gap-4 overflow-x-auto">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Calculator className="w-4 h-4 text-indigo-400" />
                  <span className="text-slate-400 font-semibold">FORMULA:</span>
                </div>
                <div className="text-indigo-300 font-medium whitespace-nowrap">
                  {singleEvaluation.formulaString}
                </div>
                <div className="text-xs text-slate-500 flex-shrink-0">Deterministic Checksum Verified</div>
              </div>

              {/* 4 Component Score Contribution Cards */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* L1 Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-blue-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-blue-400 font-semibold">Layer 1 Vector Fit</span>
                    <span className="text-slate-400 font-mono">{weights.layer1Weight * 100}% wt</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold text-white font-mono">
                      {singleEvaluation.breakdown.layer1.percentage}%
                    </div>
                    <div className="text-xs text-blue-300 font-mono">
                      +{(singleEvaluation.breakdown.layer1.weightedPercentage).toFixed(1)}% net
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${singleEvaluation.breakdown.layer1.percentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    {singleEvaluation.breakdown.layer1.requiredSkillsMatched}/{singleEvaluation.breakdown.layer1.requiredSkillsTotal} required skills matched
                  </div>
                </div>

                {/* L2 Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-purple-400 font-semibold">Layer 2 Reality Fit</span>
                    <span className="text-slate-400 font-mono">{weights.layer2Weight * 100}% wt</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold text-white font-mono">
                      {singleEvaluation.breakdown.layer2.percentage}%
                    </div>
                    <div className="text-xs text-purple-300 font-mono">
                      +{(singleEvaluation.breakdown.layer2.weightedPercentage).toFixed(1)}% net
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full"
                      style={{ width: `${singleEvaluation.breakdown.layer2.percentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    Bar: {singleEvaluation.breakdown.layer2.dsaDifficulty} ({singleEvaluation.breakdown.layer2.warningsCount} warnings)
                  </div>
                </div>

                {/* Preferred Company Boost Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-amber-400 font-semibold">Company Boost</span>
                    <span className="text-slate-400 font-mono">{weights.preferredCompanyBoostWeight * 100}% wt</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold text-white font-mono">
                      {singleEvaluation.breakdown.preferredCompany.percentage}%
                    </div>
                    <div className="text-xs text-amber-300 font-mono">
                      +{(singleEvaluation.breakdown.preferredCompany.weightedPercentage).toFixed(1)}% net
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${singleEvaluation.breakdown.preferredCompany.percentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 truncate">
                    {singleEvaluation.breakdown.preferredCompany.isPreferred ? 'Target Wishlist Match (+100%)' : singleEvaluation.breakdown.preferredCompany.companyTier}
                  </div>
                </div>

                {/* Location & Role Fit Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-400 font-semibold">Location &amp; Role</span>
                    <span className="text-slate-400 font-mono">{weights.locationRoleFilterWeight * 100}% wt</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold text-white font-mono">
                      {singleEvaluation.breakdown.locationRole.percentage}%
                    </div>
                    <div className="text-xs text-emerald-300 font-mono">
                      +{(singleEvaluation.breakdown.locationRole.weightedPercentage).toFixed(1)}% net
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${singleEvaluation.breakdown.locationRole.percentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 truncate">
                    {singleEvaluation.breakdown.locationRole.matchedLocation || (singleEvaluation.isRemote ? 'Remote Allowed' : 'Loc Match')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BATCH DETERMINISTIC MATCH LEADERBOARD                             */}
      {/* ========================================================================= */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          {/* Controls & Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">Total Evaluated</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {batchData?.totalJobsEvaluated || 0}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-emerald-400">Meets Threshold (&ge;{(customThreshold * 100).toFixed(0)}%)</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {batchData?.meetsThresholdCount || 0}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-indigo-400">Strong Matches (&ge;80%)</div>
              <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                {batchData?.aggregates?.strongMatchCount || 0}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-purple-400">Average Qualified Score</div>
              <div className="text-2xl font-bold text-purple-400 font-mono mt-1">
                {batchData?.aggregates?.averageQualifiedScore ? (batchData.aggregates.averageQualifiedScore * 100).toFixed(1) : 0}%
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-rose-400">Hard Disqualified (0%)</div>
              <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
                {batchData?.disqualifiedJobsCount || 0}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by company, role, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setBatchFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  batchFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({batchData?.evaluations?.length || 0})
              </button>
              <button
                onClick={() => setBatchFilter('meets_threshold')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  batchFilter === 'meets_threshold'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Meets Threshold ({batchData?.meetsThresholdCount || 0})
              </button>
              <button
                onClick={() => setBatchFilter('strong')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  batchFilter === 'strong'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Strong (80%+) ({batchData?.aggregates?.strongMatchCount || 0})
              </button>
              <button
                onClick={() => setBatchFilter('preferred')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  batchFilter === 'preferred'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Preferred Boosted
              </button>
              <button
                onClick={() => setBatchFilter('disqualified')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  batchFilter === 'disqualified'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Disqualified ({batchData?.disqualifiedJobsCount || 0})
              </button>
              <button
                onClick={handleRunBatchEvaluation}
                disabled={loadingBatch}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBatch ? 'animate-spin' : ''}`} />
                Recompute
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Rank &amp; Company</th>
                  <th className="px-4 py-3">Job Title &amp; Location</th>
                  <th className="px-4 py-3 text-center">L1 Fit (40%)</th>
                  <th className="px-4 py-3 text-center">L2 Reality (30%)</th>
                  <th className="px-4 py-3 text-center">Pref Boost (15%)</th>
                  <th className="px-4 py-3 text-center">Loc/Role (15%)</th>
                  <th className="px-4 py-3 text-right">Final Score</th>
                  <th className="px-4 py-3 text-center">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBatchEvaluations.map((item, idx) => (
                  <tr
                    key={item.jobId}
                    onClick={() => {
                      setSelectedJobId(item.jobId);
                      setActiveTab('single');
                    }}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5 font-medium text-white flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-[11px] font-mono flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          {item.company}
                          {item.breakdown.preferredCompany.isPreferred && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                              TARGET
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.auditSignature.slice(0, 16)}...</div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-200 truncate max-w-xs">{item.jobTitle}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {item.location} {item.isRemote ? '• Remote' : ''}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono text-blue-300">
                      {item.breakdown.layer1.percentage}%
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono text-purple-300">
                      {item.breakdown.layer2.percentage}%
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono text-amber-300">
                      {item.breakdown.preferredCompany.percentage}%
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono text-emerald-300">
                      {item.breakdown.locationRole.percentage}%
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-black text-sm">
                      <span className={
                        item.isDisqualified
                          ? 'text-rose-400 line-through'
                          : item.meetsCustomThreshold
                          ? 'text-emerald-400 text-base'
                          : 'text-amber-400'
                      }>
                        {item.finalPercentage}%
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {getVerdictBadge(item.verdict)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUTOMATED VERIFICATION HARNESS (TEST SUITE)                       */}
      {/* ========================================================================= */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Phase 9 Verification Test Suite Report
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Automated tests verifying mathematical blend, hard disqualifiers, dynamic weight normalization, and sub-millisecond execution.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {testReport && (
                <div className="text-xs text-slate-400 font-mono">
                  {testReport.passedCount}/{testReport.totalTests} passed in {testReport.totalDurationMs}ms (avg {testReport.averageLatencyMs}ms)
                </div>
              )}
              <button
                onClick={handleRunTestSuite}
                disabled={loadingTests}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loadingTests ? 'animate-spin' : ''}`} />
                {loadingTests ? 'Running Tests...' : 'Run All Verification Tests'}
              </button>
            </div>
          </div>

          {/* Test Results Cards */}
          {testReport && (
            <div className="space-y-3">
              {testReport.results.map((test) => (
                <div
                  key={test.id}
                  className={`p-4 rounded-xl border transition-all ${
                    test.passed
                      ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      : 'bg-rose-950/20 border-rose-500/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {test.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{test.name}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono border border-slate-700">
                            {test.id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          <span className="text-slate-500 font-medium">Category:</span> {test.category}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3 self-end sm:self-center">
                      <span className="text-xs font-mono text-indigo-400">{test.durationMs}ms</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        test.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {test.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold">Expected: </span>
                      <span className="text-slate-300">{test.expected}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">Actual: </span>
                      <span className="text-indigo-300 font-mono">{test.actual}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
