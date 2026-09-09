/**
 * AI Internship Scout - Phase 1 Type Definitions
 * Multi-Tenant Architecture & Database Models
 */

export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  passwordHash?: string;
  avatarUrl?: string;
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  fullName: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'passwordHash'>;
  expiresIn: string;
}

export interface ParsedResumeData {
  skills: string[];
  projects: {
    title: string;
    description: string;
    technologies: string[];
    outcomes: string[];
  }[];
  experience: {
    company: string;
    role: string;
    duration: string;
    highlights: string[];
    technologies: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    graduationYear: string;
    gpa?: string;
  }[];
  metrics: {
    latencyReduction?: string;
    systemScale?: string;
    gpa?: string;
    totalYearsExperience?: number;
    impactKeywords: string[];
  };
}

export interface Resume {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  content: string;
  extractedSkills: string[];
  parsedExperience: {
    company: string;
    role: string;
    duration: string;
    highlights: string[];
    technologies?: string[];
  }[];
  parsedData?: ParsedResumeData;
  embedding: number[]; // 768-dim float vector (Full resume vector)
  skillsVector?: number[]; // 768-dim vector
  experienceVector?: number[]; // 768-dim vector
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  tenantId: string;
  targetLocations: string[];
  targetRoles: string[];
  preferredCompanies: string[];
  blacklistedCompanies: string[];
  customMatchThreshold: number; // 0.0 to 1.0 (e.g. 0.70 = 70%)
  alertMethod: 'email' | 'telegram' | 'webhook';
  alertDestination: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  source: 'greenhouse' | 'lever' | 'direct' | 'custom';
  externalId: string;
  dedupHash: string; // SHA-256(company + title + location + direct_apply_url)
  company: string;
  title: string;
  location: string;
  isRemote: boolean;
  description: string;
  rawJd: string;
  statedRequirements: {
    requiredSkills: string[];
    preferredSkills: string[];
    education: string;
    experienceYears: number;
  };
  informalBar: {
    dsaDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
    oaPattern: string; // e.g., "LeetCode Mediums, Dynamic Programming, Graph Traversal"
    unstatedPreferences: string[]; // e.g. "Prefers Top-tier CS background or open source contributions"
    barDescription: string;
  };
  vectorEmbedding?: number[]; // 768-dim vector (computed ONLY for relevant, non-duplicate jobs)
  applyUrl: string;
  postedAt: string;
  firstSeenAt: string;
  lastVerifiedActive: string;
  isActive: boolean; // Flag to indicate if job posting is active or closed
  relevanceStatus: 'RELEVANT' | 'IRRELEVANT' | 'DROPPED_LOCATION_MISMATCH' | 'PENDING_PREFILTER';
  prefilterReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArchivedJob extends Job {
  archivedAt: string;
  archiveReason: string;
}

export interface StorageBloatStats {
  totalJobs: number;
  activeJobs: number;
  inactiveJobs: number;
  staleJobsOver60Days: number;
  staleJobsOver90Days: number;
  staleJobsOver180Days: number;
  estimatedDiskSizeBytes: number;
  reclaimableBytes: number;
  archivedJobsCount: number;
  lastCleanupRun?: {
    executedAt: string;
    deletedCount: number;
    archivedCount: number;
    freedBytes: number;
    retentionDays: number;
    query: string;
  };
}

export interface CleanupResult {
  success: boolean;
  timestamp: string;
  retentionDays: number;
  cutoffDate: string;
  mode: 'delete' | 'archive';
  scannedJobs: number;
  prunedCount: number;
  archivedCount: number;
  remainingJobs: number;
  estimatedFreedKb: number;
  sqlExecuted: string;
  details: {
    id: string;
    company: string;
    title: string;
    isActive: boolean;
    updatedAt: string;
    daysOld: number;
  }[];
}

export type JobInput = Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'vectorEmbedding' | 'dedupHash' | 'firstSeenAt' | 'lastVerifiedActive' | 'isActive' | 'relevanceStatus'> & {
  vectorEmbedding?: number[];
  dedupHash?: string;
  firstSeenAt?: string;
  lastVerifiedActive?: string;
  isActive?: boolean;
  relevanceStatus?: 'RELEVANT' | 'IRRELEVANT' | 'DROPPED_LOCATION_MISMATCH' | 'PENDING_PREFILTER';
  prefilterReason?: string;
  updatedAt?: string;
};

export interface Layer1SkillMatch {
  skill: string;
  category: 'core_language' | 'framework' | 'distributed_systems' | 'database' | 'ai_ml' | 'tools_devops' | 'general_cs';
  matched: boolean;
  matchedTokenInResume?: string;
  confidence: number; // 0.0 - 1.0
  isRequired: boolean;
}

export interface Layer1EvaluationResult {
  jobId?: string;
  resumeId?: string;
  jobTitle: string;
  company: string;
  
  // Vector Cosine Similarity
  vectorSimilarity: number; // 0.0 - 1.0
  
  // Lexical & Keyword Matching
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  
  requiredSkillsRatio: number; // 0.0 - 1.0
  preferredSkillsRatio: number; // 0.0 - 1.0
  
  // Detailed Skill Map
  skillBreakdown: Layer1SkillMatch[];
  
  // Education & Experience Heuristic Checks
  educationFit: {
    requiredEducation: string;
    candidateEducation: string;
    meetsRequirement: boolean;
    score: number; // 0.0 - 1.0
  };
  
  experienceFit: {
    requiredYears: number;
    candidateYears: number;
    meetsRequirement: boolean;
    score: number; // 0.0 - 1.0
  };
  
  // Composite Baseline Layer 1 Score (0.0 to 1.0)
  layer1Score: number;
  layer1Percentage: number; // 0 - 100%
  
  // Hybrid Search Weights used
  weights: {
    vectorWeight: number; // 0.45
    requiredSkillWeight: number; // 0.40
    preferredSkillWeight: number; // 0.10
    educationExpWeight: number; // 0.05
  };
  
  evaluationSummary: string;
  timestamp: string;
  latencyMs: number;
}

export interface Layer2Warning {
  id: string;
  category: 'OA_DIFFICULTY' | 'PROCTORING_RISK' | 'UNSPOKEN_FILTER' | 'GPA_CUTOFF' | 'SCHOOL_BIAS' | 'RED_FLAG' | 'VISA_RISK' | 'RECRUITING_VELOCITY' | 'TECH_GAP';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  recommendation?: string;
}

export interface Layer2PositiveSignal {
  category: 'TECH_DEPTH' | 'HOTKEY_MATCH' | 'SCHOOL_MATCH' | 'CULTURE_ALIGNMENT' | 'PREVIOUS_TIER1_EXP' | 'HIGH_GPA';
  title: string;
  description: string;
}

export interface Layer2DsaEvaluation {
  companyBarDifficulty: DsaDifficulty;
  requiredTopics: string[];
  candidateCoveredTopics: string[];
  uncoveredHardTopics: string[];
  technicalAlignmentScore: number; // 0.0 - 1.0
  liveCodingFormat: string;
  focusAreas: string;
}

export interface Layer2OaEvaluation {
  platform: OaPlatform;
  durationMinutes: number;
  cutoffDescription: string;
  proctoringStrictness: 'Strict Proctored (Webcam + Screen + Lock)' | 'Standard Proctoring' | 'Unproctored / Take-home' | 'No Initial OA';
  webcamRequired: boolean;
  screenRecording: boolean;
  copyPasteDisabled: boolean;
  predictedPassProbability: number; // 0.0 - 1.0
  preparationGuide: string;
}

export interface Layer2FilterEvaluation {
  targetSchoolAssessment: {
    matched: boolean;
    candidateSchool?: string;
    targetTierText: string;
    score: number; // 0.0 - 1.0
  };
  gpaAssessment: {
    candidateGpa?: string | number;
    minimumRequiredText: string;
    meetsCutoff: boolean;
    score: number; // 0.0 - 1.0
  };
  visaAssessment: {
    openness: string;
    score: number; // 0.0 - 1.0
    note: string;
  };
  experienceTierAssessment: {
    score: number; // 0.0 - 1.0
    note: string;
  };
}

export interface Layer2RetrievedEvidence {
  chunkId: string;
  company: string;
  category: CompanyKnowledgeCategory;
  source: KnowledgeSourceType;
  role: string;
  date: string;
  confidence: 'high' | 'medium' | 'verified';
  title: string;
  snippet: string;
  similarityScore: number; // 0.0 - 1.0
  relevanceToCandidate?: string;
}

export interface Layer2LLMReasoningSummary {
  company_reality_score: number;
  dsa_alignment: number;
  oa_risk: 'low' | 'medium' | 'high' | 'critical';
  gpa_risk: 'low' | 'medium' | 'high';
  university_risk: 'low' | 'medium' | 'high';
  visa_feasibility: 'high' | 'moderate' | 'low';
  evidence_citations: string[];
  warnings: string[];
  recommendations: string[];
  reasoning_synthesis: string;
}

export interface Layer2EvaluationResult {
  jobId?: string;
  resumeId?: string;
  jobTitle: string;
  company: string;
  companyInsightId?: string;
  companyTier: CompanyTier;
  industry: IndustrySector;

  // Layer 1 Stated Baseline
  layer1Score: number; // 0.0 - 1.0
  layer1Percentage: number; // 0 - 100%

  // Layer 2 Informal Company Reality
  layer2Score: number; // 0.0 - 1.0
  layer2Percentage: number; // 0 - 100%

  // Alignment Delta (Adjustment)
  alignmentDelta: number; // e.g. -0.22 or +0.14
  alignmentDeltaPercentage: number; // e.g. -22.0% or +14.0%

  // Final Composite Match Score
  compositeScore: number; // 0.0 - 1.0
  compositePercentage: number; // 0 - 100%

  // RAG Semantic Retrieval & Grounded Evidence
  ragQuery?: string;
  retrievedEvidence?: Layer2RetrievedEvidence[];
  llmReasoning?: Layer2LLMReasoningSummary;
  semanticAlignmentScore?: number;

  // Component Breakdowns
  dsaEvaluation: Layer2DsaEvaluation;
  oaEvaluation: Layer2OaEvaluation;
  filterEvaluation: Layer2FilterEvaluation;

  // Hotkeys & Red Flags
  matchedHotkeys: string[];
  missingHotkeys: string[];
  detectedRedFlags: string[];

  // Actionable Warnings & Positive Strengths
  specificWarnings: Layer2Warning[];
  positiveSignals: Layer2PositiveSignal[];

  // Culture Traits Checked
  cultureTraits: {
    trait: string;
    description: string;
    importance: 'Critical' | 'High' | 'Moderate';
    candidateMatchLevel: 'Strong' | 'Moderate' | 'Unclear';
  }[];

  // Contextual Explanations & Advice
  realityCheckSummary: string;
  actionPlan: string[];
  compensationContext: {
    verifiedHourlyRate: string;
    housingStipendMonthly?: string;
    relocationBonus?: string;
  };
  applicationTimeline: {
    typicalOpenDate: string;
    typicalCloseDate: string;
    urgencyRating: string;
    recruiterVelocity: string;
  };
  timestamp: string;
  latencyMs: number;
}

export interface Match {
  id: string;
  userId: string;
  tenantId: string;
  jobId: string;
  resumeId: string;
  layer1Score: number; // 0.0 - 1.0 (Stated JD fit)
  layer2Score: number; // 0.0 - 1.0 (Informal company bar fit)
  compositeScore: number; // 0.0 - 100.0 or 0.0 - 1.0
  matchedSkills: string[];
  missingSkills: string[];
  layer1Details?: Layer1EvaluationResult;
  layer2Details?: Layer2EvaluationResult;
  status: 'pending' | 'alerted' | 'applied' | 'skipped';
  userFeedback?: 'thumbs_up' | 'thumbs_down' | 'threshold_adjusted';
  createdAt: string;
  updatedAt: string;

  // Joined relations for convenience in API responses
  job?: Job;
  user?: User;
}

export interface NotificationLog {
  id: string;
  userId: string;
  tenantId: string;
  matchId: string;
  type: 'email' | 'telegram' | 'webhook';
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'queued' | 'sent' | 'failed';
  metadata: Record<string, any>;
  createdAt: string;
}

export interface DatabaseStats {
  usersCount: number;
  resumesCount: number;
  preferencesCount: number;
  jobsCount: number;
  matchesCount: number;
  notificationsCount: number;
  dbEngine: string;
  vectorExtensionEnabled: boolean;
  vectorDimensions: number;
  tenantsCount: number;
  migrationStatus: string;
  lastMigrationTime: string;
}

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  userEmail: string;
}

// ==========================================
// PHASE 7: COMPANY EXPECTATIONS KNOWLEDGE GRAPH (LAYER 2 SEED DATA)
// ==========================================

export type CompanyTier =
  | 'Tier 1 Quant/HFT'
  | 'Tier 1 Big Tech / FAANG+'
  | 'Tier 1 Enterprise Unicorn / High-Growth'
  | 'Tier 2 Elite Tech'
  | 'Top Finance / Wall St'
  | 'Venture Backed AI';

export type IndustrySector =
  | 'Fintech / Quantitative Trading'
  | 'Cloud / AI / Big Tech'
  | 'Enterprise Infrastructure'
  | 'Consumer / Social / Design'
  | 'Investment Banking / Finance'
  | 'Applied AI & Foundation Models'
  | 'Security & Systems';

export type DsaDifficulty = 'Easy' | 'Medium' | 'Medium-Hard' | 'Hard' | 'Extreme';

export type OaPlatform =
  | 'CodeSignal (GCA)'
  | 'HackerRank'
  | 'Karat'
  | 'Codility'
  | 'Byteboard'
  | 'Glider'
  | 'Custom Proctored Platform'
  | 'No Initial OA / Direct Phone Screen';

export type CompanyKnowledgeCategory =
  | 'interview'
  | 'oa'
  | 'dsa'
  | 'hiring_filter'
  | 'gpa_university'
  | 'visa'
  | 'compensation'
  | 'culture'
  | 'recruiter_observation'
  | 'candidate_report';

export type KnowledgeSourceType =
  | 'candidate_report'
  | 'verified_interview_debrief'
  | 'levels_fyi'
  | 'recruiter_disclosure'
  | 'leetcode_discuss'
  | 'engineering_blog';

export interface CompanyKnowledgeChunk {
  id: string; // e.g. 'chunk-goog-oa-01'
  company: string; // 'Google'
  companyAliases?: string[];
  category: CompanyKnowledgeCategory;
  source: KnowledgeSourceType;
  role: string; // 'software_engineering' | 'quantitative_trading' | 'machine_learning'
  date: string; // '2026', '2025-Q4', etc.
  confidence: 'high' | 'medium' | 'verified';
  title: string;
  content: string;
  tags: string[];
  metadata?: {
    dsaDifficulty?: string;
    oaPlatform?: string;
    minGpa?: string;
    targetSchools?: string[];
    compensation?: string;
    visaPolicy?: string;
    [key: string]: any;
  };
  vectorEmbedding?: number[];
  createdAt?: string;
}

export interface CompanyDataSource {
  name: string;
  category: 'Public Repository' | 'Verified Candidate Debriefs' | 'Official Engineering Blog' | 'Industry Benchmark Platform';
  urlOrReference: string;
  lastVerified: string;
  description: string;
}

export interface CompanyInsight {
  id: string; // e.g. 'comp-jane-street'
  companyName: string; // e.g. 'Jane Street'
  aliases: string[]; // ['Jane Street Capital', 'JSC']
  logoUrl?: string;
  tier: CompanyTier;
  industry: IndustrySector;
  headquarters: string;
  
  // 1. Technical & DSA Bar
  dsaBar: {
    difficulty: DsaDifficulty;
    primaryTopics: string[]; // ['Dynamic Programming', 'Graph Theory', 'Bit Manipulation', 'Trie']
    focusAreas: string; // 'High-speed memory optimization, type systems, probability & concurrency'
    liveCodingFormat: string; // 'CoderPad interactive pair programming with senior engineer'
    systemDesignExpectation: string; // 'Basic scalability concepts for juniors; concurrency primitives'
  };

  // 2. Online Assessment (OA) Profiling
  oaType: {
    platform: OaPlatform;
    typicalDurationMinutes: number; // e.g. 70, 90, 120
    cutoffScoreDescription: string; // 'CodeSignal GCA 840+ (800+ min threshold for recruiter review)'
    proctoring: {
      webcamRequired: boolean;
      screenRecording: boolean;
      copyPasteDisabled: boolean;
      audioMonitored: boolean;
    };
  };

  // 3. Cultural & Behavioral Alignment
  cultureTraits: {
    trait: string;
    description: string;
    importance: 'Critical' | 'High' | 'Moderate';
  }[];

  // 4. Unspoken Filters & Recruiter Biases
  unspokenFilters: {
    targetSchoolTier: string; // 'Heavy target on Ivy+ / Top 15 CS (MIT, Stanford, CMU, Berkeley); High GPA non-targets considered'
    minimumGpa: string; // '3.5+ strictly checked at Quant & Finance; Relaxed at Meta/Netflix'
    priorExperiencePreference: string; // 'High preference for prior FAANG or tier-1 unicorn internship'
    undergradClassStanding: string; // 'Rising Juniors (penultimate year) prioritized for FT return conversion'
    internationalVisaOpenness: string; // 'High (Sponsors CPT, OPT, J-1)' | 'Moderate' | 'Limited'
    githubOpenSourceWeight: string; // 'High value on open-source C++/Rust contributions or compiler projects'
  };

  // 5. ATS & Resume Optimization Signals
  resumeHotkeys: string[]; // ['Distributed Systems', 'Raft', 'Low-Latency', 'C++20', 'PyTorch CUDA']
  redFlags: string[]; // ['Generic CRUD to-do tutorial clones', 'Unquantified impact bullet points', 'Missing tech stack breakdown']

  // 6. Verified Compensation & Perks (Levels.fyi benchmark)
  compensationRange: {
    hourlyRateUsd: string; // '$100.00 - $125.00/hr ($16,000 - $20,000/mo)'
    housingStipendMonthlyUsd?: string; // '$2,500/mo or luxury corporate apartment'
    relocationBonusUsd?: string; // '$3,000 lump sum'
    perks: string[]; // ['3 gourmet meals/day', 'Round-trip flights', 'Gym & wellness stipend']
  };

  // 7. Historical Recruiting Timeline & Application Velocity
  applicationTimeline: {
    typicalOpenDate: string; // 'Early July'
    typicalCloseDate: string; // 'October (Rolling seats fill quickly)'
    rollingBasis: boolean;
    urgencyRating: 'CRITICAL_ROLLING' | 'STANDARD_FALL' | 'SPRING_WAVE';
    recruiterVelocity: string; // 'Fast (OA sent within 48h of applying)'
  };

  // 8. Typical Interview Pipeline Stages
  interviewStages: {
    roundNumber: number;
    name: string;
    type: 'OA' | 'Recruiter Call' | 'Technical Phone Screen' | 'Virtual Onsite' | 'Behavioral / Values Fit';
    description: string;
    durationMinutes: number;
  }[];

  // 9. Transparent Empirical Data Sources
  dataSources: CompanyDataSource[];

  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PHASE 9: DETERMINISTIC COMPOSITE MATCH SCORING ENGINE
// ==========================================

export interface CompositeScoringWeights {
  layer1Weight: number; // default: 0.40 (40%)
  layer2Weight: number; // default: 0.30 (30%)
  preferredCompanyBoostWeight: number; // default: 0.15 (15%)
  locationRoleFilterWeight: number; // default: 0.15 (15%)
}

export type HardDisqualifierType =
  | 'BLACKLISTED_COMPANY'
  | 'LOCATION_MISMATCH'
  | 'ROLE_MISMATCH'
  | 'INACTIVE_JOB'
  | 'CRITICAL_GPA_REJECT'
  | 'CUSTOM_RULE';

export interface HardDisqualificationRecord {
  type: HardDisqualifierType;
  reason: string;
  triggeredValue?: string;
  requiredValue?: string;
}

export interface ScoreComponentBreakdown {
  rawScore: number; // 0.0 - 1.0
  weight: number; // 0.0 - 1.0
  weightedScore: number; // rawScore * weight
  percentage: number; // rawScore * 100
  weightedPercentage: number; // weightedScore * 100
  notes?: string;
}

export interface CompositeScoreBreakdown {
  layer1: ScoreComponentBreakdown & {
    vectorSimilarity: number;
    requiredSkillsMatched: number;
    requiredSkillsTotal: number;
  };
  layer2: ScoreComponentBreakdown & {
    dsaDifficulty: DsaDifficulty;
    alignmentDelta: number;
    warningsCount: number;
  };
  preferredCompany: ScoreComponentBreakdown & {
    isPreferred: boolean;
    companyTier: CompanyTier;
    matchedPreference?: string;
  };
  locationRole: ScoreComponentBreakdown & {
    locationMatched: boolean;
    roleMatched: boolean;
    isRemote: boolean;
    matchedLocation?: string;
    matchedRole?: string;
  };
}

export type CompositeVerdict =
  | 'STRONG_MATCH' // 80 - 100%
  | 'GOOD_MATCH' // 65 - 79%
  | 'BORDERLINE' // 50 - 64%
  | 'WEAK_MATCH' // < 50%
  | 'DISQUALIFIED'; // Disqualified by hard filter

export interface CompositeMatchEvaluationResult {
  jobId: string;
  resumeId: string;
  userId?: string;
  jobTitle: string;
  company: string;
  location: string;
  isRemote: boolean;

  // Final Non-Hallucinated Deterministic Score
  finalScore: number; // 0.0 - 1.0
  finalPercentage: number; // 0.0 - 100.0%
  rawScoreBeforeDisqualification: number; // 0.0 - 1.0
  rawPercentageBeforeDisqualification: number; // 0.0 - 100.0%

  // Disqualification Status
  isDisqualified: boolean;
  disqualifications: HardDisqualificationRecord[];

  // Threshold Checks
  meetsCustomThreshold: boolean;
  thresholdValue: number; // e.g. 0.70 (70%)
  verdict: CompositeVerdict;

  // Configured Weights Used
  weights: CompositeScoringWeights;

  // Mathematical Breakdown
  breakdown: CompositeScoreBreakdown;

  // Auditability & Formula Trace
  formulaString: string;
  auditSignature: string; // Deterministic hash signature of score inputs
  evaluationSummary: string;
  timestamp: string;
  latencyMs: number;
}

export interface BatchScoringResponse {
  resumeId: string;
  userId?: string;
  candidateTitle: string;
  totalJobsEvaluated: number;
  qualifiedJobsCount: number;
  disqualifiedJobsCount: number;
  meetsThresholdCount: number;
  thresholdValue: number;
  weights: CompositeScoringWeights;
  aggregates: {
    averageFinalScore: number;
    averageFinalPercentage: number;
    averageQualifiedScore: number;
    topScore: number;
    strongMatchCount: number;
    goodMatchCount: number;
    borderlineCount: number;
    weakMatchCount: number;
  };
  evaluations: CompositeMatchEvaluationResult[];
}

// ==========================================
// PHASE 10: ASYNCHRONOUS POLLING & TASK QUEUE INFRASTRUCTURE
// ==========================================

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'dead_letter';

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

export type ScraperJobType =
  | 'greenhouse_poll'
  | 'lever_poll'
  | 'custom_poll'
  | 'batch_poll'
  | 'company_sync';

export interface TaskLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
}

export interface ScraperTaskPayload {
  source: 'greenhouse' | 'lever' | 'custom';
  boardToken: string;
  companyName: string;
  scheduleId?: string;
  forceFresh?: boolean;
  maxJobsToProcess?: number;
  customHeaders?: Record<string, string>;
}

export interface TaskResultSummary {
  jobsFetched: number;
  jobsNormalized: number;
  jobsInserted: number;
  jobsDeduplicated: number;
  jobsDropped: number;
  durationMs: number;
  proxyUsed?: string;
  httpStatusCode?: number;
  errorMessage?: string;
}

export interface QueueTask {
  id: string;
  type: ScraperJobType;
  priority: TaskPriority;
  status: TaskStatus;
  payload: ScraperTaskPayload;
  attempts: number;
  maxAttempts: number;
  backoffMs: number;
  nextRetryAt?: string;
  lastError?: string;
  errorTaxonomy?: 'RATE_LIMIT_429' | 'FORBIDDEN_403' | 'NOT_FOUND_404' | 'TIMEOUT' | 'SERVER_ERROR_5XX' | 'PARSE_ERROR' | 'UNKNOWN';
  assignedWorkerId?: string;
  result?: TaskResultSummary;
  logs: TaskLogEntry[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

export interface ScraperSchedule {
  id: string;
  name: string;
  source: 'greenhouse' | 'lever';
  boardToken: string;
  companyName: string;
  intervalMinutes: number; // e.g. 10, 15, 20, 30
  staggerOffsetSeconds: number; // Stagger batch offset (0 to 600s)
  cronExpression: string; // e.g. '*/15 * * * *'
  isEnabled: boolean;
  batchGroup: 'tier1_unicorns' | 'faang_plus' | 'hft_quant' | 'enterprise_ai' | 'general';
  lastRunAt?: string;
  nextRunAt: string;
  consecutiveFailures: number;
  totalRuns: number;
  successfulRuns: number;
  lastRunStatus?: 'success' | 'failure' | 'in_progress';
  lastRunDurationMs?: number;
}

export type ProxyStatus = 'active' | 'degraded' | 'cooling_down' | 'banned';

export interface ProxyNode {
  id: string;
  url: string;
  protocol: 'http' | 'https' | 'socks5';
  host: string;
  port: number;
  region: 'us-east' | 'us-west' | 'eu-west' | 'ap-southeast' | 'ca-central';
  status: ProxyStatus;
  latencyMs: number;
  successRate: number; // 0.0 - 1.0
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  lastUsedAt?: string;
  coolingUntil?: string;
  failureStreak: number;
}

export interface ProxyPoolStats {
  totalProxies: number;
  activeCount: number;
  degradedCount: number;
  coolingCount: number;
  bannedCount: number;
  averageLatencyMs: number;
  overallSuccessRate: number;
  totalRotations: number;
  circuitBreakerOpen: boolean;
}

export interface TaskQueueMetrics {
  queuedCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
  retryingCount: number;
  deadLetterCount: number;
  totalEnqueued: number;
  concurrencyLimit: number;
  activeWorkers: number;
  averageExecutionMs: number;
  throughputPerMinute: number;
  uptimeSeconds: number;
}

// ==========================================
// PHASE 11: REAL-TIME ALERTING ENGINE (TELEGRAM & EMAIL)
// ==========================================

export type AlertChannelType = 'telegram' | 'email' | 'webhook';
export type AlertDeliveryStatus = 'delivered' | 'failed' | 'queued' | 'suppressed_dedup' | 'suppressed_threshold' | 'dry_run';
export type EmailProviderType = 'resend' | 'sendgrid' | 'postmark' | 'custom_smtp';

export interface TelegramChannelConfig {
  enabled: boolean;
  botToken: string; // e.g. "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
  chatId: string; // e.g. "@my_scout_alerts" or "-100123456789"
  parseMode: 'MarkdownV2' | 'HTML';
  sendSilently: boolean;
  includeInlineApplyButton: boolean;
}

export interface EmailChannelConfig {
  enabled: boolean;
  provider: EmailProviderType;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  replyTo?: string;
  subjectTemplate: string;
}

export interface AlertRuleConfig {
  minScoreThreshold: number; // 0.0 to 1.0 (e.g. 0.75 for 75%)
  requireLayer2Match: boolean;
  allowDisqualified: boolean;
  dedupWindowHours: number; // Prevent duplicate alerts for same job within X hours (default: 48)
  maxAlertsPerDay: number;
  quietHoursEnabled: boolean;
  quietHoursStartUtc: number; // 0-23
  quietHoursEndUtc: number; // 0-23
}

export interface NotificationPayload {
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  applyUrl: string;
  matchScore: number; // 0.0 - 1.0 (e.g. 0.94)
  matchPercentage: number; // 94
  verdict: 'STRONG_MATCH' | 'GOOD_MATCH' | 'BORDERLINE' | 'WEAK_MATCH' | 'DISQUALIFIED';
  matchedSkills: string[];
  missingSkills: string[];
  layer2Expectations: {
    oaDifficulty?: string;
    gpaBar?: string;
    unspokenCriteria?: string;
    interviewFormat?: string;
    timeWindow?: string;
    hiringUrgency?: string;
  };
  candidateName: string;
  candidateEmail?: string;
  matchedAt: string;
  salarySnippet?: string;
  sourceAts?: string;
}

export interface FormattedAlertMessage {
  telegram: {
    text: string;
    parseMode: 'MarkdownV2' | 'HTML';
    inlineButtons?: Array<{ text: string; url: string }>;
  };
  email: {
    subject: string;
    html: string;
    plainText: string;
  };
}

export interface AlertDispatchRecord {
  id: string;
  jobId: string;
  candidateId: string;
  jobTitle: string;
  companyName: string;
  matchScore: number;
  thresholdApplied: number;
  channels: {
    telegram?: {
      status: AlertDeliveryStatus;
      chatId: string;
      messageId?: string;
      deliveredAt?: string;
      error?: string;
      latencyMs: number;
    };
    email?: {
      status: AlertDeliveryStatus;
      provider: EmailProviderType;
      toEmail: string;
      messageId?: string;
      deliveredAt?: string;
      error?: string;
      latencyMs: number;
    };
  };
  payload: NotificationPayload;
  formattedMessage: FormattedAlertMessage;
  dispatchedAt: string;
  isSimulated: boolean;
}

export interface AlertingEngineStats {
  totalTriggerEvaluations: number;
  totalAlertsDispatched: number;
  telegramDeliveredCount: number;
  emailDeliveredCount: number;
  thresholdFilteredCount: number;
  dedupSuppressedCount: number;
  failedDeliveriesCount: number;
  averageDispatchLatencyMs: number;
  activeChannels: {
    telegram: boolean;
    email: boolean;
  };
}

// ==========================================
// PHASE 12: USER FEEDBACK & ADAPTIVE TUNING
// ==========================================

export type FeedbackActionType = 'APPLIED' | 'SKIPPED' | 'IRRELEVANT' | 'SAVED';
export type FeedbackSourceType = 'telegram_inline' | 'email_link' | 'web_ui' | 'api';

export interface UserFeedback {
  id: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  matchScore: number;
  action: FeedbackActionType;
  reason?: string;
  feedbackSource: FeedbackSourceType;
  createdAt: string;
  metadata?: {
    previousThreshold?: number;
    newThreshold?: number;
    thresholdShiftDelta?: number;
    triggerReason?: string;
    matchedSkills?: string[];
    missingSkills?: string[];
  };
}

export interface ThresholdAdjustmentEvent {
  id: string;
  timestamp: string;
  previousThreshold: number;
  newThreshold: number;
  delta: number;
  reason: string;
  triggerAction: FeedbackActionType;
  jobContext: {
    jobId: string;
    companyName: string;
    jobTitle: string;
    matchScore: number;
  };
}

export interface AdaptiveThresholdProfile {
  candidateId: string;
  candidateName: string;
  baselineThreshold: number;
  currentThreshold: number;
  minAllowedThreshold: number;
  maxAllowedThreshold: number;
  totalInteractions: number;
  appliedCount: number;
  skippedCount: number;
  irrelevantCount: number;
  savedCount: number;
  consecutiveSkipStreak: number;
  averageAppliedScore: number;
  averageSkippedScore: number;
  companyAffinity: Record<string, number>;
  skillAffinity: Record<string, number>;
  lastAdjustedAt: string;
  lastAdjustmentReason: string;
  tuningLog: ThresholdAdjustmentEvent[];
}

export interface FeedbackSubmissionRequest {
  candidateId?: string;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  matchScore?: number;
  action: FeedbackActionType;
  reason?: string;
  feedbackSource?: FeedbackSourceType;
}

export interface FeedbackSubmissionResponse {
  success: boolean;
  feedbackRecord: UserFeedback;
  profile: AdaptiveThresholdProfile;
  thresholdChanged: boolean;
  message: string;
}

// ==========================================
// PHASE 13: NON-DISRUPTIVE RESUME EVOLUTION
// ==========================================

export type DeltaUpdateType =
  | 'ADD_SKILL'
  | 'REMOVE_SKILL'
  | 'ADD_PROJECT'
  | 'UPDATE_PROJECT'
  | 'REMOVE_PROJECT'
  | 'ADD_EXPERIENCE'
  | 'UPDATE_EXPERIENCE'
  | 'UPDATE_METRIC';

export interface ResumeProjectItem {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  duration?: string;
  metrics?: string;
  repoUrl?: string;
  vector?: number[];
}

export interface ResumeExperienceItem {
  id: string;
  company: string;
  role: string;
  duration: string;
  highlights: string[];
  technologies: string[];
  location?: string;
  vector?: number[];
}

export interface ModularProfileEmbeddings {
  resumeId: string;
  version: number;
  compositeVector: number[];
  skillsVector: number[];
  projectsVector: number[];
  experienceVector: number[];
  educationVector: number[];
  vectorWeights: {
    skills: number;      // e.g. 0.35
    projects: number;    // e.g. 0.30
    experience: number;  // e.g. 0.25
    education: number;   // e.g. 0.10
  };
  totalSkillsCount: number;
  totalProjectsCount: number;
  totalExperienceCount: number;
  lastPatchedAt: string;
  lastDeltaType: DeltaUpdateType;
  lastDeltaDescription: string;
}

export interface DeltaAuditLogEntry {
  id: string;
  timestamp: string;
  version: number;
  deltaType: DeltaUpdateType;
  description: string;
  affectedSubVector: 'skillsVector' | 'projectsVector' | 'experienceVector' | 'educationVector' | 'compositeVector';
  processingLatencyMs: number;
  fullReprocessLatencyMs: number;
  speedupFactor: string;
  priorCompositeScore?: number;
  newCompositeScore?: number;
}

export interface ResumeDeltaPatchRequest {
  resumeId: string;
  deltaType: DeltaUpdateType;
  skill?: string;
  project?: {
    id?: string;
    title: string;
    description: string;
    technologies: string[];
    metrics?: string;
    repoUrl?: string;
  };
  experience?: {
    id?: string;
    company: string;
    role: string;
    duration: string;
    highlights: string[];
    technologies: string[];
  };
  metric?: {
    key: string;
    value: string;
  };
  reason?: string;
}

export interface ResumeDeltaPatchResponse {
  success: boolean;
  resumeId: string;
  deltaType: DeltaUpdateType;
  version: number;
  affectedVector: 'skillsVector' | 'projectsVector' | 'experienceVector' | 'compositeVector';
  processingLatencyMs: number;
  fullReprocessLatencyMs: number;
  speedupFactor: string;
  message: string;
  updatedResume: Resume;
  modularEmbeddings: ModularProfileEmbeddings;
  auditEntry: DeltaAuditLogEntry;
  matchScoreDelta?: {
    benchmarkJobId: string;
    benchmarkCompany: string;
    priorScore: number;
    newScore: number;
    scoreDelta: number;
  }[];
}

// ==========================================
// PHASE 14: HISTORICAL HIRING PATTERN INSIGHTS
// ==========================================

export interface HourlyDropDistribution {
  hour: number; // 0 to 23
  label: string; // e.g. '09:00 AM'
  count: number;
  percentage: number;
}

export interface DayOfWeekDistribution {
  dayIndex: number; // 0 (Sunday) to 6 (Saturday)
  dayName: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  shortName: 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  count: number;
  percentage: number;
  peakHour: number;
  peakHourLabel: string;
}

export interface VelocityHeatmapCell {
  dayIndex: number;
  dayName: string;
  hour: number;
  hourLabel: string;
  count: number;
  intensity: number; // 0.0 to 1.0 for styling
}

export interface PostingVelocityData {
  totalPostingsAnalyzed: number;
  peakDropDay: string;
  peakDropHour: string;
  weekdayVsWeekendRatio: string;
  hourlyDistribution: HourlyDropDistribution[];
  dayOfWeekDistribution: DayOfWeekDistribution[];
  heatmapMatrix: VelocityHeatmapCell[];
  velocityInsightSummary: string;
}

export interface SkillFrequencyMetric {
  skill: string;
  category: 'Languages' | 'Systems & Backend' | 'AI & ML' | 'Data & Cloud' | 'Quantitative & Math' | 'Other';
  frequencyPercentage: number;
  occurrenceCount: number;
  mandatoryRatePercentage: number; // How often listed as required vs preferred
  rolesPopularity: { role: string; percentage: number }[];
  tierDistribution: { tier: string; percentage: number }[];
  trendDirection: 'RISING' | 'STABLE' | 'EMERGING';
  growthRateYearOverYear: string;
}

export interface ApplicationWindowLifespan {
  tier: string;
  averageDaysOpen: number;
  medianDaysOpen: number;
  p25DaysOpen: number;
  p75DaysOpen: number;
  p90DaysOpen: number;
  fastClosingPercentage: number; // Closed in < 14 days
  rollingBasisPercentage: number; // Stated rolling review
  sampleSize: number;
  recommendedApplicationLeadTimeDays: number;
  urgencyLevel: 'CRITICAL_IMMEDIATE' | 'HIGH_ROLLING' | 'MODERATE' | 'STANDARD_CYCLE';
}

export interface CompanyHiringMetric {
  companyId: string;
  companyName: string;
  tier: string;
  industry: string;
  totalJobsTracked: number;
  activeJobsCount: number;
  archivedJobsCount: number;
  averagePostingLifespanDays: number;
  medianPostingLifespanDays: number;
  peakPostingDay: string;
  peakPostingTime: string;
  topSkills: { skill: string; percentage: number }[];
  rollingReviewRatio: number; // e.g. 0.85
  oaPlatform: string;
  dsaDifficulty: string;
  urgencyRating: string;
  estimatedHourlyRateUsd?: string;
  fastTrackNotice: string;
}

export interface RoleHiringInsight {
  roleCategory: 'Systems & Infrastructure' | 'AI / Machine Learning' | 'Quantitative Finance & Low Latency' | 'Fullstack & Backend' | 'Data Engineering & Analytics';
  jobCount: number;
  avgLifespanDays: number;
  topLanguages: string[];
  topFrameworks: string[];
  peakPostingSeason: string;
  avgMatchDifficulty: 'High' | 'Very High' | 'Moderate';
}

export interface HistoricalHiringInsightsReport {
  timestamp: string;
  dateRange: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  totalJobsAnalyzed: number;
  totalCompaniesAnalyzed: number;
  postingVelocity: PostingVelocityData;
  skillsDemand: {
    topOverallSkills: SkillFrequencyMetric[];
    skillsByCategory: Record<string, SkillFrequencyMetric[]>;
    skillsByRole: Record<string, SkillFrequencyMetric[]>;
    skillsByTier: Record<string, SkillFrequencyMetric[]>;
  };
  applicationLifespans: {
    tierLifespans: ApplicationWindowLifespan[];
    overallAverageDays: number;
    overallMedianDays: number;
    fastestClosingCompanies: { company: string; avgDays: number; tier: string }[];
    longestOpenCompanies: { company: string; avgDays: number; tier: string }[];
  };
  companyHiringMetrics: CompanyHiringMetric[];
  roleInsights: RoleHiringInsight[];
}

export interface HiringAnalyticsQueryFilters {
  company?: string;
  roleCategory?: string;
  tier?: string;
  timeWindowDays?: number;
}

// ==========================================
// PHASE 15: WEB DASHBOARD UI & E2E INTEGRATION TYPES
// ==========================================

export type E2EStepStatus = 'PASSED' | 'FAILED' | 'RUNNING' | 'SKIPPED';

export interface E2ETestStepResult {
  stepNumber: number;
  stepName: string;
  phaseCategory: 'SCRAPE' | 'DEDUP' | 'LAYER1_RAG' | 'LAYER2_RAG' | 'COMPOSITE_SCORING' | 'TELEGRAM_DISPATCH' | 'FEEDBACK_DELTA';
  status: E2EStepStatus;
  durationMs: number;
  inputSummary: string;
  outputSummary: string;
  details?: Record<string, any>;
  assertions: {
    name: string;
    passed: boolean;
    expected: string;
    actual: string;
  }[];
}

export interface E2EPipelineExecutionTrace {
  executionId: string;
  timestamp: string;
  sourceAts: 'Greenhouse' | 'Lever' | 'Ashby' | 'Workday';
  jobTitle: string;
  companyName: string;
  tier: string;
  status: 'SUCCESS' | 'FAILED';
  totalDurationMs: number;
  steps: E2ETestStepResult[];
  finalScoringResult?: {
    compositeScore: number;
    layer1Score: number;
    layer2Score: number;
    compensationScore: number;
    penalties: number;
    meetsUserThreshold: boolean;
    verdict: 'ALERT_DISPATCHED' | 'STORED_BELOW_THRESHOLD' | 'REJECTED';
  };
  notificationResult?: {
    channel: 'telegram' | 'email' | 'webhook';
    dispatched: boolean;
    rateLimitRemaining: number;
    messagePreview: string;
  };
}

export interface E2ELoadStressBenchmark {
  totalJobsSimulated: number;
  concurrencyLevel: number;
  totalTimeMs: number;
  avgLatencyPerJobMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputJobsPerSecond: number;
  successfulJobs: number;
  failedJobs: number;
  errorRatePercentage: number;
  memoryUsageMb: {
    start: number;
    peak: number;
    end: number;
  };
}

export interface E2ETestCaseResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details: Record<string, any>;
}

export interface E2ETestSuiteSummary {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  totalDurationMs: number;
  pipelineTraces: E2EPipelineExecutionTrace[];
  loadBenchmark: E2ELoadStressBenchmark;
  testCases: E2ETestCaseResult[];
  systemHealth: {
    atsScraperStatus: 'HEALTHY' | 'DEGRADED';
    layer1VectorStatus: 'HEALTHY' | 'DEGRADED';
    layer2KnowledgeStatus: 'HEALTHY' | 'DEGRADED';
    scoringEngineStatus: 'HEALTHY' | 'DEGRADED';
    telegramDispatcherStatus: 'HEALTHY' | 'DEGRADED';
    taskQueueWorkerStatus: 'HEALTHY' | 'DEGRADED';
  };
}

export interface ProductionJobMatch {
  jobId: string;
  title: string;
  company: string;
  companyTier: string;
  location: string;
  locationType: 'Remote' | 'Hybrid' | 'Onsite';
  salaryRange?: string;
  sourceUrl: string;
  atsProvider: string;
  postedAt: string;
  daysOpen: number;
  urgencyLevel: 'CRITICAL_IMMEDIATE' | 'HIGH_ROLLING' | 'MODERATE' | 'STANDARD_CYCLE';
  estimatedTimeToCloseDays: number;
  scores: {
    finalScore: number;
    layer1StatedMatch: number;
    layer2RealityMatch: number;
    compensationScore: number;
    penaltyDeductions: number;
  };
  keyMatchedSkills: string[];
  missingCriticalSkills: string[];
  oaDetails: {
    platform: string;
    dsaDifficulty: string;
    focusAreas: string[];
  };
  matchExplanation: string;
  applicationStatus: 'NEW_MATCH' | 'APPLIED' | 'OA_RECEIVED' | 'INTERVIEWING' | 'REJECTED' | 'OFFER';
  tailoringRecommendation: string;
}

export interface DashboardOverviewPayload {
  user: {
    id: string;
    fullName: string;
    email: string;
    tenantId: string;
    isOnboarded: boolean;
  };
  targetParameters: UserPreferences;
  stats: {
    totalMatchesFound: number;
    highMatchCount: number;
    avgMatchScore: number;
    activeApplications: number;
    alertsDispatchedToday: number;
    lastScrapeRunAt: string;
  };
  topMatches: ProductionJobMatch[];
  resumeComponentsSummary: {
    resumeId: string;
    title: string;
    lastUpdated: string;
    skillsCount: number;
    topSkills: string[];
    projectsCount: number;
    experienceCount: number;
    embeddingsStatus: 'SYNCHRONIZED' | 'PENDING_RECALCULATION';
    subVectorDimensions: number;
  };
  trackedCompanies: {
    companyName: string;
    tier: string;
    activeJobsCount: number;
    realityBarSummary: string;
    fastTrackTip: string;
    avgLifespanDays: number;
  }[];
  systemMetrics: {
    pipelineLatencyMs: number;
    scraperHealth: string;
    queuePendingTasks: number;
    activeRateLimitRpm: number;
  };
}




