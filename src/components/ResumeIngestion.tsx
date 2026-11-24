import React, { useState, useRef, useEffect } from 'react';
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
  Trash2,
} from 'lucide-react';
import { User, ParsedResumeData, Resume } from '../types';

interface ResumeIngestionProps {
  currentUser: User | null;
  authToken: string | null;
  onResumeSaved?: () => void;
}

export const ResumeIngestion: React.FC<ResumeIngestionProps> = ({
  currentUser,
  authToken,
  onResumeSaved,
}) => {
  const [resumeText, setResumeText] = useState<string>('');
  const [resumeTitle, setResumeTitle] = useState<string>('');
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
  const [savedResumes, setSavedResumes] = useState<Resume[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshSavedResumes = async () => {
    const response = await fetch('/api/resumes');
    if (!response.ok) throw new Error('Could not load your saved resumes.');
    const data = await response.json();
    setSavedResumes(data.resumes);
  };

  useEffect(() => {
    void refreshSavedResumes().catch((error: unknown) => {
      setParsingError(error instanceof Error ? error.message : 'Could not load your saved resumes.');
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setResumeTitle(file.name);
      setParsedData(null);
      setVectors(null);

      if (file.type === 'text/plain' || file.type === 'text/markdown' || /\.(txt|md)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setResumeText(event.target.result as string);
          }
        };
        reader.readAsText(file);
      } else {
        setResumeText('');
      }
    }
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
      if (data.rawText) setResumeText(data.rawText);
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
      await refreshSavedResumes();
      setSaveSuccessMsg('Resume and 3 structural vectors persisted to database successfully!');
      if (onResumeSaved) onResumeSaved();
    } catch (err: any) {
      setParsingError(err.message || 'Error saving resume to database');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!window.confirm('Permanently delete this saved resume and its derived match records?')) return;
    try {
      const response = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete this resume.');
      setSavedResumes((resumes) => resumes.filter((resume) => resume.id !== resumeId));
      if (savedResume?.id === resumeId) setSavedResume(null);
      onResumeSaved?.();
    } catch (error: unknown) {
      setParsingError(error instanceof Error ? error.message : 'Could not delete this resume.');
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
                Resume text extraction
              </h2>
              <p className="text-xs text-slate-400">
                Local rule-based extraction only. The parser does not invent missing experience, projects, education, or metrics.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5" /> Processed locally; not sent to an AI provider
          </span>
        </div>

        {/* File Input */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-300">Upload a resume or paste its text:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PDF / DOCX / TXT / MD</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Files are limited to 10 MB. Your resume is parsed on this server and is not submitted to Gemini or another AI provider.
            {currentUser && <> This resume will be saved to {currentUser.fullName}&apos;s account.</>}
          </p>
        </div>

        {/* Text Area Content Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-300">Resume text</label>
            <span className="font-mono text-slate-500">{resumeText.length} characters</span>
          </div>

          <textarea
            rows={5}
            value={resumeText}
            onChange={(e) => {
              setResumeText(e.target.value);
              setSelectedFile(null);
            }}
            placeholder="Paste resume text or choose a supported file above..."
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs p-3 rounded-2xl focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Local parsing action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Extracts explicitly labeled content and creates local deterministic vectors.
          </p>

          <button
            onClick={handleParseResume}
            disabled={isParsing || (!selectedFile && !resumeText.trim())}
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

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-200">Your saved resumes</h3>
          <button
            type="button"
            onClick={() => void refreshSavedResumes().catch((error: unknown) => {
              setParsingError(error instanceof Error ? error.message : 'Could not load your saved resumes.');
            })}
            className="text-xs text-indigo-300 hover:text-indigo-200"
          >
            Refresh
          </button>
        </div>
        {savedResumes.length === 0 ? (
          <p className="text-xs text-slate-500">No resumes are saved to this account.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {savedResumes.map((resume) => (
              <li key={resume.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-xs text-slate-300">{resume.title}</span>
                <button
                  type="button"
                  onClick={() => void handleDeleteResume(resume.id)}
                  aria-label={`Delete ${resume.title}`}
                  className="shrink-0 rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
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
            <p className="text-xs text-slate-400">
              Extracted fields are based on text present in the document. No missing values are filled with sample candidate data.
              {parsedData.inferences && parsedData.inferences.length > 0
                ? ` Inferred fields: ${parsedData.inferences.join(', ')}.`
                : ' No inferred fields were added.'}
            </p>

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
              <span className="text-xs font-bold text-slate-300 block">Text extracted from the skills section:</span>
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
              {parsedData.skills.length === 0 && <p className="text-xs text-slate-500">No skills section was identified.</p>}
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
                    {parsedData.experience.length === 0 && <p className="text-xs text-slate-500">No clearly labeled role and employer entries were identified.</p>}
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
                      <span className="text-[10px] font-mono text-emerald-400 block font-bold">Resume bullet text:</span>
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
                    {parsedData.metrics.totalYearsExperience === undefined
                      ? 'Not stated'
                      : `${parsedData.metrics.totalYearsExperience} yrs`}
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
                {parsedData.metrics.impactKeywords.length === 0 && (
                  <p className="text-xs text-slate-500">No metric or keyword values are inferred by this parser.</p>
                )}
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
              {parsedData.education.length === 0 && <p className="text-xs text-slate-500">No explicit degree, GPA, or graduation-year details were identified.</p>}
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
