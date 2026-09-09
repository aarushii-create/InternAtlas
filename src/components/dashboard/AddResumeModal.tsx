import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  GraduationCap,
  Briefcase,
  Code2,
  Sliders,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { CandidateProfile, CandidateExperience, CandidateProject, addCustomCandidateProfile } from '../../lib/candidatePresets';

interface AddResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCandidateAdded: (newCandidate: CandidateProfile) => void;
  authToken?: string | null;
}

export const AddResumeModal: React.FC<AddResumeModalProps> = ({
  isOpen,
  onClose,
  onCandidateAdded,
  authToken,
}) => {
  const [creationMode, setCreationMode] = useState<'form' | 'upload' | 'paste'>('form');

  // Form States
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [school, setSchool] = useState<string>('');
  const [degree, setDegree] = useState<string>('B.S. in Computer Science (Class of 2026)');
  const [graduationYear, setGraduationYear] = useState<string>('2026');
  const [gpa, setGpa] = useState<string>('3.90 / 4.00');
  const [primaryTrack, setPrimaryTrack] = useState<string>('Full-Stack & Distributed Systems');
  const [skillInput, setSkillInput] = useState<string>('');
  const [skills, setSkills] = useState<string[]>([
    'Python',
    'TypeScript',
    'React',
    'Node.js',
    'PostgreSQL',
    'Docker',
    'Algorithms',
    'Data Structures',
  ]);

  // Experiences
  const [experiences, setExperiences] = useState<CandidateExperience[]>([
    {
      company: 'Tech Innovators Inc.',
      role: 'Software Engineering Intern',
      period: 'Summer 2025',
      bullets: [
        'Developed microservices handling 5,000 requests/sec with Node.js and PostgreSQL.',
        'Built automated CI/CD deployment pipeline using Docker and GitHub Actions.',
      ],
      technologies: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
    },
  ]);

  // Projects
  const [projects, setProjects] = useState<CandidateProject[]>([
    {
      title: 'Real-Time Collaborative Dashboard',
      description: 'Interactive analytics dashboard with live WebSocket syncing.',
      bullets: [
        'Implemented state synchronization with sub-50ms latency.',
        'Created responsive Tailwind UI with modular component architecture.',
      ],
      technologies: ['React', 'TypeScript', 'WebSockets', 'Tailwind CSS'],
      repoUrl: 'https://github.com/example/collab-dashboard',
    },
  ]);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddSkill = () => {
    if (!skillInput.trim()) return;
    const trimmed = skillInput.trim();
    if (!skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleAddExperience = () => {
    setExperiences([
      ...experiences,
      {
        company: 'New Company',
        role: 'Engineering Intern',
        period: 'Summer 2025',
        bullets: ['Contributed to high-throughput software features and unit testing.'],
        technologies: ['Python', 'SQL'],
      },
    ]);
  };

  const handleUpdateExperience = (index: number, updates: Partial<CandidateExperience>) => {
    const next = [...experiences];
    next[index] = { ...next[index], ...updates };
    setExperiences(next);
  };

  const handleRemoveExperience = (index: number) => {
    setExperiences(experiences.filter((_, idx) => idx !== index));
  };

  const handleAddProject = () => {
    setProjects([
      ...projects,
      {
        title: 'New Engineering Project',
        description: 'High-performance application solving real-world challenges.',
        bullets: ['Implemented core logic with unit test coverage and high throughput.'],
        technologies: ['Python', 'FastAPI', 'Redis'],
      },
    ]);
  };

  const handleUpdateProject = (index: number, updates: Partial<CandidateProject>) => {
    const next = [...projects];
    next[index] = { ...next[index], ...updates };
    setProjects(next);
  };

  const handleRemoveProject = (index: number) => {
    setProjects(projects.filter((_, idx) => idx !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);

      // If text or markdown file, read text
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setRawText(content);
        };
        reader.readAsText(file);
      }
    }
  };

  // AI-powered or heuristic extraction from pasted text / uploaded file
  const handleParseAndPopulate = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Please enter or paste your resume content first.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Try backend AI parser endpoint if available
      const res = await fetch('/api/resumes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: rawText }),
      });

      if (res.ok) {
        const parsed = await res.json();
        if (parsed.extracted) {
          if (parsed.extracted.education?.[0]) {
            setSchool(parsed.extracted.education[0].institution || school);
            setDegree(parsed.extracted.education[0].degree || degree);
            setGraduationYear(parsed.extracted.education[0].graduationYear || graduationYear);
          }
          if (parsed.extracted.skills && parsed.extracted.skills.length > 0) {
            setSkills(parsed.extracted.skills);
          }
          if (parsed.extracted.experience && parsed.extracted.experience.length > 0) {
            setExperiences(
              parsed.extracted.experience.map((e: any) => ({
                company: e.company || 'Company',
                role: e.role || 'Intern',
                period: e.duration || '2025',
                bullets: e.highlights || ['Built core software components.'],
                technologies: e.technologies || [],
              }))
            );
          }
          if (parsed.extracted.projects && parsed.extracted.projects.length > 0) {
            setProjects(
              parsed.extracted.projects.map((p: any) => ({
                title: p.title || 'Project',
                description: p.description || '',
                bullets: p.outcomes || [p.description || 'Developed key architecture.'],
                technologies: p.technologies || [],
              }))
            );
          }
        }
      } else {
        // Fallback local heuristic parsing for skills & lines
        extractHeuristicSkills(rawText);
      }

      setCreationMode('form');
    } catch (err: any) {
      extractHeuristicSkills(rawText);
      setCreationMode('form');
    } finally {
      setIsProcessing(false);
    }
  };

  const extractHeuristicSkills = (text: string) => {
    const commonSkills = [
      'Python', 'C++', 'Java', 'Go', 'Rust', 'TypeScript', 'JavaScript', 'React', 'Node.js',
      'Docker', 'Kubernetes', 'AWS', 'GCP', 'SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Kafka',
      'PyTorch', 'TensorFlow', 'CUDA', 'FastAPI', 'Spring Boot', 'GraphQL', 'Linux', 'Git',
      'Algorithms', 'Distributed Systems', 'System Design'
    ];
    const found = commonSkills.filter((s) => new RegExp(`\\b${s}\\b`, 'i').test(text));
    if (found.length > 0) {
      setSkills(Array.from(new Set([...skills, ...found])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Candidate full name is required.');
      return;
    }
    if (!school.trim()) {
      setErrorMsg('University or institution name is required.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const newCandidate = addCustomCandidateProfile({
        name: name.trim(),
        email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@university.edu`,
        school: school.trim(),
        degree: degree.trim(),
        graduationYear: graduationYear.trim(),
        gpa: gpa.trim(),
        primaryTrack: primaryTrack.trim(),
        skills: skills.length > 0 ? skills : ['Python', 'Algorithms', 'Data Structures', 'Git'],
        experience: experiences,
        projects: projects,
        rawText: rawText || `${name} | ${school} | Skills: ${skills.join(', ')}`,
        isPrimary: true,
      });

      // Optionally notify backend endpoint
      try {
        await fetch('/api/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-custom',
            tenantId: `tenant-${newCandidate.id}`,
            title: `${newCandidate.name} - Custom Resume`,
            content: newCandidate.rawText || '',
            extractedSkills: newCandidate.skills,
            parsedExperience: newCandidate.experience,
            isPrimary: true,
          }),
        });
      } catch (err) {
        // Safe fallback - local persistence is fully active
      }

      onCandidateAdded(newCandidate);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create candidate profile');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Add Your Custom Resume</h2>
              <p className="text-xs text-slate-400">
                Create or ingest your profile to instantly score 100+ target internship postings against your real background.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2 border-b border-slate-800/60 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setCreationMode('form')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              creationMode === 'form'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Interactive Form Builder</span>
          </button>
          <button
            type="button"
            onClick={() => setCreationMode('upload')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              creationMode === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document (PDF/DocX)</span>
          </button>
          <button
            type="button"
            onClick={() => setCreationMode('paste')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              creationMode === 'paste'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Paste Plaintext & Auto-Extract</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode 1: Upload File */}
          {creationMode === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-950/60 rounded-3xl p-8 text-center space-y-3 cursor-pointer transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {selectedFile ? selectedFile.name : 'Click to select or drag and drop your resume'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, TXT, or Markdown formats</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt,.md"
                  className="hidden"
                />
              </div>

              {rawText && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Extracted Text Preview:</label>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleParseAndPopulate}
                disabled={isProcessing || (!selectedFile && !rawText)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>Parsing with AI & Vectorizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Auto-Parse & Populate Form</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Mode 2: Paste Raw Text */}
          {creationMode === 'paste' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Paste Full Resume Text / Markdown:</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Jane Doe | jane.doe@university.edu | (555) 019-2834\nEducation: B.S. in Computer Science, University of Washington (GPA 3.91, 2026)\nSkills: Python, TypeScript, React, Docker, SQL, Machine Learning\nExperience:\n- Software Intern @ Stripe: Built payment APIs in Go handling 10k QPS\nProjects:\n- Distributed Search Engine: Inverted index in Rust`}
                  rows={10}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleParseAndPopulate}
                disabled={isProcessing || !rawText.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>Analyzing Resume Locally...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Credentials & Fill Builder</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Mode 3: Interactive Structured Form */}
          {creationMode === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal & Academic Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  <span>Candidate Identity & Education</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aarushi Sharma"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. aarushi.sharma@example.edu"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1.5">University / College *</label>
                    <input
                      type="text"
                      required
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="e.g. Carnegie Mellon University / IIT Delhi / Stanford"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1.5">GPA (Optional)</label>
                    <input
                      type="text"
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      placeholder="e.g. 3.92 / 4.00 or 9.5 / 10"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1.5">Degree & Major</label>
                    <input
                      type="text"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      placeholder="e.g. B.S. in Computer Science (Class of 2026)"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1.5">Target Engineering Track</label>
                    <select
                      value={primaryTrack}
                      onChange={(e) => setPrimaryTrack(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Full-Stack & Distributed Systems">Full-Stack & Distributed Systems</option>
                      <option value="Systems, Low-Latency & Quantitative Engineering">Systems, Low-Latency & Quant</option>
                      <option value="AI/ML, Foundation Models & Deep Learning">AI/ML & Foundation Models</option>
                      <option value="Cloud Infrastructure & DevOps">Cloud Infrastructure & DevOps</option>
                      <option value="Mobile & Cross-Platform (iOS/Android)">Mobile Engineering</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Skills Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <span>Technical Skills & Multi-Vectors ({skills.length})</span>
                </h3>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Type skill (e.g. Rust, PyTorch, Go, Kafka) and press Enter"
                    className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Skill</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 min-h-[56px]">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Work Experience */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    <span>Work Experience ({experiences.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddExperience}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Experience Entry</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {experiences.map((exp, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => handleUpdateExperience(idx, { company: e.target.value })}
                          placeholder="Company Name"
                          className="font-bold text-xs bg-transparent border-b border-slate-800 focus:border-indigo-500 text-white pb-1 focus:outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={exp.period}
                            onChange={(e) => handleUpdateExperience(idx, { period: e.target.value })}
                            placeholder="Period (e.g. Summer 2025)"
                            className="text-[11px] text-slate-400 bg-transparent border-b border-slate-800 text-right focus:outline-none pb-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExperience(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={exp.role}
                        onChange={(e) => handleUpdateExperience(idx, { role: e.target.value })}
                        placeholder="Role / Title (e.g. SWE Intern)"
                        className="w-full text-xs text-indigo-300 bg-transparent border-b border-slate-800/60 pb-1 focus:outline-none"
                      />

                      <textarea
                        value={exp.bullets.join('\n')}
                        onChange={(e) =>
                          handleUpdateExperience(idx, {
                            bullets: e.target.value.split('\n').filter((b) => b.trim().length > 0),
                          })
                        }
                        placeholder="Key impact bullets (one per line)"
                        rows={2}
                        className="w-full text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 font-sans"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Engineering Projects ({projects.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Project</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {projects.map((proj, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={proj.title}
                          onChange={(e) => handleUpdateProject(idx, { title: e.target.value })}
                          placeholder="Project Title"
                          className="font-bold text-xs bg-transparent border-b border-slate-800 focus:border-indigo-500 text-white pb-1 focus:outline-none flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveProject(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={proj.description}
                        onChange={(e) => handleUpdateProject(idx, { description: e.target.value })}
                        placeholder="Brief summary of architecture & goals"
                        className="w-full text-xs text-slate-300 bg-transparent border-b border-slate-800/60 pb-1 focus:outline-none"
                      />

                      <textarea
                        value={proj.bullets.join('\n')}
                        onChange={(e) =>
                          handleUpdateProject(idx, {
                            bullets: e.target.value.split('\n').filter((b) => b.trim().length > 0),
                          })
                        }
                        placeholder="Project impact & latency/scale metrics (one per line)"
                        rows={2}
                        className="w-full text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Cpu className="w-4 h-4 animate-spin" />
                      <span>Saving Profile & Vectorizing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save & Activate This Resume</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
