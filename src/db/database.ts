/**
 * AI Internship Scout - Phase 1 Backend Database Engine
 * Features multi-tenant isolation, 768-dim vector cosine similarity calculation,
 * 2-Layer RAG evaluation model storage, and strict UserPreferences enforcement.
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  User,
  Resume,
  UserPreferences,
  Job,
  JobInput,
  ArchivedJob,
  CleanupResult,
  StorageBloatStats,
  Match,
  NotificationLog,
  DatabaseStats,
  CompanyInsight,
  CompanyDataSource,
} from '../types';
import { cleanupEngine, CleanupOptions } from '../lib/cleanupEngine';
import { layer1RagEngine } from '../lib/rag/layer1Engine';
import { MASTER_COMPANY_INSIGHTS } from './companyInsightsMaster';
import { VERIFIED_DATA_SOURCES } from './companyInsightsData';

// Helper to calculate cosine similarity between two vector embeddings
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const dim = Math.min(a.length, b.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < dim; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Bound to 0.0 - 1.0
  return Math.max(0, Math.min(1, similarity));
}

// Generate a deterministic 768-dim semantic vector embedding using term-frequency random indexing
export function generateDeterministicEmbedding(seedText: string): number[] {
  const dim = 768;
  const vector: number[] = new Array(dim).fill(0);
  if (!seedText) return vector;

  // 1. Tokenize semantic keywords
  const words = seedText.toLowerCase().split(/[\s,.\-_()\/[\]:]+/).filter(Boolean);

  // 2. Project terms into dense 768-dim vector space
  for (const word of words) {
    let wordHash = 0;
    for (let j = 0; j < word.length; j++) {
      wordHash = (wordHash << 5) - wordHash + word.charCodeAt(j);
      wordHash |= 0;
    }
    const baseIdx = Math.abs(wordHash) % dim;
    for (let k = 0; k < 16; k++) {
      const idx = (baseIdx + k * 19) % dim;
      const weight = Math.abs(Math.sin(wordHash + k)) * 0.8 + 0.2;
      vector[idx] += weight;
    }
  }

  // 3. Add smooth dense baseline
  let textHash = 0;
  for (let i = 0; i < seedText.length; i++) {
    textHash = (textHash << 5) - textHash + seedText.charCodeAt(i);
    textHash |= 0;
  }
  for (let i = 0; i < dim; i++) {
    vector[i] += (Math.abs(Math.cos(textHash + i * 0.7)) * 0.05 + 0.02);
  }

  // 4. L2 Normalization
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vector.map((v) => parseFloat((v / norm).toFixed(6)));
}

class InAppDatabase {
  private users: User[] = [];
  private resumes: Resume[] = [];
  private preferences: UserPreferences[] = [];
  private jobs: Job[] = [];
  private archivedJobs: ArchivedJob[] = [];
  private matches: Match[] = [];
  private notifications: NotificationLog[] = [];
  private companyInsights: CompanyInsight[] = [];
  private migrationStatus = '0000_initial_schema.sql, 0002_stale_jobs_cleanup.sql, 0003_company_insights_knowledge_graph.sql executed successfully';
  private lastMigrationTime = new Date().toISOString();
  private lastCleanupStats?: StorageBloatStats['lastCleanupRun'];

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    this.users = [];
    this.resumes = [];
    this.preferences = [];
    this.jobs = [];
    this.archivedJobs = [];
    this.matches = [];
    this.notifications = [];
    this.companyInsights = [...MASTER_COMPANY_INSIGHTS];

    // Tenant 1: Alex Rivera (Stanford CS)
    const user1Id = '11111111-1111-4111-a111-111111111111';
    const tenant1 = 'tenant-alex-rivera';
    const defaultPasswordHash = bcrypt.hashSync('password123', 10);

    const user1: User = {
      id: user1Id,
      tenantId: tenant1,
      email: 'alex.rivera@stanford.edu',
      fullName: 'Alex Rivera',
      passwordHash: defaultPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isOnboarded: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resume1Id = 'res-11111111-1111-4111-a111-111111111111';
    const resume1Text = `Alex Rivera - B.S. Computer Science Stanford University (GPA 3.92). 
Skills: Python, C++, TypeScript, React, Express, PyTorch, Distributed Systems, SQL, Docker, Redis.
Experience: Software Engineering Intern at Palantir (Built distributed query engine in C++ & PyTorch), OS Contributor to Linux kernel module.
Projects: RAG-based Vector Database in Rust, Multi-Tenant Microservices architecture in Node/Express.`;

    const resume1: Resume = {
      id: resume1Id,
      userId: user1Id,
      tenantId: tenant1,
      title: 'Stanford_CS_Backend_AI_2026.pdf',
      content: resume1Text,
      extractedSkills: ['Python', 'C++', 'TypeScript', 'React', 'Express', 'PyTorch', 'Distributed Systems', 'SQL', 'Docker', 'Redis', 'RAG', 'Vector DB'],
      parsedExperience: [
        {
          company: 'Palantir Technologies',
          role: 'SWE Intern',
          duration: 'Summer 2025',
          highlights: [
            'Architected distributed C++ query engine processing 50M+ events/sec',
            'Integrated PyTorch vector embeddings for real-time anomaly detection',
          ],
        },
      ],
      embedding: generateDeterministicEmbedding(resume1Text),
      isPrimary: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const pref1: UserPreferences = {
      id: 'pref-11111111-1111-4111-a111-111111111111',
      userId: user1Id,
      tenantId: tenant1,
      targetLocations: ['San Francisco, CA', 'New York, NY', 'Remote'],
      targetRoles: ['Software Engineering Intern', 'Backend Engineering Intern', 'AI/ML Intern'],
      preferredCompanies: ['Goldman Sachs', 'Microsoft', 'Stripe', 'Databricks', 'OpenAI'],
      blacklistedCompanies: ['CryptoScam LLC', 'LowPay Agency'],
      customMatchThreshold: 0.72, // 72% minimum threshold
      alertMethod: 'email',
      alertDestination: 'alex.rivera@stanford.edu',
      isActive: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Tenant 2: Jordan Chen (UC Berkeley EECS)
    const user2Id = '22222222-2222-4222-a222-222222222222';
    const tenant2 = 'tenant-jordan-chen';
    const user2: User = {
      id: user2Id,
      tenantId: tenant2,
      email: 'jordan.chen@berkeley.edu',
      fullName: 'Jordan Chen',
      passwordHash: defaultPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      isOnboarded: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resume2Text = `Jordan Chen - B.S. EECS UC Berkeley. 
Skills: C++, Quantitative Trading, Market Microstructure, Algorithmic Trading, Python, CUDA, Low Latency Systems, Linear Algebra, Stochastic Calculus.
Experience: Quant Research Intern at Citadel Securities, Built High Frequency Order Book simulator.`;

    const resume2: Resume = {
      id: 'res-22222222-2222-4222-a222-222222222222',
      userId: user2Id,
      tenantId: tenant2,
      title: 'Jordan_Chen_Quant_Developer_2026.pdf',
      content: resume2Text,
      extractedSkills: ['C++', 'Python', 'CUDA', 'Low Latency', 'Quantitative Finance', 'Linear Algebra', 'Stochastic Calculus', 'Order Book'],
      parsedExperience: [
        {
          company: 'Citadel Securities',
          role: 'Quantitative Trader Intern',
          duration: 'Summer 2025',
          highlights: ['Built C++ order book matching engine with <10us latency'],
        },
      ],
      embedding: generateDeterministicEmbedding(resume2Text),
      isPrimary: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const pref2: UserPreferences = {
      id: 'pref-22222222-2222-4222-a222-222222222222',
      userId: user2Id,
      tenantId: tenant2,
      targetLocations: ['New York, NY', 'Chicago, IL', 'Remote'],
      targetRoles: ['Quant Developer Intern', 'Systems Engineering Intern'],
      preferredCompanies: ['Jane Street', 'Citadel', 'Two Sigma', 'Hudson River Trading'],
      blacklistedCompanies: [],
      customMatchThreshold: 0.80,
      alertMethod: 'telegram',
      alertDestination: '@jordan_chen_quant',
      isActive: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.push(user1, user2);
    this.resumes.push(resume1, resume2);
    this.preferences.push(pref1, pref2);

    // Seed Jobs with 2-Layer distinctions (Stated JD vs Informal Company Bar)
    const nowIso = new Date().toISOString();
    const job1Text = `Goldman Sachs - Summer Analyst (SWE / Quant Engineering) New York. Requirements: CS/STEM degree, C++, Java, Python, SQL, REST APIs, Object-Oriented Design.`;
    const job1: Job = {
      id: 'job-gs-001',
      source: 'greenhouse',
      externalId: 'gs-gh-99823',
      dedupHash: 'gs-sw-ny-99823-hash-01',
      company: 'Goldman Sachs',
      title: 'Software Engineering Summer Analyst 2026',
      location: 'New York, NY',
      isRemote: false,
      description: job1Text,
      rawJd: `Goldman Sachs Engineering builds solutions for complex financial challenges. We seek talented undergraduates for our 10-week summer Analyst internship in NYC or Dallas.`,
      statedRequirements: {
        requiredSkills: ['Python', 'Java', 'C++', 'SQL', 'Data Structures'],
        preferredSkills: ['Financial Knowledge', 'REST APIs', 'Spring Boot'],
        education: 'Bachelor in CS or related STEM',
        experienceYears: 0,
      },
      informalBar: {
        dsaDifficulty: 'Hard',
        oaPattern: 'Hackerrank 2 Hard Problems: Dynamic Programming (Knapsack/State DP) + Graph Shortest Path with custom constraints. strict 120-minute timer.',
        unstatedPreferences: [
          'High performance under time pressure in OA',
          'Demonstrated C++ memory management or low latency interest',
          'Clean modular object oriented architecture during system design follow-up',
        ],
        barDescription: 'While official JD mentions basic Java/Python, the real OA filters top 5% on rigorous DP and Graph algorithms before interview.',
      },
      vectorEmbedding: generateDeterministicEmbedding(job1Text + ' Dynamic Programming Graph Shortest Path C++'),
      applyUrl: 'https://careers.goldmansachs.com/jobs/99823',
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      firstSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      lastVerifiedActive: nowIso,
      isActive: true,
      relevanceStatus: 'RELEVANT',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const job2Text = `Microsoft - Software Engineering Intern Redmond WA. Requirements: Pursuing BS/MS in Computer Science, C#, C++, Java, Python, Azure, Web Services.`;
    const job2: Job = {
      id: 'job-msft-002',
      source: 'lever',
      externalId: 'msft-lv-44102',
      dedupHash: 'msft-swe-rd-44102-hash-02',
      company: 'Microsoft',
      title: 'Software Engineering Intern (Redmond / Remote)',
      location: 'Redmond, WA',
      isRemote: true,
      description: job2Text,
      rawJd: `Microsoft SWE Interns collaborate with global teams on Cloud, AI, and Windows ecosystem.`,
      statedRequirements: {
        requiredSkills: ['Python', 'C++', 'C#', 'Algorithms', 'System Design Basics'],
        preferredSkills: ['Azure', 'React', 'TypeScript'],
        education: 'Enrolled in BS/MS CS program',
        experienceYears: 0,
      },
      informalBar: {
        dsaDifficulty: 'Medium',
        oaPattern: 'Codility 3 tasks (60 mins): Array manipulation, Sliding Window, Tree Traversals with optimal space complexity O(1).',
        unstatedPreferences: [
          'Clear communication of edge cases in behavioral & technical screens',
          'Open source projects or previous cloud/fullstack deployment',
        ],
        barDescription: 'Codility OA requires 100% test case pass rate with optimal space/time complexity.',
      },
      vectorEmbedding: generateDeterministicEmbedding(job2Text + ' Sliding Window Tree Traversals Azure TypeScript'),
      applyUrl: 'https://careers.microsoft.com/us/en/job/44102',
      postedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      firstSeenAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      lastVerifiedActive: nowIso,
      isActive: true,
      relevanceStatus: 'RELEVANT',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const job3Text = `Stripe - Software Engineering Intern (Infrastructure & Payment Core) San Francisco. Requirements: Ruby, Go, Java, Python, TypeScript, Distributed Systems, API Design.`;
    const job3: Job = {
      id: 'job-stripe-003',
      source: 'greenhouse',
      externalId: 'stripe-gh-8812',
      dedupHash: 'stripe-swe-sf-8812-hash-03',
      company: 'Stripe',
      title: 'Software Engineering Intern - Infrastructure',
      location: 'San Francisco, CA',
      isRemote: true,
      description: job3Text,
      rawJd: `At Stripe, we build financial infrastructure for the internet. SWE Interns work directly on payment engine pipelines.`,
      statedRequirements: {
        requiredSkills: ['Python', 'Go', 'TypeScript', 'Distributed Systems', 'API Design', 'SQL'],
        preferredSkills: ['Docker', 'Redis', 'Kafka', 'PostgreSQL'],
        education: 'BS CS in progress',
        experienceYears: 0,
      },
      informalBar: {
        dsaDifficulty: 'Medium',
        oaPattern: 'Practical API & Integration Coding Challenge (90 mins): Parse complex nested JSON payloads, implement idempotency key tracking, and handle rate-limiting logic with unit tests.',
        unstatedPreferences: [
          'Production-grade code readability, clean error handling, and unit testing focus',
          'Familiarity with idempotent APIs and distributed system failure modes',
        ],
        barDescription: 'Stripe does NOT focus on pure LeetCode DSA; instead they test real-world software engineering, API design, clean code, and defensive edge case testing.',
      },
      vectorEmbedding: generateDeterministicEmbedding(job3Text + ' Idempotency Distributed Systems Go TypeScript Redis API'),
      applyUrl: 'https://stripe.com/jobs/8812',
      postedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      firstSeenAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      lastVerifiedActive: nowIso,
      isActive: true,
      relevanceStatus: 'RELEVANT',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const job4Text = `Databricks - Software Engineering Intern (Engine Core) San Francisco / Remote. Requirements: C++, Java, Scala, Python, Query Optimization, Distributed Computing.`;
    const job4: Job = {
      id: 'job-dbx-004',
      source: 'direct',
      externalId: 'dbx-dir-1120',
      dedupHash: 'dbx-swe-sf-1120-hash-04',
      company: 'Databricks',
      title: 'Software Engineering Intern - Engine Core',
      location: 'San Francisco, CA',
      isRemote: true,
      description: job4Text,
      rawJd: `Databricks Engine team builds Spark / Photon execution core in C++ and Scala.`,
      statedRequirements: {
        requiredSkills: ['C++', 'Python', 'Distributed Systems', 'Query Engine', 'SQL'],
        preferredSkills: ['PyTorch', 'Spark', 'Vector Processing'],
        education: 'BS/MS/PhD in Computer Science',
        experienceYears: 0,
      },
      informalBar: {
        dsaDifficulty: 'Hard',
        oaPattern: 'Codesignal 4 tasks (70 mins): Matrix transformations, Custom Data Structure design (LRU / LFU variant with O(1) operations), Segment Tree.',
        unstatedPreferences: [
          'Strong C++ template metaprogramming or systems knowledge',
          'High Speed Codesignal score (800+ required for interview)',
        ],
        barDescription: 'Databricks requires high Codesignal speed score plus deep understanding of concurrency and hardware memory alignment.',
      },
      vectorEmbedding: generateDeterministicEmbedding(job4Text + ' C++ Distributed Systems Vector Query Processing Spark PyTorch'),
      applyUrl: 'https://databricks.com/company/careers/1120',
      postedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      firstSeenAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      lastVerifiedActive: nowIso,
      isActive: true,
      relevanceStatus: 'RELEVANT',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.jobs.push(job1, job2, job3, job4);

    // Compute Matches for Alex Rivera (Tenant 1)
    const match1Layer1 = 0.82; // JD stated match (Goldman Sachs)
    const match1Layer2 = 0.88; // Informal bar fit (Palantir C++ & Distributed background fits GS OA DSA bar)
    const match1Composite = parseFloat(((match1Layer1 * 0.4 + match1Layer2 * 0.6) * 100).toFixed(1)); // 85.6%

    const match1: Match = {
      id: 'mat-11111111-1111-4111-a111-111111111111',
      userId: user1Id,
      tenantId: tenant1,
      jobId: job1.id,
      resumeId: resume1.id,
      layer1Score: match1Layer1,
      layer2Score: match1Layer2,
      compositeScore: match1Composite,
      matchedSkills: ['C++', 'Python', 'SQL', 'Data Structures', 'Distributed Systems'],
      missingSkills: ['Java', 'Spring Boot'],
      status: 'alerted',
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      updatedAt: new Date().toISOString(),
      job: job1,
    };

    const match2Layer1 = 0.88; // JD stated match (Stripe)
    const match2Layer2 = 0.94; // Informal bar fit (Alex built RAG vector DB in Rust + Node/Express multi-tenant APIs)
    const match2Composite = parseFloat(((match2Layer1 * 0.4 + match2Layer2 * 0.6) * 100).toFixed(1)); // 91.6%

    const match2: Match = {
      id: 'mat-22222222-2222-4222-a222-222222222222',
      userId: user1Id,
      tenantId: tenant1,
      jobId: job3.id,
      resumeId: resume1.id,
      layer1Score: match2Layer1,
      layer2Score: match2Layer2,
      compositeScore: match2Composite,
      matchedSkills: ['Python', 'TypeScript', 'Express', 'Distributed Systems', 'API Design', 'Docker', 'Redis', 'SQL'],
      missingSkills: ['Go'],
      status: 'alerted',
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      updatedAt: new Date().toISOString(),
      job: job3,
    };

    const match3Layer1 = 0.85; // Databricks
    const match3Layer2 = 0.91; // C++ / PyTorch / Vector DB
    const match3Composite = parseFloat(((match3Layer1 * 0.4 + match3Layer2 * 0.6) * 100).toFixed(1)); // 88.6%

    const match3: Match = {
      id: 'mat-33333333-3333-4333-a333-333333333333',
      userId: user1Id,
      tenantId: tenant1,
      jobId: job4.id,
      resumeId: resume1.id,
      layer1Score: match3Layer1,
      layer2Score: match3Layer2,
      compositeScore: match3Composite,
      matchedSkills: ['C++', 'Python', 'Distributed Systems', 'SQL', 'PyTorch', 'Vector DB'],
      missingSkills: ['Scala', 'Spark'],
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
      job: job4,
    };

    this.matches.push(match1, match2, match3);

    // Initial Notification Logs
    const notif1: NotificationLog = {
      id: 'notif-001',
      userId: user1Id,
      tenantId: tenant1,
      matchId: match2.id,
      type: 'email',
      recipient: 'alex.rivera@stanford.edu',
      subject: `[High Match 91.6%] New Posting: Stripe - Software Engineering Intern - Infrastructure`,
      body: `Hello Alex,\n\nWe found a top-tier match (Score: 91.6%) for Stripe Software Engineering Intern.\n\nStated Skills Matched: Python, TypeScript, Express, Distributed Systems, Docker, Redis.\nInformal Bar Analysis: Stripe prioritizes real-world API idempotency, clean testing, and defensive system design. Your RAG vector DB & Express project closely mirrors their bar.\n\nApply directly: https://stripe.com/jobs/8812`,
      sentAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      status: 'sent',
      metadata: { matchScore: 91.6, source: 'greenhouse' },
      createdAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    };

    this.notifications.push(notif1);
  }

  // Multi-Tenant Aware Queries
  public getUsers(tenantId?: string): User[] {
    if (!tenantId) return this.users;
    return this.users.filter((u) => u.tenantId === tenantId);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string, tenantId?: string): User | undefined {
    return this.users.find((u) => u.id === id && (!tenantId || u.tenantId === tenantId));
  }

  public registerUser(data: {
    email: string;
    password: string;
    fullName: string;
    tenantId: string;
    avatarUrl?: string;
  }): User {
    const existing = this.getUserByEmail(data.email);
    if (existing) {
      throw new Error(`An account with email ${data.email} already exists.`);
    }

    const passwordHash = bcrypt.hashSync(data.password, 10);
    const newUser: User = {
      id: uuidv4(),
      tenantId: data.tenantId,
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      passwordHash,
      avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.fullName)}`,
      isOnboarded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    return newUser;
  }

  public verifyCredentials(email: string, password: string): User | null {
    const user = this.getUserByEmail(email);
    if (!user || !user.passwordHash) return null;

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  }

  public createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'isOnboarded'> & { isOnboarded?: boolean }): User {
    const newUser: User = {
      ...userData,
      id: uuidv4(),
      isOnboarded: userData.isOnboarded ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>, tenantId?: string): User | undefined {
    const user = this.getUserById(id, tenantId);
    if (!user) return undefined;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    return user;
  }

  public deleteUser(id: string, tenantId?: string): boolean {
    const idx = this.users.findIndex((u) => u.id === id && (!tenantId || u.tenantId === tenantId));
    if (idx === -1) return false;
    this.users.splice(idx, 1);
    this.resumes = this.resumes.filter((r) => r.userId !== id);
    this.preferences = this.preferences.filter((p) => p.userId !== id);
    this.matches = this.matches.filter((m) => m.userId !== id);
    this.notifications = this.notifications.filter((n) => n.userId !== id);
    return true;
  }

  // Resumes
  public getResumes(tenantId?: string, userId?: string): Resume[] {
    return this.resumes.filter(
      (r) => (!tenantId || r.tenantId === tenantId) && (!userId || r.userId === userId)
    );
  }

  public getResumeById(id: string, tenantId?: string): Resume | undefined {
    return this.resumes.find((r) => r.id === id && (!tenantId || r.tenantId === tenantId));
  }

  public createResume(
    resumeData: Omit<Resume, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> & {
      embedding?: number[];
      skillsVector?: number[];
      experienceVector?: number[];
    }
  ): Resume {
    const embedding = resumeData.embedding || generateDeterministicEmbedding(resumeData.content);
    const skillsVector = resumeData.skillsVector || generateDeterministicEmbedding(resumeData.extractedSkills.join(', '));
    const experienceVector = resumeData.experienceVector || generateDeterministicEmbedding(resumeData.content);

    // If marked as primary, unmark existing resumes for user
    if (resumeData.isPrimary) {
      this.resumes.forEach((r) => {
        if (r.userId === resumeData.userId) {
          r.isPrimary = false;
        }
      });
    }

    const newResume: Resume = {
      ...resumeData,
      id: uuidv4(),
      embedding,
      skillsVector,
      experienceVector,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.resumes.push(newResume);
    return newResume;
  }

  // UserPreferences
  public getPreferences(userId?: string, tenantId?: string): UserPreferences | undefined {
    if (!userId) {
      return this.preferences[0];
    }
    return this.preferences.find(
      (p) => p.userId === userId && (!tenantId || p.tenantId === tenantId)
    );
  }

  public getAllPreferences(): UserPreferences[] {
    return this.preferences;
  }

  public upsertPreferences(prefData: Partial<UserPreferences> & { userId: string; tenantId: string }): UserPreferences {
    const existing = this.getPreferences(prefData.userId, prefData.tenantId);
    if (existing) {
      Object.assign(existing, prefData, { updatedAt: new Date().toISOString() });
      return existing;
    }
    const newPref: UserPreferences = {
      id: uuidv4(),
      userId: prefData.userId,
      tenantId: prefData.tenantId,
      targetLocations: prefData.targetLocations || ['San Francisco, CA', 'Remote'],
      targetRoles: prefData.targetRoles || ['Software Engineering Intern'],
      preferredCompanies: prefData.preferredCompanies || ['Goldman Sachs', 'Microsoft', 'Stripe'],
      blacklistedCompanies: prefData.blacklistedCompanies || [],
      customMatchThreshold: prefData.customMatchThreshold ?? 0.70,
      alertMethod: prefData.alertMethod || 'email',
      alertDestination: prefData.alertDestination || 'user@example.com',
      isActive: prefData.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.preferences.push(newPref);
    return newPref;
  }

  // Jobs
  public getJobs(): Job[] {
    return this.jobs;
  }

  public getJobById(id: string): Job | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  public getJobByExternalId(source: string, externalId: string): Job | undefined {
    return this.jobs.find((j) => j.source === source && j.externalId === externalId);
  }

  public getJobByDedupHash(dedupHash: string): Job | undefined {
    return this.jobs.find((j) => j.dedupHash === dedupHash);
  }

  public insertJob(job: Job): Job {
    this.jobs.push(job);
    return job;
  }

  public createJob(jobData: JobInput): Job {
    const vectorEmbedding = jobData.vectorEmbedding || generateDeterministicEmbedding(jobData.description + ' ' + jobData.company + ' ' + jobData.title);
    const nowIso = new Date().toISOString();
    const dedupHash = jobData.dedupHash || `${jobData.company.toLowerCase().trim()}|${jobData.title.toLowerCase().trim()}|${jobData.location.toLowerCase().trim()}|${jobData.applyUrl.toLowerCase().trim()}`;
    const newJob: Job = {
      ...jobData,
      id: uuidv4(),
      dedupHash,
      vectorEmbedding,
      firstSeenAt: jobData.firstSeenAt || nowIso,
      lastVerifiedActive: jobData.lastVerifiedActive || nowIso,
      isActive: jobData.isActive !== undefined ? jobData.isActive : true,
      relevanceStatus: jobData.relevanceStatus || 'RELEVANT',
      createdAt: nowIso,
      updatedAt: jobData.updatedAt || nowIso,
    };
    this.jobs.push(newJob);
    return newJob;
  }

  public upsertJob(jobData: JobInput): { job: Job; isNew: boolean } {
    const dedupHash = jobData.dedupHash || `${jobData.company.toLowerCase().trim()}|${jobData.title.toLowerCase().trim()}|${jobData.location.toLowerCase().trim()}|${jobData.applyUrl.toLowerCase().trim()}`;
    const existing = this.jobs.find(
      (j) => (jobData.dedupHash && j.dedupHash === jobData.dedupHash) ||
             (j.source === jobData.source && j.externalId === jobData.externalId) ||
             (jobData.applyUrl && j.applyUrl === jobData.applyUrl)
    );

    const nowIso = new Date().toISOString();
    const vectorEmbedding =
      jobData.vectorEmbedding ||
      (jobData.relevanceStatus === 'DROPPED_LOCATION_MISMATCH'
        ? undefined
        : generateDeterministicEmbedding(`${jobData.description} ${jobData.company} ${jobData.title} ${(jobData.statedRequirements?.requiredSkills || []).join(' ')}`));

    if (existing) {
      existing.lastVerifiedActive = nowIso;
      existing.updatedAt = nowIso;
      if (jobData.isActive !== undefined) existing.isActive = jobData.isActive;
      if (jobData.title) existing.title = jobData.title;
      if (jobData.location) existing.location = jobData.location;
      if (jobData.description) existing.description = jobData.description;
      if (jobData.statedRequirements) existing.statedRequirements = jobData.statedRequirements;
      if (jobData.informalBar) existing.informalBar = jobData.informalBar;
      if (jobData.applyUrl) existing.applyUrl = jobData.applyUrl;
      if (vectorEmbedding && !existing.vectorEmbedding) existing.vectorEmbedding = vectorEmbedding;
      if (!existing.dedupHash) existing.dedupHash = dedupHash;
      if (jobData.relevanceStatus) existing.relevanceStatus = jobData.relevanceStatus;
      return { job: existing, isNew: false };
    }

    const newJob: Job = {
      ...jobData,
      id: uuidv4(),
      dedupHash,
      vectorEmbedding,
      firstSeenAt: jobData.firstSeenAt || nowIso,
      lastVerifiedActive: jobData.lastVerifiedActive || nowIso,
      isActive: jobData.isActive !== undefined ? jobData.isActive : true,
      relevanceStatus: jobData.relevanceStatus || 'RELEVANT',
      createdAt: nowIso,
      updatedAt: jobData.updatedAt || nowIso,
    };
    this.jobs.push(newJob);
    return { job: newJob, isNew: true };
  }

  public upsertJobs(jobsData: JobInput[]): { inserted: number; updated: number; total: number } {
    let inserted = 0;
    let updated = 0;

    for (const jobData of jobsData) {
      const res = this.upsertJob(jobData);
      if (res.isNew) inserted++;
      else updated++;
    }

    return { inserted, updated, total: jobsData.length };
  }

  // Stale Job Bloat Cleanup & Retention Engine
  public getArchivedJobs(): ArchivedJob[] {
    return this.archivedJobs;
  }

  public markJobInactive(id: string, reason?: string): boolean {
    const job = this.jobs.find((j) => j.id === id);
    if (!job) return false;
    job.isActive = false;
    job.updatedAt = new Date().toISOString();
    return true;
  }

  public markJobsInactiveBulk(jobIds: string[]): number {
    let count = 0;
    const nowIso = new Date().toISOString();
    for (const id of jobIds) {
      const job = this.jobs.find((j) => j.id === id);
      if (job && job.isActive) {
        job.isActive = false;
        job.updatedAt = nowIso;
        count++;
      }
    }
    return count;
  }

  public getStorageBloatStats(): StorageBloatStats {
    return cleanupEngine.computeBloatStats(this.jobs, this.archivedJobs, this.lastCleanupStats);
  }

  /**
   * Executes the exact SQL cleanup query requested:
   * DELETE FROM jobs WHERE is_active = FALSE AND updated_at < NOW() - INTERVAL '60 days'
   */
  public cleanupStaleJobs(options: CleanupOptions = {}): CleanupResult {
    const retentionDays = options.retentionDays !== undefined ? options.retentionDays : 60;
    const mode = options.mode || 'delete';
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    const sqlExecuted = cleanupEngine.getSqlStatement(retentionDays, mode);

    const initialTotal = this.jobs.length;
    const staleJobsToPrune: Job[] = [];
    const remainingJobs: Job[] = [];

    for (const job of this.jobs) {
      const { isStale, daysSinceUpdate } = cleanupEngine.evaluateJobStaleness(job, retentionDays, now);
      
      if (isStale || (options.forceAllInactive && !job.isActive)) {
        staleJobsToPrune.push(job);
      } else {
        remainingJobs.push(job);
      }
    }

    let archivedCount = 0;
    if (mode === 'archive') {
      for (const stale of staleJobsToPrune) {
        const archivedEntry: ArchivedJob = {
          ...stale,
          archivedAt: now.toISOString(),
          archiveReason: `Stale closed job older than ${retentionDays} days (updated: ${stale.updatedAt})`,
        };
        this.archivedJobs.push(archivedEntry);
        archivedCount++;
      }
    }

    // Replace in-memory array with remaining active/recent jobs
    this.jobs = remainingJobs;

    // Calculate freed bytes estimate (each job ~1.5KB - 8KB with raw JD + vector)
    const estimatedFreedKb = staleJobsToPrune.reduce((acc, j) => {
      const size = (j.rawJd?.length || 0) + (j.description?.length || 0) + (j.vectorEmbedding ? 768 * 8 : 0) + 512;
      return acc + Math.round(size / 1024);
    }, 0);

    const details = staleJobsToPrune.map((j) => ({
      id: j.id,
      company: j.company,
      title: j.title,
      isActive: j.isActive,
      updatedAt: j.updatedAt,
      daysOld: Math.floor((now.getTime() - new Date(j.updatedAt || j.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    const result: CleanupResult = {
      success: true,
      timestamp: now.toISOString(),
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      mode,
      scannedJobs: initialTotal,
      prunedCount: staleJobsToPrune.length,
      archivedCount,
      remainingJobs: this.jobs.length,
      estimatedFreedKb,
      sqlExecuted,
      details,
    };

    this.lastCleanupStats = {
      executedAt: now.toISOString(),
      deletedCount: staleJobsToPrune.length,
      archivedCount,
      freedBytes: estimatedFreedKb * 1024,
      retentionDays,
      query: sqlExecuted,
    };

    return result;
  }

  /**
   * Seeds realistic 60-day, 90-day, and 180-day stale closed jobs to demonstrate bloat cleanup
   */
  public simulateStaleJobBloat(): { addedCount: number; message: string; sampleJobs: Job[] } {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const sampleStaleDefinitions = [
      {
        daysOld: 180, // 6 months old!
        company: 'Uber',
        title: 'Software Engineering Intern - Autonomous Systems (Closed 2025)',
        location: 'San Francisco, CA',
        source: 'greenhouse' as const,
        extId: 'uber-auton-2025-stale',
        hash: 'uber-swe-sf-stale-180d-hash',
        jd: 'Legacy posting from last cycle. Distributed path planning in C++ and ROS. This requisition was filled and closed 6 months ago.',
      },
      {
        daysOld: 120, // 4 months old
        company: 'Meta',
        title: 'Software Engineer Intern - Core Infra (Closed)',
        location: 'Menlo Park, CA',
        source: 'lever' as const,
        extId: 'meta-infra-closed-120d',
        hash: 'meta-infra-mp-stale-120d-hash',
        jd: 'Legacy Summer 2025 infrastructure posting. C++ systems and Hack/HHVM backend pipelines. Closed role.',
      },
      {
        daysOld: 75, // 2.5 months old (>60 days)
        company: 'Coinbase',
        title: 'Backend Engineering Intern - Blockchain Core (Closed)',
        location: 'Remote',
        source: 'greenhouse' as const,
        extId: 'coinbase-crypto-closed-75d',
        hash: 'coinbase-swe-rem-stale-75d-hash',
        jd: 'Blockchain transaction sequencer in Go and Solidity. Requisition marked filled.',
      },
      {
        daysOld: 65, // Just over 60 days
        company: 'Robinhood',
        title: 'Software Engineering Intern - Clearing Systems (Closed)',
        location: 'New York, NY',
        source: 'greenhouse' as const,
        extId: 'robinhood-clear-closed-65d',
        hash: 'robinhood-swe-ny-stale-65d-hash',
        jd: 'Financial clearing settlement in Python and Go. Closed requisition from earlier recruiting wave.',
      },
      {
        daysOld: 20, // Only 20 days old (<60 days - should be preserved by 60d cutoff!)
        company: 'Amazon',
        title: 'SDE Intern - AWS Databases (Recently Closed)',
        location: 'Seattle, WA',
        source: 'direct' as const,
        extId: 'amazon-aws-closed-20d',
        hash: 'amazon-sde-sea-stale-20d-hash',
        jd: 'AWS DynamoDB core engine in Java and C++. Requisition recently paused 20 days ago (within 60d grace period).',
      },
    ];

    const addedJobs: Job[] = [];

    for (const def of sampleStaleDefinitions) {
      const historicalDate = new Date(now - def.daysOld * dayMs).toISOString();
      const job: Job = {
        id: uuidv4(),
        source: def.source,
        externalId: def.extId,
        dedupHash: def.hash,
        company: def.company,
        title: def.title,
        location: def.location,
        isRemote: def.location.toLowerCase().includes('remote'),
        description: def.jd,
        rawJd: `${def.jd}\n\nFull raw job description blob taking up storage space with requirements, benefits, equal opportunity employer disclaimers, and legal disclosures.`,
        statedRequirements: {
          requiredSkills: ['C++', 'Python', 'Algorithms', 'Distributed Systems'],
          preferredSkills: ['Cloud', 'Kubernetes'],
          education: 'Enrolled in BS CS',
          experienceYears: 0,
        },
        informalBar: {
          dsaDifficulty: 'Hard',
          oaPattern: 'LeetCode Hard Dynamic Programming',
          unstatedPreferences: ['Previous Tier-1 internship'],
          barDescription: 'Closed legacy posting bar.',
        },
        vectorEmbedding: generateDeterministicEmbedding(def.jd + ' ' + def.company),
        applyUrl: `https://${def.company.toLowerCase()}.com/jobs/${def.extId}`,
        postedAt: historicalDate,
        firstSeenAt: historicalDate,
        lastVerifiedActive: historicalDate,
        isActive: false, // Closed job!
        relevanceStatus: 'RELEVANT',
        createdAt: historicalDate,
        updatedAt: historicalDate, // Historical update time
      };

      this.jobs.push(job);
      addedJobs.push(job);
    }

    return {
      addedCount: addedJobs.length,
      message: `Injected ${addedJobs.length} sample stale closed jobs (ranging from 20 to 180 days old) to test automated retention cleanup.`,
      sampleJobs: addedJobs,
    };
  }

  // Matches & 2-Layer RAG Evaluation Engine
  public getMatches(tenantId?: string, userId?: string): Match[] {
    let result = this.matches.filter(
      (m) => (!tenantId || m.tenantId === tenantId) && (!userId || m.userId === userId)
    );
    // Attach joined Job
    return result.map((m) => ({
      ...m,
      job: this.jobs.find((j) => j.id === m.jobId),
      user: this.users.find((u) => u.id === m.userId),
    }));
  }

  public createMatch(matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Match {
    const newMatch: Match = {
      ...matchData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.matches.push(newMatch);
    return newMatch;
  }

  // Calculate 2-Layer Match score for a resume against a job
  public evaluateTwoLayerMatch(resume: Resume, job: Job, prefs?: UserPreferences) {
    // 1. Layer 1: Stated Requirements Fit (Dense Vector + Hybrid Lexical Keyword & Synonym Match)
    const layer1Result = layer1RagEngine.evaluateLayer1(resume, job);
    const layer1Score = layer1Result.layer1Score;
    const matchedSkills = layer1Result.matchedRequiredSkills;
    const missingSkills = layer1Result.missingRequiredSkills;

    // Check blacklist / preferences
    const isPreferred = prefs?.preferredCompanies?.some(
      (c) => c.toLowerCase() === job.company.toLowerCase()
    );
    const isBlacklisted = prefs?.blacklistedCompanies?.some(
      (c) => c.toLowerCase() === job.company.toLowerCase()
    );

    if (isBlacklisted) {
      return {
        layer1Score: 0,
        layer2Score: 0,
        compositeScore: 0,
        matchedSkills,
        missingSkills,
        layer1Details: layer1Result,
        isBlacklisted: true,
      };
    }

    let informalBarBonus = 0;
    if (isPreferred) informalBarBonus += 0.1;

    // 2. Layer 2: Informal Bar Fit (DSA bar, OA patterns, unstated company preferences)
    const resumeFullText = `${resume.content || ''} ${(resume.extractedSkills || []).join(' ')}`.toLowerCase();
    const informalReqs = job.informalBar?.unstatedPreferences || [];
    let informalMatchedCount = 0;
    for (const req of informalReqs) {
      if (resumeFullText.includes(req.toLowerCase().slice(0, 8))) {
        informalMatchedCount++;
      }
    }
    const informalMatchRatio = informalReqs.length > 0 ? informalMatchedCount / informalReqs.length : 0.7;

    const layer2Score = parseFloat(
      Math.min(1.0, layer1Result.vectorSimilarity * 0.4 + informalMatchRatio * 0.5 + informalBarBonus).toFixed(2)
    );

    const compositeScore = parseFloat(((layer1Score * 0.45 + layer2Score * 0.55) * 100).toFixed(1));

    return {
      layer1Score,
      layer2Score,
      compositeScore,
      matchedSkills,
      missingSkills,
      layer1Details: layer1Result,
      isBlacklisted: false,
    };
  }

  // Notifications
  public getNotifications(tenantId?: string, userId?: string): NotificationLog[] {
    return this.notifications.filter(
      (n) => (!tenantId || n.tenantId === tenantId) && (!userId || n.userId === userId)
    );
  }

  public createNotification(notifData: Omit<NotificationLog, 'id' | 'createdAt'>): NotificationLog {
    const newNotif: NotificationLog = {
      ...notifData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.notifications.push(newNotif);
    return newNotif;
  }

  // ==========================================
  // PHASE 7: COMPANY EXPECTATIONS & LAYER 2 KNOWLEDGE GRAPH REPOSITORY
  // ==========================================

  public getCompanyInsights(filters?: {
    tier?: string;
    industry?: string;
    dsaDifficulty?: string;
    oaPlatform?: string;
    search?: string;
  }): CompanyInsight[] {
    let result = [...this.companyInsights];

    if (filters) {
      if (filters.tier && filters.tier !== 'all') {
        result = result.filter((c) => c.tier === filters.tier);
      }
      if (filters.industry && filters.industry !== 'all') {
        result = result.filter((c) => c.industry === filters.industry);
      }
      if (filters.dsaDifficulty && filters.dsaDifficulty !== 'all') {
        result = result.filter((c) => c.dsaBar.difficulty === filters.dsaDifficulty);
      }
      if (filters.oaPlatform && filters.oaPlatform !== 'all') {
        result = result.filter((c) => c.oaType.platform === filters.oaPlatform);
      }
      if (filters.search) {
        const query = filters.search.toLowerCase().trim();
        result = result.filter(
          (c) =>
            c.companyName.toLowerCase().includes(query) ||
            c.aliases.some((a) => a.toLowerCase().includes(query)) ||
            c.headquarters.toLowerCase().includes(query) ||
            c.resumeHotkeys.some((h) => h.toLowerCase().includes(query)) ||
            c.dsaBar.primaryTopics.some((t) => t.toLowerCase().includes(query))
        );
      }
    }

    return result;
  }

  public getCompanyInsightById(id: string): CompanyInsight | undefined {
    return this.companyInsights.find((c) => c.id === id || c.companyName.toLowerCase() === id.toLowerCase());
  }

  public getCompanyInsightByName(name: string): CompanyInsight | undefined {
    const cleanName = name.trim().toLowerCase();
    return this.companyInsights.find(
      (c) =>
        c.companyName.toLowerCase() === cleanName ||
        c.aliases.some((a) => a.toLowerCase() === cleanName || cleanName.includes(a.toLowerCase()))
    );
  }

  public upsertCompanyInsight(insight: CompanyInsight): CompanyInsight {
    const index = this.companyInsights.findIndex((c) => c.id === insight.id);
    const now = new Date().toISOString();
    const updated = { ...insight, updatedAt: now };

    if (index >= 0) {
      this.companyInsights[index] = updated;
    } else {
      this.companyInsights.push({ ...updated, createdAt: now });
    }
    return updated;
  }

  public getCompanyInsightsStats() {
    const totalCompanies = this.companyInsights.length;
    const tierCounts: Record<string, number> = {};
    const dsaCounts: Record<string, number> = {};
    const oaCounts: Record<string, number> = {};
    const industryCounts: Record<string, number> = {};

    for (const c of this.companyInsights) {
      tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1;
      dsaCounts[c.dsaBar.difficulty] = (dsaCounts[c.dsaBar.difficulty] || 0) + 1;
      oaCounts[c.oaType.platform] = (oaCounts[c.oaType.platform] || 0) + 1;
      industryCounts[c.industry] = (industryCounts[c.industry] || 0) + 1;
    }

    return {
      totalCompanies,
      tierDistribution: tierCounts,
      dsaDifficultyDistribution: dsaCounts,
      oaPlatformDistribution: oaCounts,
      industryDistribution: industryCounts,
      verifiedDataSources: Object.values(VERIFIED_DATA_SOURCES),
    };
  }

  public getDataSources(): CompanyDataSource[] {
    return Object.values(VERIFIED_DATA_SOURCES);
  }

  // Database Stats
  public getStats(): DatabaseStats {
    const tenants = new Set(this.users.map((u) => u.tenantId));
    return {
      usersCount: this.users.length,
      resumesCount: this.resumes.length,
      preferencesCount: this.preferences.length,
      jobsCount: this.jobs.length,
      matchesCount: this.matches.length,
      notificationsCount: this.notifications.length,
      dbEngine: 'PostgreSQL + pgvector (Drizzle ORM Simulation Engine)',
      vectorExtensionEnabled: true,
      vectorDimensions: 768,
      tenantsCount: tenants.size,
      migrationStatus: this.migrationStatus,
      lastMigrationTime: this.lastMigrationTime,
    };
  }

  public runMigrationSim(): string {
    this.migrationStatus = '0000_initial_schema.sql & 0001_seed_data.sql executed successfully';
    this.lastMigrationTime = new Date().toISOString();
    return this.migrationStatus;
  }
}

export const db = new InAppDatabase();
