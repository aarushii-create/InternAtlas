import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  Shield,
  Zap,
  Code2,
  BrainCircuit,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar,
  Lock,
  Eye,
  Camera,
  Layers,
  GraduationCap,
  Globe,
  Award,
  Database,
  Briefcase,
  HelpCircle,
  Clock,
  Flame,
  Check,
} from 'lucide-react';
import { CompanyInsight, CompanyDataSource, CompanyTier, DsaDifficulty, OaPlatform } from '../types';

export const CompanyKnowledgeGraph: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedOa, setSelectedOa] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<CompanyInsight | null>(null);
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [dataSources, setDataSources] = useState<CompanyDataSource[]>([]);
  const [stats, setStats] = useState<any>(null);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTier !== 'all') params.append('tier', selectedTier);
      if (selectedDifficulty !== 'all') params.append('dsaDifficulty', selectedDifficulty);
      if (selectedOa !== 'all') params.append('oaPlatform', selectedOa);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/companies/insights?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }

      const statsRes = await fetch('/api/companies/insights/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const sourcesRes = await fetch('/api/companies/insights/data-sources');
      if (sourcesRes.ok) {
        const sourcesData = await sourcesRes.json();
        setDataSources(sourcesData.sources || []);
      }
    } catch (err) {
      console.error('Failed to load company insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [selectedTier, selectedDifficulty, selectedOa]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInsights();
  };

  const getTierBadge = (tier: CompanyTier) => {
    switch (tier) {
      case 'Tier 1 Quant/HFT':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'Tier 1 Big Tech / FAANG+':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'Tier 1 Enterprise Unicorn / High-Growth':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'Top Finance / Wall St':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  const getDifficultyBadge = (difficulty: DsaDifficulty) => {
    switch (difficulty) {
      case 'Hard':
      case 'Extreme':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'Medium-Hard':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'Medium':
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Knowledge Graph Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    Company Expectations Knowledge Graph
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                    Layer 2 Seed Data
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Curated intelligence on "informal" company hiring bars: DSA difficulty, CodeSignal/HackerRank proctoring, unspoken GPA/school filters, and verified compensation.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowDataSourceModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer shadow-sm hover:text-white"
            >
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Data Sources & Provenance</span>
            </button>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-xs text-indigo-300 font-mono">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>{stats?.totalCompanies || companies.length} Companies Tracked</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Distribution Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Quant & HFT Elite</span>
            </div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {stats?.tierDistribution?.['Tier 1 Quant/HFT'] || 10}
            </div>
            <div className="text-[10px] text-slate-500">$110 - $125/hr • Hard DSA</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>FAANG & Big Tech</span>
            </div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {stats?.tierDistribution?.['Tier 1 Big Tech / FAANG+'] || 7}
            </div>
            <div className="text-[10px] text-slate-500">$50 - $65/hr • Medium-Hard</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Enterprise Unicorns</span>
            </div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {stats?.tierDistribution?.['Tier 1 Enterprise Unicorn / High-Growth'] || 12}
            </div>
            <div className="text-[10px] text-slate-500">$60 - $90/hr • CodeSignal 830+</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Wall St & Finance</span>
            </div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {stats?.tierDistribution?.['Top Finance / Wall St'] || 4}
            </div>
            <div className="text-[10px] text-slate-500">Early July Waves • 3.4+ GPA</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company (e.g. Jane Street, Stripe, PyTorch, C++, CodeSignal)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tier Filter */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="all">All Tiers</option>
            <option value="Tier 1 Quant/HFT">Quant / HFT</option>
            <option value="Tier 1 Big Tech / FAANG+">Big Tech (FAANG+)</option>
            <option value="Tier 1 Enterprise Unicorn / High-Growth">Enterprise Unicorns</option>
            <option value="Top Finance / Wall St">Wall Street / Finance</option>
            <option value="Tier 2 Elite Tech">Elite Tech Leaders</option>
          </select>

          {/* DSA Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="all">All DSA Bars</option>
            <option value="Hard">Hard / Extreme</option>
            <option value="Medium-Hard">Medium-Hard</option>
            <option value="Medium">Medium</option>
            <option value="Easy">Easy</option>
          </select>

          {/* OA Platform Filter */}
          <select
            value={selectedOa}
            onChange={(e) => setSelectedOa(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="all">All OA Types</option>
            <option value="CodeSignal (GCA)">CodeSignal GCA</option>
            <option value="HackerRank">HackerRank</option>
            <option value="Karat">Karat</option>
            <option value="Codility">Codility</option>
            <option value="No Initial OA / Direct Phone Screen">No Initial OA</option>
          </select>
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : companies.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No company profiles match your filters</h3>
          <p className="text-xs text-slate-500 mt-1">Try broadening your search query or tier filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <div
              key={company.id}
              onClick={() => setSelectedCompany(company)}
              className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-indigo-500/5 hover:-translate-y-0.5"
            >
              {/* Card Header */}
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-white group-hover:border-indigo-500/50 group-hover:bg-indigo-950/30 transition">
                      {company.companyName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition flex items-center gap-1.5">
                        {company.companyName}
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <span>{company.headquarters}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tier and Difficulty Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${getTierBadge(company.tier)}`}>
                    {company.tier}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${getDifficultyBadge(company.dsaBar.difficulty)}`}>
                    DSA: {company.dsaBar.difficulty}
                  </span>
                </div>
              </div>

              {/* Core DSA & OA Snapshot */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Key DSA Topics
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {company.dsaBar.primaryTopics.slice(0, 3).map((topic, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-300">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>{company.oaType.platform}</span>
                  </span>
                  {company.oaType.proctoring.webcamRequired && (
                    <span className="text-[10px] text-rose-400 flex items-center gap-0.5" title="Webcam Proctored">
                      <Camera className="w-3 h-3" />
                      <span>Proctored</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Unspoken Filter Snippet & Comp */}
              <div className="space-y-2 pt-1 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 text-[11px]">Levels.fyi Verified:</span>
                  <span className="font-mono font-bold text-emerald-400 text-[11px]">
                    {company.compensationRange.hourlyRateUsd}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 line-clamp-1">
                  <span className="text-slate-300 font-semibold">Filter: </span>
                  {company.unspokenFilters.targetSchoolTier}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deep Profile Inspection Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-150 my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-lg font-bold text-indigo-300 shadow-inner">
                  {selectedCompany.companyName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{selectedCompany.companyName}</h2>
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${getTierBadge(selectedCompany.tier)}`}>
                      {selectedCompany.tier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedCompany.industry} • {selectedCompany.headquarters} • Aliases: {selectedCompany.aliases.join(', ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400">DSA Bar Difficulty</div>
                <div className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-xs border ${getDifficultyBadge(selectedCompany.dsaBar.difficulty)}`}>
                    {selectedCompany.dsaBar.difficulty}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400">OA Platform</div>
                <div className="text-xs font-bold text-slate-200 mt-1 truncate">
                  {selectedCompany.oaType.platform}
                </div>
                <div className="text-[10px] text-slate-500">{selectedCompany.oaType.typicalDurationMinutes} min duration</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400">Verified Intern Pay</div>
                <div className="text-xs font-bold font-mono text-emerald-400 mt-1">
                  {selectedCompany.compensationRange.hourlyRateUsd}
                </div>
                <div className="text-[10px] text-slate-500">Levels.fyi Index</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400">Recruiting Velocity</div>
                <div className="text-xs font-bold text-amber-400 mt-1 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>{selectedCompany.applicationTimeline.urgencyRating.replace('_', ' ')}</span>
                </div>
                <div className="text-[10px] text-slate-500">{selectedCompany.applicationTimeline.typicalOpenDate}</div>
              </div>
            </div>

            {/* Section 1: Technical & DSA Bar Deep Dive */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                <span>1. Technical & Algorithmic Expectations</span>
              </h4>
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Primary Algorithm Topics:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCompany.dsaBar.primaryTopics.map((topic, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-indigo-200 text-xs font-mono">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Focus Areas:</span>
                    <p className="text-slate-300">{selectedCompany.dsaBar.focusAreas}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Live Coding Environment:</span>
                    <p className="text-slate-300">{selectedCompany.dsaBar.liveCodingFormat}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 font-semibold block mb-0.5">System Design Expectation:</span>
                  <p className="text-slate-300">{selectedCompany.dsaBar.systemDesignExpectation}</p>
                </div>
              </div>
            </div>

            {/* Section 2: Online Assessment (OA) Profiling */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>2. Online Assessment (OA) & Cutoff Thresholds</span>
              </h4>
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Cutoff Score Description:</span>
                  <span className="font-mono text-amber-300 font-semibold">{selectedCompany.oaType.cutoffScoreDescription}</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Camera className={`w-3.5 h-3.5 ${selectedCompany.oaType.proctoring.webcamRequired ? 'text-rose-400' : 'text-slate-600'}`} />
                    <span>Webcam: {selectedCompany.oaType.proctoring.webcamRequired ? 'Required' : 'Disabled'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Eye className={`w-3.5 h-3.5 ${selectedCompany.oaType.proctoring.screenRecording ? 'text-rose-400' : 'text-slate-600'}`} />
                    <span>Screen Recording: {selectedCompany.oaType.proctoring.screenRecording ? 'Active' : 'Disabled'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Lock className={`w-3.5 h-3.5 ${selectedCompany.oaType.proctoring.copyPasteDisabled ? 'text-rose-400' : 'text-slate-600'}`} />
                    <span>Copy-Paste: {selectedCompany.oaType.proctoring.copyPasteDisabled ? 'Blocked' : 'Enabled'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Unspoken Filters & Recruiter Biases */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                <span>3. Unspoken Filters & Recruiter Biases</span>
              </h4>
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Target University Bias:</span>
                    <p className="text-slate-300">{selectedCompany.unspokenFilters.targetSchoolTier}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Minimum GPA Cutoff:</span>
                    <p className="text-slate-300">{selectedCompany.unspokenFilters.minimumGpa}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Class Standing Preference:</span>
                    <p className="text-slate-300">{selectedCompany.unspokenFilters.undergradClassStanding}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Visa Sponsorship Openness:</span>
                    <p className="text-slate-300">{selectedCompany.unspokenFilters.internationalVisaOpenness}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: ATS Resume Hotkeys & Red Flags */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>4. ATS Resume Optimization Hotkeys & Red Flags</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>High-Signal Resume Keywords</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedCompany.resumeHotkeys.map((key, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[11px] text-emerald-300 font-mono">
                        {key}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Fatal Resume Red Flags</span>
                  </div>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    {selectedCompany.redFlags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-rose-400">•</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 5: Typical Interview Pipeline Stages */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>5. Verified Interview Stages ({selectedCompany.interviewStages.length} Rounds)</span>
              </h4>
              <div className="space-y-2">
                {selectedCompany.interviewStages.map((stage) => (
                  <div key={stage.roundNumber} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {stage.roundNumber}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{stage.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{stage.durationMinutes} mins</span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{stage.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 6: Verified Data Sources for this Company */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <span>Data Provenance & Source Attribution</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {selectedCompany.dataSources.map((ds, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px]">
                    <div className="font-semibold text-slate-300">{ds.name}</div>
                    <div className="text-slate-500 font-mono text-[10px] mt-0.5">{ds.urlOrReference}</div>
                    <div className="text-slate-400 text-[10px] mt-1">{ds.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                Last verified: {new Date(selectedCompany.updatedAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => setSelectedCompany(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-indigo-600/20"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Source Transparency Modal */}
      {showDataSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Layer 2 Data Sources & Provenance
                  </h2>
                  <p className="text-xs text-slate-400">
                    Transparent documentation of all empirical intelligence sources.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDataSourceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-slate-300 leading-relaxed">
                <strong className="text-white block mb-1">Methodology Statement:</strong>
                Layer 2 informal company requirements are derived by aggregating real hiring debriefs, verified offer letters, open-source tech community repositories, and standardized platform scoring rubrics. No subjective assumptions are made without multiple verified candidate or company sources.
              </div>

              <div className="space-y-2.5">
                {dataSources.map((source, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-200">{source.name}</h4>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                        {source.category}
                      </span>
                    </div>
                    <div className="text-[10px] text-indigo-400 font-mono">{source.urlOrReference}</div>
                    <p className="text-slate-400 text-xs mt-1">{source.description}</p>
                    <div className="text-[10px] text-slate-500 pt-1">Verified: {source.lastVerified}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowDataSourceModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-indigo-600/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
