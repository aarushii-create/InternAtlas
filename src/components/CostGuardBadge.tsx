import React, { useState, useEffect } from 'react';
import { Shield, Zap, DollarSign, Activity, RefreshCw, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { safeFetchJson } from '../lib/apiHelper';

export interface CostGuardData {
  totalAiCalls: number;
  cachedAiHits: number;
  estimatedTokensUsed: number;
  estimatedTokensSaved: number;
  estimatedCostUsd: number;
  estimatedCostSavedUsd: number;
  dailyBudgetUsd: number;
  budgetExceeded: boolean;
  rateLimitsEnforced: number;
  cachedEntriesCount: number;
  savingsPercentage: number;
}

export const CostGuardBadge: React.FC = () => {
  const [stats, setStats] = useState<CostGuardData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await safeFetchJson<CostGuardData>('/api/cost-guard/stats');
      if (res.ok && res.data) {
        setStats(res.data);
      }
    } catch {
      // Quietly swallow transient fetch errors during reload
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        onClick={() => {
          fetchStats();
          setIsOpen(true);
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50 hover:border-emerald-500/50 transition-all text-xs font-semibold shadow-sm cursor-pointer"
        title="API Rate Limiter & Cost Guardian Active"
      >
        <Shield className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="hidden md:inline font-mono">
          Cost Guard: ${stats ? stats.estimatedCostUsd.toFixed(4) : '0.0000'}
        </span>
        <span className="md:hidden font-mono">Guard Active</span>
        {stats && stats.cachedAiHits > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-300 font-mono">
            {stats.savingsPercentage}% saved
          </span>
        )}
      </button>

      {/* Modal Inspector */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    API Rate Limiter & Cost Guardian
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sliding-window quotas, SHA-256 deduplication cache, and hard budget cap protection.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Spent / Budget</span>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                  ${stats ? stats.estimatedCostUsd.toFixed(4) : '0.0000'}
                </div>
                <div className="text-[10px] text-slate-500">Cap: ${stats?.dailyBudgetUsd.toFixed(2)}/day</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cost Saved</span>
                </div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                  ${stats ? stats.estimatedCostSavedUsd.toFixed(4) : '0.0000'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{stats?.estimatedTokensSaved || 0} tokens saved</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cache Hits</span>
                </div>
                <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
                  {stats?.cachedAiHits || 0} <span className="text-xs text-slate-400">/ {stats?.cachedEntriesCount || 0} entries</span>
                </div>
                <div className="text-[10px] text-slate-500">{stats?.savingsPercentage || 0}% hit ratio</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Throttled</span>
                </div>
                <div className="text-lg font-bold font-mono text-indigo-400 mt-1">
                  {stats?.rateLimitsEnforced || 0} <span className="text-xs text-slate-400">reqs</span>
                </div>
                <div className="text-[10px] text-slate-500">429 Protections</div>
              </div>
            </div>

            {/* Active Quota Tiers */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Configured Rate Limiting Tiers
              </h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-semibold text-slate-200">Resume Ingestion Tier</span>
                  </div>
                  <div className="text-slate-400 font-mono">20 req/min • $5.00 Hard Daily Cap</div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span className="font-semibold text-slate-200">RAG Layer 1 Search & Vector Match</span>
                  </div>
                  <div className="text-slate-400 font-mono">60 req/min • Sub-millisecond Cosine</div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span className="font-semibold text-slate-200">ATS Board Scraper Engine</span>
                  </div>
                  <div className="text-slate-400 font-mono">10 req/min • Greenhouse & Lever Protection</div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span className="font-semibold text-slate-200">Authentication & Login Guard</span>
                  </div>
                  <div className="text-slate-400 font-mono">20 req/15min • Anti-Brute-Force</div>
                </div>
              </div>
            </div>

            {/* Defense Mechanism Summary */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero-Cost Heuristic Fallback Active</span>
              </div>
              <p className="text-slate-400 pl-6 leading-relaxed">
                Resume parsing and 768-dimensional random-indexing embeddings run locally through the deterministic pipeline, ensuring uninterrupted operation with $0.00 external AI bill risk.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Metrics</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
