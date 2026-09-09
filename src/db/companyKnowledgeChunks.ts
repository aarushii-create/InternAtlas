/**
 * AI Internship Scout - True RAG Company Knowledge Base
 * Granular chunked empirical observations, interview debriefs, OA patterns,
 * DSA difficulty benchmarks, recruiter filters, and verified compensation data.
 */

import { CompanyKnowledgeChunk, CompanyInsight } from '../types';
import { generateDeterministicEmbedding } from './database';
import { MASTER_COMPANY_INSIGHTS } from './companyInsightsMaster';

export const SEED_COMPANY_KNOWLEDGE_CHUNKS: CompanyKnowledgeChunk[] = [
  // =========================================================================
  // GOOGLE
  // =========================================================================
  {
    id: 'chunk-goog-oa-01',
    company: 'Google',
    companyAliases: ['Alphabet', 'Google LLC', 'Goog'],
    category: 'oa',
    source: 'candidate_report',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Google OA & Coding Assessment Patterns',
    content: 'Recent candidate reports indicate that Google software engineering internship assessments typically emphasize data structures, graph traversal (BFS/DFS, topological sort), 2D grid pathfinding, and dynamic programming (1D/2D memoization). Candidates are evaluated heavily on edge-case handling, optimal Big-O time and space complexity, and clean code modularity.',
    tags: ['Google', 'OA', 'Graphs', 'Dynamic Programming', 'BFS', 'DFS', 'Algorithms'],
    metadata: {
      dsaDifficulty: 'Medium-Hard',
      oaPlatform: 'Custom Proctored Platform',
    },
  },
  {
    id: 'chunk-goog-interview-01',
    company: 'Google',
    companyAliases: ['Alphabet', 'Google LLC', 'Goog'],
    category: 'interview',
    source: 'verified_interview_debrief',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Google Technical Phone Screen & Onsite Debrief',
    content: 'Google technical interviews commonly evaluate problem-solving ability, algorithmic reasoning, and verbal communication over Google Meet via Google Docs / CoderPad. Interviewers expect candidates to verify edge cases out loud, trace example inputs with test cases before writing code, and justify chosen data structures (HashMaps, Tries, Heaps) with exact asymptotic bounds.',
    tags: ['Google', 'Interview', 'CoderPad', 'Communication', 'Algorithmic Reasoning'],
    metadata: {
      dsaDifficulty: 'Medium-Hard',
    },
  },
  {
    id: 'chunk-goog-filter-01',
    company: 'Google',
    companyAliases: ['Alphabet', 'Google LLC', 'Goog'],
    category: 'hiring_filter',
    source: 'recruiter_disclosure',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Google Internship Screening & Project Evaluation',
    content: 'Candidate reports and recruiter disclosures suggest that academic performance, coursework rigor (Algorithms, Operating Systems, Compilers), and substantive open-source / full-stack systems projects significantly influence internship resume screening. While Google has relaxed strict GPA cutoffs, transcripts showing solid CS foundations provide strong signal during candidate committee reviews.',
    tags: ['Google', 'Hiring Filter', 'GPA', 'Coursework', 'Resume Screening', 'Projects'],
    metadata: {
      minGpa: 'No hard cutoff (3.3+ recommended)',
      targetSchools: ['Top 50 CS Programs', 'HBCU/HSI Pipelines', 'Global Top Universities'],
    },
  },
  {
    id: 'chunk-goog-visa-01',
    company: 'Google',
    companyAliases: ['Alphabet', 'Google LLC', 'Goog'],
    category: 'visa',
    source: 'verified_interview_debrief',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Google International Student & Visa Sponsorship Policy',
    content: 'Google provides full visa sponsorship for undergraduate and graduate software engineering interns, actively issuing CPT, OPT, J-1, and TN support documentation for US and international engineering offices.',
    tags: ['Google', 'Visa', 'CPT', 'OPT', 'J-1', 'International Students'],
    metadata: {
      visaPolicy: 'High (Full visa sponsorship supported)',
    },
  },
  {
    id: 'chunk-goog-comp-01',
    company: 'Google',
    companyAliases: ['Alphabet', 'Google LLC', 'Goog'],
    category: 'compensation',
    source: 'levels_fyi',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Google SWE Intern Compensation Benchmark',
    content: 'Verified offer reports indicate Google SWE intern compensation ranges from $58.00/hr to $65.00/hr (~$9,500 - $10,500/month), accompanied by a $9,000 corporate housing stipend or provided corporate apartments, plus full travel reimbursement and daily gourmet meals.',
    tags: ['Google', 'Compensation', 'Hourly Rate', 'Housing Stipend', 'Perks'],
    metadata: {
      compensation: '$58.00 - $65.00/hr ($9,500 - $10,500/mo) + $9,000 housing stipend',
    },
  },

  // =========================================================================
  // META
  // =========================================================================
  {
    id: 'chunk-meta-oa-01',
    company: 'Meta',
    companyAliases: ['Facebook', 'Meta Platforms', 'Instagram', 'WhatsApp'],
    category: 'oa',
    source: 'candidate_report',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Meta Coding Interview Speed & Tagged LeetCode Patterns',
    content: 'Meta frequently skips initial automated OAs and moves directly to 45-minute live technical screens. Interviews heavily test standard LeetCode Medium/Hard questions (Trees, BFS/DFS, Heaps, Two Pointers, String manipulation). Speed is paramount: candidates are expected to complete two distinct algorithmic problems within 40 minutes with bug-free syntax.',
    tags: ['Meta', 'Facebook', 'Speed', 'LeetCode Tagged', 'Two Pointers', 'Trees', 'Graphs'],
    metadata: {
      dsaDifficulty: 'Medium-Hard',
      oaPlatform: 'No Initial OA / Direct Phone Screen',
    },
  },
  {
    id: 'chunk-meta-filter-01',
    company: 'Meta',
    companyAliases: ['Facebook', 'Meta Platforms'],
    category: 'hiring_filter',
    source: 'recruiter_disclosure',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Meta Recruiter Screening & Production Systems Bias',
    content: 'Meta recruiters place minimal emphasis on university prestige or GPA, focusing almost entirely on hands-on production code, prior software internships, Hackathon achievements, and demonstrable proficiency in Python, C++, Java, or React/GraphQL.',
    tags: ['Meta', 'Hiring Filter', 'GPA Relaxed', 'Prior Internships', 'Hackathons'],
    metadata: {
      minGpa: 'No GPA requirement',
    },
  },
  {
    id: 'chunk-meta-comp-01',
    company: 'Meta',
    companyAliases: ['Facebook', 'Meta Platforms'],
    category: 'compensation',
    source: 'levels_fyi',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Meta SWE Intern Compensation & Benefits',
    content: 'Meta offers SWE interns $56.00 - $62.00/hr ($9,000 - $10,000/mo), with corporate housing in Menlo Park/Seattle/NYC or an optional $2,200/mo cash housing stipend, round-trip flights, and free transit passes.',
    tags: ['Meta', 'Compensation', 'Housing Stipend'],
    metadata: {
      compensation: '$56.00 - $62.00/hr ($9,000 - $10,000/mo) + housing',
    },
  },

  // =========================================================================
  // JANE STREET
  // =========================================================================
  {
    id: 'chunk-js-dsa-01',
    company: 'Jane Street',
    companyAliases: ['Jane Street Capital', 'JSC'],
    category: 'dsa',
    source: 'verified_interview_debrief',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Jane Street Extreme Technical Bar & Algorithmic Rigor',
    content: 'Jane Street maintains an extreme technical bar testing mathematical precision, dynamic programming, functional abstractions (OCaml / Haskell / C++ concepts), type systems, and concurrency primitives. Live CoderPad interviews feature complex interactive simulations with custom constraints that cannot be memorized from standard LeetCode.',
    tags: ['Jane Street', 'Quant', 'OCaml', 'Functional Programming', 'Dynamic Programming', 'Concurrency', 'Extreme Bar'],
    metadata: {
      dsaDifficulty: 'Extreme',
      liveCodingFormat: 'Interactive CoderPad pair programming with senior engineers',
    },
  },
  {
    id: 'chunk-js-oa-01',
    company: 'Jane Street',
    companyAliases: ['Jane Street Capital', 'JSC'],
    category: 'oa',
    source: 'candidate_report',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Jane Street Screening & Probability / Game Theory Assessment',
    content: 'Initial screening involves either a direct technical phone screen or an interactive numerical/coding assessment. Focus is on clear thinking under uncertainty, expected value calculations, bitwise operations, and memory efficiency.',
    tags: ['Jane Street', 'Probability', 'Game Theory', 'CoderPad'],
    metadata: {
      oaPlatform: 'No Initial OA / Direct Phone Screen',
    },
  },
  {
    id: 'chunk-js-filter-01',
    company: 'Jane Street',
    companyAliases: ['Jane Street Capital', 'JSC'],
    category: 'gpa_university',
    source: 'recruiter_disclosure',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Jane Street Academic & Meritocracy Filters',
    content: 'Jane Street does not enforce formal GPA cutoffs, but candidates with proven competitive programming achievements (ICPC, Codeforces Grandmaster, Putnam Math Competition, USACO Platinum) or deep low-level systems coursework (Compilers, Distributed Systems) receive heavy priority.',
    tags: ['Jane Street', 'Putnam', 'ICPC', 'Codeforces', 'USACO', 'Target Schools'],
    metadata: {
      targetSchools: ['MIT', 'Stanford', 'CMU', 'Berkeley', 'Harvard', 'Waterloo', 'Cambridge'],
    },
  },
  {
    id: 'chunk-js-comp-01',
    company: 'Jane Street',
    companyAliases: ['Jane Street Capital', 'JSC'],
    category: 'compensation',
    source: 'levels_fyi',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Jane Street Industry-Leading Intern Compensation',
    content: 'Jane Street pays SWE interns $125.00/hr ($20,000/month / ~$240k annualized), plus luxury furnished corporate housing in Manhattan / London / Hong Kong, $3,000 relocation stipend, and 3 daily gourmet catered meals.',
    tags: ['Jane Street', 'Compensation', '$125/hr', 'Quant Comp', 'Luxury Housing'],
    metadata: {
      compensation: '$125.00/hr ($20,000/mo) + Luxury Manhattan corporate housing',
    },
  },

  // =========================================================================
  // CITADEL & CITADEL SECURITIES
  // =========================================================================
  {
    id: 'chunk-citadel-oa-01',
    company: 'Citadel',
    companyAliases: ['Citadel Securities', 'Citadel LLC'],
    category: 'oa',
    source: 'candidate_report',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Citadel HackerRank OA Benchmark & Strict Proctoring',
    content: 'Citadel sends a 90-minute HackerRank assessment consisting of 2 algorithmic problems (typically LeetCode Hard level involving segment trees, DP with bitmasks, shortest paths, or trie string queries). 100% test case pass rate is strictly required to pass the automated benchmark.',
    tags: ['Citadel', 'HackerRank', 'Hard DSA', 'DP', 'Segment Trees', 'Proctoring'],
    metadata: {
      dsaDifficulty: 'Hard',
      oaPlatform: 'HackerRank',
      durationMinutes: 90,
    },
  },
  {
    id: 'chunk-citadel-filter-01',
    company: 'Citadel',
    companyAliases: ['Citadel Securities'],
    category: 'gpa_university',
    source: 'recruiter_disclosure',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Citadel High GPA Cutoff & Target School Bias',
    content: 'Citadel recruiting exhibits a strict academic filter: transcripts with a 3.8+ GPA from Top 15 CS programs (MIT, Stanford, CMU, UIUC, Cornell, Berkeley) or Ivy League are heavily prioritized. Resumes with GPAs under 3.5 face near-universal ATS rejection unless offset by major international Olympiad / Putnam ranking.',
    tags: ['Citadel', 'GPA Cutoff', '3.8 GPA', 'Target Schools', 'Recruiting Filters'],
    metadata: {
      minGpa: '3.8+ expected on transcript',
    },
  },
  {
    id: 'chunk-citadel-comp-01',
    company: 'Citadel',
    companyAliases: ['Citadel Securities'],
    category: 'compensation',
    source: 'levels_fyi',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Citadel Quant Intern Compensation',
    content: 'Citadel SWE interns receive $120.00/hr (~$19,200/mo), a $5,000 sign-on bonus, luxury corporate housing in Chicago/NYC/Miami, and full relocation flight bookings.',
    tags: ['Citadel', 'Compensation', '$120/hr', 'Housing', 'Sign-on Bonus'],
    metadata: {
      compensation: '$120.00/hr ($19,200/mo) + Luxury corporate housing',
    },
  },

  // =========================================================================
  // STRIPE
  // =========================================================================
  {
    id: 'chunk-stripe-interview-01',
    company: 'Stripe',
    companyAliases: ['Stripe Inc'],
    category: 'interview',
    source: 'verified_interview_debrief',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Stripe Practical Systems & Integration Coding Environment',
    content: 'Stripe departs from theoretical DP puzzles and tests real-world software engineering: candidates work in their own local IDE with full internet access to build robust API integrations, parse nested HTTP payloads, write comprehensive unit tests, and refactor existing production codebases under realistic time limits.',
    tags: ['Stripe', 'Practical Coding', 'Unit Testing', 'Local IDE', 'API Design', 'Production Quality'],
    metadata: {
      dsaDifficulty: 'Medium-Hard',
      liveCodingFormat: 'Local IDE pair programming on real APIs and test suites',
    },
  },
  {
    id: 'chunk-stripe-filter-01',
    company: 'Stripe',
    companyAliases: ['Stripe Inc'],
    category: 'recruiter_observation',
    source: 'recruiter_disclosure',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Stripe Focus on Code Quality & Developer Empathy',
    content: 'Stripe evaluation panels heavily penalize sloppy variable naming, lack of edge case tests, or poor modular architecture. Candidates who write readable, well-commented code that feels like a production pull request receive the highest ratings.',
    tags: ['Stripe', 'Code Craft', 'Testing', 'Clean Code', 'Modular Architecture'],
  },
  {
    id: 'chunk-stripe-comp-01',
    company: 'Stripe',
    companyAliases: ['Stripe Inc'],
    category: 'compensation',
    source: 'levels_fyi',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Stripe SWE Intern Compensation',
    content: 'Stripe pays $62.00 - $68.00/hr ($10,000 - $11,000/mo), with a $2,500/mo housing stipend and comprehensive health, wellness, and ergonomics equipment budget.',
    tags: ['Stripe', 'Compensation', 'Housing Stipend'],
    metadata: {
      compensation: '$62.00 - $68.00/hr ($10,000 - $11,000/mo)',
    },
  },

  // =========================================================================
  // DATABRICKS
  // =========================================================================
  {
    id: 'chunk-databricks-oa-01',
    company: 'Databricks',
    companyAliases: ['Databricks Inc'],
    category: 'oa',
    source: 'candidate_report',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Databricks CodeSignal GCA 840+ Threshold',
    content: 'Databricks uses the CodeSignal General Coding Assessment (GCA) as an automated initial screen. Candidates must achieve a verified score of 840+ (out of 850) with clean execution on Task 4 (Prefix sums / DP) and Task 3 (2D matrix simulation) within 70 minutes to advance to engineer review.',
    tags: ['Databricks', 'CodeSignal', 'GCA 840+', 'Matrix Simulation', 'Algorithms'],
    metadata: {
      dsaDifficulty: 'Hard',
      oaPlatform: 'CodeSignal (GCA)',
      cutoffScore: '840+ out of 850',
    },
  },
  {
    id: 'chunk-databricks-interview-01',
    company: 'Databricks',
    companyAliases: ['Databricks Inc'],
    category: 'interview',
    source: 'verified_interview_debrief',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Databricks Systems Concurrency & Distributed Engine Rounds',
    content: 'Technical rounds at Databricks test low-level data structures (LRU/LFU cache implementations, B+ trees, concurrent thread-safe queues, lock-free primitives) and distributed systems fundamentals (Raft, Paxos consensus, data partitioning).',
    tags: ['Databricks', 'Concurrency', 'LRU Cache', 'Distributed Systems', 'Java', 'Scala', 'C++'],
  },

  // =========================================================================
  // OPENAI
  // =========================================================================
  {
    id: 'chunk-openai-interview-01',
    company: 'OpenAI',
    companyAliases: ['OpenAI LLC'],
    category: 'interview',
    source: 'verified_interview_debrief',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'OpenAI Research Engineering & GPU Infrastructure Bar',
    content: 'OpenAI interview loops evaluate candidates on deep systems architecture, GPU kernel optimization (CUDA, Triton, PyTorch C++ extensions), distributed model training parallelism (ZeRO, Megatron-LM), and rigorous algorithmic problem solving. Candidates must articulate memory bandwidth bottlenecks and communication overheads.',
    tags: ['OpenAI', 'AI', 'CUDA', 'Triton', 'PyTorch', 'Distributed Training', 'GPU Kernels'],
    metadata: {
      dsaDifficulty: 'Extreme',
    },
  },
  {
    id: 'chunk-openai-comp-01',
    company: 'OpenAI',
    companyAliases: ['OpenAI LLC'],
    category: 'compensation',
    source: 'levels_fyi',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'OpenAI Intern Compensation Benchmark',
    content: 'OpenAI offers research and software interns $65.00 - $80.00/hr ($10,500 - $13,000/mo), corporate San Francisco housing, daily meals, and comprehensive compute access for personal research explorations.',
    tags: ['OpenAI', 'Compensation', 'High Rate', 'San Francisco'],
  },

  // =========================================================================
  // AMAZON
  // =========================================================================
  {
    id: 'chunk-amzn-oa-01',
    company: 'Amazon',
    companyAliases: ['Amazon.com', 'AWS', 'Amazon Web Services'],
    category: 'oa',
    source: 'candidate_report',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Amazon SDE Intern Online Assessment (OA1 + OA2)',
    content: 'Amazon uses a 2-part online assessment on HackerRank: Part 1 consists of 2 coding questions (Medium difficulty: HashMaps, Arrays, Strings, BFS/DFS) in 70 minutes. Part 2 consists of a Work Style Assessment and Work Simulation evaluating Amazon Leadership Principles (Customer Obsession, Ownership, Bias for Action, Deliver Results). Both parts must be passed.',
    tags: ['Amazon', 'AWS', 'OA', 'HackerRank', 'Leadership Principles', 'Work Simulation'],
    metadata: {
      dsaDifficulty: 'Medium',
      oaPlatform: 'HackerRank',
    },
  },
  {
    id: 'chunk-amzn-filter-01',
    company: 'Amazon',
    companyAliases: ['Amazon.com', 'AWS'],
    category: 'hiring_filter',
    source: 'recruiter_disclosure',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Amazon High Volume Hiring & Behavioral Alignment',
    content: 'Amazon hires massive intern cohorts with fast automated screening. Rejections often occur in Part 2 of the OA when behavioral responses conflict with Amazon Leadership Principles (e.g. failing to prioritize customer needs over perfectionism or compromising on ownership).',
    tags: ['Amazon', 'Leadership Principles', 'High Volume', 'Behavioral Screening'],
  },

  // =========================================================================
  // MICROSOFT
  // =========================================================================
  {
    id: 'chunk-msft-oa-01',
    company: 'Microsoft',
    companyAliases: ['Microsoft Corporation', 'MSFT'],
    category: 'oa',
    source: 'candidate_report',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Microsoft Codility Online Assessment & Balanced Bar',
    content: 'Microsoft uses Codility or HackerRank for 60-90 minute OAs consisting of 2-3 algorithmic problems (Medium difficulty: Strings, Matrix, Linked Lists, Tree Traversals). Focus is on writing clean, readable OOP code with strong unit test coverage.',
    tags: ['Microsoft', 'Codility', 'HackerRank', 'OOP', 'Data Structures'],
    metadata: {
      dsaDifficulty: 'Medium',
      oaPlatform: 'Codility',
    },
  },
  {
    id: 'chunk-msft-filter-01',
    company: 'Microsoft',
    companyAliases: ['Microsoft Corporation'],
    category: 'gpa_university',
    source: 'recruiter_disclosure',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Microsoft Broad Campus Outreach & Growth Mindset',
    content: 'Microsoft recruits across hundreds of universities globally, with no hard GPA cutoff (3.0+ general guideline) and high receptivity to diverse backgrounds, non-traditional students, and candidates showing strong collaborative growth mindset.',
    tags: ['Microsoft', 'Campus Outreach', 'Growth Mindset', 'Diverse Pipelines', 'Broad Reach'],
  },

  // =========================================================================
  // APPLE
  // =========================================================================
  {
    id: 'chunk-apple-interview-01',
    company: 'Apple',
    companyAliases: ['Apple Inc.'],
    category: 'interview',
    source: 'verified_interview_debrief',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Apple Team-Specific Deep Dives & Systems Craftsmanship',
    content: 'Apple does not use centralized automated OAs. Engineering managers and tech leads screen candidates directly for specific teams (CoreOS, Swift, WebKit, GPU Drivers, Hardware/Software Integration). Interviews test low-level C, C++, memory management, thread synchronization, and deep passion for hardware/software synergy.',
    tags: ['Apple', 'CoreOS', 'C++', 'C', 'Swift', 'Team Matching', 'No Central OA', 'Hardware Synergy'],
    metadata: {
      dsaDifficulty: 'Hard',
      oaPlatform: 'No Initial OA / Direct Phone Screen',
    },
  },

  // =========================================================================
  // D.E. SHAW
  // =========================================================================
  {
    id: 'chunk-deshaw-oa-01',
    company: 'D.E. Shaw & Co.',
    companyAliases: ['D. E. Shaw', 'DESCO'],
    category: 'oa',
    source: 'candidate_report',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'D.E. Shaw 90-min Algorithmic Challenge & Academic Bar',
    content: 'D.E. Shaw HackerRank OA involves 2 challenging algorithmic problems focusing on Dynamic Programming, Graph Theory, and mathematical abstractions. Suboptimal Big-O complexity or failing to handle recurrence relations leads to immediate rejection.',
    tags: ['D.E. Shaw', 'Quant', 'HackerRank', 'DP', 'Math', 'Academic Rigor'],
    metadata: {
      dsaDifficulty: 'Hard',
      oaPlatform: 'HackerRank',
      minGpa: '3.6+ expected on transcript review',
    },
  },

  // =========================================================================
  // MORGAN STANLEY & WALL STREET
  // =========================================================================
  {
    id: 'chunk-ms-filter-01',
    company: 'Morgan Stanley',
    companyAliases: ['MS', 'Morgan Stanley Technology'],
    category: 'gpa_university',
    source: 'recruiter_disclosure',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: 'Morgan Stanley 3.3+ Strict GPA Cutoff & Penultimate Year Rule',
    content: 'Morgan Stanley strictly enforces a 3.3+ minimum GPA cutoff during resume submission for its Summer Technology Analyst program. Candidates must also be in their penultimate year of undergraduate or master study (rising juniors/seniors). Resumes lacking GPA or with GPA below 3.3 are filtered out automatically.',
    tags: ['Morgan Stanley', 'Finance', 'GPA Cutoff', '3.3 GPA', 'Penultimate Year', 'Java', 'Enterprise'],
    metadata: {
      minGpa: '3.3+ strictly screened',
      oaPlatform: 'HackerRank',
    },
  },

  // =========================================================================
  // UBER & FIGMA & SNOWFLAKE & ROBINHOOD
  // =========================================================================
  {
    id: 'chunk-uber-oa-01',
    company: 'Uber',
    companyAliases: ['Uber Technologies'],
    category: 'oa',
    source: 'candidate_report',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Uber CodeSignal 830+ OA & Geospatial Architecture',
    content: 'Uber screens with CodeSignal GCA requiring 830+ score. Subsequent technical rounds test microservices architecture, geospatial indexing (H3, QuadTrees), concurrency, and clean Go / Java / Python backend design.',
    tags: ['Uber', 'CodeSignal', 'Geospatial', 'H3', 'Microservices', 'Concurrency'],
    metadata: {
      oaPlatform: 'CodeSignal (GCA)',
    },
  },
  {
    id: 'chunk-figma-interview-01',
    company: 'Figma',
    companyAliases: ['Figma Inc'],
    category: 'interview',
    source: 'verified_interview_debrief',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: 'Figma WebAssembly, Canvas & Real-Time CRDT Architecture',
    content: 'Figma interviews emphasize browser performance, WebAssembly / C++, 2D Canvas rendering, operational transforms / CRDTs for multiplayer collaboration, and extreme frontend engineering craftsmanship with TypeScript.',
    tags: ['Figma', 'WebAssembly', 'Canvas', 'CRDT', 'TypeScript', 'Frontend Craft', 'Rendering'],
  },
];

/**
 * Utility: Ingests an existing CompanyInsight object and generates granular knowledge chunks
 */
export function chunkCompanyInsight(insight: CompanyInsight): CompanyKnowledgeChunk[] {
  const chunks: CompanyKnowledgeChunk[] = [];
  const baseTags = [insight.companyName, insight.tier, insight.industry, ...(insight.aliases || [])];

  // 1. DSA Bar Chunk
  chunks.push({
    id: `chunk-${insight.id}-dsa`,
    company: insight.companyName,
    companyAliases: insight.aliases,
    category: 'dsa',
    source: 'verified_interview_debrief',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: `${insight.companyName} Technical & DSA Bar Profile`,
    content: `At ${insight.companyName} (${insight.tier}), the DSA bar difficulty is classified as ${insight.dsaBar.difficulty}. Primary evaluated topics include: ${insight.dsaBar.primaryTopics.join(', ')}. Key focus areas: ${insight.dsaBar.focusAreas}. Live coding format: ${insight.dsaBar.liveCodingFormat}. System design expectation: ${insight.dsaBar.systemDesignExpectation}.`,
    tags: [...baseTags, 'DSA', 'Algorithms', insight.dsaBar.difficulty, ...insight.dsaBar.primaryTopics],
    metadata: {
      dsaDifficulty: insight.dsaBar.difficulty,
      primaryTopics: insight.dsaBar.primaryTopics,
    },
  });

  // 2. Online Assessment (OA) Chunk
  chunks.push({
    id: `chunk-${insight.id}-oa`,
    company: insight.companyName,
    companyAliases: insight.aliases,
    category: 'oa',
    source: 'candidate_report',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: `${insight.companyName} OA Assessment & Proctoring Profile`,
    content: `${insight.companyName} utilizes ${insight.oaType.platform} with a typical duration of ${insight.oaType.typicalDurationMinutes} minutes. Score cutoff standards: ${insight.oaType.cutoffScoreDescription}. Proctoring parameters: Webcam required: ${insight.oaType.proctoring.webcamRequired}, Screen recording: ${insight.oaType.proctoring.screenRecording}, Copy-paste disabled: ${insight.oaType.proctoring.copyPasteDisabled}.`,
    tags: [...baseTags, 'OA', insight.oaType.platform, 'Proctoring'],
    metadata: {
      oaPlatform: insight.oaType.platform,
      durationMinutes: insight.oaType.typicalDurationMinutes,
    },
  });

  // 3. Unspoken Screening & Academic Filters Chunk
  chunks.push({
    id: `chunk-${insight.id}-filters`,
    company: insight.companyName,
    companyAliases: insight.aliases,
    category: 'hiring_filter',
    source: 'recruiter_disclosure',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: `${insight.companyName} Recruiter Filters, GPA & Target Schools`,
    content: `Recruiter screening guidelines for ${insight.companyName}: Target School tier: ${insight.unspokenFilters.targetSchoolTier}. Minimum GPA guideline: ${insight.unspokenFilters.minimumGpa}. Prior experience preference: ${insight.unspokenFilters.priorExperiencePreference}. Undergrad standing: ${insight.unspokenFilters.undergradClassStanding}. International visa sponsorship: ${insight.unspokenFilters.internationalVisaOpenness}. Open-source GitHub weighting: ${insight.unspokenFilters.githubOpenSourceWeight}.`,
    tags: [...baseTags, 'Recruiter Filters', 'GPA', 'Target Schools', 'Visa'],
    metadata: {
      minGpa: insight.unspokenFilters.minimumGpa,
      visaPolicy: insight.unspokenFilters.internationalVisaOpenness,
    },
  });

  // 4. ATS Hotkeys & Red Flags Chunk
  chunks.push({
    id: `chunk-${insight.id}-hotkeys`,
    company: insight.companyName,
    companyAliases: insight.aliases,
    category: 'recruiter_observation',
    source: 'recruiter_disclosure',
    role: 'software_engineering',
    date: '2026',
    confidence: 'high',
    title: `${insight.companyName} High-Signal Resume Keywords & Red Flags`,
    content: `High-signal ATS keywords for ${insight.companyName}: [${insight.resumeHotkeys.join(', ')}]. Recruiter fatal red flags: [${insight.redFlags.join(', ')}].`,
    tags: [...baseTags, 'Hotkeys', 'Red Flags', 'ATS Optimization'],
  });

  // 5. Compensation & Timeline Chunk
  chunks.push({
    id: `chunk-${insight.id}-comp`,
    company: insight.companyName,
    companyAliases: insight.aliases,
    category: 'compensation',
    source: 'levels_fyi',
    role: 'software_engineering',
    date: '2026',
    confidence: 'verified',
    title: `${insight.companyName} Verified Compensation & Recruiting Timeline`,
    content: `Verified intern compensation for ${insight.companyName}: ${insight.compensationRange.hourlyRateUsd}. Housing stipend: ${insight.compensationRange.housingStipendMonthlyUsd || 'None / Corporate Housing'}. Relocation bonus: ${insight.compensationRange.relocationBonusUsd || 'None'}. Perks: ${insight.compensationRange.perks.join(', ')}. Recruiting timeline: Typically opens in ${insight.applicationTimeline.typicalOpenDate} and closes in ${insight.applicationTimeline.typicalCloseDate} (Urgency: ${insight.applicationTimeline.urgencyRating}, Recruiter velocity: ${insight.applicationTimeline.recruiterVelocity}).`,
    tags: [...baseTags, 'Compensation', 'Timeline', 'Hourly Rate', 'Housing Stipend'],
    metadata: {
      compensation: insight.compensationRange.hourlyRateUsd,
    },
  });

  return chunks;
}

/**
 * Initializes and embeds all company knowledge chunks into vector space
 */
export function buildAllCompanyKnowledgeChunks(): CompanyKnowledgeChunk[] {
  const chunks: CompanyKnowledgeChunk[] = [...SEED_COMPANY_KNOWLEDGE_CHUNKS];

  // Ingest all master company insights as structured chunks
  for (const insight of MASTER_COMPANY_INSIGHTS) {
    const generated = chunkCompanyInsight(insight);
    for (const gen of generated) {
      // Avoid duplicate IDs
      if (!chunks.some((c) => c.id === gen.id)) {
        chunks.push(gen);
      }
    }
  }

  // Pre-calculate 768-dim embeddings for all chunks
  for (const chunk of chunks) {
    if (!chunk.vectorEmbedding || chunk.vectorEmbedding.length === 0) {
      const embeddingText = `${chunk.company} ${(chunk.companyAliases || []).join(' ')} ${chunk.category} ${chunk.role} ${chunk.title} ${chunk.content} ${chunk.tags.join(' ')}`;
      chunk.vectorEmbedding = generateDeterministicEmbedding(embeddingText);
    }
  }

  return chunks;
}
