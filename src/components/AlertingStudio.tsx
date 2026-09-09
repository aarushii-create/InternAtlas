import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  Zap,
  Sliders,
  Settings,
  Shield,
  Layers,
  FileText,
  ExternalLink,
  History,
  Check,
  X,
  Clock,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Key,
  Database,
  ArrowRight,
  Flame,
  Filter,
} from 'lucide-react';
import {
  TelegramChannelConfig,
  EmailChannelConfig,
  AlertRuleConfig,
  AlertDispatchRecord,
  AlertingEngineStats,
  NotificationPayload,
  FormattedAlertMessage,
  UserPreferences,
} from '../types';
import { AlertTestSuiteReport } from '../lib/alerts/alertTestSuite';
import { safeFetchJson } from '../lib/apiHelper';

interface AlertingStudioProps {
  currentPreferences?: UserPreferences | null;
}

const PRESET_SAMPLE_JOBS: NotificationPayload[] = [
  {
    jobId: 'job-gh-openai-01',
    jobTitle: 'Research Engineer Intern - Pretraining & Reasoning',
    companyName: 'OpenAI',
    location: 'San Francisco, CA (In-person)',
    applyUrl: 'https://openai.com/careers/research-engineer-intern',
    matchScore: 0.94,
    matchPercentage: 94,
    verdict: 'STRONG_MATCH',
    matchedSkills: ['PyTorch', 'Distributed Training', 'CUDA', 'Transformer Architectures', 'LLM Alignment'],
    missingSkills: ['Triton', 'vLLM'],
    layer2Expectations: {
      oaDifficulty: 'Codeforces 1800+ / Hard DP & Graph Theory',
      unspokenCriteria: 'Strong preference for NeurIPS/ICLR/CVPR first-author papers or major open source contributions',
      gpaBar: '3.8+ GPA preferred',
      timeWindow: '48-hour OA Turnaround Window',
    },
    candidateName: 'Alex Rivera',
    candidateEmail: 'alex.rivera@stanford.edu',
    matchedAt: new Date().toISOString(),
    salarySnippet: '$85 - $95 / hr + Housing',
    sourceAts: 'greenhouse',
  },
  {
    jobId: 'job-gh-stripe-02',
    jobTitle: 'Software Engineering Intern - Infrastructure & Core APIs',
    companyName: 'Stripe',
    location: 'San Francisco, CA / Seattle, WA',
    applyUrl: 'https://stripe.com/jobs/swe-intern',
    matchScore: 0.88,
    matchPercentage: 88,
    verdict: 'STRONG_MATCH',
    matchedSkills: ['Distributed Systems', 'Go', 'Ruby', 'gRPC', 'Database Indexing', 'Kafka'],
    missingSkills: ['Sorbet Typechecker', 'Bento'],
    layer2Expectations: {
      oaDifficulty: 'Custom Practical Coding Challenge (API building + Unit testing)',
      unspokenCriteria: 'Emphasis on clean code, edge-case coverage, and clear variable naming over raw algorithmic speed',
      gpaBar: 'No strict GPA cutoff',
      timeWindow: '7-day submission window',
    },
    candidateName: 'Alex Rivera',
    candidateEmail: 'alex.rivera@stanford.edu',
    matchedAt: new Date().toISOString(),
    salarySnippet: '$68 / hr + Relocation Bonus',
    sourceAts: 'greenhouse',
  },
  {
    jobId: 'job-gh-citadel-03',
    jobTitle: 'Quantitative Research Intern (Machine Learning)',
    companyName: 'Citadel Securities',
    location: 'New York, NY / Miami, FL',
    applyUrl: 'https://citadelsecurities.com/careers/quant-ml-intern',
    matchScore: 0.96,
    matchPercentage: 96,
    verdict: 'STRONG_MATCH',
    matchedSkills: ['C++', 'Stochastic Calculus', 'Python', 'PyTorch', 'Distributed Systems', 'Low-Latency Optimizations'],
    missingSkills: ['FPGA Programming', 'Verilog'],
    layer2Expectations: {
      oaDifficulty: 'Extreme (Math Olympiad / Putnam level probability + LeetCode Hard C++)',
      unspokenCriteria: 'Top 1% STEM GPA, Putnam Honorable Mention or ICPC World Finals strongly preferred',
      gpaBar: '3.9+ GPA strict screen',
      timeWindow: '24-hour OA completion limit from invite',
    },
    candidateName: 'Alex Rivera',
    candidateEmail: 'alex.rivera@stanford.edu',
    matchedAt: new Date().toISOString(),
    salarySnippet: '$125 / hr + Relocation + Sign-on',
    sourceAts: 'greenhouse',
  },
  {
    jobId: 'job-gh-figma-04',
    jobTitle: 'Frontend Systems Intern (WebAssembly & Rendering)',
    companyName: 'Figma',
    location: 'San Francisco, CA (Hybrid)',
    applyUrl: 'https://figma.com/careers/internships',
    matchScore: 0.82,
    matchPercentage: 82,
    verdict: 'GOOD_MATCH',
    matchedSkills: ['TypeScript', 'WebGL', 'WebAssembly', 'React', 'Canvas Rendering', 'Performance Profiling'],
    missingSkills: ['Rust to Wasm Tooling', 'Skia'],
    layer2Expectations: {
      oaDifficulty: 'Take-home Canvas / Geometry manipulation exercise',
      unspokenCriteria: 'Deep portfolio review of graphics, UI architecture, and interactive web experiments',
      gpaBar: 'Holistic review',
      timeWindow: '5-day take-home turnaround',
    },
    candidateName: 'Alex Rivera',
    candidateEmail: 'alex.rivera@stanford.edu',
    matchedAt: new Date().toISOString(),
    salarySnippet: '$62 / hr + Housing',
    sourceAts: 'greenhouse',
  },
];

export const AlertingStudio: React.FC<AlertingStudioProps> = () => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'config' | 'history' | 'tests'>('simulator');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Configurations & Stats State
  const [telegramConfig, setTelegramConfig] = useState<TelegramChannelConfig>({
    enabled: true,
    botToken: 'demo_scout_bot_token_sandbox',
    chatId: '@ai_internship_scout_alerts',
    parseMode: 'HTML',
    sendSilently: false,
    includeInlineApplyButton: true,
  });

  const [emailConfig, setEmailConfig] = useState<EmailChannelConfig>({
    enabled: true,
    provider: 'resend',
    apiKey: 're_sandbox_scout_alert_key',
    fromEmail: 'alerts@internship-scout.ai',
    fromName: 'AI Internship Scout',
    toEmail: 'alex.rivera@stanford.edu',
    replyTo: 'support@internship-scout.ai',
    subjectTemplate: '[{{match_score}}% Match] {{company}} is hiring: {{role}}',
  });

  const [alertRules, setAlertRules] = useState<AlertRuleConfig>({
    minScoreThreshold: 0.75,
    requireLayer2Match: false,
    allowDisqualified: false,
    dedupWindowHours: 48,
    maxAlertsPerDay: 50,
    quietHoursEnabled: false,
    quietHoursStartUtc: 2,
    quietHoursEndUtc: 6,
  });

  const [stats, setStats] = useState<AlertingEngineStats | null>(null);
  const [history, setHistory] = useState<AlertDispatchRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AlertDispatchRecord | null>(null);

  // Simulator State
  const [selectedJobIndex, setSelectedJobIndex] = useState<number>(0);
  const [activePayload, setActivePayload] = useState<NotificationPayload>(PRESET_SAMPLE_JOBS[0]);
  const [previewFormat, setPreviewFormat] = useState<FormattedAlertMessage | null>(null);
  const [devicePreviewMode, setDevicePreviewMode] = useState<'telegram' | 'email'>('telegram');
  const [isDispatching, setIsDispatching] = useState(false);
  const [lastDispatchedRecord, setLastDispatchedRecord] = useState<AlertDispatchRecord | null>(null);

  // Test Suite State
  const [testReport, setTestReport] = useState<AlertTestSuiteReport | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Initial Data Load
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Update preview when active payload changes
  useEffect(() => {
    generatePreview(activePayload);
  }, [activePayload, telegramConfig, emailConfig]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [configRes, statsRes, historyRes] = await Promise.all([
        safeFetchJson<{ telegram: TelegramChannelConfig; email: EmailChannelConfig; rules: AlertRuleConfig }>('/api/alerts/config'),
        safeFetchJson<AlertingEngineStats>('/api/alerts/stats'),
        safeFetchJson<AlertDispatchRecord[]>('/api/alerts/history?limit=30'),
      ]);

      if (configRes.ok && configRes.data) {
        setTelegramConfig(configRes.data.telegram);
        setEmailConfig(configRes.data.email);
        setAlertRules(configRes.data.rules);
      }
      if (statsRes.ok && statsRes.data) {
        setStats(statsRes.data);
      }
      if (historyRes.ok && historyRes.data) {
        setHistory(historyRes.data);
        if (historyRes.data.length > 0) {
          setSelectedRecord(historyRes.data[0]);
        }
      }
    } catch {
      // Quietly ignore transient errors
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async (payload: NotificationPayload) => {
    try {
      const res = await safeFetchJson<FormattedAlertMessage>('/api/alerts/format-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok && res.data) {
        setPreviewFormat(res.data);
      }
    } catch {
      // Fallback
    }
  };

  const handleSelectPresetJob = (index: number) => {
    setSelectedJobIndex(index);
    setActivePayload({ ...PRESET_SAMPLE_JOBS[index] });
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      const res = await safeFetchJson('/api/alerts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram: telegramConfig,
          email: emailConfig,
          rules: alertRules,
        }),
      });

      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Alert configuration saved and applied!' });
        setTimeout(() => setActionMessage(null), 4000);
        fetchInitialData();
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to save configuration' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Save error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchTestAlert = async (bypassThreshold = false) => {
    try {
      setIsDispatching(true);
      const res = await safeFetchJson<AlertDispatchRecord>('/api/alerts/dispatch-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: activePayload,
          candidateId: 'alex-rivera-stanford',
          forceSimulated: true,
          bypassThreshold,
        }),
      });

      if (res.ok && res.data) {
        setLastDispatchedRecord(res.data);
        setActionMessage({
          type: 'success',
          text: `Alert dispatched successfully! Telegram ID: ${res.data.channels.telegram?.messageId || 'N/A'}, Email ID: ${res.data.channels.email?.messageId || 'N/A'}`,
        });
        setTimeout(() => setActionMessage(null), 5000);
        fetchInitialData();
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Dispatch failed' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Dispatch error' });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleRetryRecord = async (recordId: string) => {
    try {
      const res = await safeFetchJson<AlertDispatchRecord>(`/api/alerts/retry/${recordId}`, {
        method: 'POST',
      });
      if (res.ok && res.data) {
        setActionMessage({ type: 'success', text: `Retried alert ${recordId} successfully!` });
        fetchInitialData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Retry failed' });
    }
  };

  const handleTestConnection = async (channel: 'telegram' | 'email') => {
    try {
      const res = await safeFetchJson<{ ok: boolean; botName?: string; error?: string; provider?: string }>('/api/alerts/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });

      if (res.ok && res.data?.ok) {
        setActionMessage({
          type: 'success',
          text: channel === 'telegram'
            ? `Telegram Connected: ${res.data.botName || 'Bot Valid'}`
            : `Email Provider (${res.data.provider || 'Resend'}) Verified!`,
        });
      } else {
        setActionMessage({
          type: 'error',
          text: res.data?.error || `Failed to verify ${channel} credentials`,
        });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Connection test failed' });
    }
  };

  const handleRunTestSuite = async () => {
    try {
      setIsRunningTests(true);
      const res = await safeFetchJson<AlertTestSuiteReport>('/api/alerts/test-suite', {
        method: 'POST',
      });
      if (res.ok && res.data) {
        setTestReport(res.data);
        setActiveTab('tests');
      }
    } catch {
      // Ignore
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-white shadow-lg shadow-indigo-500/20">
                <Bell className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    Phase 11: Real-Time Alerting Engine
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active & Multi-Channel
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Instant, mobile-optimized job dispatch via Telegram Bot API & Resend/SendGrid Email with Layer 2 Real Expectation insights.
                </p>
              </div>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleRunTestSuite()}
              disabled={isRunningTests}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Play className={`w-3.5 h-3.5 text-indigo-400 ${isRunningTests ? 'animate-spin' : ''}`} />
              <span>{isRunningTests ? 'Running Tests...' : 'Run Test Suite (6/6)'}</span>
            </button>

            <button
              onClick={() => handleDispatchTestAlert(true)}
              disabled={isDispatching}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Send className={`w-3.5 h-3.5 ${isDispatching ? 'animate-spin' : ''}`} />
              <span>{isDispatching ? 'Dispatching...' : 'Trigger Real Alert'}</span>
            </button>
          </div>
        </div>

        {/* Global Telemetry Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Min Score Threshold</span>
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {Math.round(alertRules.minScoreThreshold * 100)}%
            </div>
            <div className="text-[10px] text-emerald-400">Trigger standard</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Total Dispatched</span>
              <Send className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {stats?.totalAlertsDispatched ?? 2}
            </div>
            <div className="text-[10px] text-slate-400">Across all channels</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Telegram Delivered</span>
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-bold text-cyan-300 mt-1">
              {stats?.telegramDeliveredCount ?? 2}
            </div>
            <div className="text-[10px] text-slate-400">Bot Markdown/HTML</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Email Delivered</span>
              <Mail className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-lg font-bold text-purple-300 mt-1">
              {stats?.emailDeliveredCount ?? 2}
            </div>
            <div className="text-[10px] text-slate-400">HTML Rich Layout</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Avg Dispatch Latency</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-amber-300 mt-1">
              {stats?.averageDispatchLatencyMs ?? 51} ms
            </div>
            <div className="text-[10px] text-emerald-400">Sub-100ms pipeline</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Dedup Window</span>
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-lg font-bold text-indigo-300 mt-1">
              {alertRules.dedupWindowHours}h
            </div>
            <div className="text-[10px] text-slate-400">Anti-spam guard</div>
          </div>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : actionMessage.type === 'error'
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              : 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>1. Live Dispatch Simulator & Previews</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>2. Channel Credentials & Threshold Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>3. Dispatch Audit Log ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'tests'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>4. Verification Test Suite</span>
          </button>
        </div>

        <button
          onClick={fetchInitialData}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Refresh Alert Telemetry"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE DISPATCH SIMULATOR & MOBILE PREVIEWER */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Sample Job Selector & Simulation Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Select Target Job Posting
                </h2>
                <span className="text-[10px] text-slate-500">4 ATS Benchmarks</span>
              </div>

              {/* Job Preset Cards */}
              <div className="space-y-2">
                {PRESET_SAMPLE_JOBS.map((job, idx) => (
                  <div
                    key={job.jobId}
                    onClick={() => handleSelectPresetJob(idx)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedJobIndex === idx
                        ? 'bg-indigo-950/40 border-indigo-500/70 shadow-md shadow-indigo-950/30'
                        : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{job.companyName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          job.matchPercentage >= 90
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {job.matchPercentage}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{job.jobTitle}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                      <span>📍 {job.location}</span>
                      <span>•</span>
                      <span>💰 {job.salarySnippet}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Match Score Gauge / Slider */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Test Match Score:</span>
                  <span className="font-bold text-white bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700">
                    {activePayload.matchPercentage}% ({activePayload.verdict})
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={activePayload.matchPercentage}
                  onChange={(e) => {
                    const pct = parseInt(e.target.value, 10);
                    const score = pct / 100;
                    const verdict =
                      pct >= 85 ? 'STRONG_MATCH' : pct >= 75 ? 'GOOD_MATCH' : pct >= 60 ? 'BORDERLINE' : 'WEAK_MATCH';
                    setActivePayload({
                      ...activePayload,
                      matchPercentage: pct,
                      matchScore: score,
                      verdict,
                    });
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>40% (Weak)</span>
                  <span className="text-indigo-400 font-semibold">
                    Threshold: {Math.round(alertRules.minScoreThreshold * 100)}%
                  </span>
                  <span>100% (Perfect)</span>
                </div>
              </div>

              {/* Trigger Instant Dispatch Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => handleDispatchTestAlert(false)}
                  disabled={isDispatching}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:opacity-90 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  <Send className={`w-3.5 h-3.5 ${isDispatching ? 'animate-spin' : ''}`} />
                  <span>
                    {isDispatching ? 'Dispatching Alert...' : 'Dispatch Live Alert (Trigger Check)'}
                  </span>
                </button>

                <button
                  onClick={() => handleDispatchTestAlert(true)}
                  disabled={isDispatching}
                  className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Force Dispatch (Bypass Min Threshold)</span>
                </button>
              </div>
            </div>

            {/* Layer 2 Reality Expectation Inspector Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Layer 2 Reality Expectation Note
              </h2>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">OA Difficulty Standard</span>
                  <span className="text-slate-200 font-medium">{activePayload.layer2Expectations.oaDifficulty}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Unspoken Screening Criteria</span>
                  <span className="text-slate-200 font-medium">{activePayload.layer2Expectations.unspokenCriteria}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">GPA Cutoff Bar</span>
                    <span className="text-slate-200 font-medium">{activePayload.layer2Expectations.gpaBar || 'Holistic'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Turnaround Window</span>
                    <span className="text-slate-200 font-medium">{activePayload.layer2Expectations.timeWindow || '48 Hours'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Mobile / Device Previews (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Device Switcher Header */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Live Client Preview:</span>
                <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setDevicePreviewMode('telegram')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      devicePreviewMode === 'telegram'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Telegram Bot UI</span>
                  </button>

                  <button
                    onClick={() => setDevicePreviewMode('email')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      devicePreviewMode === 'email'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Responsive Email HTML</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Pixel-Perfect Real-Time Render</span>
              </div>
            </div>

            {/* TELEGRAM MOBILE CLIENT PREVIEW */}
            {devicePreviewMode === 'telegram' && (
              <div className="rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col items-center">
                {/* Mobile Device Frame */}
                <div className="w-full max-w-md rounded-3xl bg-[#0e1621] border-4 border-slate-800 p-4 shadow-2xl relative overflow-hidden">
                  {/* Top Mobile Status Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#17212b] mb-3 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                        ⚡
                      </div>
                      <div>
                        <div className="font-bold text-white">AI Internship Scout Bot</div>
                        <div className="text-[10px] text-cyan-400">bot • active alert dispatcher</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">12:30 PM</span>
                  </div>

                  {/* Telegram Message Bubble */}
                  <div className="rounded-2xl rounded-tl-sm bg-[#182533] border border-[#2b3a4a] p-4 text-xs text-slate-200 space-y-3 shadow-md">
                    {/* Header line with match badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span>🎯</span>
                        <span>HIGH MATCH SCOUT ALERT:</span>
                        <span className="text-emerald-400">{activePayload.matchPercentage}%</span>
                        <span>🌟</span>
                      </div>
                    </div>

                    <div className="border-l-2 border-indigo-400 pl-2 space-y-0.5">
                      <div className="font-bold text-white text-sm">{activePayload.companyName}</div>
                      <div className="text-slate-300 italic text-[11px]">{activePayload.jobTitle}</div>
                      <div className="text-[10px] text-slate-400">📍 {activePayload.location}</div>
                    </div>

                    <div className="text-[11px] text-slate-300 bg-[#0e1621] p-2 rounded-lg border border-[#233140]">
                      <span className="text-slate-400 font-semibold">Match Verdict: </span>
                      <span className="font-bold text-cyan-300">{activePayload.verdict.replace(/_/g, ' ')}</span>
                      {activePayload.salarySnippet && (
                        <span className="text-slate-400 ml-2">| 💰 {activePayload.salarySnippet}</span>
                      )}
                    </div>

                    {/* Matched Skills */}
                    <div className="space-y-1">
                      <div className="font-semibold text-emerald-400 flex items-center gap-1 text-[11px]">
                        <span>✅</span>
                        <span>Matched Skills:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {activePayload.matchedSkills.map((s) => (
                          <span
                            key={s}
                            className="bg-[#0f3427] text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-[#1a5b44]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    {activePayload.missingSkills && activePayload.missingSkills.length > 0 && (
                      <div className="space-y-1">
                        <div className="font-semibold text-amber-400 flex items-center gap-1 text-[11px]">
                          <span>⚠️</span>
                          <span>Gap Areas to Prepare:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {activePayload.missingSkills.map((s) => (
                            <span
                              key={s}
                              className="bg-[#3e2410] text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded border border-[#6b3e1b]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Layer 2 Reality Check Box */}
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-700/60 space-y-1.5">
                      <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-[11px]">
                        <span>🧠</span>
                        <span>Layer 2 Reality Check (Crucial Insights):</span>
                      </div>
                      <div className="text-[10px] space-y-1 text-slate-300">
                        <div>• <b>OA Standard:</b> {activePayload.layer2Expectations.oaDifficulty}</div>
                        <div>• <b>Hidden Criteria:</b> {activePayload.layer2Expectations.unspokenCriteria}</div>
                        {activePayload.layer2Expectations.gpaBar && (
                          <div>• <b>Academic Filter:</b> {activePayload.layer2Expectations.gpaBar}</div>
                        )}
                        {activePayload.layer2Expectations.timeWindow && (
                          <div>• <b>Speed Window:</b> {activePayload.layer2Expectations.timeWindow}</div>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 italic">
                      ⚡ Action: High match threshold met for <b>{activePayload.candidateName}</b>. Apply immediately!
                    </div>

                    <div className="text-[10px] text-right text-slate-500">12:30 PM ✓✓</div>
                  </div>

                  {/* Telegram Inline Keyboard Button */}
                  <div className="mt-2 space-y-1.5">
                    <a
                      href={activePayload.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-[#2b5278] hover:bg-[#346290] text-white text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow"
                    >
                      <span>🚀 Apply to {activePayload.companyName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* RESPONSIVE EMAIL CLIENT PREVIEW */}
            {devicePreviewMode === 'email' && (
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 shadow-2xl">
                {/* Email Client Header Bar */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 mb-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Subject:</span>
                    <span className="text-emerald-400 font-bold">
                      [{activePayload.matchPercentage}% Match] {activePayload.companyName} is hiring: {activePayload.jobTitle} 🌟
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>From: AI Internship Scout &lt;alerts@internship-scout.ai&gt;</span>
                    <span>To: {activePayload.candidateEmail}</span>
                  </div>
                </div>

                {/* Rendered HTML Email Body */}
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0b0f19]">
                  {/* Banner */}
                  <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-5 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                        AI Internship Scout • Instant Match Alert
                      </div>
                      <div className="text-lg font-extrabold text-white mt-1">{activePayload.companyName}</div>
                      <div className="text-xs text-slate-300 font-medium">{activePayload.jobTitle}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-500 text-center">
                      <div className="text-xl font-black text-emerald-400 leading-none">{activePayload.matchPercentage}%</div>
                      <div className="text-[9px] uppercase font-bold text-emerald-300 mt-1">Match Score</div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4 text-xs">
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pb-3 border-b border-slate-800">
                      <span>📍 <b>Location:</b> {activePayload.location}</span>
                      {activePayload.salarySnippet && <span>💰 <b>Comp:</b> {activePayload.salarySnippet}</span>}
                    </div>

                    {/* Matched Skills */}
                    <div>
                      <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                        ✓ High-Value Matched Skills ({activePayload.matchedSkills.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activePayload.matchedSkills.map((s) => (
                          <span
                            key={s}
                            className="bg-emerald-950 text-emerald-300 border border-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div>
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">
                        ⚡ Quick-Prep Topics & Potential Gaps
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activePayload.missingSkills.map((s) => (
                          <span
                            key={s}
                            className="bg-amber-950 text-amber-300 border border-amber-700 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          >
                            ⚡ {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Layer 2 Reality Expectation Box */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 to-emerald-950/40 border-l-4 border-indigo-500 space-y-2">
                      <div className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                        <span>🧠</span>
                        <span>Layer 2 Reality Expectation Note</span>
                      </div>
                      <div className="text-[11px] space-y-1 text-slate-300">
                        <div>• <b>OA Standard:</b> {activePayload.layer2Expectations.oaDifficulty}</div>
                        <div>• <b>Hidden Criteria:</b> {activePayload.layer2Expectations.unspokenCriteria}</div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <a
                      href={activePayload.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-center font-bold text-sm shadow-lg shadow-indigo-600/30 hover:opacity-90 transition-all"
                    >
                      🚀 Apply to {activePayload.companyName} Immediately →
                    </a>

                    <div className="text-[10px] text-center text-slate-500">
                      Candidate Profile: <b>{activePayload.candidateName}</b> • Dispatched in real-time
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHANNEL CREDENTIALS & THRESHOLD RULES */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Telegram Settings Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Telegram Bot API Channel</h2>
                  <p className="text-xs text-slate-400">Direct message or broadcast channel alerts</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={telegramConfig.enabled}
                  onChange={(e) => setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Telegram Bot Token</label>
                <input
                  type="password"
                  value={telegramConfig.botToken}
                  onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Target Chat ID or Channel Handle</label>
                <input
                  type="text"
                  value={telegramConfig.chatId}
                  onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                  placeholder="e.g. @my_scout_alerts or -100192849182"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Parse Mode</label>
                  <select
                    value={telegramConfig.parseMode}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, parseMode: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="HTML">HTML (Recommended)</option>
                    <option value="MarkdownV2">MarkdownV2</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="tgInlineBtn"
                    checked={telegramConfig.includeInlineApplyButton}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, includeInlineApplyButton: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="tgInlineBtn" className="text-slate-300 cursor-pointer">
                    Inline Apply CTA Button
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleTestConnection('telegram')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium transition-all cursor-pointer"
                >
                  Ping Bot Connection
                </button>
                <span className="text-[10px] text-slate-500">Supports Live Token & Sandbox</span>
              </div>
            </div>
          </div>

          {/* Email Settings Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Email Service Channel</h2>
                  <p className="text-xs text-slate-400">Resend, SendGrid, Postmark, or Custom SMTP</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailConfig.enabled}
                  onChange={(e) => setEmailConfig({ ...emailConfig, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Provider</label>
                  <select
                    value={emailConfig.provider}
                    onChange={(e) => setEmailConfig({ ...emailConfig, provider: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="resend">Resend (Modern REST API)</option>
                    <option value="sendgrid">SendGrid (v3 Mail Send)</option>
                    <option value="postmark">Postmark (Transactional)</option>
                    <option value="custom_smtp">Custom SMTP / Mock Sandbox</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">API Key / Token</label>
                  <input
                    type="password"
                    value={emailConfig.apiKey}
                    onChange={(e) => setEmailConfig({ ...emailConfig, apiKey: e.target.value })}
                    placeholder="e.g. re_123456789..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">From Email</label>
                  <input
                    type="email"
                    value={emailConfig.fromEmail}
                    onChange={(e) => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">To Email (Recipient)</label>
                  <input
                    type="email"
                    value={emailConfig.toEmail}
                    onChange={(e) => setEmailConfig({ ...emailConfig, toEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Subject Template</label>
                <input
                  type="text"
                  value={emailConfig.subjectTemplate}
                  onChange={(e) => setEmailConfig({ ...emailConfig, subjectTemplate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleTestConnection('email')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-medium transition-all cursor-pointer"
                >
                  Verify Email Provider
                </button>
                <span className="text-[10px] text-slate-500">Live API Key or Mock</span>
              </div>
            </div>
          </div>

          {/* Trigger Rules & Anti-Spam Controls (Full Width) */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Alert Dispatch Rules & Anti-Spam Policies</h2>
                <p className="text-xs text-slate-400">
                  Controls threshold sensitivity, deduplication cooldown, and quiet hours
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Score Threshold Slider */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Min Match Score Threshold</span>
                  <span className="font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                    {Math.round(alertRules.minScoreThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={Math.round(alertRules.minScoreThreshold * 100)}
                  onChange={(e) =>
                    setAlertRules({
                      ...alertRules,
                      minScoreThreshold: parseInt(e.target.value, 10) / 100,
                    })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-[10px] text-slate-500">Only composite match scores &gt;= this value trigger alerts.</p>
              </div>

              {/* Dedup Cooldown Window */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Deduplication Window</span>
                  <span className="font-bold text-indigo-300">{alertRules.dedupWindowHours} Hours</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="168"
                  step="12"
                  value={alertRules.dedupWindowHours}
                  onChange={(e) =>
                    setAlertRules({
                      ...alertRules,
                      dedupWindowHours: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-[10px] text-slate-500">Prevents repeated notifications for same job within window.</p>
              </div>

              {/* Max Alerts per Day */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Daily Alert Limit</span>
                  <span className="font-bold text-purple-300">{alertRules.maxAlertsPerDay} / day</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={alertRules.maxAlertsPerDay}
                  onChange={(e) =>
                    setAlertRules({
                      ...alertRules,
                      maxAlertsPerDay: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <p className="text-[10px] text-slate-500">Hard frequency cap protecting candidate inboxes.</p>
              </div>
            </div>

            {/* Save Config Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveConfig}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                Save All Alert Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REAL-TIME DISPATCH AUDIT LOG & HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Notification Dispatch Audit Stream ({history.length} events)
              </h2>
              <p className="text-[11px] text-slate-400">
                Granular delivery receipts, payload inspection, and channel latency telemetry
              </p>
            </div>

            <button
              onClick={async () => {
                await safeFetchJson('/api/alerts/history', { method: 'DELETE' });
                setHistory([]);
                setSelectedRecord(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 transition-all cursor-pointer"
            >
              Clear Audit Log
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Table (7 cols) */}
            <div className="lg:col-span-7 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Job & Company</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Channels</th>
                      <th className="p-3">Time</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          No alerts dispatched yet. Run a simulator test to generate events.
                        </td>
                      </tr>
                    ) : (
                      history.map((rec) => (
                        <tr
                          key={rec.id}
                          onClick={() => setSelectedRecord(rec)}
                          className={`cursor-pointer transition-colors ${
                            selectedRecord?.id === rec.id
                              ? 'bg-indigo-950/40 text-white'
                              : 'hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-white">{rec.companyName}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {rec.jobTitle}
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.matchScore >= 0.9
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-indigo-500/20 text-indigo-300'
                              }`}
                            >
                              {Math.round(rec.matchScore * 100)}%
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              {rec.channels.telegram && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800"
                                  title={`Telegram: ${rec.channels.telegram.status} (${rec.channels.telegram.latencyMs}ms)`}
                                >
                                  TG {rec.channels.telegram.latencyMs}ms
                                </span>
                              )}
                              {rec.channels.email && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-950 text-purple-300 border border-purple-800"
                                  title={`Email: ${rec.channels.email.status} (${rec.channels.email.latencyMs}ms)`}
                                >
                                  EM {rec.channels.email.latencyMs}ms
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-[10px] text-slate-500 whitespace-nowrap">
                            {new Date(rec.dispatchedAt).toLocaleTimeString()}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryRecord(rec.id);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                              title="Retry Alert Dispatch"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expanded Record Inspector (5 cols) */}
            <div className="lg:col-span-5 rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3 text-xs">
              <h3 className="font-bold text-white flex items-center justify-between pb-2 border-b border-slate-800">
                <span>Dispatch Receipt Inspector</span>
                {selectedRecord && (
                  <span className="text-[10px] text-slate-500 font-mono">{selectedRecord.id}</span>
                )}
              </h3>

              {selectedRecord ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-white font-bold">{selectedRecord.companyName}</div>
                    <div className="text-slate-300 text-[11px]">{selectedRecord.jobTitle}</div>
                    <div className="text-[10px] text-emerald-400 font-bold">
                      Match Score: {Math.round(selectedRecord.matchScore * 100)}% (Threshold: {Math.round(selectedRecord.thresholdApplied * 100)}%)
                    </div>
                  </div>

                  {/* Channel Delivery Receipts */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Delivery Receipts
                    </span>
                    {selectedRecord.channels.telegram && (
                      <div className="p-2.5 rounded-lg bg-[#0e1621] border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-cyan-400 font-bold">
                          <span>Telegram Channel</span>
                          <span className="text-[10px] bg-cyan-950 px-1.5 py-0.5 rounded">
                            {selectedRecord.channels.telegram.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Chat ID: <code>{selectedRecord.channels.telegram.chatId}</code>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Message ID: <code>{selectedRecord.channels.telegram.messageId}</code> (Latency: {selectedRecord.channels.telegram.latencyMs}ms)
                        </div>
                      </div>
                    )}

                    {selectedRecord.channels.email && (
                      <div className="p-2.5 rounded-lg bg-[#0b0f19] border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-purple-400 font-bold">
                          <span>Email Service ({selectedRecord.channels.email.provider})</span>
                          <span className="text-[10px] bg-purple-950 px-1.5 py-0.5 rounded">
                            {selectedRecord.channels.email.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Recipient: <code>{selectedRecord.channels.email.toEmail}</code>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Message ID: <code>{selectedRecord.channels.email.messageId}</code> (Latency: {selectedRecord.channels.email.latencyMs}ms)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Layer 2 Reality Check Summary */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                      Layer 2 Reality Expectation Included
                    </span>
                    <div className="text-slate-300">
                      • OA: {selectedRecord.payload.layer2Expectations.oaDifficulty || 'Standard'}
                    </div>
                    <div className="text-slate-300">
                      • Filter: {selectedRecord.payload.layer2Expectations.unspokenCriteria || 'Rolling'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Select a dispatch record from the table to view its full delivery receipt.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: VERIFICATION TEST SUITE (6/6 TESTS) */}
      {/* ========================================================================= */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Phase 11 Automated Verification Test Suite
              </h2>
              <p className="text-[11px] text-slate-400">
                Validates MarkdownV2 & HTML templates, instant threshold triggers, deduplication, and sub-100ms multi-channel delivery.
              </p>
            </div>

            <button
              onClick={handleRunTestSuite}
              disabled={isRunningTests}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <Play className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
              <span>{isRunningTests ? 'Running Suite...' : 'Execute All 6 Tests'}</span>
            </button>
          </div>

          {/* Test Suite Summary Banner */}
          {testReport && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                testReport.failedCount === 0
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    testReport.failedCount === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {testReport.failedCount === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-bold text-sm">
                    {testReport.passedCount}/{testReport.totalTests} Phase 11 Tests Passed ({testReport.failedCount} Failed)
                  </div>
                  <div className="text-xs text-slate-400">
                    Total Duration: {testReport.totalDurationMs}ms • Average Step Latency: {testReport.averageLatencyMs}ms
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800">
                {new Date(testReport.timestamp).toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* Test Results Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(testReport?.results || []).map((test) => (
              <div
                key={test.id}
                className={`p-4 rounded-xl border space-y-2 transition-all ${
                  test.passed
                    ? 'bg-slate-900/90 border-emerald-500/30 hover:border-emerald-500/60'
                    : 'bg-slate-900/90 border-rose-500/30 hover:border-rose-500/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        test.passed ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-400 shadow-sm shadow-rose-400'
                      }`}
                    />
                    <span className="font-bold text-white text-xs">{test.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{test.durationMs}ms</span>
                </div>

                <div className="text-[10px] text-slate-400 font-mono bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500">ID: {test.id} • </span>
                  <span className="text-indigo-400 font-semibold">{test.category}</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-[11px] text-slate-300">
                    <span className="text-slate-500 font-medium">Expected: </span>
                    {test.expected}
                  </div>
                  <div className={`text-[11px] font-medium ${test.passed ? 'text-emerald-300' : 'text-rose-300'}`}>
                    <span className="text-slate-500 font-medium">Actual: </span>
                    {test.actual}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
