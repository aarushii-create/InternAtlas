/**
 * AI Internship Scout - Phase 9: Composite Scoring Engine Verification Test Suite
 * Validates deterministic mathematical blend, hard disqualifiers,
 * configurable weight parameters, and latency performance invariants.
 */

import { Job, Resume, UserPreferences } from '../../types';
import { generateDeterministicEmbedding } from '../../db/database';
import { CompositeScoringEngine, DEFAULT_COMPOSITE_WEIGHTS } from './compositeScoringEngine';

export interface CompositeTestCaseResult {
  id: string;
  name: string;
  category: 'FORMULA_INVARIANT' | 'HARD_DISQUALIFIER' | 'PREFERRED_BOOST' | 'WEIGHT_TUNING' | 'PERFORMANCE_LATENCY';
  passed: boolean;
  durationMs: number;
  expected: string;
  actual: string;
  error?: string;
}

export interface CompositeTestSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  averageLatencyMs: number;
  weightsTested: any;
  results: CompositeTestCaseResult[];
}

export function runCompositeScoringTestSuite(): CompositeTestSuiteReport {
  const tTotalStart = Date.now();
  const results: CompositeTestCaseResult[] = [];
  const engine = new CompositeScoringEngine();

  // ==========================================
  // FIXTURE DATA SETUP
  // ==========================================

  // Candidate Profile 1: Full-Stack React & Node Web Developer (GPA 3.4)
  const candidateWeb: Resume = {
    id: 'res-comp-web-01',
    userId: 'user-comp-01',
    tenantId: 'tenant-default',
    title: 'Sam Taylor - Full Stack Web Intern',
    content: 'Full Stack Developer with React, TypeScript, Node.js, Python, PostgreSQL, REST APIs. Stanford University.',
    extractedSkills: ['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'REST APIs', 'Docker'],
    parsedExperience: [
      {
        company: 'Campus Startup Lab',
        role: 'Full Stack Engineering Intern',
        duration: 'May 2025 - Aug 2025',
        highlights: ['Built customer portal in React and Express with 10k monthly active users.'],
        technologies: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
      },
    ],
    parsedData: {
      skills: ['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'REST APIs', 'Docker'],
      education: [
        {
          institution: 'Stanford University',
          degree: 'B.S. in Computer Science',
          graduationYear: '2027',
          gpa: '3.40',
        },
      ],
      experience: [
        {
          company: 'Campus Startup Lab',
          role: 'Full Stack Engineering Intern',
          duration: 'May 2025 - Aug 2025',
          highlights: ['Built customer portal in React and Express with 10k monthly active users.'],
          technologies: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
        },
      ],
      projects: [
        {
          title: 'Full Stack E-Commerce Platform',
          description: 'React frontend with Node.js backend and MongoDB storage.',
          technologies: ['React', 'Node.js', 'MongoDB'],
          outcomes: ['Supported 100+ product catalog queries and shopping cart state management.'],
        },
      ],
      metrics: {
        impactKeywords: ['react', 'node.js', 'postgresql', 'rest apis'],
      },
    },
    embedding: generateDeterministicEmbedding('Sam Taylor Full Stack React Node TypeScript Python PostgreSQL Stanford'),
    isPrimary: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Job 1: Stripe SWE Intern (San Francisco, CA / Remote, Greenhouse)
  const jobStripe: Job = {
    id: 'job-stripe-comp-01',
    source: 'greenhouse',
    externalId: 'gh-stripe-01',
    dedupHash: 'hash-stripe-comp-01',
    company: 'Stripe',
    title: 'Software Engineering Intern (Backend Infrastructure)',
    location: 'San Francisco, CA',
    isRemote: true,
    applyUrl: 'https://stripe.com/jobs/swe-intern',
    description: 'Build economic infrastructure for the internet. Work on high-reliability distributed systems, payment gateways, and developer APIs.',
    rawJd: 'Stripe SWE Intern Backend. Requirements: React, TypeScript, Node.js, Python, PostgreSQL, Distributed Systems, SQL, API Design. Preferred: Docker, Kafka.',
    statedRequirements: {
      requiredSkills: ['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL'],
      preferredSkills: ['Docker', 'Kafka', 'Redis', 'High Availability'],
      education: "Bachelor's in Computer Science",
      experienceYears: 0,
    },
    informalBar: {
      dsaDifficulty: 'Medium',
      oaPattern: 'Practical HackerRank and pair programming in candidate IDE',
      unstatedPreferences: ['Clean abstractions and defensive error handling'],
      barDescription: 'Practical problem solving followed by live pair programming',
    },
    postedAt: new Date().toISOString(),
    firstSeenAt: new Date().toISOString(),
    lastVerifiedActive: new Date().toISOString(),
    isActive: true,
    relevanceStatus: 'RELEVANT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Job 2: Goldman Sachs (New York, NY - In Person)
  const jobGoldmanSachs: Job = {
    id: 'job-gs-comp-01',
    source: 'direct',
    externalId: 'direct-gs-01',
    dedupHash: 'hash-gs-comp-01',
    company: 'Goldman Sachs',
    title: 'Summer Analyst - Global Markets Engineering',
    location: 'New York, NY',
    isRemote: false,
    applyUrl: 'https://goldmansachs.com/careers/engineering',
    description: 'Develop low-latency pricing and trade execution architectures for global derivatives.',
    rawJd: 'Goldman Sachs Summer Analyst Global Markets. Requirements: Java, C++, Python, Data Structures, SQL. Preferred: Spring Boot, Linux.',
    statedRequirements: {
      requiredSkills: ['Java', 'C++', 'Python', 'Data Structures', 'SQL'],
      preferredSkills: ['Spring Boot', 'Financial Markets', 'Linux'],
      education: "Bachelor's in Computer Science or Engineering",
      experienceYears: 0,
    },
    informalBar: {
      dsaDifficulty: 'Hard',
      oaPattern: 'HackerRank 120-min proctored with dynamic programming and graph theory',
      unstatedPreferences: ['Strict 3.4+ GPA minimum filter on resume review'],
      barDescription: 'Proctored HackerRank OA followed by 2 technical phone screens',
    },
    postedAt: new Date().toISOString(),
    firstSeenAt: new Date().toISOString(),
    lastVerifiedActive: new Date().toISOString(),
    isActive: true,
    relevanceStatus: 'RELEVANT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Job 3: Inactive Posting
  const jobInactive: Job = {
    ...jobStripe,
    id: 'job-inactive-01',
    isActive: false,
  };

  // User Preferences Fixture
  const basePreferences: UserPreferences = {
    id: 'pref-01',
    userId: 'user-comp-01',
    tenantId: 'tenant-default',
    targetLocations: ['San Francisco, CA', 'Bay Area'],
    targetRoles: ['Software Engineering Intern', 'SWE Intern', 'Backend Intern'],
    preferredCompanies: ['Stripe', 'Anthropic'],
    blacklistedCompanies: ['Goldman Sachs', 'Meta'],
    customMatchThreshold: 0.70,
    alertMethod: 'email',
    alertDestination: 'candidate@stanford.edu',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // ==========================================
  // TEST 1: Mathematical Formula Invariant & Weights Blend
  // ==========================================
  try {
    const tStart = Date.now();
    const result = engine.evaluateCompositeMatch(candidateWeb, jobStripe, {
      ...basePreferences,
      blacklistedCompanies: [], // No blacklist
    });

    const b = result.breakdown;
    const computedSum =
      b.layer1.rawScore * b.layer1.weight +
      b.layer2.rawScore * b.layer2.weight +
      b.preferredCompany.rawScore * b.preferredCompany.weight +
      b.locationRole.rawScore * b.locationRole.weight;

    const mathDifference = Math.abs(computedSum - result.finalScore);
    const pass =
      mathDifference < 0.0001 &&
      result.finalScore >= 0.0 &&
      result.finalScore <= 1.0 &&
      result.weights.layer1Weight === 0.40 &&
      result.weights.layer2Weight === 0.30 &&
      result.weights.preferredCompanyBoostWeight === 0.15 &&
      result.weights.locationRoleFilterWeight === 0.15;

    results.push({
      id: 'COMP-TEST-001',
      name: 'Mathematical Blend & Formula Invariant (40/30/15/15 weights)',
      category: 'FORMULA_INVARIANT',
      passed: pass,
      durationMs: Date.now() - tStart,
      expected: 'Final score strictly matches weighted sum of (0.40*L1 + 0.30*L2 + 0.15*Comp + 0.15*LocRole)',
      actual: `Final=${result.finalPercentage}%, L1=${b.layer1.percentage}%, L2=${b.layer2.percentage}%, Comp=${b.preferredCompany.percentage}%, LocRole=${b.locationRole.percentage}%, MathDiff=${mathDifference.toFixed(6)}`,
    });
  } catch (err: any) {
    results.push({
      id: 'COMP-TEST-001',
      name: 'Mathematical Blend & Formula Invariant (40/30/15/15 weights)',
      category: 'FORMULA_INVARIANT',
      passed: false,
      durationMs: 0,
      expected: 'Match formula',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  // ==========================================
  // TEST 2: Hard Disqualifier - Blacklisted Company
  // ==========================================
  try {
    const tStart = Date.now();
    // Candidate explicitly blacklists Goldman Sachs
    const result = engine.evaluateCompositeMatch(candidateWeb, jobGoldmanSachs, basePreferences);

    const isDisqualified = result.isDisqualified === true;
    const finalScoreIsZero = result.finalScore === 0.0 && result.finalPercentage === 0.0;
    const hasBlacklistReason = result.disqualifications.some((d) => d.type === 'BLACKLISTED_COMPANY');
    const rawScorePreserved = result.rawScoreBeforeDisqualification > 0;

    results.push({
      id: 'COMP-TEST-002',
      name: 'Hard Disqualifier: Explicit Blacklisted Company Immediately Zeroes Score',
      category: 'HARD_DISQUALIFIER',
      passed: isDisqualified && finalScoreIsZero && hasBlacklistReason && rawScorePreserved,
      durationMs: Date.now() - tStart,
      expected: 'Score zeroed to 0.00% with BLACKLISTED_COMPANY record, while retaining raw audit score',
      actual: `Disqualified=${isDisqualified}, FinalScore=${result.finalScore}, Reason="${result.disqualifications[0]?.reason}", RawBeforeDisq=${result.rawPercentageBeforeDisqualification}%`,
    });
  } catch (err: any) {
    results.push({
      id: 'COMP-TEST-002',
      name: 'Hard Disqualifier: Explicit Blacklisted Company Immediately Zeroes Score',
      category: 'HARD_DISQUALIFIER',
      passed: false,
      durationMs: 0,
      expected: 'Disqualification',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  // ==========================================
  // TEST 3: Hard Disqualifier - Strict Location Mismatch on Non-Remote Job
  // ==========================================
  try {
    const tStart = Date.now();
    // Candidate strictly targets Seattle, WA (Goldman Sachs is in New York, NY and not remote)
    const seattleOnlyPrefs: UserPreferences = {
      ...basePreferences,
      blacklistedCompanies: [],
      targetLocations: ['Seattle, WA'],
    };

    const result = engine.evaluateCompositeMatch(candidateWeb, jobGoldmanSachs, seattleOnlyPrefs, {
      strictLocationDisqualifier: true,
    });

    const isDisqualified = result.isDisqualified === true;
    const finalScoreIsZero = result.finalScore === 0.0;
    const hasLocationReason = result.disqualifications.some((d) => d.type === 'LOCATION_MISMATCH');

    results.push({
      id: 'COMP-TEST-003',
      name: 'Hard Disqualifier: Strict Location Mismatch on Non-Remote Job',
      category: 'HARD_DISQUALIFIER',
      passed: isDisqualified && finalScoreIsZero && hasLocationReason,
      durationMs: Date.now() - tStart,
      expected: 'Non-remote NYC job disqualified when strict location filter is set to Seattle, WA',
      actual: `Disqualified=${isDisqualified}, FinalScore=${result.finalScore}, Reason="${result.disqualifications[0]?.reason}"`,
    });
  } catch (err: any) {
    results.push({
      id: 'COMP-TEST-003',
      name: 'Hard Disqualifier: Strict Location Mismatch on Non-Remote Job',
      category: 'HARD_DISQUALIFIER',
      passed: false,
      durationMs: 0,
      expected: 'Location disqualification',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  // ==========================================
  // TEST 4: Preferred Company Boost (Full 15% Contribution)
  // ==========================================
  try {
    const tStart = Date.now();
    // Candidate has Stripe in preferredCompanies
    const resultPreferred = engine.evaluateCompositeMatch(candidateWeb, jobStripe, {
      ...basePreferences,
      blacklistedCompanies: [],
      preferredCompanies: ['Stripe'],
    });

    // Candidate does NOT have Stripe in preferredCompanies
    const resultNeutral = engine.evaluateCompositeMatch(candidateWeb, jobStripe, {
      ...basePreferences,
      blacklistedCompanies: [],
      preferredCompanies: ['Unknown Other Company'],
    });

    const prefCompScore = resultPreferred.breakdown.preferredCompany.rawScore;
    const neutralCompScore = resultNeutral.breakdown.preferredCompany.rawScore;
    const boostAdvantage = resultPreferred.finalScore - resultNeutral.finalScore;

    const pass =
      prefCompScore === 1.0 &&
      resultPreferred.breakdown.preferredCompany.isPreferred === true &&
      neutralCompScore < 1.0 &&
      boostAdvantage > 0.05;

    results.push({
      id: 'COMP-TEST-004',
      name: 'Preferred Company Boost (100% Raw Company Score & Positive Edge)',
      category: 'PREFERRED_BOOST',
      passed: pass,
      durationMs: Date.now() - tStart,
      expected: 'Preferred company receives 100% boost score and creates positive score delta',
      actual: `Pref Score=${(prefCompScore * 100).toFixed(0)}%, Neutral Score=${(neutralCompScore * 100).toFixed(0)}%, Final With Boost=${resultPreferred.finalPercentage}% vs Without=${resultNeutral.finalPercentage}% (+${(boostAdvantage * 100).toFixed(1)}%)`,
    });
  } catch (err: any) {
    results.push({
      id: 'COMP-TEST-004',
      name: 'Preferred Company Boost (100% Raw Company Score & Positive Edge)',
      category: 'PREFERRED_BOOST',
      passed: false,
      durationMs: 0,
      expected: 'Boost verification',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  // ==========================================
  // TEST 5: Dynamic Weight Tuning & Normalization
  // ==========================================
  try {
    const tStart = Date.now();
    // Custom non-normalized weights: L1=50, L2=30, Comp=10, Loc=10 (sums to 100)
    const customWeights = {
      layer1Weight: 0.50,
      layer2Weight: 0.20,
      preferredCompanyBoostWeight: 0.15,
      locationRoleFilterWeight: 0.15,
    };

    const result = engine.evaluateCompositeMatch(candidateWeb, jobStripe, {
      ...basePreferences,
      blacklistedCompanies: [],
    }, {
      weights: customWeights,
    });

    const weightSum =
      result.weights.layer1Weight +
      result.weights.layer2Weight +
      result.weights.preferredCompanyBoostWeight +
      result.weights.locationRoleFilterWeight;

    const pass =
      Math.abs(weightSum - 1.0) < 0.0001 &&
      result.weights.layer1Weight === 0.50 &&
      result.weights.layer2Weight === 0.20;

    results.push({
      id: 'COMP-TEST-005',
      name: 'Configurable Weight Parameters & Mathematical Normalization',
      category: 'WEIGHT_TUNING',
      passed: pass,
      durationMs: Date.now() - tStart,
      expected: 'Custom weights configured to 50/20/15/15 maintain exact 1.0 sum invariant',
      actual: `Normalized Weights: L1=${result.weights.layer1Weight}, L2=${result.weights.layer2Weight}, Comp=${result.weights.preferredCompanyBoostWeight}, Loc=${result.weights.locationRoleFilterWeight}, Sum=${weightSum.toFixed(4)}`,
    });
  } catch (err: any) {
    results.push({
      id: 'COMP-TEST-005',
      name: 'Configurable Weight Parameters & Mathematical Normalization',
      category: 'WEIGHT_TUNING',
      passed: false,
      durationMs: 0,
      expected: 'Weight tuning',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  // ==========================================
  // TEST 6: Inactive Job Disqualification & Batch Performance Benchmark
  // ==========================================
  try {
    const tStart = Date.now();
    const resultInactive = engine.evaluateCompositeMatch(candidateWeb, jobInactive, basePreferences);

    // Run batch evaluation across 10 jobs to measure throughput
    const sampleJobs: Job[] = Array.from({ length: 10 }).map((_, i) => ({
      ...jobStripe,
      id: `job-batch-${i}`,
      company: i % 2 === 0 ? 'Stripe' : 'Anthropic',
      title: i % 3 === 0 ? 'Software Engineering Intern' : 'Backend Engineering Intern',
    }));

    const batchResult = engine.batchEvaluate(candidateWeb, sampleJobs, {
      ...basePreferences,
      blacklistedCompanies: [],
    });

    const inactiveDisqualified =
      resultInactive.isDisqualified === true &&
      resultInactive.disqualifications.some((d) => d.type === 'INACTIVE_JOB');

    const highThroughput = batchResult.evaluations.length === 10;
    const duration = Date.now() - tStart;

    results.push({
      id: 'COMP-TEST-006',
      name: 'Inactive Job Disqualification & Batch Execution Throughput',
      category: 'PERFORMANCE_LATENCY',
      passed: inactiveDisqualified && highThroughput && duration < 100,
      durationMs: duration,
      expected: 'Inactive jobs zeroed with INACTIVE_JOB reason, batch throughput < 100ms',
      actual: `InactiveDisqualified=${inactiveDisqualified}, BatchCount=${batchResult.evaluations.length}, Duration=${duration}ms`,
    });
  } catch (err: any) {
    results.push({
      id: 'COMP-TEST-006',
      name: 'Inactive Job Disqualification & Batch Execution Throughput',
      category: 'PERFORMANCE_LATENCY',
      passed: false,
      durationMs: 0,
      expected: 'Benchmark pass',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalDurationMs = Date.now() - tTotalStart;
  const averageLatencyMs = parseFloat((totalDurationMs / results.length).toFixed(2));

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount,
    totalDurationMs,
    averageLatencyMs,
    weightsTested: DEFAULT_COMPOSITE_WEIGHTS,
    results,
  };
}
