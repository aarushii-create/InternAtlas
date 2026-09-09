import React, { useState, useEffect } from 'react';
import {
  Globe,
  Play,
  CheckCircle2,
  AlertCircle,
  Code2,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Search,
  Filter,
  Check,
  FileCheck2,
  Terminal,
  Server,
  Database,
  Tag,
  MapPin,
  Clock,
  Briefcase,
} from 'lucide-react';
import { Job } from '../types';
import { TestCaseResult, TestSuiteReport } from '../lib/scrapers/testSuite';

interface AtsScrapersProps {
  onJobsUpdated?: () => void;
}

interface SupportedBoard {
  company: string;
  source: 'greenhouse' | 'lever';
  boardToken: string;
  industry: string;
  sampleRoles: string[];
  typicalHiringBar: string;
}

export const AtsScrapers: React.FC<AtsScrapersProps> = ({ onJobsUpdated }) => {
  const [activeTab, setActiveTab] = useState<'runner' | 'sandbox' | 'tests' | 'database'>('runner');

  // Supported Boards
  const [supportedBoards, setSupportedBoards] = useState<SupportedBoard[]>([]);
  const [loadingBoards, setLoadingBoards] = useState<boolean>(false);

  // Scraper Execution
  const [selectedBoard, setSelectedBoard] = useState<string>('stripe');
  const [customSource, setCustomSource] = useState<'greenhouse' | 'lever'>('greenhouse');
  const [customToken, setCustomToken] = useState<string>('');
  const [customCompany, setCustomCompany] = useState<string>('');
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapeResult, setScrapeResult] = useState<any | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Normalization Sandbox
  const [sandboxHtml, setSandboxHtml] = useState<string>(
    `<h3>About Stripe Infrastructure</h3>
<p>Stripe&rsquo;s core distributed storage team is hiring Software Engineering Interns for <b>Summer 2026</b>.<br>
We process &gt; 100,000 queries/sec with strict latency SLAs (&lt; 10ms).</p>
<h3>Qualifications</h3>
<ul>
  <li>Pursuing a BS or MS in Computer Science or Software Engineering.</li>
  <li>Proficiency in <strong>Go, C++, Python, or TypeScript</strong>.</li>
  <li>Familiarity with PostgreSQL, Redis, Docker, and distributed consensus.</li>
</ul>
<p>Requisition ID: REQ-STRP-2026-DIST</p>`
  );
  const [sandboxCompany, setSandboxCompany] = useState<string>('Stripe');
  const [sandboxTitle, setSandboxTitle] = useState<string>('Distributed Systems Intern (Summer 2026)');
  const [isNormalizing, setIsNormalizing] = useState<boolean>(false);
  const [normalizationResult, setNormalizationResult] = useState<any | null>(null);

  // Unit Test Suite
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [testReport, setTestReport] = useState<TestSuiteReport | null>(null);

  // Jobs in Database
  const [dbJobs, setDbJobs] = useState<Job[]>([]);
  const [jobSearch, setJobSearch] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'greenhouse' | 'lever'>('all');
  const [remoteOnly, setRemoteOnly] = useState<boolean>(false);

  // Fetch initial data
  useEffect(() => {
    fetchSupportedBoards();
    fetchDbJobs();
    runUnitTests();
  }, []);

  const fetchSupportedBoards = async () => {
    setLoadingBoards(true);
    try {
      const res = await fetch('/api/scrapers/supported-boards');
      const data = await res.json();
      if (data.supportedBoards) {
        setSupportedBoards(data.supportedBoards);
      }
    } catch (err) {
      console.error('Failed to load supported boards:', err);
    } finally {
      setLoadingBoards(false);
    }
  };

  const fetchDbJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (Array.isArray(data)) {
        setDbJobs(data);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  };

  // Run Scraper for a single board
  const handleRunScraper = async (source: 'greenhouse' | 'lever', token: string, company: string) => {
    setIsScraping(true);
    setScrapeError(null);
    setScrapeResult(null);

    try {
      const endpoint = source === 'greenhouse' ? '/api/scrapers/greenhouse' : '/api/scrapers/lever';
      const body =
        source === 'greenhouse'
          ? { boardToken: token, company, persistToDb: true }
          : { companySite: token, company, persistToDb: true };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Scraper failed');
      }

      setScrapeResult(data);
      fetchDbJobs();
      if (onJobsUpdated) onJobsUpdated();
    } catch (err: any) {
      setScrapeError(err.message || 'Error running scraper');
    } finally {
      setIsScraping(false);
    }
  };

  // Run Batch Ingestion across all boards
  const handleRunAllScrapers = async () => {
    setIsScraping(true);
    setScrapeError(null);
    setScrapeResult(null);

    try {
      const res = await fetch('/api/scrapers/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Batch scraping failed');

      setScrapeResult(data);
      fetchDbJobs();
      if (onJobsUpdated) onJobsUpdated();
    } catch (err: any) {
      setScrapeError(err.message || 'Batch scraping failed');
    } finally {
      setIsScraping(false);
    }
  };

  // Run Unit Tests
  const runUnitTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch('/api/scrapers/test-suite', { method: 'POST' });
      const data = await res.json();
      setTestReport(data);
    } catch (err) {
      console.error('Error running test suite:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Run Sandbox Normalization Preview
  const handleNormalizeSandbox = async () => {
    setIsNormalizing(true);
    try {
      const res = await fetch('/api/scrapers/normalize-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawHtml: sandboxHtml,
          company: sandboxCompany,
          jobTitle: sandboxTitle,
        }),
      });
      const data = await res.json();
      setNormalizationResult(data);
    } catch (err) {
      console.error('Error normalizing preview:', err);
    } finally {
      setIsNormalizing(false);
    }
  };

  // Filtered jobs in DB
  const filteredJobs = dbJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.company.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.location.toLowerCase().includes(jobSearch.toLowerCase());
    const matchesSource = sourceFilter === 'all' || job.source === sourceFilter;
    const matchesRemote = !remoteOnly || job.isRemote;
    return matchesSearch && matchesSource && matchesRemote;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-3xl border border-indigo-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Phase 4: Target Job Board Scrapers (Greenhouse & Lever)
              </h2>
              <p className="text-xs text-slate-400">
                Lightweight, scalable scrapers extracting <code className="text-cyan-300 font-mono">job_title</code>, <code className="text-cyan-300 font-mono">company</code>, <code className="text-cyan-300 font-mono">location</code>, <code className="text-cyan-300 font-mono">req_id</code>, <code className="text-cyan-300 font-mono">posted_at</code>, and direct apply URLs with HTML sanitization & 768d vector embeddings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRunAllScrapers}
              disabled={isScraping}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isScraping ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Ingesting All Boards...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Batch Scrape All Target Boards</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('runner')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'runner'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>ATS Scraper Hub</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sandbox');
              if (!normalizationResult) handleNormalizeSandbox();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'sandbox'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Live Normalization Sandbox</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tests');
              if (!testReport) runUnitTests();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'tests'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Automated Unit Tests ({testReport?.passedCount ?? 5}/{testReport?.totalTests ?? 5})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('database');
              fetchDbJobs();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Scraped Jobs DB ({dbJobs.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ATS Scraper Hub */}
      {activeTab === 'runner' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Preset Boards Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Configured Top-Tier Target Boards:</span>
              <span className="text-[11px] text-slate-500 font-mono">Greenhouse & Lever Ingestion</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {supportedBoards.map((board, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-100">{board.company}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                          board.source === 'greenhouse'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {board.source}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">{board.industry}</p>

                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-slate-500 block">Typical Hiring Bar:</span>
                      <span className="text-xs font-semibold text-amber-300/90 block">
                        {board.typicalHiringBar}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-500 truncate">
                      /{board.boardToken}
                    </span>
                    <button
                      onClick={() => handleRunScraper(board.source, board.boardToken, board.company)}
                      disabled={isScraping}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Scrape Board</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Scraper Input */}
          <div className="p-5 bg-slate-900 rounded-3xl border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-slate-200 block">Custom Board Ingestion:</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">ATS Type</label>
                <select
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2.5 rounded-xl focus:border-cyan-500 focus:outline-none"
                >
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Company Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Scale AI"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2.5 rounded-xl focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Board Token / Site Slug</label>
                <input
                  type="text"
                  placeholder="e.g. scaleai"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2.5 rounded-xl focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => handleRunScraper(customSource, customToken || 'custom', customCompany || 'Custom')}
                  disabled={isScraping || !customToken}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Scrape</span>
                </button>
              </div>
            </div>
          </div>

          {/* Scrape Error */}
          {scrapeError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{scrapeError}</span>
            </div>
          )}

          {/* Scrape Output Results */}
          {scrapeResult && (
            <div className="bg-slate-900 rounded-3xl border border-emerald-500/30 p-5 sm:p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Ingestion Succeeded: {scrapeResult.company || 'Batch Targets'} ({scrapeResult.jobsCount || scrapeResult.totalIngested} Jobs)
                  </h3>
                </div>

                {scrapeResult.dbSync && (
                  <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    DB Sync: +{scrapeResult.dbSync.inserted} inserted, {scrapeResult.dbSync.updated} updated
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {(scrapeResult.jobs || []).slice(0, 3).map((job: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-sm font-bold text-cyan-300">{job.jobTitle}</span>
                      <span className="text-xs font-mono text-slate-400">
                        Req ID: <strong className="text-emerald-400">{job.reqId}</strong> &bull; {job.location}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2">{job.cleanDescription}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900">
                      <div className="flex flex-wrap gap-1.5">
                        {job.statedRequirements?.requiredSkills?.map((s: string, sIdx: number) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded text-[10px] font-mono"
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      <a
                        href={job.directApplyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <span>Apply URL</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Live Normalization Sandbox */}
      {activeTab === 'sandbox' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Raw HTML Input */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-200">Raw HTML / Markdown JD Payload</span>
                <button
                  onClick={handleNormalizeSandbox}
                  disabled={isNormalizing}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sanitize & Normalize</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Company</label>
                  <input
                    type="text"
                    value={sandboxCompany}
                    onChange={(e) => setSandboxCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Job Title</label>
                  <input
                    type="text"
                    value={sandboxTitle}
                    onChange={(e) => setSandboxTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <textarea
                rows={12}
                value={sandboxHtml}
                onChange={(e) => setSandboxHtml(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs p-3 rounded-2xl focus:border-indigo-500 focus:outline-none leading-relaxed"
                placeholder="Paste raw Greenhouse / Lever HTML or Markdown..."
              />
            </div>

            {/* Right: Sanitized & Normalized Output */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-indigo-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" /> Sanitized Plaintext & Extracted Metadata
                </span>
                {normalizationResult && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    Req ID: {normalizationResult.reqId}
                  </span>
                )}
              </div>

              {normalizationResult ? (
                <div className="space-y-4">
                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-500 block">Remote Status</span>
                      <span
                        className={`text-xs font-bold font-mono ${
                          normalizationResult.isRemote ? 'text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        {normalizationResult.isRemote ? 'Yes (Remote / Hybrid)' : 'Onsite'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-500 block">DSA Bar Tier</span>
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        {normalizationResult.informalBar?.dsaDifficulty || 'Medium'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-500 block">Vector Embedding</span>
                      <span className="text-xs font-bold text-cyan-400 font-mono">
                        {normalizationResult.vectorPreview?.dimensions || 768}d Vector
                      </span>
                    </div>
                  </div>

                  {/* Skills tags */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-300 block">Parsed Technical Skills:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {normalizationResult.statedRequirements?.requiredSkills?.map((skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-md text-[11px] font-mono font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Clean Text Box */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-300 block">Sanitized Description:</span>
                    <pre className="p-3 bg-slate-950 text-slate-300 font-mono text-xs rounded-xl border border-slate-800 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {normalizationResult.cleanDescription}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs font-mono">
                  Click &ldquo;Sanitize &amp; Normalize&rdquo; to process the raw HTML payload.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Unit Test Suite */}
      {activeTab === 'tests' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-slate-900 p-5 rounded-3xl border border-emerald-500/30 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">Phase 4 Scraper Unit Test Suite</h3>
              </div>

              <div className="flex items-center gap-3">
                {testReport && (
                  <span className="text-xs font-mono text-emerald-400">
                    Duration: {testReport.totalDurationMs}ms &bull; {testReport.passedCount}/{testReport.totalTests} Passed
                  </span>
                )}
                <button
                  onClick={runUnitTests}
                  disabled={isRunningTests}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                  <span>Re-run Unit Tests</span>
                </button>
              </div>
            </div>

            {/* Test Cards List */}
            {testReport ? (
              <div className="space-y-3">
                {testReport.results.map((test, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      test.passed
                        ? 'bg-slate-950/80 border-emerald-500/30'
                        : 'bg-rose-500/10 border-rose-500/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-900">
                      <div className="flex items-center space-x-2">
                        {test.passed ? (
                          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="text-xs font-bold text-slate-200 font-mono">
                          [{test.id}] {test.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{test.durationMs}ms</span>
                    </div>

                    <div className="pt-2 text-xs space-y-1">
                      {test.details && <p className="text-slate-400 text-[11px]">{test.details}</p>}
                      <div className="p-2 bg-slate-900 rounded-lg font-mono text-[10px] text-slate-300 overflow-x-auto">
                        <span className="text-emerald-400 font-bold">Actual: </span>
                        {typeof test.actual === 'object' ? JSON.stringify(test.actual) : String(test.actual)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs font-mono">
                Executing automated unit tests...
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Scraped Jobs in DB */}
      {activeTab === 'database' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filter Bar */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by role, company, or location..."
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs p-2 rounded-xl focus:outline-none"
              >
                <option value="all">All Sources</option>
                <option value="greenhouse">Greenhouse</option>
                <option value="lever">Lever</option>
              </select>

              <button
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  remoteOnly
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-400'
                }`}
              >
                <MapPin className="w-3 h-3" />
                <span>Remote Only</span>
              </button>
            </div>
          </div>

          {/* Job Postings Grid */}
          <div className="space-y-3">
            {filteredJobs.length === 0 ? (
              <div className="bg-slate-900 p-12 text-center rounded-3xl border border-slate-800 text-slate-500 text-xs font-mono space-y-2">
                <p>No scraped jobs matching your filters.</p>
                <button
                  onClick={handleRunAllScrapers}
                  className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-xl"
                >
                  Run Batch Scrapers
                </button>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold text-slate-100">{job.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            job.source === 'greenhouse'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {job.source}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-indigo-400">{job.company}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <span>Direct Apply</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{job.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">Skills:</span>
                      {job.statedRequirements?.requiredSkills?.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-950 text-slate-300 rounded text-[10px] font-mono">
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {job.location}
                      </span>
                      <span className="text-amber-400">Bar: {job.informalBar?.dsaDifficulty}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
