import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Database,
  Archive,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Play,
  Layers,
  Code2,
  HardDrive,
  Check,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { StorageBloatStats, CleanupResult } from '../types';
import { CleanupTestSuiteReport } from '../lib/cleanupTestSuite';
import { cleanupEngine } from '../lib/cleanupEngine';
import { safeFetchJson } from '../lib/apiHelper';

interface StaleJobCleanupPanelProps {
  onJobsUpdated?: () => void;
}

export function StaleJobCleanupPanel({ onJobsUpdated }: StaleJobCleanupPanelProps) {
  const [stats, setStats] = useState<StorageBloatStats | null>(null);
  const [retentionDays, setRetentionDays] = useState<number>(60);
  const [cleanupMode, setCleanupMode] = useState<'delete' | 'archive'>('delete');
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);
  const [testReport, setTestReport] = useState<CleanupTestSuiteReport | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'sql' | 'tests'>('dashboard');
  const [sqlQueries, setSqlQueries] = useState<{ deleteQuery: string; archiveQuery: string; partitioningDdl: string } | null>(null);

  const fetchBloatStats = async () => {
    try {
      const res = await safeFetchJson<{ stats: StorageBloatStats; sqlStatements: { deleteQuery: string; archiveQuery: string; partitioningDdl: string } }>('/api/jobs/storage-bloat-stats');
      if (res.ok && res.data) {
        setStats(res.data.stats);
        setSqlQueries(res.data.sqlStatements);
      }
    } catch {
      // Quietly ignore transient errors during reload
    }
  };

  useEffect(() => {
    fetchBloatStats();
  }, []);

  const handleExecuteCleanup = async () => {
    setIsCleaning(true);
    try {
      const res = await fetch('/api/jobs/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays, mode: cleanupMode }),
      });
      if (res.ok) {
        const result: CleanupResult = await res.json();
        setLastResult(result);
        await fetchBloatStats();
        if (onJobsUpdated) onJobsUpdated();
      }
    } catch (err) {
      console.error('Cleanup execution failed:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleSimulateStaleBloat = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/jobs/simulate-stale-bloat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await fetchBloatStats();
        if (onJobsUpdated) onJobsUpdated();
      }
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRunTests = async () => {
    try {
      const res = await fetch('/api/jobs/test-suite-cleanup', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setTestReport(data);
      }
    } catch (err) {
      console.error('Failed to run test suite:', err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/40 border border-rose-800/40 rounded-3xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Automated Retention & Storage Bloat Engine
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
              Stale Job Bloat Remediation
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl mt-1">
              Prunes and archives closed job postings older than 60 days via deterministic SQL query execution and partition pruning, freeing memory, disk storage, and vector indexes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSimulateStaleBloat}
              disabled={isSimulating}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Injecting...' : 'Simulate 6-Month Bloat'}</span>
            </button>

            <button
              onClick={handleExecuteCleanup}
              disabled={isCleaning}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isCleaning ? 'animate-spin' : ''}`} />
              <span>{isCleaning ? 'Pruning Database...' : 'Execute 60-Day Purge'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Total Storage Rows</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">{stats?.totalJobs ?? 0}</div>
          <div className="text-[11px] text-emerald-400 font-mono mt-1">
            {stats?.activeJobs ?? 0} Active Live Postings
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-rose-900/40 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-rose-300 font-medium mb-1">
            <span>Stale Jobs (&gt;60 Days)</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{stats?.staleJobsOver60Days ?? 0}</div>
          <div className="text-[11px] text-rose-400/80 font-mono mt-1">
            {stats?.staleJobsOver180Days ?? 0} over 6 months old
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Reclaimable Footprint</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {formatBytes(stats?.reclaimableBytes || 0)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Total disk: {formatBytes(stats?.estimatedDiskSizeBytes || 0)}
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Cold Archival Vault</span>
            <Archive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300">{stats?.archivedJobsCount ?? 0}</div>
          <div className="text-[11px] text-indigo-400/80 font-mono mt-1">
            Cold storage partition
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'dashboard'
              ? 'bg-rose-600/30 text-rose-200 border border-rose-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Retention Controls & Logs</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sql')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'sql'
              ? 'bg-rose-600/30 text-rose-200 border border-rose-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>SQL Query & Partition DDL</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('tests');
            if (!testReport) handleRunTests();
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'tests'
              ? 'bg-rose-600/30 text-rose-200 border border-rose-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Retention Test Suite (5 Tests)</span>
        </button>
      </div>

      {/* View 1: Retention Controls & Execution Logs */}
      {activeSubTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Card */}
          <div className="lg:col-span-1 p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-5">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              Retention Policy Config
            </h3>

            {/* Retention Threshold */}
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-medium flex justify-between">
                <span>Retention Cutoff Window</span>
                <span className="font-mono text-rose-400 font-bold">{retentionDays} Days</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[30, 60, 90, 180].map((d) => (
                  <button
                    key={d}
                    onClick={() => setRetentionDays(d)}
                    className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                      retentionDays === d
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Jobs with <code className="text-rose-300">is_active = false</code> older than {retentionDays} days will be cleaned.
              </p>
            </div>

            {/* Cleanup Mode */}
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-medium">Disposal Action</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCleanupMode('delete')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    cleanupMode === 'delete'
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Hard Purge (DELETE)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Direct deletion from database table.
                  </p>
                </button>

                <button
                  onClick={() => setCleanupMode('archive')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    cleanupMode === 'archive'
                      ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Archive className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Archive to Partition</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Transfers to cold storage before purging.
                  </p>
                </button>
              </div>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecuteCleanup}
              disabled={isCleaning}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className={`w-4 h-4 ${isCleaning ? 'animate-spin' : ''}`} />
              <span>Execute SQL Cleanup Query Now</span>
            </button>

            {/* Cron Schedule Info */}
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Automated pg_cron Schedule Active</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Runs daily at 03:00 UTC (0 3 * * *)
              </p>
            </div>
          </div>

          {/* Execution Results & Details */}
          <div className="lg:col-span-2 p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Latest Cleanup Run Execution Log
              </h3>
              {lastResult && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {lastResult.prunedCount} Jobs Pruned ({lastResult.estimatedFreedKb} KB Freed)
                </span>
              )}
            </div>

            {lastResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-slate-300">Executed SQL Query:</div>
                  <pre className="text-xs text-rose-300 font-mono bg-slate-900/90 p-3 rounded-xl overflow-x-auto border border-rose-900/30">
                    {lastResult.sqlExecuted}
                  </pre>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 font-mono">
                    <span>Scanned: <strong className="text-slate-200">{lastResult.scannedJobs}</strong></span>
                    <span>Pruned: <strong className="text-rose-400">{lastResult.prunedCount}</strong></span>
                    <span>Archived: <strong className="text-indigo-300">{lastResult.archivedCount}</strong></span>
                    <span>Remaining: <strong className="text-emerald-400">{lastResult.remainingJobs}</strong></span>
                  </div>
                </div>

                {lastResult.details && lastResult.details.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300">Pruned Stale Job Records:</div>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                      {lastResult.details.map((item) => (
                        <div key={item.id} className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2">
                          <div className="truncate">
                            <span className="text-slate-200 font-semibold">{item.company}</span>
                            <span className="text-slate-400 text-[11px] ml-2">{item.title}</span>
                          </div>
                          <div className="text-[11px] text-rose-400 whitespace-nowrap">
                            Closed {item.daysOld}d ago
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950/60 border border-slate-800/60 rounded-2xl space-y-3">
                <HardDrive className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-xs font-bold text-slate-300">No Cleanup Run Executed In This Session</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click <strong>"Simulate 6-Month Bloat"</strong> above to seed sample closed jobs from 60 to 180 days ago, then click <strong>"Execute 60-Day Purge"</strong> to observe instant space reclamation.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 2: SQL Query & Partition DDL Inspector */}
      {activeSubTab === 'sql' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-rose-400" />
              SQL Retention Query & Database Partitioning Architecture
            </h3>
            <span className="text-xs font-mono text-slate-400">PostgreSQL 15+ / Cloud SQL Compatible</span>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300">1. Core Automated Cleanup Query (Requested Fix):</div>
            <pre className="text-xs font-mono text-emerald-400 bg-slate-950 p-4 rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed">
{`-- Archive or delete jobs older than 60 days that are no longer active
DELETE FROM jobs WHERE is_active = FALSE AND updated_at < NOW() - INTERVAL '60 days';`}
            </pre>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300">2. High-Throughput Table Range Partitioning Strategy:</div>
            <pre className="text-xs font-mono text-cyan-300 bg-slate-950 p-4 rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed">
{sqlQueries?.partitioningDdl || cleanupEngine.getPartitioningDdl()}
            </pre>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300">3. Scheduled Automated Purge (pg_cron Extension):</div>
            <pre className="text-xs font-mono text-amber-300 bg-slate-950 p-4 rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed">
{`-- Schedule daily execution at 03:00 UTC
SELECT cron.schedule('stale_jobs_daily_cleanup', '0 3 * * *', $$
  DELETE FROM jobs WHERE is_active = FALSE AND updated_at < NOW() - INTERVAL '60 days';
$$);`}
            </pre>
          </div>
        </div>
      )}

      {/* View 3: Retention Test Suite */}
      {activeSubTab === 'tests' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Retention & Partition Unit Test Suite
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifies exact 60-day SQL rule execution, active job preservation, and grace period protections.
              </p>
            </div>

            <button
              onClick={handleRunTests}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rerun Suite</span>
            </button>
          </div>

          {testReport && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center gap-4 text-xs text-slate-300 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-emerald-400 font-bold">Passed: {testReport.passedCount}/{testReport.totalTests}</span>
                <span>Duration: {testReport.totalDurationMs}ms</span>
                <span className="text-slate-500">Timestamp: {new Date(testReport.timestamp).toLocaleTimeString()}</span>
              </div>

              <div className="space-y-2">
                {testReport.results.map((test) => (
                  <div
                    key={test.id}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          test.passed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
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
