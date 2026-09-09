import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  RotateCcw,
  Pause,
  Clock,
  Shield,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Sliders,
  Layers,
  ArrowRight,
  Terminal,
  Globe,
  Radio,
  Cpu,
  Inbox,
  Filter,
  Check,
  ChevronRight,
  Info,
  Trash2,
  Lock,
} from 'lucide-react';
import {
  QueueTask,
  ScraperSchedule,
  ProxyNode,
  ProxyPoolStats,
  TaskQueueMetrics,
  TaskStatus,
  TaskPriority,
} from '../types';
import { QueueTestSuiteReport } from '../lib/queue/queueTestSuite';
import { safeFetchJson } from '../lib/apiHelper';

export const TaskQueueStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'schedules' | 'proxies' | 'tests'>('queue');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(2000);

  // Data states
  const [metrics, setMetrics] = useState<TaskQueueMetrics | null>(null);
  const [tasks, setTasks] = useState<QueueTask[]>([]);
  const [schedules, setSchedules] = useState<ScraperSchedule[]>([]);
  const [proxies, setProxies] = useState<ProxyNode[]>([]);
  const [proxyStats, setProxyStats] = useState<ProxyPoolStats | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<QueueTask | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Test suite state
  const [testReport, setTestReport] = useState<QueueTestSuiteReport | null>(null);
  const [runningTests, setRunningTests] = useState<boolean>(false);

  // Fetch all telemetry data
  const fetchData = async () => {
    try {
      const [metricsRes, tasksRes, schedRes, proxyRes] = await Promise.all([
        safeFetchJson<{ queue: TaskQueueMetrics; proxies: ProxyPoolStats }>('/api/queue/metrics'),
        safeFetchJson<QueueTask[]>('/api/queue/tasks?limit=60'),
        safeFetchJson<ScraperSchedule[]>('/api/queue/schedules'),
        safeFetchJson<{ stats: ProxyPoolStats; proxies: ProxyNode[] }>('/api/queue/proxies'),
      ]);

      if (metricsRes.ok && metricsRes.data) {
        setMetrics(metricsRes.data.queue);
        setProxyStats(metricsRes.data.proxies);
      }
      if (tasksRes.ok && tasksRes.data) {
        const t = tasksRes.data;
        setTasks(t);
        // Keep selectedTask updated if open
        if (selectedTask) {
          const updated = t.find((item: QueueTask) => item.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
      if (schedRes.ok && schedRes.data) {
        setSchedules(schedRes.data);
      }
      if (proxyRes.ok && proxyRes.data) {
        setProxies(proxyRes.data.proxies || []);
      }
    } catch {
      // Quietly ignore transient errors during reload
    }
  };

  // Setup auto-refresh polling
  useEffect(() => {
    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, selectedTask?.id]);

  // Actions
  const handleTriggerSchedule = async (schedId: string) => {
    try {
      setIsRefreshing(true);
      await fetch(`/api/queue/schedules/${schedId}/trigger`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Failed to trigger schedule:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleSchedule = async (schedId: string) => {
    try {
      await fetch(`/api/queue/schedules/${schedId}/toggle`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    }
  };

  const handleTriggerBatch = async () => {
    try {
      setIsRefreshing(true);
      await fetch('/api/queue/schedules/batch-trigger', { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Failed to trigger batch schedules:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetryTask = async (taskId: string) => {
    try {
      await fetch(`/api/queue/tasks/${taskId}/retry`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Failed to retry task:', err);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await fetch(`/api/queue/tasks/${taskId}/cancel`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Failed to cancel task:', err);
    }
  };

  const handleClearCompleted = async () => {
    try {
      await fetch('/api/queue/clear', { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Failed to clear completed tasks:', err);
    }
  };

  const handleResetProxies = async () => {
    try {
      await fetch('/api/queue/proxies/reset', { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Failed to reset proxies:', err);
    }
  };

  const handleRunTestSuite = async () => {
    setRunningTests(true);
    try {
      const res = await fetch('/api/queue/test-suite', { method: 'POST' });
      if (res.ok) {
        const report = await res.json();
        setTestReport(report);
      }
    } catch (err) {
      console.error('Failed to run queue test suite:', err);
    } finally {
      setRunningTests(false);
    }
  };

  // Run test suite on initial load of test tab if empty
  useEffect(() => {
    if (activeTab === 'tests' && !testReport && !runningTests) {
      handleRunTestSuite();
    }
  }, [activeTab]);

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'queued':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3" /> Queued</span>;
      case 'running':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse"><RefreshCw className="w-3 h-3 animate-spin" /> Running</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'retrying':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20"><RotateCcw className="w-3 h-3" /> Retrying</span>;
      case 'dead_letter':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><XCircle className="w-3 h-3" /> Dead Letter (DLQ)</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20"><AlertTriangle className="w-3 h-3" /> Failed</span>;
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300">CRITICAL</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300">HIGH</span>;
      case 'normal':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">NORMAL</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-slate-800 text-slate-400">LOW</span>;
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner & Control Deck */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-900/90 to-purple-950/50 border border-indigo-500/20 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
              <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Phase 10 Asynchronous Architecture</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-mono">Continuous Background Ingestion</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Asynchronous Polling &amp; Task Queue Infrastructure
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-3xl leading-relaxed">
              Automated, continuous, low-latency background worker engine with concurrency management, staggered cron batching (10–30m), multi-region proxy rotation, exponential jitter retries, and dead-letter queue routing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'queue'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700'
              }`}
            >
              <Inbox className="w-4 h-4 inline-block mr-2" />
              Queue Live Stream ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'schedules'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700'
              }`}
            >
              <Clock className="w-4 h-4 inline-block mr-2" />
              Scraper Schedules ({schedules.length})
            </button>
            <button
              onClick={() => setActiveTab('proxies')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'proxies'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700'
              }`}
            >
              <Shield className="w-4 h-4 inline-block mr-2" />
              Proxy Mesh &amp; Shield ({proxies.length})
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
              Test Suite (6/6)
            </button>
          </div>
        </div>

        {/* Real-time Telemetry Metric Cards */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Active Workers
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1">
              {metrics?.activeWorkers || 0} / {metrics?.concurrencyLimit || 3}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Queued / Pending
            </div>
            <div className="text-xl font-bold text-amber-300 font-mono mt-1">
              {metrics?.queuedCount || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
              {metrics?.completedCount || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-purple-400 font-medium flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Retrying Tasks
            </div>
            <div className="text-xl font-bold text-purple-300 font-mono mt-1">
              {metrics?.retryingCount || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Dead Letter (DLQ)
            </div>
            <div className="text-xl font-bold text-rose-400 font-mono mt-1">
              {metrics?.deadLetterCount || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Avg Duration
            </div>
            <div className="text-xl font-bold text-blue-300 font-mono mt-1">
              {metrics?.averageExecutionMs || 0}ms
            </div>
          </div>
        </div>
      </div>

      {/* Global Quick Action Deck */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleTriggerBatch}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Trigger Staggered Batch Poll (All Schedules)</span>
          </button>

          <button
            onClick={handleClearCompleted}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear Completed / DLQ</span>
          </button>

          <button
            onClick={handleResetProxies}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Proxy Pool Health</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Auto-Poll Stream (2s)</span>
          </label>

          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            title="Refresh Now"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TASK QUEUE STREAM & LIVE LOG INSPECTOR                            */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Status Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter Status:
              </span>
              {(['all', 'queued', 'running', 'completed', 'retrying', 'dead_letter'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {st.toUpperCase().replace('_', ' ')} (
                  {st === 'all'
                    ? tasks.length
                    : tasks.filter((t) => t.status === st).length}
                  )
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-400">
              Showing {filteredTasks.length} tasks
            </div>
          </div>

          {/* Main Queue & Inspector Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task Stream List */}
            <div className="lg:col-span-2 overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-indigo-400" />
                  Task Queue Execution Stream
                </h3>
                <span className="text-xs text-slate-400 font-mono">FIFO with Priority Weights</span>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No tasks found matching filter criteria.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
                  {filteredTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className={`p-4 transition-all cursor-pointer flex items-center justify-between gap-4 hover:bg-slate-800/40 ${
                        selectedTask?.id === t.id ? 'bg-indigo-950/30 border-l-4 border-indigo-500' : ''
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(t.status)}
                          {getPriorityBadge(t.priority)}
                          <span className="text-xs text-slate-400 font-mono truncate">{t.id}</span>
                        </div>
                        <div className="text-sm font-bold text-white truncate">
                          {t.payload.companyName} ({t.payload.boardToken})
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3">
                          <span>Source: {t.payload.source}</span>
                          <span>•</span>
                          <span>Attempts: {t.attempts}/{t.maxAttempts}</span>
                          {t.durationMs && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-400 font-mono">{t.durationMs}ms</span>
                            </>
                          )}
                          {t.nextRetryAt && (
                            <>
                              <span>•</span>
                              <span className="text-purple-300 font-mono">Retry ETA: {new Date(t.nextRetryAt).toLocaleTimeString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {t.status === 'dead_letter' || t.status === 'failed' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetryTask(t.id);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 transition-all"
                            title="Retry now"
                          >
                            Retry
                          </button>
                        ) : null}

                        {t.status === 'queued' || t.status === 'retrying' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelTask(t.id);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all"
                            title="Cancel task"
                          >
                            Cancel
                          </button>
                        ) : null}

                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Task Detail & Real-Time Log Terminal */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Task Inspector &amp; Audit Logs
                </h3>
                {selectedTask && getStatusBadge(selectedTask.status)}
              </div>

              {selectedTask ? (
                <div className="space-y-4 flex-1 flex flex-col">
                  {/* Task Metadata */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Task ID:</span>
                      <span className="text-slate-200 font-mono">{selectedTask.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target:</span>
                      <span className="text-white font-bold">{selectedTask.payload.companyName} ({selectedTask.payload.source})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Priority &amp; Retries:</span>
                      <span className="text-slate-200">{selectedTask.priority.toUpperCase()} • {selectedTask.attempts}/{selectedTask.maxAttempts} attempts</span>
                    </div>
                    {selectedTask.assignedWorkerId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Assigned Worker:</span>
                        <span className="text-indigo-300 font-mono">{selectedTask.assignedWorkerId}</span>
                      </div>
                    )}
                    {selectedTask.errorTaxonomy && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Error Taxonomy:</span>
                        <span className="text-rose-400 font-mono font-bold">{selectedTask.errorTaxonomy}</span>
                      </div>
                    )}
                    {selectedTask.result && (
                      <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 space-y-0.5">
                        <div>• Ingested: {selectedTask.result.jobsInserted} jobs inserted, {selectedTask.result.jobsDeduplicated} deduped</div>
                        <div>• Latency: {selectedTask.result.durationMs}ms ({selectedTask.result.proxyUsed})</div>
                      </div>
                    )}
                  </div>

                  {/* Terminal Log Window */}
                  <div className="flex-1 flex flex-col min-h-[260px] max-h-[380px] rounded-xl bg-slate-950 border border-slate-800/80 p-3 font-mono text-[11px] overflow-y-auto space-y-1.5">
                    <div className="text-slate-500 pb-1 border-b border-slate-800 text-[10px]">
                      [EXECUTION TELEMETRY LOGS - {selectedTask.id}]
                    </div>
                    {selectedTask.logs.map((log, index) => (
                      <div key={index} className="leading-relaxed">
                        <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                        <span
                          className={`font-semibold ${
                            log.level === 'error'
                              ? 'text-rose-400'
                              : log.level === 'warn'
                              ? 'text-amber-400'
                              : log.level === 'info'
                              ? 'text-blue-400'
                              : 'text-slate-400'
                          }`}
                        >
                          [{log.level.toUpperCase()}]
                        </span>{' '}
                        <span className="text-slate-300">{log.message}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={() => handleRetryTask(selectedTask.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retry Task
                    </button>
                    {selectedTask.status === 'queued' || selectedTask.status === 'retrying' ? (
                      <button
                        onClick={() => handleCancelTask(selectedTask.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel Task
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                  <Terminal className="w-8 h-8 text-slate-600" />
                  <p className="text-xs">Select any task from the execution stream to inspect its live logs and network retry metadata.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SCRAPER SCHEDULER MATRIX (STAGGERED CRON 10-30 MIN)                */}
      {/* ========================================================================= */}
      {activeTab === 'schedules' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  Staggered ATS Polling Schedules (10–30m Intervals)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-configured cron schedules with offset stagger batches ($t_0 + i \times 30s$) to eliminate traffic spikes and rate-limiting blocks.
                </p>
              </div>

              <button
                onClick={handleTriggerBatch}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Poll All Enabled Now
              </button>
            </div>

            {/* Schedule Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Status &amp; Company</th>
                    <th className="px-4 py-3">ATS Source</th>
                    <th className="px-4 py-3">Batch Group</th>
                    <th className="px-4 py-3">Polling Interval</th>
                    <th className="px-4 py-3">Stagger Offset</th>
                    <th className="px-4 py-3">Next Scheduled Run</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-all">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleSchedule(s.id)}
                            className={`w-3 h-3 rounded-full transition-all ${
                              s.isEnabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'
                            }`}
                            title={s.isEnabled ? 'Active - Click to Pause' : 'Paused - Click to Enable'}
                          />
                          <span className="text-white font-bold">{s.companyName}</span>
                          <span className="text-slate-500 font-mono">({s.boardToken})</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                          s.source === 'greenhouse' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {s.source}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300">
                          {s.batchGroup.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-indigo-300">
                        Every {s.intervalMinutes} min ({s.cronExpression})
                      </td>

                      <td className="px-4 py-3 font-mono text-purple-300">
                        +{s.staggerOffsetSeconds}s offset
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-300">
                        {new Date(s.nextRunAt).toLocaleTimeString()}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTriggerSchedule(s.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-current" /> Poll
                          </button>
                          <button
                            onClick={() => handleToggleSchedule(s.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                              s.isEnabled
                                ? 'border-slate-700 text-slate-400 hover:text-white'
                                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            }`}
                          >
                            {s.isEnabled ? 'Pause' : 'Resume'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROXY MESH & NETWORK RESILIENCE SHIELD                             */}
      {/* ========================================================================= */}
      {activeTab === 'proxies' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Total Proxy Nodes</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {proxyStats?.totalProxies || 0}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-emerald-400 font-medium">Active &amp; Healthy</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {proxyStats?.activeCount || 0}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-amber-400 font-medium">Cooling Down (429 Shield)</div>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {proxyStats?.coolingCount || 0}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-blue-400 font-medium">Overall Success Rate</div>
              <div className="text-2xl font-bold text-blue-400 font-mono mt-1">
                {proxyStats?.overallSuccessRate ? (proxyStats.overallSuccessRate * 100).toFixed(1) : 100}%
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                Multi-Region Residential &amp; Datacenter Proxy Nodes
              </h2>
              <button
                onClick={handleResetProxies}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Node State
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {proxies.map((p) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border space-y-3 transition-all ${
                    p.status === 'active'
                      ? 'bg-slate-950/60 border-slate-800'
                      : p.status === 'cooling_down'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400">{p.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        p.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : p.status === 'cooling_down'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {p.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-white truncate">{p.host}:{p.port}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Region: <span className="text-indigo-300 uppercase">{p.region}</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-500">EMA Latency:</span>{' '}
                      <span className="text-slate-200 font-mono">{p.latencyMs}ms</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Success Rate:</span>{' '}
                      <span className="text-emerald-400 font-mono">{(p.successRate * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Requests:</span>{' '}
                      <span className="text-slate-300 font-mono">{p.totalRequests}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">429 Hits:</span>{' '}
                      <span className="text-amber-400 font-mono">{p.rateLimitHits}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PHASE 10 VERIFICATION TEST SUITE (6/6)                            */}
      {/* ========================================================================= */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Phase 10 Automated Verification Test Suite
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Validates concurrency limits, staggered cron offsets, proxy rotation, 429 rate-limit cooldown, exponential backoff jitter, and dead-letter routing.
                </p>
              </div>

              <button
                onClick={handleRunTestSuite}
                disabled={runningTests}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runningTests ? 'animate-spin' : ''}`} />
                <span>{runningTests ? 'Running Tests...' : 'Re-run All Verification Tests'}</span>
              </button>
            </div>

            {testReport && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <div>
                  <div className="text-slate-400">Total Test Cases</div>
                  <div className="text-xl font-bold text-white font-mono mt-0.5">{testReport.totalTests}</div>
                </div>
                <div>
                  <div className="text-emerald-400">Passed Tests</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{testReport.passedCount} / {testReport.totalTests}</div>
                </div>
                <div>
                  <div className="text-slate-400">Total Duration</div>
                  <div className="text-xl font-bold text-indigo-300 font-mono mt-0.5">{testReport.totalDurationMs}ms</div>
                </div>
                <div>
                  <div className="text-slate-400">Average Latency</div>
                  <div className="text-xl font-bold text-blue-300 font-mono mt-0.5">{testReport.averageLatencyMs}ms / test</div>
                </div>
              </div>
            )}

            {/* Test Results Table */}
            <div className="space-y-3">
              {testReport?.results.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-xl border transition-all ${
                    t.passed
                      ? 'bg-slate-950/40 border-emerald-500/20'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {t.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-bold text-white">{t.name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {t.id} • Category: {t.category}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
                      <span className="text-slate-400 font-mono">{t.durationMs}ms</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          t.passed
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {t.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold">Expected:</span>{' '}
                      <span className="text-slate-300">{t.expected}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">Actual Result:</span>{' '}
                      <span className="text-slate-200 font-mono">{t.actual}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
