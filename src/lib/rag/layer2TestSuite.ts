/**
 * AI Internship Scout - Phase 8: Layer 2 RAG Engine Test Suite
 * 
 * Validates:
 * 1. CompanyInsight retrieval and profile matching (exact, alias, and fallback archetypes).
 * 2. Informal DSA bar evaluation vs candidate algorithms depth (e.g. C++, DP, Concurrency).
 * 3. OA platform risk assessment & proctoring flags (CodeSignal GCA 840+, HackerRank locks).
 * 4. Unspoken filters evaluation (Target school tiers, GPA cutoff screening).
 * 5. Output of Layer 2 alignment delta score and specific actionable warnings.
 * 6. Composite scoring invariants and execution latency benchmarks.
 */

import { Job, Resume } from '../../types';
import { layer2RagEngine, Layer2RagEngine } from './layer2Engine';
import { generateDeterministicEmbedding } from '../../db/database';
import { companyVectorStore } from './companyVectorStore';

export interface Layer2TestCaseResult {
  id: string;
  name: string;
  category: 'COMPANY_INSIGHT_LOOKUP' | 'INFORMAL_DSA_BAR' | 'OA_PROCTORING_RISK' | 'UNSPOKEN_GPA_FILTER' | 'DELTA_ALIGNMENT_SCORE' | 'WARNINGS_GENERATION';
  passed: boolean;
  durationMs: number;
  expected: any;
  actual: any;
  error?: string;
}

export interface Layer2TestSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  results: Layer2TestCaseResult[];
  averageLatencyMs: number;
}

export function runLayer2TestSuite(): Layer2TestSuiteReport {
  const startTime = Date.now();
  const results: Layer2TestCaseResult[] = [];
  const engine = new Layer2RagEngine();

  // Test Candidate A: Web / Full-Stack Developer with high Python/JS and standard GPA (3.2)
  const candidateWeb: Resume = {
    id: 'resume-web-dev',
    userId: 'user-sam',
    tenantId: 'tenant-default',
    title: 'Sam Taylor - Full Stack Web Developer',
    content: 'Sam Taylor State College BS Computer Science. GPA: 3.2. Skills: Python, Django, JavaScript, React, Node.js, HTML, CSS, MongoDB, REST APIs, Git, Docker. Projects: Built Full-Stack E-Commerce React app with Stripe checkout and product catalog. Weather dashboard using OpenWeather API.',
    extractedSkills: ['Python', 'Django', 'JavaScript', 'React', 'Node.js', 'MongoDB', 'REST APIs', 'Git', 'Docker'],
    parsedExperience: [
      {
        company: 'WebSolutions Local',
        role: 'Frontend Intern',
        duration: 'Summer 2025',
        highlights: ['Built responsive React dashboards and REST endpoints in Node.js.'],
        technologies: ['React', 'Node.js', 'MongoDB'],
      },
    ],
    parsedData: {
      skills: ['Python', 'Django', 'JavaScript', 'React', 'Node.js', 'MongoDB', 'REST APIs', 'Git', 'Docker'],
      education: [
        {
          institution: 'State College of Engineering',
          degree: 'Bachelor of Science in Computer Science',
          graduationYear: '2026',
          gpa: '3.2',
        },
      ],
      experience: [
        {
          company: 'WebSolutions Local',
          role: 'Frontend Intern',
          duration: 'Summer 2025',
          highlights: ['Built responsive React dashboards and REST endpoints in Node.js.'],
          technologies: ['React', 'Node.js', 'MongoDB'],
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
        impactKeywords: ['react', 'node.js', 'mongodb', 'rest apis'],
      },
    },
    embedding: generateDeterministicEmbedding('Sam Taylor Python Django React Node.js MongoDB E-Commerce Full Stack'),
    isPrimary: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Test Candidate B: Elite Systems & Competitive Programming Engineer (Stanford CS, 3.94 GPA, C++, Raft, ICPC)
  const candidateSystems: Resume = {
    id: 'resume-systems-engineer',
    userId: 'user-elena',
    tenantId: 'tenant-default',
    title: 'Elena Vance - Stanford Systems & Concurrency',
    content: 'Elena Vance Stanford University BS Computer Science. GPA: 3.94. Competitive Programming ICPC North America Finalist. Skills: C++, C++20, Go, Rust, Python, Distributed Systems, Raft, SIMD, Lock-Free Queues, Linux, Docker, PostgreSQL. Projects: Distributed Raft Key-Value Store with Jepsen linearizability verification. High-frequency order book matching engine in C++20 with sub-microsecond latency. Work: SWE Intern at Meta (Infrastructure).',
    extractedSkills: ['C++', 'C++20', 'Go', 'Rust', 'Python', 'Distributed Systems', 'Raft', 'SIMD', 'Lock-Free Queues', 'Linux', 'Docker', 'PostgreSQL', 'ICPC'],
    parsedExperience: [
      {
        company: 'Meta',
        role: 'Software Engineering Intern',
        duration: 'Summer 2025',
        highlights: ['Optimized RPC caching layer with C++20 and shared memory buffers.'],
        technologies: ['C++', 'Distributed Systems', 'Linux'],
      },
    ],
    parsedData: {
      skills: ['C++', 'C++20', 'Go', 'Rust', 'Python', 'Distributed Systems', 'Raft', 'SIMD', 'Lock-Free Queues', 'Linux', 'Docker', 'PostgreSQL', 'ICPC'],
      education: [
        {
          institution: 'Stanford University',
          degree: 'Bachelor of Science in Computer Science',
          graduationYear: '2026',
          gpa: '3.94',
        },
      ],
      experience: [
        {
          company: 'Meta',
          role: 'Software Engineering Intern',
          duration: 'Summer 2025',
          highlights: ['Optimized RPC caching layer with C++20 and shared memory buffers.'],
          technologies: ['C++', 'Distributed Systems', 'Linux'],
        },
      ],
      projects: [
        {
          title: 'High-Frequency Order Book in C++20',
          description: 'Lock-free ring buffer order matching engine processing 2.5M orders/sec with sub-microsecond latency.',
          technologies: ['C++', 'C++20', 'SIMD', 'Lock-Free Queues'],
          outcomes: ['Benchmarked sub-microsecond execution on Linux memory-mapped pages with 99.9th percentile latency under 450ns.'],
        },
      ],
      metrics: {
        impactKeywords: ['c++', 'c++20', 'simd', 'raft', 'concurrency', 'icpc'],
      },
    },
    embedding: generateDeterministicEmbedding('Elena Vance Stanford C++ C++20 Raft Distributed Systems ICPC Meta Concurrency'),
    isPrimary: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Job 1: Jane Street (Quant / HFT with Extreme DSA and OCaml/C++ bar)
  const jobJaneStreet: Job = {
    id: 'job-js-01',
    source: 'direct',
    externalId: 'direct-js-01',
    dedupHash: 'hash-js-01',
    company: 'Jane Street',
    title: 'Software Engineering Intern - Summer 2026',
    location: 'New York, NY',
    isRemote: false,
    applyUrl: 'https://janestreet.com/join-jane-street/position/swe-intern',
    description: 'Jane Street is looking for software engineering interns. You will build high-performance systems and tools that power our trading operations.',
    rawJd: 'Jane Street SWE Intern. Build high-performance systems and tools. Requirements: Python, C++, Algorithms, Data Structures. Preferred: Functional Programming, Linux, Distributed Systems.',
    statedRequirements: {
      requiredSkills: ['Python', 'C++', 'Algorithms', 'Data Structures'],
      preferredSkills: ['Functional Programming', 'Linux', 'Distributed Systems'],
      education: "Bachelor's in Computer Science, Math, or Physics",
      experienceYears: 0,
    },
    informalBar: {
      dsaDifficulty: 'Extreme',
      oaPattern: 'Hard DP, Type systems, Memory management',
      unstatedPreferences: ['High Putnam / ICPC background'],
      barDescription: 'Extreme algorithmic and concurrency bar',
    },
    postedAt: new Date().toISOString(),
    firstSeenAt: new Date().toISOString(),
    lastVerifiedActive: new Date().toISOString(),
    isActive: true,
    relevanceStatus: 'RELEVANT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Job 2: Stripe (Tier 1 Unicorn with Practical Coding & Systems Focus)
  const jobStripe: Job = {
    id: 'job-stripe-01',
    source: 'greenhouse',
    externalId: 'gh-stripe-01',
    dedupHash: 'hash-stripe-01',
    company: 'Stripe',
    title: 'Software Engineering Intern (Backend Infrastructure)',
    location: 'San Francisco, CA',
    isRemote: true,
    applyUrl: 'https://stripe.com/jobs/swe-intern',
    description: 'Build economic infrastructure for the internet. Work on high-reliability distributed systems, payment gateways, and developer APIs.',
    rawJd: 'Stripe SWE Intern Backend. Requirements: Go, Ruby, Java, Distributed Systems, SQL, API Design. Preferred: Docker, Kafka, Redis.',
    statedRequirements: {
      requiredSkills: ['Go', 'Ruby', 'Java', 'Distributed Systems', 'SQL', 'API Design'],
      preferredSkills: ['Docker', 'Kafka', 'Redis', 'High Availability'],
      education: "Bachelor's in Computer Science",
      experienceYears: 0,
    },
    informalBar: {
      dsaDifficulty: 'Medium',
      oaPattern: 'Practical HackerRank challenge and Bring-Your-Own-Environment (BYOE) live coding',
      unstatedPreferences: ['Clean abstractions and defensive error handling'],
      barDescription: 'Practical problem solving followed by live pair programming in candidate IDE',
    },
    postedAt: new Date().toISOString(),
    firstSeenAt: new Date().toISOString(),
    lastVerifiedActive: new Date().toISOString(),
    isActive: true,
    relevanceStatus: 'RELEVANT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Job 2b: Databricks (Tier 1 Unicorn with strict CodeSignal GCA 840+ threshold)
  const jobDatabricks: Job = {
    id: 'job-databricks-01',
    source: 'greenhouse',
    externalId: 'gh-databricks-01',
    dedupHash: 'hash-databricks-01',
    company: 'Databricks',
    title: 'Software Engineering Intern (Distributed Systems & AI Infrastructure)',
    location: 'San Francisco, CA',
    isRemote: false,
    applyUrl: 'https://databricks.com/company/careers/swe-intern',
    description: 'Build large scale distributed data engines, query compilers, and generative AI platforms.',
    rawJd: 'Databricks SWE Intern. Requirements: C++, Java, Scala, Distributed Systems, Algorithms. Preferred: Spark, Raft, Docker.',
    statedRequirements: {
      requiredSkills: ['C++', 'Java', 'Scala', 'Distributed Systems', 'Algorithms'],
      preferredSkills: ['Spark', 'Raft', 'Docker'],
      education: "Bachelor's in Computer Science",
      experienceYears: 0,
    },
    informalBar: {
      dsaDifficulty: 'Hard',
      oaPattern: 'CodeSignal GCA 840+ proctored assessment',
      unstatedPreferences: ['High performance computing and low-level data structures'],
      barDescription: 'Proctored CodeSignal GCA followed by distributed systems interviews',
    },
    postedAt: new Date().toISOString(),
    firstSeenAt: new Date().toISOString(),
    lastVerifiedActive: new Date().toISOString(),
    isActive: true,
    relevanceStatus: 'RELEVANT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Job 3: Goldman Sachs (Wall Street with HackerRank OA and strict 3.4+ GPA screening)
  const jobGoldmanSachs: Job = {
    id: 'job-gs-01',
    source: 'direct',
    externalId: 'direct-gs-01',
    dedupHash: 'hash-gs-01',
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

  // ==========================================
  // TEST 1: CompanyInsight Retrieval & Alias Resolution
  // ==========================================
  try {
    const tStart = Date.now();
    const insightJaneStreet = engine.resolveCompanyInsight('Jane Street');
    const insightCitadelAlias = engine.resolveCompanyInsight('Citadel LLC');
    const insightGooglePartial = engine.resolveCompanyInsight('Google Inc.');
    const insightFallback = engine.resolveCompanyInsight('Unknown Stealth Robotics Inc.', 'Software Engineering Intern');

    const pass = insightJaneStreet.tier === 'Tier 1 Quant/HFT' &&
      insightCitadelAlias.companyName.includes('Citadel') &&
      insightGooglePartial.companyName === 'Google' &&
      insightFallback.oaType.platform !== undefined;

    results.push({
      id: 'L2-TEST-001',
      name: 'Knowledge Graph Company Retrieval & Alias Resolution',
      category: 'COMPANY_INSIGHT_LOOKUP',
      passed: pass,
      durationMs: Date.now() - tStart,
      expected: 'Retrieve exact, alias, and fallback company insight profiles safely',
      actual: `JS Tier=${insightJaneStreet.tier}, Citadel=${insightCitadelAlias.companyName}, Google=${insightGooglePartial.companyName}, Fallback=${insightFallback.tier}`,
    });
  } catch (err: any) {
    results.push({
      id: 'L2-TEST-001',
      name: 'Knowledge Graph Company Retrieval & Alias Resolution',
      category: 'COMPANY_INSIGHT_LOOKUP',
      passed: false,
      durationMs: 0,
      expected: 'Company insight resolved',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  // ==========================================
  // TEST 2: Quant Reality Check & Specific Reality Barriers on Web Profile
  // ==========================================
  try {
    const tStart = Date.now();
    const evalWebOnJaneStreet = engine.evaluateLayer2(candidateWeb, jobJaneStreet);

    // Web developer lacks C++/DP/Systems bar, lacks Tier 1 university pipeline & has 3.2 GPA (< 3.7 JS bar)
    // Confirms presence of specific warnings (DSA difficulty, GPA cutoff, or School filter)
    const hasRealityWarning = evalWebOnJaneStreet.specificWarnings.length > 0 &&
      evalWebOnJaneStreet.specificWarnings.some((w) => w.category === 'OA_DIFFICULTY' || w.category === 'GPA_CUTOFF' || w.category === 'RED_FLAG');
    const lowDsaScore = evalWebOnJaneStreet.dsaEvaluation.technicalAlignmentScore < 0.60;

    results.push({
      id: 'L2-TEST-002',
      name: 'Quant / HFT Reality Check (Informal Bar Downgrade & Warnings)',
      category: 'INFORMAL_DSA_BAR',
      passed: hasRealityWarning && lowDsaScore,
      durationMs: Date.now() - tStart,
      expected: 'Flag informal DSA and GPA barriers with actionable reality warnings for web-only applicant',
      actual: `L1=${evalWebOnJaneStreet.layer1Percentage}%, L2=${evalWebOnJaneStreet.layer2Percentage}%, DSA Score=${(evalWebOnJaneStreet.dsaEvaluation.technicalAlignmentScore * 100).toFixed(0)}%, Warnings=${evalWebOnJaneStreet.specificWarnings.length}`,
    });
  } catch (err: any) {
    results.push({
      id: 'L2-TEST-002',
      name: 'Quant / HFT Reality Check (Informal Bar Downgrade & Warnings)',
      category: 'INFORMAL_DSA_BAR',
      passed: false,
      durationMs: 0,
      expected: 'Evaluated reality bar',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  // ==========================================
  // TEST 3: Systems Candidate Reality Boost & Positive Signals
  // ==========================================
  try {
    const tStart = Date.now();
    const evalSystemsOnJaneStreet = engine.evaluateLayer2(candidateSystems, jobJaneStreet);
    const evalSystemsOnStripe = engine.evaluateLayer2(candidateSystems, jobStripe);

    // Stanford + C++ + Raft + 3.94 GPA should pass school filter and trigger strong positive signals
    const pass = evalSystemsOnJaneStreet.filterEvaluation.targetSchoolAssessment.matched &&
      evalSystemsOnJaneStreet.positiveSignals.length > 0 &&
      evalSystemsOnStripe.filterEvaluation.targetSchoolAssessment.matched;

    results.push({
      id: 'L2-TEST-003',
      name: 'Systems & High-GPA Candidate Reality Boost & Positive Signals',
      category: 'DELTA_ALIGNMENT_SCORE',
      passed: pass,
      durationMs: Date.now() - tStart,
      expected: 'Matched target school tier, verified GPA pass, and positive signals generated',
      actual: `TargetSchoolMatched=${evalSystemsOnJaneStreet.filterEvaluation.targetSchoolAssessment.matched}, PositiveSignals=${evalSystemsOnJaneStreet.positiveSignals.length}, GPA=${evalSystemsOnJaneStreet.filterEvaluation.gpaAssessment.candidateGpa}`,
    });
  } catch (err: any) {
    results.push({
      id: 'L2-TEST-003',
      name: 'Systems & High-GPA Candidate Reality Boost & Positive Signals',
      category: 'DELTA_ALIGNMENT_SCORE',
      passed: false,
      durationMs: 0,
      expected: 'Boosted score',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  // ==========================================
  // TEST 4: Goldman Sachs Unspoken GPA Cutoff Screen
  // ==========================================
  try {
    const tStart = Date.now();
    const evalWebOnGS = engine.evaluateLayer2(candidateWeb, jobGoldmanSachs);
    const evalSystemsOnGS = engine.evaluateLayer2(candidateSystems, jobGoldmanSachs);

    // Candidate Web has 3.2 GPA (< 3.4 Goldman cutoff) -> meetsCutoff = false, produces GPA warning
    // Candidate Systems has 3.94 GPA (>= 3.4 Goldman cutoff) -> meetsCutoff = true
    const gpaCheckPassed = !evalWebOnGS.filterEvaluation.gpaAssessment.meetsCutoff &&
      evalSystemsOnGS.filterEvaluation.gpaAssessment.meetsCutoff &&
      evalWebOnGS.specificWarnings.some((w) => w.category === 'GPA_CUTOFF');

    results.push({
      id: 'L2-TEST-004',
      name: 'Wall Street Recruiter Unspoken GPA Screening Cutoff Filter',
      category: 'UNSPOKEN_GPA_FILTER',
      passed: gpaCheckPassed,
      durationMs: Date.now() - tStart,
      expected: 'Flag GPA cutoff barrier for candidate < 3.4 while passing candidate with 3.94',
      actual: `Web MeetsCutoff=${evalWebOnGS.filterEvaluation.gpaAssessment.meetsCutoff}, Systems MeetsCutoff=${evalSystemsOnGS.filterEvaluation.gpaAssessment.meetsCutoff}`,
    });
  } catch (err: any) {
    results.push({
      id: 'L2-TEST-004',
      name: 'Wall Street Recruiter Unspoken GPA Screening Cutoff Filter',
      category: 'UNSPOKEN_GPA_FILTER',
      passed: false,
      durationMs: 0,
      expected: 'GPA filter evaluated',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  // ==========================================
  // TEST 5: CodeSignal GCA Proctoring & Risk Warnings
  // ==========================================
  try {
    const tStart = Date.now();
    const evalDatabricks = engine.evaluateLayer2(candidateWeb, jobDatabricks);

    // Databricks uses CodeSignal GCA with 70 min duration, strict 840+ cutoff, and proctoring
    const oaCheckPassed = evalDatabricks.oaEvaluation.platform === 'CodeSignal (GCA)' &&
      evalDatabricks.oaEvaluation.durationMinutes === 70 &&
      evalDatabricks.oaEvaluation.preparationGuide.includes('830+') &&
      evalDatabricks.specificWarnings.some((w) => w.category === 'PROCTORING_RISK' || w.category === 'OA_DIFFICULTY');

    results.push({
      id: 'L2-TEST-005',
      name: 'CodeSignal GCA Assessment Profiling & Proctoring Guidance',
      category: 'OA_PROCTORING_RISK',
      passed: oaCheckPassed,
      durationMs: Date.now() - tStart,
      expected: 'Recognize CodeSignal GCA 70-min assessment and generate proctoring risk advice',
      actual: `Platform=${evalDatabricks.oaEvaluation.platform}, Duration=${evalDatabricks.oaEvaluation.durationMinutes}m, PassProb=${(evalDatabricks.oaEvaluation.predictedPassProbability * 100).toFixed(0)}%`,
    });
  } catch (err: any) {
    results.push({
      id: 'L2-TEST-005',
      name: 'CodeSignal GCA Assessment Profiling & Proctoring Guidance',
      category: 'OA_PROCTORING_RISK',
      passed: false,
      durationMs: 0,
      expected: 'OA risk verified',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  // ==========================================
  // TEST 6: Composite Scoring Invariant & Sub-50ms Latency
  // ==========================================
  try {
    const tStart = Date.now();
    const evalRes = engine.evaluateLayer2(candidateSystems, jobJaneStreet);

    const deltaExact = Math.abs(evalRes.alignmentDelta - (evalRes.layer2Score - evalRes.layer1Score)) < 0.001;
    const scoreBounded = evalRes.compositeScore >= 0.0 && evalRes.compositeScore <= 1.0 &&
      evalRes.layer2Score >= 0.0 && evalRes.layer2Score <= 1.0;
    const latencySub50 = evalRes.latencyMs < 50;

    results.push({
      id: 'L2-TEST-006',
      name: 'Mathematical Scoring Invariants & Execution Latency Benchmark',
      category: 'WARNINGS_GENERATION',
      passed: deltaExact && scoreBounded && latencySub50,
      durationMs: Date.now() - tStart,
      expected: 'Delta = (L2 - L1), scores in [0, 1], evaluation latency < 50ms',
      actual: `Delta Exact=${deltaExact}, Bounded=${scoreBounded}, Latency=${evalRes.latencyMs}ms`,
    });
  } catch (err: any) {
    results.push({
      id: 'L2-TEST-006',
      name: 'Mathematical Scoring Invariants & Execution Latency Benchmark',
      category: 'WARNINGS_GENERATION',
      passed: false,
      durationMs: 0,
      expected: 'Invariants checked',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  // ==========================================
  // TEST 7: Vector Store Semantic & Hybrid Retrieval Benchmark
  // ==========================================
  try {
    const tStart = Date.now();
    const query = engine.constructRagQuery(candidateSystems, jobJaneStreet);
    const searchResults = engine['resolveCompanyInsight']('Jane Street');
    const hybridChunks = companyVectorStore.searchHybrid(
      'Jane Street extreme DSA C++ dynamic programming probability and concurrency bar',
      { company: 'Jane Street', topK: 3 }
    );

    const hasJaneStreetChunk = hybridChunks.some((h) => h.chunk.company.toLowerCase().includes('jane street'));
    const validScores = hybridChunks.every((h) => h.similarityScore >= 0.0 && h.similarityScore <= 1.0);

    results.push({
      id: 'L2-TEST-007',
      name: 'RAG Vector Store Semantic Hybrid Retrieval & Evidence Match',
      category: 'COMPANY_INSIGHT_LOOKUP',
      passed: query.length > 20 && hasJaneStreetChunk && validScores,
      durationMs: Date.now() - tStart,
      expected: 'Construct query and retrieve high-similarity company evidence chunks',
      actual: `Retrieved ${hybridChunks.length} chunks, TopScore=${hybridChunks[0]?.similarityScore}, TopCompany=${hybridChunks[0]?.chunk.company}`,
    });
  } catch (err: any) {
    results.push({
      id: 'L2-TEST-007',
      name: 'RAG Vector Store Semantic Hybrid Retrieval & Evidence Match',
      category: 'COMPANY_INSIGHT_LOOKUP',
      passed: false,
      durationMs: 0,
      expected: 'RAG search passed',
      actual: 'Error thrown',
      error: err?.message,
    });
  }

  const totalDuration = Date.now() - startTime;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount,
    totalDurationMs: totalDuration,
    results,
    averageLatencyMs: parseFloat((totalDuration / results.length).toFixed(2)),
  };
}
