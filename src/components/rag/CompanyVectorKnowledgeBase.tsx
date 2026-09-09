import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Plus,
  Tag,
  ExternalLink,
  FileText,
  Check,
  Sparkles,
  BrainCircuit,
  Filter,
  RefreshCw,
  Award,
  Layers,
  ChevronRight,
  ShieldCheck,
  Send,
  Building,
  GraduationCap,
  DollarSign,
  AlertTriangle,
  Code2,
  Calendar,
  XCircle,
  Copy,
} from 'lucide-react';
import { CompanyKnowledgeChunk, CompanyKnowledgeCategory, Layer2RetrievedEvidence, Layer2LLMReasoningSummary } from '../../types';

export const CompanyVectorKnowledgeBase: React.FC = () => {
  const [chunks, setChunks] = useState<CompanyKnowledgeChunk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('');
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);

  // Live RAG Query Bench State
  const [benchQuery, setBenchQuery] = useState<string>('What is Jane Street software engineering intern interview DSA difficulty and OA format?');
  const [benchCompany, setBenchCompany] = useState<string>('Jane Street');
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [queryResults, setQueryResults] = useState<{
    query: string;
    totalRetrieved: number;
    retrievedEvidence: Layer2RetrievedEvidence[];
    llmReasoning: Layer2LLMReasoningSummary | null;
  } | null>(null);

  // Ingestion Modal / Form State
  const [showIngestModal, setShowIngestModal] = useState<boolean>(false);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [ingestForm, setIngestForm] = useState({
    company: 'Stripe',
    category: 'interview_experiences' as CompanyKnowledgeCategory,
    source: 'verified_interview_debrief',
    role: 'software_engineering',
    title: '2026 Practical Coding & BYOE Pair Programming Debrief',
    content: 'Stripe SWE Intern interview focuses heavily on practical coding rather than abstract algorithmic puzzles. Candidates are asked to build an API rate limiter or webhook dispatcher with clean error handling and unit tests in their own IDE.',
    tags: 'stripe, byoe, practical_coding, rate_limiter, api',
    confidence: 'high' as 'high' | 'medium' | 'verified',
  });
  const [ingestSuccessMsg, setIngestSuccessMsg] = useState<string | null>(null);

  const fetchChunks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany) params.append('company', selectedCompany);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedConfidence) params.append('minConfidence', selectedConfidence);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/rag/layer2/chunks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setChunks(data.chunks || []);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge chunks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChunks();
  }, [selectedCategory, selectedConfidence, selectedCompany]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchChunks();
  };

  const handleRunBenchQuery = async () => {
    if (!benchQuery && !benchCompany) return;
    setIsQuerying(true);
    try {
      const res = await fetch('/api/rag/layer2/chunks/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: benchQuery,
          company: benchCompany,
          topK: 4,
          synthesizeLlm: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQueryResults(data);
      }
    } catch (err) {
      console.error('RAG bench query failed:', err);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleIngestChunk = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIngesting(true);
    setIngestSuccessMsg(null);
    try {
      const res = await fetch('/api/rag/layer2/chunks/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ingestForm,
          tags: ingestForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      if (res.ok) {
        setIngestSuccessMsg(`Observation for ${ingestForm.company} embedded into 768-dim vector space and stored!`);
        fetchChunks();
        setTimeout(() => {
          setShowIngestModal(false);
          setIngestSuccessMsg(null);
        }, 2000);
      }
    } catch (err: any) {
      alert(`Failed to ingest chunk: ${err.message}`);
    } finally {
      setIsIngesting(false);
    }
  };

  // Group chunks by category for stats
  const categoryCounts = chunks.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueCompanies = Array.from(new Set(chunks.map((c) => c.company))).sort();

  return (
    <div className="space-y-6">
      {/* Knowledge Base Header Stats Banner */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                True RAG Architecture &middot; pgvector Ready
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                768-dim Embeddings
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Company Reality Knowledge Base & Vector Store
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Searchable, chunked empirical repository of real-world interview experiences, OA patterns, recruiter filters, GPA cutoffs, and verified compensation levels.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setShowIngestModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ingest Debrief Chunk</span>
            </button>
            <button
              onClick={fetchChunks}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Refresh Store"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400">Total Chunks Ingested</div>
            <div className="text-xl font-extrabold text-white mt-0.5">{chunks.length}</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400">Target Companies Covered</div>
            <div className="text-xl font-extrabold text-indigo-400 mt-0.5">{uniqueCompanies.length}</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400">Retrieval Mechanism</div>
            <div className="text-sm font-bold text-emerald-400 mt-1">Hybrid (Dense + BM25)</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400">Synthesis Engine</div>
            <div className="text-sm font-bold text-purple-400 mt-1">Deterministic Reasoning</div>
          </div>
        </div>
      </div>

      {/* Interactive Live RAG Semantic Query Bench */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/40 p-5 rounded-2xl border border-indigo-500/30 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Interactive RAG Retrieval & LLM Reality Bench
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Semantic Vector Query Test
          </span>
        </div>

        <p className="text-xs text-slate-300">
          Construct an arbitrary natural language query to retrieve grounded empirical company chunks from the vector database and synthesize real-time LLM reasoning:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8">
            <div className="relative">
              <input
                type="text"
                value={benchQuery}
                onChange={(e) => setBenchQuery(e.target.value)}
                placeholder="Ask about company OA patterns, DSA difficulty, recruiter filters, or GPA..."
                className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <select
              value={benchCompany}
              onChange={(e) => setBenchCompany(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Companies</option>
              {uniqueCompanies.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              onClick={handleRunBenchQuery}
              disabled={isQuerying}
              className="w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isQuerying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute RAG</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Question Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
          <span className="text-slate-400 font-medium text-[11px]">Suggested Inquiries:</span>
          {[
            { label: 'Jane Street DSA & Concurrency', q: 'What is Jane Street software engineering interview DSA difficulty and OA pattern?', c: 'Jane Street' },
            { label: 'Databricks CodeSignal GCA 840+', q: 'What is Databricks OA format, CodeSignal cutoff score, and proctoring rules?', c: 'Databricks' },
            { label: 'Goldman Sachs GPA Cutoff Screen', q: 'Does Goldman Sachs enforce an unspoken GPA cutoff and HackerRank testing?', c: 'Goldman Sachs' },
            { label: 'Stripe BYOE Pair Programming', q: 'How does Stripe conduct practical coding and bring your own environment rounds?', c: 'Stripe' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setBenchQuery(item.q);
                setBenchCompany(item.c);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all text-[11px] cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Query Results Display */}
        {queryResults && (
          <div className="mt-4 pt-4 border-t border-indigo-500/20 space-y-4 animate-in fade-in duration-300">
            {/* LLM Synthesis Box */}
            {queryResults.llmReasoning && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      LLM Synthesized Reality Intelligence
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Reality Score: {(queryResults.llmReasoning.company_reality_score * 100).toFixed(0)}%
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {queryResults.llmReasoning.reasoning_synthesis}
                </p>

                {/* Risk Badges */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    queryResults.llmReasoning.oa_risk === 'high' || queryResults.llmReasoning.oa_risk === 'critical'
                      ? 'bg-rose-950/60 text-rose-300 border-rose-700/40'
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40'
                  }`}>
                    OA Risk: {queryResults.llmReasoning.oa_risk.toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    queryResults.llmReasoning.gpa_risk === 'high'
                      ? 'bg-amber-950/60 text-amber-300 border-amber-700/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    GPA Risk: {queryResults.llmReasoning.gpa_risk.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-700/40">
                    Visa: {queryResults.llmReasoning.visa_feasibility.toUpperCase()}
                  </span>
                </div>

                {/* Citations */}
                {queryResults.llmReasoning.evidence_citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">Evidence Citations: </span>
                    {queryResults.llmReasoning.evidence_citations.join('; ')}
                  </div>
                )}
              </div>
            )}

            {/* Retrieved Chunks Grid */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Top Retrieved Evidence Chunks ({queryResults.retrievedEvidence.length})
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {queryResults.retrievedEvidence.map((ev, idx) => (
                  <div
                    key={ev.chunkId || idx}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {ev.company}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                          {ev.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <span>Similarity: {(ev.similarityScore * 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    <h5 className="text-xs font-semibold text-white truncate">{ev.title}</h5>
                    <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3 font-mono">
                      "{ev.snippet}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>Source: {ev.source} &bull; {ev.date}</span>
                      <span className="uppercase font-semibold text-slate-400">{ev.confidence} confidence</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search Bar for Chunks Database */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, questions, requirements, keywords..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Companies ({uniqueCompanies.length})</option>
              {uniqueCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              <option value="interview_experiences">Interview Experiences</option>
              <option value="oa_patterns">OA Patterns & Platforms</option>
              <option value="dsa_difficulty">DSA Difficulty</option>
              <option value="frequently_tested_topics">Tested Topics & Algorithms</option>
              <option value="interview_questions">Specific Questions</option>
              <option value="gpa_requirements">GPA & University Screen</option>
              <option value="ats_recruiting_filters">ATS & Recruiter Filters</option>
              <option value="visa_requirements">Visa Sponsorship</option>
              <option value="compensation_levels">Compensation & Housing</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Filter Chunks
            </button>
          </div>
        </form>
      </div>

      {/* Chunks List Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Indexed Knowledge Chunks ({chunks.length})
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Vector Store Status: Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chunks.map((chunk) => {
            const isExpanded = expandedChunkId === chunk.id;
            return (
              <div
                key={chunk.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isExpanded
                    ? 'bg-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-950/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {chunk.company}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {chunk.category}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {chunk.confidence}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug">
                    {chunk.title}
                  </h4>

                  <p className={`text-xs text-slate-300 leading-relaxed font-mono ${isExpanded ? '' : 'line-clamp-4'}`}>
                    {chunk.content}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {chunk.tags.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded text-[9px] bg-slate-900 text-slate-400 border border-slate-800"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Source: {chunk.source} ({chunk.date})</span>
                  <button
                    onClick={() => setExpandedChunkId(isExpanded ? null : chunk.id)}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    {isExpanded ? 'Collapse' : 'Inspect'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ingestion Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Ingest New Company Knowledge Chunk</h3>
              </div>
              <button
                onClick={() => setShowIngestModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {ingestSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{ingestSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleIngestChunk} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Company Name</label>
                    <input
                      type="text"
                      required
                      value={ingestForm.company}
                      onChange={(e) => setIngestForm({ ...ingestForm, company: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                    <select
                      value={ingestForm.category}
                      onChange={(e) => setIngestForm({ ...ingestForm, category: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="interview_experiences">Interview Experiences</option>
                      <option value="oa_patterns">OA Patterns & Platforms</option>
                      <option value="dsa_difficulty">DSA Difficulty</option>
                      <option value="frequently_tested_topics">Frequently Tested Topics</option>
                      <option value="interview_questions">Interview Questions</option>
                      <option value="gpa_requirements">GPA Requirements</option>
                      <option value="university_preferences">University Preferences</option>
                      <option value="ats_recruiting_filters">ATS & Recruiter Filters</option>
                      <option value="visa_requirements">Visa Requirements</option>
                      <option value="compensation_levels">Compensation Levels</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Chunk Title</label>
                  <input
                    type="text"
                    required
                    value={ingestForm.title}
                    onChange={(e) => setIngestForm({ ...ingestForm, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Content / Observation</label>
                  <textarea
                    rows={4}
                    required
                    value={ingestForm.content}
                    onChange={(e) => setIngestForm({ ...ingestForm, content: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      value={ingestForm.tags}
                      onChange={(e) => setIngestForm({ ...ingestForm, tags: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Confidence Rating</label>
                    <select
                      value={ingestForm.confidence}
                      onChange={(e) => setIngestForm({ ...ingestForm, confidence: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="verified">Verified (High Provenance)</option>
                      <option value="high">High Confidence</option>
                      <option value="medium">Medium Confidence</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowIngestModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isIngesting}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white cursor-pointer shadow-md shadow-indigo-600/30"
                  >
                    {isIngesting ? 'Embedding...' : 'Save & Vectorize'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
