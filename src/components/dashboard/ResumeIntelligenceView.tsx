import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Zap,
  Cpu,
  Layers,
  CheckCircle2,
  Plus,
  Trash2,
  Activity,
  Code2,
  TrendingUp,
  RefreshCw,
  Edit3,
  GraduationCap,
  Briefcase,
  ExternalLink,
  ChevronDown,
  User,
  Sliders,
  Check,
  X,
} from 'lucide-react';
import { ResumeEvolutionStudio } from '../ResumeEvolutionStudio';
import { ResumeIngestion } from '../ResumeIngestion';
import { AddResumeModal } from './AddResumeModal';
import {
  CandidateProfile,
  getStoredCandidateProfiles,
  getActiveCandidateProfile,
  setActiveCandidateProfile,
  updateCandidateProfile,
  deleteCustomCandidateProfile,
  PRESET_CANDIDATES,
} from '../../lib/candidatePresets';
import { User as UserType } from '../../types';

interface ResumeIntelligenceViewProps {
  activeCandidate?: CandidateProfile;
  onSelectCandidate?: (candidate: CandidateProfile) => void;
  currentUser?: UserType | null;
  authToken?: string | null;
}

export const ResumeIntelligenceView: React.FC<ResumeIntelligenceViewProps> = ({
  activeCandidate: propActiveCandidate,
  onSelectCandidate: propOnSelectCandidate,
  currentUser,
  authToken,
}) => {
  const [candidatesList, setCandidatesList] = useState<CandidateProfile[]>(getStoredCandidateProfiles());
  const [candidate, setCandidate] = useState<CandidateProfile>(
    propActiveCandidate || getActiveCandidateProfile()
  );
  const [activeSubSection, setActiveSubSection] = useState<'profile' | 'all-candidates' | 'delta-studio' | 'upload'>('profile');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingSkill, setEditingSkill] = useState<string>('');
  const [isAddingSkill, setIsAddingSkill] = useState<boolean>(false);
  const [inlineFeedback, setInlineFeedback] = useState<string | null>(null);

  // Sync state if prop changes
  useEffect(() => {
    if (propActiveCandidate) {
      setCandidate(propActiveCandidate);
    }
  }, [propActiveCandidate]);

  const refreshCandidates = () => {
    const list = getStoredCandidateProfiles();
    setCandidatesList(list);
    const active = getActiveCandidateProfile();
    setCandidate(active);
  };

  const handleSwitchCandidate = (selected: CandidateProfile) => {
    const activated = setActiveCandidateProfile(selected.id);
    setCandidate(activated);
    refreshCandidates();
    if (propOnSelectCandidate) {
      propOnSelectCandidate(activated);
    }
    setInlineFeedback(`Switched active candidate resume to ${activated.name}!`);
    setTimeout(() => setInlineFeedback(null), 4000);
  };

  const handleCandidateAdded = (newCandidate: CandidateProfile) => {
    refreshCandidates();
    setCandidate(newCandidate);
    if (propOnSelectCandidate) {
      propOnSelectCandidate(newCandidate);
    }
    setInlineFeedback(`Activated new custom resume for ${newCandidate.name}!`);
    setTimeout(() => setInlineFeedback(null), 4000);
  };

  const handleDeleteCandidate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const fallback = deleteCustomCandidateProfile(id);
    refreshCandidates();
    setCandidate(fallback);
    if (propOnSelectCandidate) {
      propOnSelectCandidate(fallback);
    }
    setInlineFeedback('Custom candidate profile removed.');
    setTimeout(() => setInlineFeedback(null), 4000);
  };

  const handleAddInlineSkill = () => {
    if (!editingSkill.trim()) return;
    const trimmed = editingSkill.trim();
    if (!candidate.skills.includes(trimmed)) {
      const updatedSkills = [...candidate.skills, trimmed];
      const updated = updateCandidateProfile(candidate.id, { skills: updatedSkills });
      if (updated) {
        setCandidate(updated);
        refreshCandidates();
        if (propOnSelectCandidate) propOnSelectCandidate(updated);
        setInlineFeedback(`Added skill "${trimmed}" and regenerated 768-dim sub-vector.`);
        setTimeout(() => setInlineFeedback(null), 4000);
      }
    }
    setEditingSkill('');
    setIsAddingSkill(false);
  };

  const handleRemoveInlineSkill = (skillToRemove: string) => {
    const updatedSkills = candidate.skills.filter((s) => s !== skillToRemove);
    const updated = updateCandidateProfile(candidate.id, { skills: updatedSkills });
    if (updated) {
      setCandidate(updated);
      refreshCandidates();
      if (propOnSelectCandidate) propOnSelectCandidate(updated);
      setInlineFeedback(`Removed skill "${skillToRemove}".`);
      setTimeout(() => setInlineFeedback(null), 3000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Resume Intelligence & Modular Embeddings
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active: {candidate.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              768-dimensional dense vector embeddings with sub-vector delta patching and dynamic multi-candidate testing.
            </p>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setActiveSubSection('profile')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubSection === 'profile'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Profile
          </button>
          <button
            onClick={() => setActiveSubSection('all-candidates')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubSection === 'all-candidates'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Switch Profile ({candidatesList.length})
          </button>
          <button
            onClick={() => setActiveSubSection('delta-studio')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubSection === 'delta-studio'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-cyan-300" />
            <span>Delta Evolution</span>
          </button>
          <button
            onClick={() => setActiveSubSection('upload')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubSection === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Ingest
          </button>
        </div>
      </div>

      {/* Notification feedback banner */}
      {inlineFeedback && (
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>{inlineFeedback}</span>
        </div>
      )}

      {/* Candidate Quick Switcher Bar */}
      <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Active Resume:
          </span>
          {candidatesList.map((c) => {
            const isActive = c.id === candidate.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSwitchCandidate(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/40'
                    : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <span>{c.name}</span>
                {c.isCustom && (
                  <span className="text-[9px] px-1 py-0.2 bg-purple-500/30 text-purple-200 rounded">
                    Custom
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Your Resume</span>
        </button>
      </div>

      {/* Sub Section 1: Active Candidate Profile */}
      {activeSubSection === 'profile' && (
        <div className="space-y-6">
          {/* Candidate Overview Card */}
          <div className="p-6 rounded-3xl bg-slate-900/70 backdrop-blur-md border border-slate-800/80 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">{candidate.name}</h3>
                  {candidate.isCustom ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      User Custom Profile
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Elite Engineering Preset
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {candidate.degree} &bull; <span className="text-indigo-400 font-semibold">{candidate.school}</span> (GPA {candidate.gpa})
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-semibold text-slate-300 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    Track: {candidate.primaryTrack}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {candidate.email}
                  </span>
                </div>
              </div>

              <div className="sm:text-right bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                <span className="text-xs font-mono text-cyan-400 block font-bold">768-dim Dense Vector</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Model: text-embedding-004</span>
                <span className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center sm:justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Sub-vectors Synchronized
                </span>
              </div>
            </div>

            {/* Extracted Skills Cloud with Inline Editing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <span>Parsed Skills Vector ({candidate.skills.length} skills):</span>
                </span>
                {!isAddingSkill ? (
                  <button
                    onClick={() => setIsAddingSkill(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Skill</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingSkill}
                      onChange={(e) => setEditingSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddInlineSkill();
                        if (e.key === 'Escape') setIsAddingSkill(false);
                      }}
                      placeholder="Skill name..."
                      autoFocus
                      className="px-2.5 py-1 bg-slate-950 border border-indigo-500 rounded-lg text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={handleAddInlineSkill}
                      className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsAddingSkill(false)}
                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <span
                    key={skill}
                    className="group px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5 transition-colors"
                  >
                    <span>{skill}</span>
                    <button
                      onClick={() => handleRemoveInlineSkill(skill)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition-opacity cursor-pointer"
                      title="Remove skill"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Experience Highlights */}
            {candidate.experience && candidate.experience.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span>Work & Research Experience:</span>
                </span>
                <div className="space-y-3">
                  {candidate.experience.map((exp, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <span className="text-xs font-bold text-white">{exp.role}</span>
                          <span className="text-xs text-indigo-400 font-semibold ml-1.5">&bull; {exp.company}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{exp.period}</span>
                      </div>
                      <ul className="space-y-1 mt-2">
                        {exp.bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects Highlights */}
            {candidate.projects && candidate.projects.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Key Engineering Projects:</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {candidate.projects.map((proj, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{proj.title}</span>
                        {proj.repoUrl && (
                          <a
                            href={proj.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 text-[10px] flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Code</span>
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{proj.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {proj.technologies.map((tech) => (
                          <span key={tech} className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub Section 2: All Candidate Profiles Grid */}
      {activeSubSection === 'all-candidates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">All Candidate Profiles</h3>
              <p className="text-xs text-slate-400">Switch active candidate to re-score all 100+ target internship matches instantly.</p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Resume</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {candidatesList.map((c) => {
              const isActive = c.id === candidate.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSwitchCandidate(c)}
                  className={`p-5 rounded-3xl border text-left transition-all cursor-pointer space-y-4 relative ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500/80 ring-2 ring-indigo-500/30 shadow-xl'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white">{c.name}</h4>
                        {isActive && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-indigo-400 font-medium">{c.school}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{c.degree}</p>
                    </div>

                    {c.isCustom && (
                      <button
                        onClick={(e) => handleDeleteCandidate(c.id, e)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete custom profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Target Track:
                    </span>
                    <span className="text-xs text-slate-200 block font-medium">
                      {c.primaryTrack}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Key Skills ({c.skills.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {c.skills.slice(0, 5).map((s) => (
                        <span key={s} className="px-2 py-0.5 text-[10px] rounded-md bg-slate-800 text-slate-300">
                          {s}
                        </span>
                      ))}
                      {c.skills.length > 5 && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-slate-800/60 text-slate-400">
                          +{c.skills.length - 5}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-cyan-400">GPA: {c.gpa}</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isActive ? 'Active Candidate' : 'Select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub Section 3: Delta Evolution Studio */}
      {activeSubSection === 'delta-studio' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
            <span>
              Delta Evolution Studio tests single-skill injections and sub-vector patches in sub-10ms without full-profile invalidation.
            </span>
          </div>
          <ResumeEvolutionStudio />
        </div>
      )}

      {/* Sub Section 4: AI Ingest & Parsing */}
      {activeSubSection === 'upload' && (
        <ResumeIngestion
          currentUser={currentUser || null}
          authToken={authToken || null}
          onResumeSaved={() => {
            refreshCandidates();
            setActiveSubSection('profile');
          }}
        />
      )}

      {/* Add Resume Modal */}
      <AddResumeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCandidateAdded={handleCandidateAdded}
        authToken={authToken}
      />
    </div>
  );
};
