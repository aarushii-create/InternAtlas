export interface CandidateExperience {
  company: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface CandidateProject {
  title: string;
  description: string;
  technologies: string[];
  repoUrl?: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  school: string;
  degree: string;
  gpa: string;
  email: string;
  primaryTrack: string;
  skills: string[];
  experience: CandidateExperience[];
  projects: CandidateProject[];
  isCustom: boolean;
  isPrimary: boolean;
  createdAt: string;
}

const now = new Date().toISOString();

export const PRESET_CANDIDATES: CandidateProfile[] = [
  {
    id: 'preset-alex-rivera',
    name: 'Alex Rivera',
    school: 'Stanford University',
    degree: 'B.S. Computer Science',
    gpa: '3.92',
    email: 'alex.rivera@stanford.edu',
    primaryTrack: 'Systems & AI Engineering',
    skills: [
      'Python',
      'C++',
      'TypeScript',
      'React',
      'Express',
      'PyTorch',
      'Distributed Systems',
      'SQL',
      'Docker',
      'Redis',
      'RAG',
      'Vector Databases',
    ],
    experience: [
      {
        company: 'Palantir Technologies',
        role: 'Software Engineering Intern',
        period: 'Summer 2025',
        bullets: [
          'Built a distributed query engine using C++ and PyTorch.',
          'Contributed to a Linux kernel module.',
        ],
      },
    ],
    projects: [
      {
        title: 'RAG Vector Database',
        description: 'A vector retrieval project built with Rust.',
        technologies: ['Rust', 'RAG', 'Vector Search'],
      },
      {
        title: 'Multi-Tenant Microservices',
        description: 'A multi-tenant service architecture built with Node.js and Express.',
        technologies: ['Node.js', 'Express', 'Distributed Systems'],
      },
    ],
    isCustom: false,
    isPrimary: true,
    createdAt: now,
  },
  {
    id: 'preset-jordan-chen',
    name: 'Jordan Chen',
    school: 'University of California, Berkeley',
    degree: 'B.S. Electrical Engineering and Computer Sciences',
    gpa: 'Not provided',
    email: 'jordan.chen@berkeley.edu',
    primaryTrack: 'Quantitative Development',
    skills: [
      'C++',
      'Python',
      'CUDA',
      'Low-Latency Systems',
      'Quantitative Finance',
      'Linear Algebra',
      'Stochastic Calculus',
      'Order Books',
    ],
    experience: [
      {
        company: 'Citadel Securities',
        role: 'Quantitative Research Intern',
        period: 'Summer 2025',
        bullets: ['Built a high-frequency order book simulator.'],
      },
    ],
    projects: [],
    isCustom: false,
    isPrimary: false,
    createdAt: now,
  },
];

const LOCAL_STORAGE_KEY = 'intern_atlas_candidate_profiles_v1';
const ACTIVE_CANDIDATE_ID_KEY = 'intern_atlas_active_candidate_id_v1';
const DEFAULT_CANDIDATE_ID = PRESET_CANDIDATES[0].id;

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function createEmptyProfile(): CandidateProfile {
  return {
    id: '',
    name: '',
    school: '',
    degree: '',
    gpa: '',
    email: '',
    primaryTrack: 'Software Engineering',
    skills: [],
    experience: [],
    projects: [],
    isCustom: true,
    isPrimary: false,
    createdAt: new Date().toISOString(),
  };
}

export function getStoredCandidateProfiles(): CandidateProfile[] {
  if (!canUseLocalStorage()) return PRESET_CANDIDATES;

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return PRESET_CANDIDATES;

    const stored = JSON.parse(raw) as CandidateProfile[];
    if (!Array.isArray(stored)) return PRESET_CANDIDATES;

    const savedById = new Map(stored.map((profile) => [profile.id, profile]));
    const presets = PRESET_CANDIDATES.map((profile) => savedById.get(profile.id) ?? profile);
    const customs = stored.filter(
      (profile) => profile.isCustom && !PRESET_CANDIDATES.some((preset) => preset.id === profile.id)
    );
    return [...presets, ...customs];
  } catch (error) {
    console.error('Unable to read saved candidate profiles:', error);
    return PRESET_CANDIDATES;
  }
}

export function saveCandidateProfiles(profiles: CandidateProfile[]): void {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error('Unable to save candidate profiles:', error);
  }
}

export function getActiveCandidateProfile(): CandidateProfile {
  const profiles = getStoredCandidateProfiles();
  if (canUseLocalStorage()) {
    const activeId = window.localStorage.getItem(ACTIVE_CANDIDATE_ID_KEY);
    const active = profiles.find((profile) => profile.id === activeId);
    if (active) return active;
  }
  return profiles.find((profile) => profile.isPrimary) ?? profiles[0] ?? PRESET_CANDIDATES[0];
}

export function setActiveCandidateProfile(candidateId: string): CandidateProfile {
  const profiles = getStoredCandidateProfiles();
  const selected = profiles.find((profile) => profile.id === candidateId);
  if (!selected) {
    throw new Error(`Candidate profile "${candidateId}" was not found.`);
  }
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ACTIVE_CANDIDATE_ID_KEY, candidateId);
  }
  return selected;
}

export function addCustomCandidateProfile(
  newProfile: Omit<CandidateProfile, 'id' | 'createdAt' | 'isCustom'>
): CandidateProfile {
  const profiles = getStoredCandidateProfiles();
  const profile: CandidateProfile = {
    ...newProfile,
    id: `custom-candidate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    isCustom: true,
    isPrimary: false,
    createdAt: new Date().toISOString(),
  };
  saveCandidateProfiles([...profiles, profile]);
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ACTIVE_CANDIDATE_ID_KEY, profile.id);
  }
  return profile;
}

export function updateCandidateProfile(
  id: string,
  updates: Partial<CandidateProfile>
): CandidateProfile | null {
  const profiles = getStoredCandidateProfiles();
  const index = profiles.findIndex((profile) => profile.id === id);
  if (index < 0) return null;

  const updated = {
    ...profiles[index],
    ...updates,
    id: profiles[index].id,
    createdAt: profiles[index].createdAt,
  };
  const nextProfiles = [...profiles];
  nextProfiles[index] = updated;
  saveCandidateProfiles(nextProfiles);
  return updated;
}

export function deleteCustomCandidateProfile(id: string): CandidateProfile {
  const profiles = getStoredCandidateProfiles();
  const target = profiles.find((profile) => profile.id === id);
  if (!target || !target.isCustom) return getActiveCandidateProfile();

  const remaining = profiles.filter((profile) => profile.id !== id);
  saveCandidateProfiles(remaining);
  if (canUseLocalStorage() && window.localStorage.getItem(ACTIVE_CANDIDATE_ID_KEY) === id) {
    window.localStorage.setItem(ACTIVE_CANDIDATE_ID_KEY, DEFAULT_CANDIDATE_ID);
  }
  return remaining.find((profile) => profile.id === DEFAULT_CANDIDATE_ID) ?? PRESET_CANDIDATES[0];
}
