import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Database,
  Code2,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { User, ParsedResumeData, Resume } from '../types';

interface ResumeIngestionProps {
  currentUser: User | null;
  authToken: string | null;
  onResumeSaved?: () => void;
}

const SAMPLE_RESUMES = [
  {
    title: 'Alex Rivera - Stanford CS Resume',
    content: `Alex Rivera | alex.rivera@stanford.edu | github.com/arivera
Education: B.S. in Computer Science, Stanford University (GPA 3.92, Class of 2026)
Coursework: Distributed Systems, Compilers, Machine Learning, Operating Systems, Data Structures & Algorithms.

Technical Skills:
Languages: C++, Python, TypeScript, Go, SQL, Rust
Frameworks: React, Express, PyTorch, Docker, Kubernetes, Tailwind, PostgreSQL, pgvector
Concepts: Distributed Consensus, High-Performance Networking, Vector Embeddings, RAG Architectures

Experience:
Systems Engineering Intern @ Databricks (Summer 2025)
- Engineered a C++ query optimizer caching layer that reduced P99 latency by 42% across 100,000+ daily queries.
- Built automated benchmark harness in Python and Docker to measure vector search precision on 768-dim datasets.

Software Engineering Intern @ Stripe (Summer 2024)
- Architected idempotency middleware for payment dispatches handling 15,000 requests/sec with zero duplicate executions.
- Refactored legacy Go microservices, improving throughput by 28% and eliminating memory leaks.

Projects:
AI Internship Scout (2026): Multi-tenant 2-layer RAG matching engine using pgvector and deterministic local processing.
Distributed Key-Value Store (2025): Built Raft consensus algorithm in Go with 99.99% fault tolerance in chaos testing.`,
  },
  {
    title: 'Jordan Chen - UC Berkeley EECS Resume',
    content: `Jordan Chen | jordan.chen@berkeley.edu | github.com/jchen-eecs
Education: B.S. in Electrical Engineering & Computer Sciences, UC Berkeley (GPA 3.88, Class of 2026)

Technical Skills:
Languages: Python, Java, C, C++, TypeScript, SQL
AI/ML: PyTorch, TensorFlow, HuggingFace, CUDA, Vector Databases, ONNX
Tools: Git, Linux, Docker, AWS (S3, EC2, Lambda), Redis, FastAPI

Experience:
AI Research Intern @ OpenAI (Summer 2025)
- Fine-tuned 7B parameter Transformer models for code generation, achieving a 14% improvement on HumanEval benchmark.
- Implemented FlashAttention-2 GPU kernel integrations in PyTorch to cut training memory footprint by 35%.

Backend Developer Intern @ Goldman Sachs (Summer 2024)
- Developed low-latency FIX protocol trade ingestion engine handling $50M+ daily volume.
- Migrated legacy Java monolith services to Dockerized Spring Boot microservices with Kafka streams.

Projects:
GPU-Accelerated Neural Engine: CUDA implementation of convolution operations with 3.2x speedup over PyTorch CPU.
Real-Time Market Data Feed: Low-latency WebSocket parser in Rust processing 50,000 tick updates/sec.`,
  },
];

export const ResumeIngestion: React.FC<ResumeIngestionProps> = ({
  currentUser,
  authToken,
  onResumeSaved,
}) => {
  const [selectedSample, setSelectedSample] = useState<number | null>(0);
  const [resumeText, setResumeText] = useState<string>(SAMPLE_RESUMES[0].content);
  const [resumeTitle, setResumeTitle] = useState<string>(SAMPLE_RESUMES[0].title);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsingError, setParsingError] = useState<string | null>(null);

  // Parsing Result
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [vectors, setVectors] = useState<{
    fullTextVector: number[];
    skillsVector: number[];
    experienceVector: number[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    'skills' | 'experience' | 'projects' | 'metrics' | 'education' | 'vectors' | 'json'
  >('skills');

  // DB Persistence
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedResume, setSavedResume] = useState<Resume | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setResumeTitle(file.name);
      setSelectedSample(null);

      // If text file, read content preview
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setResumeText(event.target.result as string);
          }
        };
        reader.readAsText(file);
      } else {
        setResumeText(`[Binary File Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\nParsing pipeline will process PDF/DocX text using binary text extractors on backend.`);
      }
    }
  };

  const handleSampleSelect = (index: number) => {
    setSelectedSample(index);
    setSelectedFile(null);
    setResumeTitle(SAMPLE_RESUMES[index].title);
    setResumeText(SAMPLE_RESUMES[index].content);
  };

  // Run the local deterministic parsing pipeline.
  const handleParseResume = async () => {
    setIsParsing(true);
    setParsingError(null);
    setSavedResume(null);
    setSaveSuccessMsg(null);

    try {
      let res: Response;

      if (selectedFile) {
        // Multipart file upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', resumeTitle);

        res = await fetch('/api/resumes/parse', {
          method: 'POST',
          body: formData,
        });
      } else {
        // JSON body string payload
        res = await fetch('/api/resumes/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: resumeTitle,
            rawText: resumeText,
          }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to parse resume');
      }

      setParsedData(data.parsedData);
      setVectors(data.vectors);
      if (data.rawText && selectedFile) {
        setResumeText(data.rawText);
      }
    } catch (err: any) {
      setParsingError(err.message || 'Error executing AI resume parsing');
    } finally {
      setIsParsing(false);
    }
  };

  // Save Parsed Resume and Structural Multi-Vectors to DB
  const handleSaveToDatabase = async () => {
    if (!authToken) {
      setParsingError('Please sign in to save parsed resumes to your database tenant.');
      return;
    }

    if (!parsedData || !vectors) {
      setParsingError('No parsed resume data available to save.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg(null);
    setParsingError(null);

    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: resumeTitle,
          rawText: resumeText,
          parsedData,
          isPrimary: true,
          fullTextVector: vectors.fullTextVector,
          skillsVector: vectors.skillsVector,
          experienceVector: vectors.experienceVector,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save resume to database');
      }

      setSavedResume(data.resume);
      setSaveSuccessMsg('Resume and 3 structural vectors persisted to database successfully!');
      if (onResumeSaved) onResumeSaved();
    } catch (err: any) {
      setParsingError(err.message || 'Error saving resume to database');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header Card */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-3xl border border-indigo-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Phase 3: Resume Ingestion & Structural Vectorization
              </h2>
              <p className="text-xs text-slate-400">
                Local extraction into modular JSON schemas and 768-dimensional multi-vector embeddings.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5" /> Structured Output Schema Active
          </span>
        </div>

        {/* File Input & Sample Preset Selection Bar */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-300">1. Select Candidate Resume Source:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PDF / DocX / TXT File</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.doc,.txt,.md"
                className="hidden"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_RESUMES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSampleSelect(idx)}
                className={`p-3 rounded-2xl border text-left space-y-1 transition-all cursor-pointer ${
                  selectedSample === idx
                    ? 'bg-indigo-600/20 border-indigo-500 text-slate-100 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300">{sample.title}</span>
                  {selectedSample === idx && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <span className="text-[10px] text-slate-500 block truncate font-mono">
                  {sample.content.slice(0, 80)}...
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Area Content Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-300">Unstructured Resume Raw Text Payload</label>
            <span className="font-mono text-slate-500">{resumeText.length} characters</span>
          </div>

          <textarea
            rows={5}
            value={resumeText}
            onChange={(e) => {
              setResumeText(e.target.value);
              setSelectedSample(null);
            }}
            placeholder="Paste raw unstructured resume text or upload PDF/DocX file..."
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs p-3 rounded-2xl focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* AI Parsing Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Runs structured JSON parsing plus three deterministic structural vectors.
          </p>

          <button
            onClick={handleParseResume}
            disabled={isParsing || !resumeText.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            {isParsing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Parsing Resume Locally...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Execute Structural Vectorization</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {parsingError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{parsingError}</span>
        </div>
      )}

      {/* Success Alert */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Parsed Results Section */}
      {parsedData && vectors && (
        <div className="bg-slate-900 rounded-3xl border border-indigo-500/30 p-5 sm:p-6 shadow-2xl space-y-6 animate-fadeIn">
          {/* Header & Database Persist Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-slate-100">Structured Data & Multi-Vector Extraction</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveToDatabase}
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Database className="w-4 h-4" />
                <span>{isSaving ? 'Persisting to DB...' : 'Save to Tenant Database'}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab('skills')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'skills'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Skills ({parsedData.skills.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('experience')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'experience'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Experience ({parsedData.experience.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Projects ({parsedData.projects.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'metrics'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Impact Metrics</span>
            </button>

            <button
              onClick={() => setActiveTab('education')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'education'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Education</span>
            </button>

            <button
              onClick={() => setActiveTab('vectors')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'vectors'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-300" />
              <span>Modular Vectors (3x 768d)</span>
            </button>

            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Raw JSON</span>
            </button>
          </div>

          {/* TAB 1: Skills */}
          {activeTab === 'skills' && (
            <div className="space-y-3 animate-fadeIn">
              <span className="text-xs font-bold text-slate-300 block">Extracted Technical Skills & Frameworks:</span>
              <div className="flex flex-wrap gap-2">
                {parsedData.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-mono font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Experience */}
          {activeTab === 'experience' && (
            <div className="space-y-4 animate-fadeIn">
              {parsedData.experience.map((exp, idx) => (
                <div key={idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-sm font-bold text-indigo-300">{exp.role}</span>
                    <span className="text-xs font-mono text-emerald-400">{exp.company} &bull; {exp.duration}</span>
                  </div>

                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {exp.highlights.map((h, hIdx) => (
                      <li key={hIdx}>{h}</li>
                    ))}
                  </ul>

                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {exp.technologies.map((tech, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px] font-mono">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Projects */}
          {activeTab === 'projects' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
              {parsedData.projects.map((proj, idx) => (
                <div key={idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-sm font-bold text-cyan-300 block">{proj.title}</span>
                  <p className="text-xs text-slate-300">{proj.description}</p>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 block">Tech Stack:</span>
                    <div className="flex flex-wrap gap-1">
                      {proj.technologies.map((tech, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-md text-[10px] font-mono">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {proj.outcomes && proj.outcomes.length > 0 && (
                    <div className="space-y-1 border-t border-slate-900 pt-2">
                      <span className="text-[10px] font-mono text-emerald-400 block font-bold">Key Outcomes:</span>
                      <ul className="list-disc list-inside text-[11px] text-slate-400">
                        {proj.outcomes.map((out, oIdx) => (
                          <li key={oIdx}>{out}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: Impact Metrics */}
          {activeTab === 'metrics' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Latency Reduction</span>
                  <span className="text-sm font-bold text-amber-400 font-mono">
                    {parsedData.metrics.latencyReduction || 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-cyan-500/30 space-y-1">
                  <span className="text-[10px] text-slate-400 block">System Scale</span>
                  <span className="text-sm font-bold text-cyan-400 font-mono">
                    {parsedData.metrics.systemScale || 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] text-slate-400 block">GPA Metric</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {parsedData.metrics.gpa || 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-indigo-500/30 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Years Experience</span>
                  <span className="text-sm font-bold text-indigo-400 font-mono">
                    {parsedData.metrics.totalYearsExperience ?? 1} yrs
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 block">Impact & Action Keywords:</span>
                <div className="flex flex-wrap gap-1.5">
                  {parsedData.metrics.impactKeywords.map((kw, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-mono">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Education */}
          {activeTab === 'education' && (
            <div className="space-y-3 animate-fadeIn">
              {parsedData.education.map((edu, idx) => (
                <div key={idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-slate-200 block">{edu.institution}</span>
                    <span className="text-xs text-indigo-400 block">{edu.degree}</span>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-emerald-400 block font-bold">Graduation: {edu.graduationYear}</span>
                    {edu.gpa && <span className="text-slate-400 block text-[11px]">GPA: {edu.gpa}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: Modular Vectors Breakdown */}
          {activeTab === 'vectors' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-950 rounded-2xl border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-cyan-400 font-bold">1. Full Resume Vector Embedding (768d)</span>
                  <span className="text-slate-500">Dimensions: {vectors.fullTextVector.length}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Global semantic vector representing candidate experience, coursework, and broad fit.
                </p>
                <div className="p-2 bg-slate-900 rounded-xl font-mono text-[10px] text-cyan-300/80 truncate">
                  [{vectors.fullTextVector.slice(0, 10).map((n) => n.toFixed(4)).join(', ')}, ...]
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-indigo-400 font-bold">2. Modular Skills Vector (768d)</span>
                  <span className="text-slate-500">Dimensions: {vectors.skillsVector.length}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Isolated technical skill space for precise programming language and framework matching.
                </p>
                <div className="p-2 bg-slate-900 rounded-xl font-mono text-[10px] text-indigo-300/80 truncate">
                  [{vectors.skillsVector.slice(0, 10).map((n) => n.toFixed(4)).join(', ')}, ...]
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-emerald-400 font-bold">3. Modular Experience Vector (768d)</span>
                  <span className="text-slate-500">Dimensions: {vectors.experienceVector.length}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Work history & achievement vector space for evaluating company bar and scale metrics.
                </p>
                <div className="p-2 bg-slate-900 rounded-xl font-mono text-[10px] text-emerald-300/80 truncate">
                  [{vectors.experienceVector.slice(0, 10).map((n) => n.toFixed(4)).join(', ')}, ...]
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Raw JSON */}
          {activeTab === 'json' && (
            <pre className="p-4 bg-slate-950 text-indigo-300 font-mono text-xs rounded-2xl border border-slate-800 max-h-96 overflow-y-auto leading-relaxed">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
