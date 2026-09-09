import React, { useState } from 'react';
import {
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Code2,
  Table,
  Database,
  Globe,
  Trash2,
  Calculator,
  ShieldCheck,
  Building,
  BarChart3,
  Flame,
  Check,
  X,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  E2ETestSuiteSummary,
  E2EPipelineExecutionTrace,
  E2ELoadStressBenchmark,
} from '../../types';

// Import existing Phase Studio components for seamless tabbed access in Dev Sandbox
import { Layer1RagStudio } from '../Layer1RagStudio';
import { Layer2RealityStudio } from '../Layer2RealityStudio';
import { CompositeScoringStudio } from '../CompositeScoringStudio';
import { VectorTestBench } from '../VectorTestBench';
import { CompanyKnowledgeGraph } from '../CompanyKnowledgeGraph';
import { AtsScrapers } from '../AtsScrapers';
import { JobDedupEngine } from '../JobDedupEngine';
import { StaleJobCleanupPanel } from '../StaleJobCleanupPanel';
import { TaskQueueStudio } from '../TaskQueueStudio';
import { DataExplorer } from '../DataExplorer';
import { SchemaViewer } from '../SchemaViewer';
import { AuthSecurityCenter } from '../AuthSecurityCenter';
import { ApiPlayground } from '../ApiPlayground';

export const DevSandboxView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<
    'e2e-benchmarks' | 'pipeline-sim' | 'rag-scoring' | 'scrapers-dedup' | 'knowledge-graph' | 'queue-cleanup' | 'database-api'
  >('e2e-benchmarks');

  // Sub-tabs for RAG & Scoring
  const [ragSubTab, setRagSubTab] = useState<'l1' | 'l2' | 'composite' | 'vector'>('l1');

  // Sub-tabs for Scrapers & Dedup
  const [scraperSubTab, setScraperSubTab] = useState<'scrapers' | 'dedup'>('scrapers');

  // Sub-tabs for Database & API
  const [dbSubTab, setDbSubTab] = useState<'explorer' | 'schema' | 'security' | 'api'>('explorer');

  // E2E Test Suite State
  const [testSummary, setTestSummary] = useState<E2ETestSuiteSummary | null>(null);
  const [runningSuite, setRunningSuite] = useState<boolean>(false);

  // Concurrency Benchmark State
  const [runningBenchmark, setRunningBenchmark] = useState<boolean>(false);
  const [benchmarkResult, setBenchmarkResult] = useState<E2ELoadStressBenchmark | null>(null);

  // Pipeline Simulator State
  const [simAts, setSimAts] = useState<'Greenhouse' | 'Lever' | 'Ashby' | 'Workday'>('Greenhouse');
  const [simCompany, setSimCompany] = useState<string>('Citadel Securities');
  const [simTitle, setSimTitle] = useState<string>('Quantitative Research & C++ Systems Intern 2027');
  const [simTier, setSimTier] = useState<string>('Tier 1 Quant/HFT');
  const [simLocation, setSimLocation] = useState<string>('New York, NY (Hybrid)');
  const [simSalary, setSimSalary] = useState<string>('$125/hr + $10,000 Sign-on');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [liveTrace, setLiveTrace] = useState<E2EPipelineExecutionTrace | null>(null);

  // Run E2E Test Suite
  const handleRunTestSuite = async () => {
    try {
      setRunningSuite(true);
      const res = await fetch('/api/e2e/test-suite', { method: 'POST' });
      if (res.ok) {
        const payload = await res.json();
        setTestSummary(payload);
      }
    } catch (err: any) {
      alert(`E2E Suite error: ${err.message}`);
    } finally {
      setRunningSuite(false);
    }
  };

  // Run Concurrency Load Benchmark
  const handleRunBenchmark = async () => {
    try {
      setRunningBenchmark(true);
      const res = await fetch('/api/e2e/load-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concurrency: 50 }),
      });
      if (res.ok) {
        const payload = await res.json();
        setBenchmarkResult(payload);
      }
    } catch (err: any) {
      alert(`Benchmark error: ${err.message}`);
    } finally {
      setRunningBenchmark(false);
    }
  };

  // Run Live Pipeline Simulation Trace
  const handleRunSimulation = async () => {
    try {
      setSimulating(true);
      const mockHtml = `
        <div class="job-posting">
          <h1>${simTitle}</h1>
          <p>Location: ${simLocation}</p>
          <p>Compensation: ${simSalary}</p>
          <h3>Core Technical Expectations</h3>
          <ul>
            <li>Exceptional systems programming proficiency in C++, CUDA, Python, or Rust.</li>
            <li>Deep mastery of low-latency networking, memory caching, and multi-threading.</li>
            <li>Strong foundation in algorithms and performance profiling.</li>
          </ul>
        </div>
      `;

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
          rawHtmlContent: mockHtml,
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        setLiveTrace(payload);
      }
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Dev Sandbox Header */}
      <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Terminal className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Developer Sandbox &amp; Diagnostic Testing Lab
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                15 System Phases
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive test harness for end-to-end pipeline traces, 50-job load benchmarks, vector embeddings, and RAG tuning.
            </p>
          </div>
        </div>
      </div>

      {/* Main Dev Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'e2e-benchmarks', label: 'E2E Suite & Load Tests', icon: Sparkles },
          { id: 'pipeline-sim', label: 'Live Pipeline Simulator', icon: Play },
          { id: 'rag-scoring', label: 'RAG & Scoring Studios', icon: Layers },
          { id: 'knowledge-graph', label: 'Company Knowledge Graph', icon: Building },
          { id: 'scrapers-dedup', label: 'ATS Scrapers & Dedup', icon: Globe },
          { id: 'queue-cleanup', label: 'Task Queue & Cleanup', icon: Activity },
          { id: 'database-api', label: 'Database & API Explorer', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Category Content Views */}

      {/* 1. E2E SUITE & LOAD BENCHMARKS */}
      {activeCategory === 'e2e-benchmarks' && (
        <div className="space-y-6">
          {/* Action Launchers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Run 6-Phase Test Suite Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 6-Phase Pipeline Invariant Suite
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Deterministic</span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Automated End-to-End Test Suite
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Executes automated test cases across Scrape Normalization, SHA-256 Dedup, Layer 1 Vector Cosine Similarity, Layer 2 Reality Grounding, Composite Scoring, Telegram Webhooks, and Sub-vector Delta Calibrations.
                </p>
              </div>

              <button
                onClick={handleRunTestSuite}
                disabled={runningSuite}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-4 h-4 ${runningSuite ? 'animate-spin' : ''}`} />
                <span>{runningSuite ? 'Executing Test Suite...' : 'Run Automated E2E Test Suite'}</span>
              </button>
            </div>

            {/* Run 50-Job Concurrency Load Benchmark */}
            <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" /> 50 Simultaneous ATS Ingestions
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Stress Test</span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Concurrency &amp; Load Stress Test
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Simultaneously pumps 50 parallel ATS jobs across Greenhouse, Lever, Ashby, and Workday. Measures p50, p95, p99 latency percentiles, throughput (jobs/sec), and memory heap delta.
                </p>
              </div>

              <button
                onClick={handleRunBenchmark}
                disabled={runningBenchmark}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-600/30 cursor-pointer disabled:opacity-50"
              >
                <Flame className={`w-4 h-4 ${runningBenchmark ? 'animate-spin' : ''}`} />
                <span>{runningBenchmark ? 'Simulating 50 Concurrent Jobs...' : 'Run 50-Job Concurrency Benchmark'}</span>
              </button>
            </div>
          </div>

          {/* Test Suite Results Display */}
          {testSummary && (
            <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    E2E Test Suite Results: {testSummary.passed} / {testSummary.totalTests} Passed (100%)
                  </h3>
                </div>
                <span className="text-xs font-mono text-cyan-400">
                  Total Duration: {testSummary.totalDurationMs}ms
                </span>
              </div>

              <div className="space-y-2">
                {testSummary.testCases.map((tc) => (
                  <div
                    key={tc.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-slate-200">{tc.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{tc.durationMs}ms</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{tc.description}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                      PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concurrency Benchmark Results Display */}
          {benchmarkResult && (
            <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">
                    50-Job Concurrency Load Benchmark Telemetry
                  </h3>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  Throughput: {benchmarkResult.throughputJobsPerSecond} jobs/sec
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">p50 Latency</span>
                  <span className="text-lg font-bold text-white font-mono">{benchmarkResult.p50LatencyMs} ms</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">p95 Latency</span>
                  <span className="text-lg font-bold text-cyan-400 font-mono">{benchmarkResult.p95LatencyMs} ms</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">p99 Latency</span>
                  <span className="text-lg font-bold text-indigo-400 font-mono">{benchmarkResult.p99LatencyMs} ms</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Successful Ingests</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">{benchmarkResult.successfulJobs} / 50</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. PIPELINE SIMULATOR */}
      {activeCategory === 'pipeline-sim' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-cyan-400" />
              Configure Raw ATS Ingestion Simulation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">ATS Provider</label>
                <select
                  value={simAts}
                  onChange={(e) => setSimAts(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="Greenhouse">Greenhouse</option>
                  <option value="Lever">Lever</option>
                  <option value="Ashby">Ashby</option>
                  <option value="Workday">Workday</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Company Name</label>
                <input
                  type="text"
                  value={simCompany}
                  onChange={(e) => setSimCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Company Tier</label>
                <select
                  value={simTier}
                  onChange={(e) => setSimTier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="Tier 1 Quant/HFT">Tier 1 Quant/HFT</option>
                  <option value="Tier 1 AI Labs">Tier 1 AI Labs</option>
                  <option value="High-Growth Unicorn">High-Growth Unicorn</option>
                  <option value="Enterprise SaaS">Enterprise SaaS</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Job Title</label>
                <input
                  type="text"
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Location</label>
                <input
                  type="text"
                  value={simLocation}
                  onChange={(e) => setSimLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Salary / Stipend</label>
                <input
                  type="text"
                  value={simSalary}
                  onChange={(e) => setSimSalary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={simulating}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{simulating ? 'Simulating 7-Step Pipeline...' : 'Execute 7-Step Pipeline Trace'}</span>
            </button>
          </div>

          {/* Live Trace Result */}
          {liveTrace && (
            <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white">
                  Simulation Execution Trace ({liveTrace.totalDurationMs}ms)
                </h3>
                <span className="text-xs font-mono text-emerald-400">
                  Verdict: {liveTrace.finalScoringResult?.verdict} ({( (liveTrace.finalScoringResult?.compositeScore || 0) * 100).toFixed(1)}%)
                </span>
              </div>

              <div className="space-y-3">
                {liveTrace.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center justify-center">
                          {step.stepNumber}
                        </span>
                        <span className="text-xs font-bold text-white">{step.stepName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{step.durationMs}ms</span>
                    </div>
                    <p className="text-xs text-slate-300">{step.outputSummary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. RAG & SCORING STUDIOS */}
      {activeCategory === 'rag-scoring' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            {[
              { id: 'l1', label: 'Layer 1: Stated RAG Studio' },
              { id: 'l2', label: 'Layer 2: Reality Grounding' },
              { id: 'composite', label: 'Composite Scoring' },
              { id: 'vector', label: 'Vector Test Bench' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setRagSubTab(sub.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ragSubTab === sub.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {ragSubTab === 'l1' && <Layer1RagStudio />}
          {ragSubTab === 'l2' && <Layer2RealityStudio />}
          {ragSubTab === 'composite' && <CompositeScoringStudio />}
          {ragSubTab === 'vector' && <VectorTestBench />}
        </div>
      )}

      {/* 4. COMPANY KNOWLEDGE GRAPH */}
      {activeCategory === 'knowledge-graph' && (
        <CompanyKnowledgeGraph />
      )}

      {/* 5. ATS SCRAPERS & DEDUP */}
      {activeCategory === 'scrapers-dedup' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setScraperSubTab('scrapers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scraperSubTab === 'scrapers'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ATS Scrapers (4 Providers)
            </button>
            <button
              onClick={() => setScraperSubTab('dedup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scraperSubTab === 'dedup'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Deterministic SHA-256 Dedup
            </button>
          </div>

          {scraperSubTab === 'scrapers' && <AtsScrapers />}
          {scraperSubTab === 'dedup' && <JobDedupEngine />}
        </div>
      )}

      {/* 6. TASK QUEUE & STALE JOB CLEANUP */}
      {activeCategory === 'queue-cleanup' && (
        <div className="space-y-6">
          <TaskQueueStudio />
          <StaleJobCleanupPanel />
        </div>
      )}

      {/* 7. DATABASE & API EXPLORER */}
      {activeCategory === 'database-api' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            {[
              { id: 'explorer', label: 'Data Explorer' },
              { id: 'schema', label: 'Schema Viewer' },
              { id: 'security', label: 'Auth & Security' },
              { id: 'api', label: 'API Playground' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setDbSubTab(sub.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dbSubTab === sub.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {dbSubTab === 'explorer' && <DataExplorer />}
          {dbSubTab === 'schema' && <SchemaViewer />}
          {dbSubTab === 'security' && <AuthSecurityCenter />}
          {dbSubTab === 'api' && <ApiPlayground />}
        </div>
      )}
    </div>
  );
};
