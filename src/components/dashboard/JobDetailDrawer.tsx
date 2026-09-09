import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  Target,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Shield,
  Building,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  Code2,
  Check,
} from 'lucide-react';
import { ProductionJobMatch } from '../../types';

interface JobDetailDrawerProps {
  match: ProductionJobMatch | null;
  onClose: () => void;
  onUpdateStatus: (jobId: string, status: ProductionJobMatch['applicationStatus']) => void;
}

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({
  match,
  onClose,
  onUpdateStatus,
}) => {
  if (!match) return null;

  const [activeSubTab, setActiveSubTab] = useState<'breakdown' | 'reality' | 'resume-delta'>('breakdown');
  const [copiedBullet, setCopiedBullet] = useState<string | null>(null);

  const handleCopyBullet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBullet(text);
    setTimeout(() => setCopiedBullet(null), 2500);
  };

  const getStatusColor = (status: ProductionJobMatch['applicationStatus']) => {
    switch (status) {
      case 'APPLIED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'OA_RECEIVED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'INTERVIEWING':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'OFFER':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'REJECTED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-950/80 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-600/30 shrink-0">
              {match.company.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  {match.company}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {match.companyTier}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusColor(match.applicationStatus)}`}>
                  {match.applicationStatus}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight truncate">
                {match.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                <span>{match.location} ({match.locationType})</span>
                {match.salaryRange && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">{match.salaryRange}</span>
                  </>
                )}
                <span>•</span>
                <span className="text-slate-400 uppercase">{match.atsProvider}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Summary Banner */}
        <div className="px-6 py-4 bg-slate-950/30 border-b border-slate-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col items-center justify-center">
              <span className="text-base font-black text-indigo-400">
                {(match.scores.finalScore * 100).toFixed(0)}%
              </span>
              <span className="text-[8px] font-bold text-indigo-300/80 uppercase">FIT SCORE</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Deterministic Composite Match</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Layer 1: {(match.scores.layer1StatedMatch * 100).toFixed(0)}% &bull; Layer 2 Reality: {(match.scores.layer2RealityMatch * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Quick Status Updater */}
          <div className="flex items-center gap-2">
            <select
              value={match.applicationStatus}
              onChange={(e) => onUpdateStatus(match.jobId, e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="NEW_MATCH">Status: New Match</option>
              <option value="APPLIED">Status: Applied</option>
              <option value="OA_RECEIVED">Status: OA Received</option>
              <option value="INTERVIEWING">Status: Interviewing</option>
              <option value="OFFER">Status: Offer Received</option>
              <option value="REJECTED">Status: Rejected</option>
            </select>

            <a
              href={match.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <span>Apply</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800">
          <button
            onClick={() => setActiveSubTab('breakdown')}
            className={`pb-2.5 px-1 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'breakdown'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Layer 1 & 2 Scoring Breakdown
          </button>
          <button
            onClick={() => setActiveSubTab('reality')}
            className={`pb-2.5 px-1 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'reality'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Company Reality Bar Profile
          </button>
          <button
            onClick={() => setActiveSubTab('resume-delta')}
            className={`pb-2.5 px-1 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'resume-delta'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dynamic Resume Delta</span>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {activeSubTab === 'breakdown' && (
            <div className="space-y-6">
              {/* Layer 1 Stated Vector Matching */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Layer 1: Stated JD Vector & Skill Match
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-indigo-400">
                    {(match.scores.layer1StatedMatch * 100).toFixed(0)}% Score
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Evaluated candidate's 768-dimensional resume embedding against normalized ATS job description tokens.
                </p>

                {/* Skills Match vs Missing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] font-bold text-emerald-400 block mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Matched Skills ({match.keyMatchedSkills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {match.keyMatchedSkills.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] font-bold text-amber-400 block mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Missing / Unstated Skills ({match.missingCriticalSkills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {match.missingCriticalSkills.length > 0 ? (
                        match.missingCriticalSkills.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No critical missing skills</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Layer 2 Reality Grounding */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Layer 2: Reality RAG & Informal Bar Alignment
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-amber-400">
                    {(match.scores.layer2RealityMatch * 100).toFixed(0)}% Score
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">
                    Ground Reality Check:
                  </span>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    "{match.matchExplanation}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'reality' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-purple-400" />
                  {match.company} Hiring Knowledge Profile
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Synthesized informal requirements based on recent interview passes, recruiter filters, and online OA formats.
                </p>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400">Company Classification Tier:</span>
                    <span className="text-xs font-bold text-indigo-400">{match.companyTier}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400">OA Assessment Format:</span>
                    <span className="text-xs font-bold text-amber-400">{match.oaDetails.platform} ({match.oaDetails.dsaDifficulty})</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400">Focus Areas:</span>
                    <span className="text-xs font-bold text-emerald-400">{match.oaDetails.focusAreas.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'resume-delta' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> Recommended Bullet Tailoring
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Targeted Tailoring
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Tailoring suggestions to maximize sub-vector cosine similarity for {match.company}'s ATS filters:
                </p>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/20 space-y-2 hover:border-emerald-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-emerald-400">
                      Recommendation
                    </span>
                    <button
                      onClick={() => handleCopyBullet(match.tailoringRecommendation)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedBullet === match.tailoringRecommendation ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Code2 className="w-3 h-3" />
                          <span>Copy to Clipboard</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 font-mono leading-relaxed">
                    "{match.tailoringRecommendation}"
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateStatus(match.jobId, 'APPLIED')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Mark Applied</span>
            </button>
            <a
              href={match.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <span>Apply on {match.atsProvider}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
