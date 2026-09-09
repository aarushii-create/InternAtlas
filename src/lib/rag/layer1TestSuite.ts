/**
 * AI Internship Scout - Phase 6: Layer 1 RAG Engine Test Suite
 * 
 * Validates:
 * 1. Dense vector embedding generation for JD text.
 * 2. Hybrid search (vector cosine similarity + keyword matching).
 * 3. Exact & synonym skill matching (e.g. Golang -> Go, Postgres -> PostgreSQL).
 * 4. Extraction of matched vs missing required skills.
 * 5. Score output normalization (0.0 to 1.0) and latency benchmarks.
 */

import { Resume, Job } from '../../types';
import { layer1RagEngine, Layer1RagEngine, DEFAULT_HYBRID_WEIGHTS } from './layer1Engine';
import { generateDeterministicEmbedding } from '../../db/database';

export interface Layer1TestCaseResult {
  id: string;
  name: string;
  category: 'VECTOR_SIMILARITY' | 'KEYWORD_MATCHING' | 'SYNONYM_RECALL' | 'MISSING_SKILL_DETECTION' | 'SCORE_FORMULA' | 'EDUCATION_EXP';
  passed: boolean;
  durationMs: number;
  expected: any;
  actual: any;
  error?: string;
}

export interface Layer1TestSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  results: Layer1TestCaseResult[];
  averageLatencyMs: number;
}

export function runLayer1TestSuite(): Layer1TestSuiteReport {
  const startTime = Date.now();
  const results: Layer1TestCaseResult[] = [];
  const engine = new Layer1RagEngine();

  // Mock Candidate Resume: Backend & Distributed Systems Focus
  const mockBackendResume: Resume = {
    id: 'resume-alex-001',
    userId: 'user-alex',
    tenantId: 'tenant-alex',
    title: 'Alex Rivera - Stanford CS Resume',
    content: 'Alex Rivera Stanford University BS Computer Science. Skills: Go, Golang, Python, C++, PostgreSQL, Postgres, Redis, Docker, Git, Linux. Projects: Distributed Key-Value Store with Raft consensus in Go. Implemented snapshotting, RPC communication, and crash fault tolerance. Database query engine in C++ with B+ Tree indexing. Work Experience: SWE Intern at Cloud Startup (Go, PostgreSQL, Docker, AWS).',
    extractedSkills: ['Go', 'Golang', 'Python', 'C++', 'PostgreSQL', 'Redis', 'Docker', 'Distributed Systems', 'Git', 'Linux'],
    parsedExperience: [
      {
        company: 'CloudStream Inc.',
        role: 'Software Engineering Intern',
        duration: 'Summer 2025',
        highlights: ['Built high-throughput data pipelines in Go and PostgreSQL with Docker deployment.'],
        technologies: ['Go', 'PostgreSQL', 'Docker', 'AWS'],
      },
    ],
    parsedData: {
      skills: ['Go', 'Golang', 'Python', 'C++', 'PostgreSQL', 'Redis', 'Docker', 'Distributed Systems', 'Git', 'Linux'],
      education: [
        {
          institution: 'Stanford University',
          degree: 'Bachelor of Science in Computer Science',
          graduationYear: '2026',
          gpa: '3.92',
        },
      ],
      experience: [
        {
          company: 'CloudStream Inc.',
          role: 'Software Engineering Intern',
          duration: 'Summer 2025',
          highlights: ['Built high-throughput data pipelines in Go and PostgreSQL with Docker deployment.'],
          technologies: ['Go', 'PostgreSQL', 'Docker', 'AWS'],
        },
      ],
      projects: [
        {
          title: 'Distributed Raft Key-Value Store',
          description: 'Built fault-tolerant distributed consensus store with heartbeat elections and log replication.',
          technologies: ['Go', 'gRPC', 'Protobuf'],
          outcomes: ['Passed all Jepsen linearizability tests with 99.99% fault recovery rate'],
        },
      ],
      metrics: {
        impactKeywords: ['distributed', 'consensus', 'raft', 'high throughput'],
      },
    },
    embedding: generateDeterministicEmbedding('Alex Rivera Stanford BS CS Go Python C++ PostgreSQL Redis Docker Distributed Systems Raft'),
    isPrimary: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Mock Stripe Job Description (Asking for Go, TypeScript, Distributed Systems, SQL, API Design, Docker, Kafka)
  const mockStripeJob: Job = {
    id: 'job-stripe-test',
    source: 'greenhouse',
    externalId: 'gh-stripe-8812',
    dedupHash: 'stripe-swe-sf-8812-hash',
    company: 'Stripe',
    title: 'Software Engineering Intern - Infrastructure',
    location: 'San Francisco, CA',
    isRemote: true,
    description: 'At Stripe, we build financial infrastructure for the internet. SWE Interns work on payment engine pipelines with Go, TypeScript, Distributed Systems, and SQL.',
    rawJd: 'At Stripe, we build financial infrastructure. Requirements: Go, TypeScript, Distributed Systems, API Design, SQL. Preferred: Docker, Kafka, Redis, PostgreSQL.',
    statedRequirements: {
      requiredSkills: ['Go', 'TypeScript', 'Distributed Systems', 'API Design', 'SQL'],
      preferredSkills: ['Docker', 'Kafka', 'Redis', 'PostgreSQL'],
      education: 'BS CS in progress',
      experienceYears: 0,
    },
    informalBar: {
      dsaDifficulty: 'Medium',
      oaPattern: 'Practical API coding test',
      unstatedPreferences: ['Defensive error handling'],
      barDescription: 'Stripe bar',
    },
    vectorEmbedding: generateDeterministicEmbedding('Stripe Software Engineering Intern Infrastructure Go TypeScript Distributed Systems API Design SQL Docker Kafka'),
    applyUrl: 'https://stripe.com/jobs/8812',
    postedAt: new Date().toISOString(),
    firstSeenAt: new Date().toISOString(),
    lastVerifiedActive: new Date().toISOString(),
    isActive: true,
    relevanceStatus: 'RELEVANT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // TEST 1: Vector Cosine Similarity Embedding & Generation
  (() => {
    const t0 = Date.now();
    const resumeVec = engine.embedResumeText(mockBackendResume);
    const jobVec = engine.embedJobText(mockStripeJob);

    const is768Dim = resumeVec.length === 768 && jobVec.length === 768;
    const result = engine.evaluateLayer1(mockBackendResume, mockStripeJob);
    const validSim = result.vectorSimilarity >= 0.0 && result.vectorSimilarity <= 1.0 && result.vectorSimilarity >= 0.35;

    results.push({
      id: 'L1-01',
      name: 'Dense Vector Cosine Similarity: 768-dim embeddings produce normalized similarity score',
      category: 'VECTOR_SIMILARITY',
      passed: is768Dim && validSim,
      durationMs: Date.now() - t0,
      expected: { dimensions: 768, minSimilarity: 0.35 },
      actual: { resumeDim: resumeVec.length, jobDim: jobVec.length, similarity: result.vectorSimilarity },
    });
  })();

  // TEST 2: Exact & Synonym Skill Matching (Golang -> Go, Postgres -> PostgreSQL, SQL -> PostgreSQL)
  (() => {
    const t0 = Date.now();
    const skillsLower = new Set(mockBackendResume.extractedSkills.map((s) => s.toLowerCase()));
    const fullTextLower = mockBackendResume.content.toLowerCase();

    const goMatch = engine.matchSkillAgainstResume('Go', skillsLower, fullTextLower);
    const postgresMatch = engine.matchSkillAgainstResume('PostgreSQL', skillsLower, fullTextLower);
    const sqlMatch = engine.matchSkillAgainstResume('SQL', skillsLower, fullTextLower);

    const passed = goMatch.matched && postgresMatch.matched && sqlMatch.matched;

    results.push({
      id: 'L1-02',
      name: 'Synonym & Lexical Match: Successfully recognizes Go, PostgreSQL, and SQL from candidate resume',
      category: 'SYNONYM_RECALL',
      passed,
      durationMs: Date.now() - t0,
      expected: { go: true, postgres: true, sql: true },
      actual: { go: goMatch.matched, postgres: postgresMatch.matched, sql: sqlMatch.matched },
    });
  })();

  // TEST 3: Missing Skill Detection (TypeScript is required by Stripe but missing from Alex's resume)
  (() => {
    const t0 = Date.now();
    const evalResult = engine.evaluateLayer1(mockBackendResume, mockStripeJob);

    const hasMatchedGo = evalResult.matchedRequiredSkills.includes('Go');
    const hasMatchedDistSys = evalResult.matchedRequiredSkills.includes('Distributed Systems');
    const hasMissingTypeScript = evalResult.missingRequiredSkills.includes('TypeScript');
    const hasMissingKafka = evalResult.missingPreferredSkills.includes('Kafka');
    const hasMatchedDocker = evalResult.matchedPreferredSkills.includes('Docker');

    const passed = hasMatchedGo && hasMatchedDistSys && hasMissingTypeScript && hasMissingKafka && hasMatchedDocker;

    results.push({
      id: 'L1-03',
      name: 'Missing vs Matched Skill Extraction: Correctly flags missing TypeScript & Kafka vs matched Go & Docker',
      category: 'MISSING_SKILL_DETECTION',
      passed,
      durationMs: Date.now() - t0,
      expected: {
        matchedRequired: ['Go', 'Distributed Systems', 'SQL'],
        missingRequired: ['TypeScript'],
        missingPreferred: ['Kafka'],
      },
      actual: {
        matchedRequired: evalResult.matchedRequiredSkills,
        missingRequired: evalResult.missingRequiredSkills,
        missingPreferred: evalResult.missingPreferredSkills,
      },
    });
  })();

  // TEST 4: Raw Layer 1 Baseline Score Normalization (0.0 to 1.0)
  (() => {
    const t0 = Date.now();
    const evalResult = engine.evaluateLayer1(mockBackendResume, mockStripeJob);

    const scoreInRange = evalResult.layer1Score >= 0.0 && evalResult.layer1Score <= 1.0;
    const percentageMatches = evalResult.layer1Percentage === parseFloat((evalResult.layer1Score * 100).toFixed(1));
    const breakdownComplete = evalResult.skillBreakdown.length === (mockStripeJob.statedRequirements!.requiredSkills.length + mockStripeJob.statedRequirements!.preferredSkills.length);

    results.push({
      id: 'L1-04',
      name: 'Score Formula & Normalization: Layer 1 baseline score is strictly in [0.0, 1.0] with granular skill breakdown',
      category: 'SCORE_FORMULA',
      passed: scoreInRange && percentageMatches && breakdownComplete,
      durationMs: Date.now() - t0,
      expected: { scoreMin: 0.0, scoreMax: 1.0, totalSkillBreakdownCount: 9 },
      actual: { score: evalResult.layer1Score, percentage: evalResult.layer1Percentage, breakdownCount: evalResult.skillBreakdown.length },
    });
  })();

  // TEST 5: Education & Experience Fit Heuristics
  (() => {
    const t0 = Date.now();
    const eduEval = engine.evaluateEducation(
      'BS CS in progress',
      mockBackendResume.parsedData?.education
    );
    const expEval = engine.evaluateExperience(
      0,
      mockBackendResume.parsedData?.experience
    );

    const passed = eduEval.meetsRequirement && eduEval.score >= 0.9 && expEval.meetsRequirement && expEval.score === 1.0;

    results.push({
      id: 'L1-05',
      name: 'Education & Experience Heuristic: Stanford BS CS student passes undergraduate intern criteria',
      category: 'EDUCATION_EXP',
      passed,
      durationMs: Date.now() - t0,
      expected: { eduMeets: true, expMeets: true, expScore: 1.0 },
      actual: { eduMeets: eduEval.meetsRequirement, eduScore: eduEval.score, expMeets: expEval.meetsRequirement, expScore: expEval.score },
    });
  })();

  // TEST 6: Custom Weighting Dynamic Sensitivity
  (() => {
    const t0 = Date.now();
    // Test with heavy required skills weight
    const skillHeavyEval = engine.evaluateLayer1(mockBackendResume, mockStripeJob, {
      requiredSkillWeight: 0.80,
      vectorWeight: 0.10,
      preferredSkillWeight: 0.05,
      educationExpWeight: 0.05,
    });

    const passed = skillHeavyEval.layer1Score > 0 && skillHeavyEval.weights.requiredSkillWeight === 0.80;

    results.push({
      id: 'L1-06',
      name: 'Configurable Hybrid Weights: Supports custom weighting between vector similarity and lexical matching',
      category: 'SCORE_FORMULA',
      passed,
      durationMs: Date.now() - t0,
      expected: { requiredSkillWeight: 0.80, validScore: true },
      actual: { requiredSkillWeight: skillHeavyEval.weights.requiredSkillWeight, score: skillHeavyEval.layer1Score },
    });
  })();

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalDurationMs = Date.now() - startTime;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount,
    totalDurationMs,
    results,
    averageLatencyMs: parseFloat((totalDurationMs / results.length).toFixed(2)),
  };
}
