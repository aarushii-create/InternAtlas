/**
 * InternAtlas - Dynamic Candidate Profile Manager
 * Manages runtime candidate profiles, local storage persistence, and dynamic user updates.
 */

export interface CandidateExperience {
  company: string;
  role: string;
  period: string;
  bullets: string[];
  technologies?: string[];
}

export interface CandidateProject {
  title: string;
  description: string;
  bullets: string[];
  technologies: string[];
  repoUrl?: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  school: string;
  degree: string;
  graduationYear: string;
  gpa: string;
  primaryTrack: string;
  skills: string[];
  experience: CandidateExperience[];
  projects: CandidateProject[];
  rawText?: string;
  isCustom: boolean;
  isPrimary: boolean;
  createdAt: string;
  embeddingDimensions?: number;
}

export const PRESET_CANDIDATES: CandidateProfile[] = [
  {
    id: 'candidate-alex-rivera',
    name: 'Alex Rivera',
    email: 'alex.rivera@stanford.edu',
    school: 'Stanford University',
    degree: 'BS/MS in Computer Science (Class of 2026)',
    graduationYear: '2026',
    gpa: '3.94 / 4.00',
    primaryTrack: 'Systems, Low-Latency & Quantitative Engineering',
    skills: [
      'C++',
      'CUDA',
      'Python',
      'Rust',
      'Distributed Systems',
      'Low-Latency Networking',
      'PyTorch',
      'Linux Kernel',
      'TCP/IP',
      'SIMD',
      'Lock-Free Data Structures',
      'pgvector',
    ],
    experience: [
      {
        company: 'Meta',
        role: 'Software Engineering Intern (Infrastructure)',
        period: 'Summer 2025',
        bullets: [
          'Built real-time cache invalidation pipeline in C++ processing 1.2M QPS with sub-millisecond p99 latency.',
          'Optimized memory serialization using FlatBuffers to lower p99 latency to 420us.',
        ],
        technologies: ['C++', 'FlatBuffers', 'Linux Kernel', 'Distributed Systems'],
      },
      {
        company: 'Stanford High-Performance Computing Lab',
        role: 'Undergraduate Researcher',
        period: '2024 - Present',
        bullets: [
          'Designed GPU kernel optimizer for sparse matrix multiplication using CUDA and C++20, reducing kernel latency by 38%.',
          'Authored high-throughput vectorized SIMD routines for dense matrix cache-line alignment.',
        ],
        technologies: ['CUDA', 'C++20', 'SIMD', 'GPU Hardware'],
      },
    ],
    projects: [
      {
        title: 'Distributed Raft Key-Value Store',
        description: 'Fault-tolerant distributed log replication engine built in Rust.',
        bullets: [
          'Implemented leader election, log compaction, and snapshotting with 99.99% reliability under chaos testing.',
          'Achieved 45,000 commits/sec using zero-allocation ring buffers and asynchronous tokio I/O.',
        ],
        technologies: ['Rust', 'Tokio', 'Distributed Consensus', 'Raft'],
        repoUrl: 'https://github.com/alexrivera/raft-kv',
      },
      {
        title: 'Microsecond HFT Order Matching Engine',
        description: 'Limit order book matching engine in C++20 with deterministic lock-free ring buffers.',
        bullets: [
          'Benchmarked order book cross latency at 820ns median and 1.4us p99 under 500K msgs/sec.',
          'Utilized memory pool pre-allocation and cache-line padded data structures to eliminate L1 cache thrashing.',
        ],
        technologies: ['C++20', 'Lock-Free', 'Low-Latency', 'POSIX Sockets'],
        repoUrl: 'https://github.com/alexrivera/cpp-matching-engine',
      },
    ],
    rawText: `Alex Rivera | alex.rivera@stanford.edu | Stanford CS 2026 (GPA 3.94)
Track: Systems, Low-Latency & Quantitative Engineering
Skills: C++, CUDA, Python, Rust, Distributed Systems, Low-Latency Networking, PyTorch, Linux Kernel, TCP/IP, SIMD, Lock-Free Data Structures.
Experience:
- Meta: Software Engineering Intern (Infrastructure) - Built real-time cache invalidation in C++ processing 1.2M QPS.
- Stanford HPC Lab: GPU Kernel Optimizer for sparse matrix multiplication using CUDA and C++20.
Projects:
- Distributed Raft Key-Value Store in Rust with 45K commits/sec.
- Microsecond HFT Order Matching Engine in C++20 with 820ns median latency.`,
    isCustom: false,
    isPrimary: true,
    createdAt: '2026-08-20T10:00:00.000Z',
    embeddingDimensions: 768,
  },
  {
    id: 'candidate-jordan-chen',
    name: 'Jordan Chen',
    email: 'jordan.chen@berkeley.edu',
    school: 'UC Berkeley',
    degree: 'B.S. in Electrical Engineering & Computer Sciences (Class of 2026)',
    graduationYear: '2026',
    gpa: '3.88 / 4.00',
    primaryTrack: 'AI/ML, Foundation Models & Deep Learning Infrastructure',
    skills: [
      'Python',
      'PyTorch',
      'CUDA',
      'Transformers',
      'HuggingFace',
      'Triton',
      'Distributed Pretraining',
      'TensorFlow',
      'FastAPI',
      'Docker',
      'C++',
      'Vector Databases',
    ],
    experience: [
      {
        company: 'OpenAI (Contributed / Open Source)',
        role: 'AI Research Intern / Contributor',
        period: 'Summer 2025',
        bullets: [
          'Fine-tuned 7B parameter Transformer models for code generation, achieving a 14% improvement on HumanEval benchmark.',
          'Implemented FlashAttention-2 GPU kernel integrations in PyTorch to cut training memory footprint by 35%.',
        ],
        technologies: ['PyTorch', 'Transformers', 'CUDA', 'Triton'],
      },
      {
        company: 'Berkeley AI Research (BAIR)',
        role: 'Undergraduate AI Researcher',
        period: '2024 - Present',
        bullets: [
          'Trained multi-modal diffusion pipelines with mixed precision FP8 / BF16 quantization on 32x H100 GPUs.',
          'Published benchmark evaluations on LLM speculative decoding inference acceleration.',
        ],
        technologies: ['Python', 'PyTorch', 'Megatron-LM', 'Slurm'],
      },
    ],
    projects: [
      {
        title: 'Speculative Decoding Engine for LLMs',
        description: 'Accelerated autoregressive token generation using draft model speculative execution.',
        bullets: [
          'Achieved 2.8x speedup on LLaMA-3 8B inference on single NVIDIA RTX 4090.',
          'Integrated custom Triton kernel for KV-cache tree verification.',
        ],
        technologies: ['Python', 'Triton', 'CUDA', 'vLLM'],
        repoUrl: 'https://github.com/jordanchen/speculative-decode',
      },
    ],
    rawText: `Jordan Chen | jordan.chen@berkeley.edu | UC Berkeley EECS 2026 (GPA 3.88)
Track: AI/ML, Foundation Models & Deep Learning Infrastructure
Skills: Python, PyTorch, CUDA, Transformers, HuggingFace, Triton, Distributed Pretraining, FastAPI, Docker, C++, Vector DBs.
Experience:
- OpenAI Open Source: Fine-tuned 7B Transformers, FlashAttention-2 GPU kernel integrations.
- BAIR: Trained multi-modal diffusion pipelines with FP8/BF16 quantization on 32x H100s.
Projects:
- Speculative Decoding Engine in Triton/CUDA with 2.8x inference speedup.`,
    isCustom: false,
    isPrimary: false,
    createdAt: '2026-08-21T10:00:00.000Z',
    embeddingDimensions: 768,
  },
  {
    id: 'candidate-maya-patel',
    name: 'Maya Patel',
    email: 'maya.patel@iitb.ac.in',
    school: 'IIT Bombay',
    degree: 'B.Tech in Computer Science & Engineering (Class of 2026)',
    graduationYear: '2026',
    gpa: '3.96 / 4.00 (9.8/10)',
    primaryTrack: 'High-Concurrency Backend & Distributed Cloud Systems',
    skills: [
      'Go',
      'Java',
      'Spring Boot',
      'Kafka',
      'Kubernetes',
      'PostgreSQL',
      'Redis',
      'gRPC',
      'Distributed Systems',
      'AWS',
      'Docker',
      'System Design',
      'GraphQL',
    ],
    experience: [
      {
        company: 'Razorpay',
        role: 'Backend Engineering Intern',
        period: 'Summer 2025',
        bullets: [
          'Built high-throughput payment reconciliation service in Go processing 25,000 transactions/second with sub-50ms latency.',
          'Migrated event-driven ledger architecture to Apache Kafka with exactly-once delivery guarantees.',
        ],
        technologies: ['Go', 'Kafka', 'PostgreSQL', 'Redis', 'Docker'],
      },
      {
        company: 'Flipkart',
        role: 'Software Engineering Intern',
        period: 'Winter 2024',
        bullets: [
          'Optimized distributed inventory lock service using Redis Redlock and Lua scripts, eliminating race conditions during flash sales.',
          'Reduced inventory checkout latency by 45% across Big Billion Days traffic spikes.',
        ],
        technologies: ['Java', 'Spring Boot', 'Redis', 'Kubernetes'],
      },
    ],
    projects: [
      {
        title: 'Distributed Transaction Coordinator (2PC / Sagas)',
        description: 'High-availability two-phase commit transaction manager for microservices in Go.',
        bullets: [
          'Implemented distributed saga pattern with compensating transactions and dead-letter queue recovery.',
          'Achieved 10,000 distributed state transitions/sec with zero orphaned transactions.',
        ],
        technologies: ['Go', 'gRPC', 'Protobuf', 'PostgreSQL', 'Docker'],
        repoUrl: 'https://github.com/mayapatel/distributed-saga-coordinator',
      },
    ],
    rawText: `Maya Patel | maya.patel@iitb.ac.in | IIT Bombay CSE 2026 (GPA 3.96 / 9.8)
Track: High-Concurrency Backend & Distributed Cloud Systems
Skills: Go, Java, Spring Boot, Kafka, Kubernetes, PostgreSQL, Redis, gRPC, Distributed Systems, AWS, Docker, System Design.
Experience:
- Razorpay: Backend Engineering Intern - Built 25K TPS payment reconciliation in Go with Kafka.
- Flipkart: SWE Intern - Optimized distributed inventory lock with Redis Redlock for flash sales.
Projects:
- Distributed Transaction Coordinator in Go using 2PC and Sagas.`,
    isCustom: false,
    isPrimary: false,
    createdAt: '2026-08-22T10:00:00.000Z',
    embeddingDimensions: 768,
  },
];

const LOCAL_STORAGE_KEY = 'intern_atlas_candidate_profiles_v1';
const ACTIVE_CANDIDATE_ID_KEY = 'intern_atlas_active_candidate_id_v1';

/**
 * Returns a blank candidate profile template for uninitialized sessions
 */
export function createEmptyProfile(): CandidateProfile {
  return {
    id: `candidate-user-${Date.now()}`,
    name: '',
    email: '',
    school: '',
    degree: '',
    graduationYear: '',
    gpa: '',
    primaryTrack: '',
    skills: [],
    experience: [],
    projects: [],
    rawText: '',
    isCustom: true,
    isPrimary: true,
    createdAt: new Date().toISOString(),
    embeddingDimensions: 768,
  };
}

/**
 * Reads stored profiles from local storage (combined with presets)
 */
export function getStoredCandidateProfiles(): CandidateProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return PRESET_CANDIDATES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return PRESET_CANDIDATES;
    const customProfiles: CandidateProfile[] = parsed.filter((p: CandidateProfile) => p.isCustom);
    return [...PRESET_CANDIDATES, ...customProfiles];
  } catch (err) {
    return PRESET_CANDIDATES;
  }
}

/**
 * Saves candidate profiles to local storage
 */
export function saveCandidateProfiles(profiles: CandidateProfile[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.error('Error persisting candidate profile state:', err);
  }
}

/**
 * Gets the active candidate profile dynamically
 */
export function getActiveCandidateProfile(): CandidateProfile {
  try {
    const all = getStoredCandidateProfiles();
    const activeId = localStorage.getItem(ACTIVE_CANDIDATE_ID_KEY);

    if (activeId && all.length > 0) {
      const found = all.find((c) => c.id === activeId);
      if (found) return found;
    }

    const primary = all.find((c) => c.isPrimary);
    return primary || all[0] || PRESET_CANDIDATES[0];
  } catch (err) {
    return PRESET_CANDIDATES[0] || createEmptyProfile();
  }
}

/**
 * Sets the active candidate profile
 */
export function setActiveCandidateProfile(candidateId: string): CandidateProfile {
  try {
    localStorage.setItem(ACTIVE_CANDIDATE_ID_KEY, candidateId);
    const all = getStoredCandidateProfiles();
    const updated = all.map((c) => ({
      ...c,
      isPrimary: c.id === candidateId,
    }));
    saveCandidateProfiles(updated);
    const active = updated.find((c) => c.id === candidateId);
    return active || updated[0] || PRESET_CANDIDATES[0];
  } catch (err) {
    console.error('Error setting active candidate profile:', err);
    return PRESET_CANDIDATES[0];
  }
}

/**
 * Adds a new custom candidate profile
 */
export function addCustomCandidateProfile(newProfile: Omit<CandidateProfile, 'id' | 'createdAt' | 'isCustom'>): CandidateProfile {
  const all = getStoredCandidateProfiles();
  const id = `custom-candidate-${Date.now()}`;
  const profile: CandidateProfile = {
    ...newProfile,
    id,
    isCustom: true,
    isPrimary: true,
    createdAt: new Date().toISOString(),
    embeddingDimensions: 768,
  };

  // Set new profile as primary
  const updated = all.map((c) => ({ ...c, isPrimary: false }));
  updated.push(profile);

  saveCandidateProfiles(updated);
  localStorage.setItem(ACTIVE_CANDIDATE_ID_KEY, id);

  return profile;
}

/**
 * Updates an existing candidate profile
 */
export function updateCandidateProfile(id: string, updates: Partial<CandidateProfile>): CandidateProfile | null {
  const all = getStoredCandidateProfiles();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  all[idx] = {
    ...all[idx],
    ...updates,
  };

  saveCandidateProfiles(all);
  return all[idx];
}

/**
 * Deletes a custom candidate profile
 */
export function deleteCustomCandidateProfile(id: string): CandidateProfile {
  const all = getStoredCandidateProfiles();
  const filtered = all.filter((c) => c.id !== id || !c.isCustom);
  saveCandidateProfiles(filtered);

  // If deleted candidate was active, reset to default
  const activeId = localStorage.getItem(ACTIVE_CANDIDATE_ID_KEY);
  if (activeId === id) {
    localStorage.setItem(ACTIVE_CANDIDATE_ID_KEY, PRESET_CANDIDATES[0].id);
    return PRESET_CANDIDATES[0];
  }

  return getActiveCandidateProfile();
}

/**
 * Sets or creates the primary candidate profile dynamically
 */
export function saveOrUpdateActiveProfile(profile: Partial<CandidateProfile>): CandidateProfile {
  const all = getStoredCandidateProfiles();
  const activeId = localStorage.getItem(ACTIVE_CANDIDATE_ID_KEY);

  let existingIndex = -1;
  if (activeId) {
    existingIndex = all.findIndex((c) => c.id === activeId);
  }

  let updatedProfile: CandidateProfile;

  if (existingIndex >= 0) {
    updatedProfile = {
      ...all[existingIndex],
      ...profile,
    };
    all[existingIndex] = updatedProfile;
  } else {
    updatedProfile = {
      ...createEmptyProfile(),
      ...profile,
      isPrimary: true,
    };
    all.push(updatedProfile);
  }

  saveCandidateProfiles(all);
  localStorage.setItem(ACTIVE_CANDIDATE_ID_KEY, updatedProfile.id);

  return updatedProfile;
}

/**
 * Deletes the active candidate profile and resets state
 */
export function clearActiveProfile(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_CANDIDATE_ID_KEY);
  } catch (err) {
    console.error('Error resetting candidate state:', err);
  }
}