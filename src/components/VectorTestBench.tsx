import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Cpu,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Target,
  FileText,
  Briefcase,
  BarChart3,
} from 'lucide-react';

export const VectorTestBench: React.FC = () => {
  const [resumeText, setResumeText] = useState<string>(
    `Alex Rivera - B.S. Computer Science Stanford University.
Skills: C++, Python, TypeScript, React, Express, PyTorch, Distributed Systems, SQL, Docker, Redis.
Experience: SWE Intern at Palantir - Built distributed C++ query engine and PyTorch vector anomaly detector.`
  );

  const [jobText, setJobText] = useState<string>(
    `Goldman Sachs - Software Engineering Summer Analyst 2026.
Requirements: C++, Java, Python, SQL, Data Structures & Algorithms.
Informal Bar: Hackerrank 2 Hard Problems (Dynamic Programming & Graph Shortest Path). Low-latency C++ interest preferred.`
  );

  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);

  const handleComputeSimilarity = async () => {
    setCalculating(true);
    try {
      const res = await fetch('/api/vectors/similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          jobText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCalcResult(data);
      }
    } catch (err) {
      console.error('Vector computation error:', err);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              768-Dim Vector Similarity & 2-Layer RAG Calculator
            </h2>
            <p className="text-xs text-slate-400">
              Test cosine similarity between Candidate Resume Vector and Target Job Embedding.
            </p>
          </div>
        </div>

        <button
          onClick={handleComputeSimilarity}
          disabled={calculating}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{calculating ? 'Computing Vectors...' : 'Compute Cosine Similarity & Scores'}</span>
        </button>
      </div>

      {/* Input Editors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate Resume Text Input */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200">Candidate Resume Text / Skills</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Vector A Target
            </span>
          </div>

          <textarea
            rows={6}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-xs leading-relaxed focus:border-emerald-500 focus:outline-none"
            placeholder="Paste candidate resume text or skill set..."
          />
        </div>

        {/* Job Posting & Expectations Input */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200">Job Description & Informal Bar</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Vector B Target
            </span>
          </div>

          <textarea
            rows={6}
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-xs leading-relaxed focus:border-cyan-500 focus:outline-none"
            placeholder="Paste job posting details and company informal bar requirements..."
          />
        </div>
      </div>

      {/* Results View */}
      {calcResult ? (
        <div className="bg-slate-900 p-6 rounded-2xl border border-indigo-500/40 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Vector Calculation Output
              </span>
              <h3 className="text-lg font-bold text-slate-100 font-mono flex items-center gap-2">
                Cosine Similarity Result
              </h3>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Raw Cosine Distance</span>
                <span className="text-lg font-mono font-bold text-emerald-400">
                  {calcResult.cosineSimilarity}
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 font-mono text-2xl font-black">
                {calcResult.matchPercentage}%
              </div>
            </div>
          </div>

          {/* 2-Layer Score Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Layer 1 Fit Card */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> Layer 1: Stated Requirement Fit
                </span>
                <span className="font-mono text-sm font-bold text-blue-300">
                  {(calcResult.layer1EstimatedFit * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Measures keyword match ratio and stated resume skills against explicit job description requirements.
              </p>
            </div>

            {/* Layer 2 Fit Card */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <Target className="w-4 h-4" /> Layer 2: Informal Company Bar Fit
                </span>
                <span className="font-mono text-sm font-bold text-purple-300">
                  {(calcResult.layer2InformalBarFit * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Evaluates candidate experience against unstated company standards (real DSA bar, OA patterns, low latency, system design).
              </p>
            </div>
          </div>

          {/* Raw Embedding Floats Preview */}
          <div className="space-y-3 font-mono text-xs">
            <h4 className="text-slate-300 font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              768-Dimensional Vector Embeddings Sample (First 10 Dimensions)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-emerald-400 font-bold block">Resume Embedding Vector (768 Float Array)</span>
                <div className="text-slate-400 break-all leading-relaxed">
                  [{calcResult.vectorAPreview?.map((n: number) => n.toFixed(4)).join(', ')}...]
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-cyan-400 font-bold block">Job Embedding Vector (768 Float Array)</span>
                <div className="text-slate-400 break-all leading-relaxed">
                  [{calcResult.vectorBPreview?.map((n: number) => n.toFixed(4)).join(', ')}...]
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 text-center space-y-2">
          <p className="text-slate-300 font-medium">Click "Compute Cosine Similarity & Scores" above to run the 768-dimensional vector engine.</p>
        </div>
      )}
    </div>
  );
};
