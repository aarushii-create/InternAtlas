import React, { FormEvent, useState } from 'react';
import { CandidateProfile, addCustomCandidateProfile } from '../../lib/candidatePresets';

interface AddResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCandidateAdded: (candidate: CandidateProfile) => void;
  authToken?: string | null;
}

export const AddResumeModal: React.FC<AddResumeModalProps> = ({
  isOpen,
  onClose,
  onCandidateAdded,
}) => {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [degree, setDegree] = useState('');
  const [gpa, setGpa] = useState('');
  const [email, setEmail] = useState('');
  const [primaryTrack, setPrimaryTrack] = useState('Software Engineering');
  const [skillsText, setSkillsText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const skills = skillsText.split(',').map((skill) => skill.trim()).filter(Boolean);
    if (!name.trim() || !school.trim() || skills.length === 0) {
      setError('Enter a name, school, and at least one skill.');
      return;
    }

    try {
      const candidate = addCustomCandidateProfile({
        name: name.trim(),
        school: school.trim(),
        degree: degree.trim() || 'Degree not provided',
        gpa: gpa.trim() || 'Not provided',
        email: email.trim(),
        primaryTrack: primaryTrack.trim() || 'Software Engineering',
        skills,
        experience: [],
        projects: [],
        isPrimary: false,
      });
      onCandidateAdded(candidate);
      onClose();
      setName('');
      setSchool('');
      setDegree('');
      setGpa('');
      setEmail('');
      setPrimaryTrack('Software Engineering');
      setSkillsText('');
      setError(null);
    } catch (saveError) {
      console.error('Unable to add candidate profile:', saveError);
      setError('The profile could not be saved in this browser.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add candidate profile</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-white">
            Close
          </button>
        </div>
        <p className="text-xs text-slate-400">
          This is a browser-local profile preview. It is not saved to your account or used for server-scored matches.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-slate-300">
            Name *
            <input required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            School *
            <input required value={school} onChange={(event) => setSchool(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            Degree
            <input value={degree} onChange={(event) => setDegree(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            GPA
            <input value={gpa} onChange={(event) => setGpa(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            Target track
            <input value={primaryTrack} onChange={(event) => setPrimaryTrack(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
        </div>
        <label className="block space-y-1 text-xs text-slate-300">
          Skills (comma-separated) *
          <textarea required value={skillsText} onChange={(event) => setSkillsText(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Add profile</button>
        </div>
      </form>
    </div>
  );
};
