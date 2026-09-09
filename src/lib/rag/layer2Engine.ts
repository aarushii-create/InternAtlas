/**
 * AI Internship Scout - Phase 8: True RAG Layer 2 Engine (Company Reality Matching)
 * 
 * Full RAG Pipeline:
 * Company knowledge → Chunking → Embeddings → Vector Database → Semantic/Hybrid Retrieval → Retrieved Evidence → Deterministic Reasoning → Company Reality Evaluation
 */

import {
  Job,
  Resume,
  CompanyInsight,
  Layer1EvaluationResult,
  Layer2EvaluationResult,
  Layer2Warning,
  Layer2PositiveSignal,
  Layer2DsaEvaluation,
  Layer2OaEvaluation,
  Layer2FilterEvaluation,
  DsaDifficulty,
  Layer2RetrievedEvidence,
  Layer2LLMReasoningSummary,
} from '../../types';
import { layer1RagEngine } from './layer1Engine';
import { MASTER_COMPANY_INSIGHTS } from '../../db/companyInsightsMaster';
import { companyVectorStore } from './companyVectorStore';
import { layer2LLMReasoningEngine } from './layer2LLMReasoning';

// DSA Difficulty Multipliers and baseline expectations
const DSA_DIFFICULTY_SCORES: Record<DsaDifficulty, number> = {
  'Extreme': 0.95,
  'Hard': 0.85,
  'Medium-Hard': 0.70,
  'Medium': 0.55,
  'Easy': 0.35,
};

// Target university tiers recognized in tech & finance recruiting
const TIER_1_UNIVERSITIES = [
  'stanford', 'mit', 'massachusetts institute of technology', 'cmu', 'carnegie mellon',
  'berkeley', 'uc berkeley', 'university of california, berkeley', 'harvard', 'princeton',
  'yale', 'columbia', 'cornell', 'caltech', 'waterloo', 'university of waterloo',
  'uiuc', 'university of illinois', 'georgia tech', 'michigan', 'university of michigan',
  'washington', 'university of washington', 'purdue', 'ut austin', 'university of texas at austin',
  'brown', 'dartmouth', 'penn', 'university of pennsylvania', 'upenn', 'oxford', 'cambridge'
];

export class Layer2RagEngine {
  /**
   * Constructs a targeted semantic query from Job Description + Candidate Profile + Target Company
   * e.g. "Software engineering internship candidate applying to Google. Evaluate DSA expectations, OA difficulty, GPA requirements, university preferences, and interview filters."
   */
  public constructRagQuery(resume: Resume, job: Job): string {
    const role = job.title || 'Software Engineering Intern';
    const company = job.company || 'Tech Company';
    const skills = (resume.extractedSkills || []).slice(0, 8).join(', ') || 'Software Engineering';
    const school = resume.parsedData?.education?.[0]?.institution || 'University';
    const gpa = resume.parsedData?.education?.[0]?.gpa ? `GPA ${resume.parsedData.education[0].gpa}` : 'GPA unlisted';

    return `${role} candidate applying to ${company}. Candidate profile: ${skills}, ${school}, ${gpa}. Evaluate DSA expectations, OA difficulty, GPA requirements, university preferences, interview filters, compensation, and company hiring signals.`;
  }

  /**
   * Resolves the CompanyInsight profile by company name or aliases.
   * If not explicitly seeded, searches the vector store for semantic context or builds an archetype.
   */
  public resolveCompanyInsight(companyName: string, jobTitle: string = ''): CompanyInsight {
    const cleanName = companyName.trim().toLowerCase();
    
    // 1. Direct exact or alias lookup in knowledge graph
    const found = MASTER_COMPANY_INSIGHTS.find((c) => {
      if (c.companyName.toLowerCase() === cleanName) return true;
      return c.aliases.some((a) => a.toLowerCase() === cleanName || cleanName.includes(a.toLowerCase()));
    });

    if (found) {
      return found;
    }

    // 2. Partial substring match (e.g. "Google Inc." -> "Google")
    const partialMatch = MASTER_COMPANY_INSIGHTS.find((c) => {
      const cNameLower = c.companyName.toLowerCase();
      return cleanName.includes(cNameLower) || cNameLower.includes(cleanName);
    });

    if (partialMatch) {
      return partialMatch;
    }

    // 3. Check if semantic chunks exist in vector database for this company
    const semanticChunks = companyVectorStore.searchSemantic(companyName, { company: companyName, topK: 3 });
    if (semanticChunks.length > 0 && semanticChunks[0].similarityScore > 0.70) {
      const topChunk = semanticChunks[0].chunk;
      const dsaChunk = semanticChunks.find((s) => s.chunk.category === 'dsa' || s.chunk.category === 'oa');
      const filterChunk = semanticChunks.find((s) => s.chunk.category === 'hiring_filter' || s.chunk.category === 'gpa_university');
      const compChunk = semanticChunks.find((s) => s.chunk.category === 'compensation');

      return {
        id: `comp-semantic-${cleanName.replace(/\s+/g, '-').toLowerCase()}`,
        companyName: topChunk.company,
        aliases: topChunk.companyAliases || [companyName],
        tier: (topChunk.metadata?.tier as any) || 'Tier 2 Elite Tech',
        industry: (topChunk.metadata?.industry as any) || 'Enterprise Infrastructure',
        headquarters: topChunk.metadata?.headquarters || 'United States / Remote',
        dsaBar: {
          difficulty: (dsaChunk?.chunk.metadata?.dsaDifficulty as any) || 'Medium-Hard',
          primaryTopics: dsaChunk?.chunk.metadata?.primaryTopics || ['Data Structures & Algorithms', 'Dynamic Programming', 'System Design'],
          focusAreas: dsaChunk?.chunk.content.slice(0, 120) || 'Practical problem solving, algorithms, and clean architecture.',
          liveCodingFormat: 'Interactive CoderPad / live technical pair programming.',
          systemDesignExpectation: 'Basic distributed components and scalable APIs.',
        },
        oaType: {
          platform: (dsaChunk?.chunk.metadata?.oaPlatform as any) || 'CodeSignal (GCA)',
          typicalDurationMinutes: dsaChunk?.chunk.metadata?.durationMinutes || 70,
          cutoffScoreDescription: 'Standard algorithmic OA with passing score on hidden tests.',
          proctoring: {
            webcamRequired: true,
            screenRecording: false,
            copyPasteDisabled: true,
            audioMonitored: false,
          },
        },
        cultureTraits: [
          { trait: 'Technical Rigor', description: 'Strong computer science foundations and attention to detail.', importance: 'High' },
          { trait: 'Ownership & Velocity', description: 'Proactive problem solving and clear communication.', importance: 'High' },
        ],
        unspokenFilters: {
          targetSchoolTier: filterChunk?.chunk.content.includes('Ivy') ? 'Top 25 CS Programs' : 'Accredited CS Programs',
          minimumGpa: filterChunk?.chunk.metadata?.minGpa || '3.2+ recommended',
          priorExperiencePreference: 'Prior software engineering internships or significant projects.',
          undergradClassStanding: 'Rising Juniors, Seniors, Masters.',
          internationalVisaOpenness: (filterChunk?.chunk.metadata?.visaPolicy as any) || 'High (Sponsors CPT, OPT, J-1).',
          githubOpenSourceWeight: 'Moderate-High.',
        },
        resumeHotkeys: ['Python', 'TypeScript', 'React', 'Node.js', 'SQL', 'Docker', 'AWS', 'Algorithms'],
        redFlags: ['Generic unmaintained tutorial clones', 'Lack of testing or algorithmic depth'],
        compensationRange: {
          hourlyRateUsd: compChunk?.chunk.metadata?.compensation || '$50.00 - $65.00/hr (~$9,000/mo)',
          housingStipendMonthlyUsd: '$2,000/mo housing stipend',
          relocationBonusUsd: '$1,500 relocation stipend',
          perks: ['Modern workstation gear', 'Mentorship program', 'Health benefits coverage'],
        },
        applicationTimeline: {
          typicalOpenDate: 'August / September',
          typicalCloseDate: 'December',
          rollingBasis: true,
          urgencyRating: 'STANDARD_FALL',
          recruiterVelocity: 'Moderate',
        },
        interviewStages: [
          { roundNumber: 1, name: 'Technical OA', type: 'OA', description: '70-min coding assessment.', durationMinutes: 70 },
          { roundNumber: 2, name: 'Technical Phone Screen', type: 'Technical Phone Screen', description: 'Live coding + problem solving.', durationMinutes: 60 },
          { roundNumber: 3, name: 'Virtual Onsite', type: 'Virtual Onsite', description: 'Algorithms and systems design.', durationMinutes: 120 },
        ],
        dataSources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // 4. Fallback archetype: High-Growth Tech Startup / General Enterprise
    const isQuantFinance = cleanName.includes('capital') || cleanName.includes('trading') || cleanName.includes('quant') || cleanName.includes('fund');
    const isAiMl = cleanName.includes('ai') || cleanName.includes('intelligence') || cleanName.includes('labs') || jobTitle.toLowerCase().includes('machine learning');

    return {
      id: `comp-archetype-${cleanName.replace(/\s+/g, '-').toLowerCase()}`,
      companyName: companyName,
      aliases: [companyName],
      tier: isQuantFinance ? 'Top Finance / Wall St' : isAiMl ? ('Venture Backed AI' as any) : 'Tier 2 Elite Tech',
      industry: isQuantFinance ? 'Fintech / Quantitative Trading' : isAiMl ? 'Applied AI & Foundation Models' : 'Enterprise Infrastructure',
      headquarters: 'United States / Remote',
      dsaBar: {
        difficulty: isQuantFinance ? 'Hard' : isAiMl ? 'Medium-Hard' : 'Medium',
        primaryTopics: isQuantFinance
          ? ['Dynamic Programming', 'Graph Theory', 'C++ Low-Latency', 'Concurrency']
          : ['Data Structures & Algorithms', 'System Architecture', 'API Design', 'Database Queries'],
        focusAreas: 'Clean code maintainability, standard algorithmic problem solving, and API design.',
        liveCodingFormat: 'CoderPad / HackerRank interactive pair programming with engineering staff.',
        systemDesignExpectation: 'Understanding basic microservice architecture and data model normalization.',
      },
      oaType: {
        platform: isQuantFinance ? 'HackerRank' : 'CodeSignal (GCA)',
        typicalDurationMinutes: 70,
        cutoffScoreDescription: 'Standard algorithmic OA (800+ on CodeSignal or 85%+ test pass on HackerRank).',
        proctoring: {
          webcamRequired: false,
          screenRecording: false,
          copyPasteDisabled: true,
          audioMonitored: false,
        },
      },
      cultureTraits: [
        { trait: 'Ownership & Velocity', description: 'Self-direction, proactive execution, and quality code.', importance: 'High' },
        { trait: 'Collaborative Problem Solving', description: 'Clear communication and team mindset.', importance: 'High' },
      ],
      unspokenFilters: {
        targetSchoolTier: 'Broad accredited CS & Engineering programs nationwide.',
        minimumGpa: isQuantFinance ? '3.3+ recommended' : '3.0+ (Generally flexible for strong project portfolios)',
        priorExperiencePreference: 'Practical full-stack or backend engineering projects.',
        undergradClassStanding: 'Rising Sophomores, Juniors, Seniors, Masters.',
        internationalVisaOpenness: 'High (Sponsors CPT, OPT, J-1).',
        githubOpenSourceWeight: 'Moderate-High.',
      },
      resumeHotkeys: ['Python', 'TypeScript', 'React', 'Node.js', 'SQL', 'PostgreSQL', 'Docker', 'AWS', 'Git'],
      redFlags: ['Generic unmaintained tutorial clones', 'Missing technical details on project implementations'],
      compensationRange: {
        hourlyRateUsd: isQuantFinance ? '$50.00 - $65.00/hr' : '$45.00 - $55.00/hr (~$8,000/mo)',
        housingStipendMonthlyUsd: '$2,000/mo housing stipend or relocation package',
        relocationBonusUsd: '$1,000 relocation stipend',
        perks: ['Modern workstation gear', 'Mentorship program', 'Health benefits coverage'],
      },
      applicationTimeline: {
        typicalOpenDate: 'August / September',
        typicalCloseDate: 'December',
        rollingBasis: true,
        urgencyRating: 'STANDARD_FALL',
        recruiterVelocity: 'Moderate',
      },
      interviewStages: [
        { roundNumber: 1, name: 'Technical OA', type: 'OA', description: '70-min coding assessment.', durationMinutes: 70 },
        { roundNumber: 2, name: 'Technical Phone Screen', type: 'Technical Phone Screen', description: 'Live coding + project discussion.', durationMinutes: 60 },
        { roundNumber: 3, name: 'Virtual Onsite (2 Rounds)', type: 'Virtual Onsite', description: 'Coding + systems + culture fit.', durationMinutes: 120 },
      ],
      dataSources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Evaluates candidate's Technical / DSA depth against the company's informal DSA bar
   */
  public evaluateDsaBar(company: CompanyInsight, resume: Resume): Layer2DsaEvaluation {
    const requiredTopics = company.dsaBar.primaryTopics;
    const resumeTextLower = `${resume.content || ''} ${(resume.extractedSkills || []).join(' ')} ${(resume.parsedData?.skills || []).join(' ')} ${(resume.parsedData?.projects || []).map((p) => p.title + ' ' + p.description + ' ' + (p.technologies || []).join(' ')).join(' ')}`.toLowerCase();

    const candidateCoveredTopics: string[] = [];
    const uncoveredHardTopics: string[] = [];

    // Technical indicator keywords
    const topicKeywords: Record<string, string[]> = {
      'Dynamic Programming': ['dynamic programming', 'dp', 'memoization', 'knapsack', 'recurrence', 'optimal substructure'],
      'Graph Theory': ['graph', 'dijkstra', 'bfs', 'dfs', 'topological sort', 'shortest path', 'a*', 'spanning tree', 'bipartite'],
      'Bit Manipulation': ['bit manipulation', 'bitwise', 'bitmask', 'xor', 'binary'],
      'Trie & Strings': ['trie', 'suffix tree', 'kmp', 'string hashing', 'rabin-karp', 'automata'],
      'C++ Systems & Memory': ['c++', 'c++20', 'pointer', 'raii', 'memory layout', 'simd', 'template metaprogramming', 'valgrind', 'cache locality', 'assembly'],
      'C++20 Templates': ['c++20', 'c++', 'template', 'metaprogramming', 'concepts', 'constexpr'],
      'Lock-Free Queues': ['lock-free', 'atomic', 'memory barrier', 'concurrency', 'mutex', 'thread safe', 'spin lock'],
      'OS & Kernel Bypass': ['kernel bypass', 'dpdk', 'solarflare', 'socket', 'tcp/ip', 'epoll', 'io_uring', 'linux kernel'],
      'Distributed Systems': ['distributed', 'raft', 'paxos', 'consensus', 'replication', 'sharding', 'byzantine', 'linearizability', 'jepsen', 'grpc'],
      'CUDA & GPU Architecture': ['cuda', 'gpu', 'kernel', 'shared memory', 'pytorch cuda', 'warp', 'vulkan', 'opengl', 'parallel computing'],
      'Spatial Indexing (H3 / Geospatial)': ['geospatial', 'spatial', 'h3', 'k-d tree', 'quadtree', 'r-tree', 'gis'],
      'SQL Query Compilers': ['compiler', 'ast', 'query engine', 'b+ tree', 'lsm tree', 'storage engine', 'vectorized execution'],
      'WebAssembly / C++ in Browser': ['webassembly', 'wasm', 'canvas', 'webgl', 'crdt', 'rendering engine'],
      'Competitive Programming': ['icpc', 'codeforces', 'putnam', 'usaco', 'leetcode contest', 'grandmaster'],
    };

    let coveredCount = 0;
    for (const topic of requiredTopics) {
      const keywords = topicKeywords[topic] || [topic.toLowerCase()];
      const isCovered = keywords.some((kw) => resumeTextLower.includes(kw.toLowerCase()));
      
      if (isCovered) {
        candidateCoveredTopics.push(topic);
        coveredCount++;
      } else {
        uncoveredHardTopics.push(topic);
      }
    }

    // Also check if candidate has general competitive programming or low-level systems depth
    const hasCompetitiveProgramming = resumeTextLower.includes('icpc') ||
      resumeTextLower.includes('codeforces') ||
      resumeTextLower.includes('putnam') ||
      resumeTextLower.includes('usaco') ||
      resumeTextLower.includes('leetcode contest');

    const hasLowLevelSystems = resumeTextLower.includes('c++') ||
      resumeTextLower.includes('rust') ||
      resumeTextLower.includes('distributed') ||
      resumeTextLower.includes('concurrency') ||
      resumeTextLower.includes('kernel') ||
      resumeTextLower.includes('memory management');

    // Base ratio
    const topicRatio = requiredTopics.length > 0 ? coveredCount / requiredTopics.length : 1.0;
    
    // Calculate alignment score based on company bar strictness
    let score = topicRatio * 0.75 + (hasLowLevelSystems ? 0.15 : 0.0) + (hasCompetitiveProgramming ? 0.15 : 0.0);

    // If company is Hard/Extreme and candidate has zero systems/algorithms depth, apply reality penalty
    if ((company.dsaBar.difficulty === 'Hard' || company.dsaBar.difficulty === 'Extreme') && !hasCompetitiveProgramming && !hasLowLevelSystems) {
      score = Math.min(score, 0.45);
    }

    const finalScore = Math.min(1.0, Math.max(0.15, parseFloat(score.toFixed(3))));

    return {
      companyBarDifficulty: company.dsaBar.difficulty,
      requiredTopics,
      candidateCoveredTopics,
      uncoveredHardTopics,
      technicalAlignmentScore: finalScore,
      liveCodingFormat: company.dsaBar.liveCodingFormat,
      focusAreas: company.dsaBar.focusAreas,
    };
  }

  /**
   * Evaluates candidate's Online Assessment (OA) risk and pass probability
   */
  public evaluateOaRisk(
    company: CompanyInsight,
    dsaEval: Layer2DsaEvaluation,
    resume: Resume
  ): Layer2OaEvaluation {
    const oa = company.oaType;
    const isProctored = oa.proctoring.webcamRequired || oa.proctoring.screenRecording || oa.proctoring.copyPasteDisabled;

    let strictnessText: Layer2OaEvaluation['proctoringStrictness'] = 'Standard Proctoring';
    if (oa.platform === 'No Initial OA / Direct Phone Screen') {
      strictnessText = 'No Initial OA';
    } else if (oa.proctoring.webcamRequired && oa.proctoring.screenRecording && oa.proctoring.copyPasteDisabled) {
      strictnessText = 'Strict Proctored (Webcam + Screen + Lock)';
    } else if (!isProctored) {
      strictnessText = 'Unproctored / Take-home';
    }

    // Predict pass probability based on candidate's technical alignment and OA duration/difficulty
    let passProb = dsaEval.technicalAlignmentScore * 0.85;

    if (oa.platform === 'CodeSignal (GCA)') {
      const resumeText = (resume.content || '').toLowerCase();
      if (resumeText.includes('icpc') || resumeText.includes('leetcode') || resumeText.includes('algorithms')) {
        passProb += 0.12;
      }
    } else if (oa.platform === 'HackerRank') {
      if (company.dsaBar.difficulty === 'Hard' || company.dsaBar.difficulty === 'Extreme') {
        passProb *= 0.90;
      }
    }

    passProb = Math.min(0.98, Math.max(0.20, parseFloat(passProb.toFixed(2))));

    // Build specific preparation guide
    let prepGuide = '';
    if (oa.platform === 'CodeSignal (GCA)') {
      prepGuide = `Target 830+ score on 70-min GCA. Focus strategy: Solve Q1 & Q2 in under 12 mins, skip immediately to Q4 (Prefix Sum / Hashmap / DP), then finish Q3 (2D Matrix Simulation). Strict proctoring active.`;
    } else if (oa.platform === 'HackerRank') {
      prepGuide = `HackerRank ${oa.typicalDurationMinutes}-min format. Expect ${company.dsaBar.primaryTopics.slice(0, 2).join(' & ')}. Must pass 100% of hidden test cases (watch for integer overflow and O(N log N) time limit timeouts).`;
    } else if (oa.platform === 'Karat') {
      prepGuide = `60-min Karat video interview: 10 mins CS fundamentals MCQs + 45 mins live coding. Must complete at least 2 coding questions cleanly to advance.`;
    } else {
      prepGuide = `Prepare for ${company.dsaBar.focusAreas}. Practice interactive live whiteboard coding on ${company.dsaBar.liveCodingFormat}.`;
    }

    return {
      platform: oa.platform,
      durationMinutes: oa.typicalDurationMinutes,
      cutoffDescription: oa.cutoffScoreDescription,
      proctoringStrictness: strictnessText,
      webcamRequired: oa.proctoring.webcamRequired,
      screenRecording: oa.proctoring.screenRecording,
      copyPasteDisabled: oa.proctoring.copyPasteDisabled,
      predictedPassProbability: passProb,
      preparationGuide: prepGuide,
    };
  }

  /**
   * Evaluates Unspoken Recruiter Filters (Target School, GPA Cutoff, Visa Openness)
   */
  public evaluateUnspokenFilters(company: CompanyInsight, resume: Resume): Layer2FilterEvaluation {
    const filters = company.unspokenFilters;
    const eduList = resume.parsedData?.education || [];
    
    // 1. University Tier Screening
    const schoolNames = eduList.map((e) => e.institution?.toLowerCase() || '').join(' ') + ' ' + (resume.content || '').toLowerCase();
    const isTargetSchool = TIER_1_UNIVERSITIES.some((uni) => schoolNames.includes(uni));
    
    let schoolScore = isTargetSchool ? 1.0 : 0.70;
    if (company.tier === 'Tier 1 Quant/HFT' && !isTargetSchool) {
      schoolScore = 0.55;
    }

    const candidateSchoolName = eduList.length > 0 ? eduList[0].institution : 'Accredited University';

    // 2. GPA Assessment
    let candidateGpaNum: number | undefined = undefined;
    if (eduList.length > 0 && eduList[0].gpa) {
      const parsedGpa = parseFloat(eduList[0].gpa);
      if (!isNaN(parsedGpa)) candidateGpaNum = parsedGpa;
    }

    let gpaScore = 0.85;
    let meetsGpaCutoff = true;

    if (candidateGpaNum !== undefined) {
      if (filters.minimumGpa.includes('3.6') && candidateGpaNum < 3.6) {
        meetsGpaCutoff = false;
        gpaScore = candidateGpaNum >= 3.4 ? 0.65 : 0.40;
      } else if (filters.minimumGpa.includes('3.5') && candidateGpaNum < 3.5) {
        meetsGpaCutoff = false;
        gpaScore = candidateGpaNum >= 3.2 ? 0.70 : 0.45;
      } else if (filters.minimumGpa.includes('3.4') && candidateGpaNum < 3.4) {
        meetsGpaCutoff = false;
        gpaScore = 0.60;
      } else if (candidateGpaNum >= 3.8) {
        gpaScore = 1.0;
      } else {
        gpaScore = 0.90;
      }
    } else {
      if (company.tier === 'Tier 1 Quant/HFT' || company.tier === 'Top Finance / Wall St') {
        meetsGpaCutoff = false;
        gpaScore = 0.60;
      } else {
        meetsGpaCutoff = true;
        gpaScore = 0.85;
      }
    }

    // 3. Visa Sponsorship Assessment
    const visaScore = filters.internationalVisaOpenness.toLowerCase().includes('high')
      ? 1.0
      : filters.internationalVisaOpenness.toLowerCase().includes('moderate')
      ? 0.75
      : 0.40;

    // 4. Experience Tier Assessment (Prior Tier-1 Tech Internship)
    const expList = resume.parsedData?.experience || resume.parsedExperience || [];
    const expText = expList.map((e) => `${e.company} ${e.role}`).join(' ').toLowerCase();
    
    const hasTier1Exp = expText.includes('google') ||
      expText.includes('meta') ||
      expText.includes('facebook') ||
      expText.includes('amazon') ||
      expText.includes('apple') ||
      expText.includes('microsoft') ||
      expText.includes('stripe') ||
      expText.includes('jane street') ||
      expText.includes('citadel') ||
      expText.includes('uber') ||
      expText.includes('snowflake') ||
      expText.includes('databricks');

    const expScore = hasTier1Exp ? 1.0 : expList.length > 0 ? 0.80 : 0.60;

    return {
      targetSchoolAssessment: {
        matched: isTargetSchool,
        candidateSchool: candidateSchoolName,
        targetTierText: filters.targetSchoolTier,
        score: schoolScore,
      },
      gpaAssessment: {
        candidateGpa: candidateGpaNum || 'Not Specified on Resume',
        minimumRequiredText: filters.minimumGpa,
        meetsCutoff: meetsGpaCutoff,
        score: gpaScore,
      },
      visaAssessment: {
        openness: filters.internationalVisaOpenness,
        score: visaScore,
        note: `Visa sponsorship feasibility: ${filters.internationalVisaOpenness}`,
      },
      experienceTierAssessment: {
        score: expScore,
        note: hasTier1Exp ? 'Possesses verified Tier-1 industry experience' : 'Standard academic/internship experience',
      },
    };
  }

  /**
   * Evaluates ATS Resume Hotkeys and detects fatal Red Flags
   */
  public evaluateHotkeysAndRedFlags(
    company: CompanyInsight,
    resume: Resume
  ): {
    matchedHotkeys: string[];
    missingHotkeys: string[];
    detectedRedFlags: string[];
    hotkeyScore: number;
  } {
    const resumeTextLower = `${resume.content || ''} ${(resume.extractedSkills || []).join(' ')} ${(resume.parsedData?.skills || []).join(' ')} ${(resume.parsedData?.projects || []).map((p) => p.title + ' ' + p.description + ' ' + (p.technologies || []).join(' ')).join(' ')}`.toLowerCase();
    
    const matchedHotkeys: string[] = [];
    const missingHotkeys: string[] = [];

    for (const hotkey of company.resumeHotkeys) {
      if (resumeTextLower.includes(hotkey.toLowerCase())) {
        matchedHotkeys.push(hotkey);
      } else {
        missingHotkeys.push(hotkey);
      }
    }

    const detectedRedFlags: string[] = [];
    for (const flag of company.redFlags) {
      const flagLower = flag.toLowerCase();
      if (flagLower.includes('python only') && resumeTextLower.includes('python') && !resumeTextLower.includes('c++') && !resumeTextLower.includes('rust')) {
        detectedRedFlags.push(flag);
      } else if (flagLower.includes('gpa below') && resume.parsedData?.education?.[0]?.gpa && parseFloat(resume.parsedData.education[0].gpa) < 3.3) {
        detectedRedFlags.push(flag);
      } else if (flagLower.includes('generic crud') && (resumeTextLower.includes('todo') || resumeTextLower.includes('to-do') || resumeTextLower.includes('weather app'))) {
        detectedRedFlags.push(flag);
      } else if (flagLower.includes('lack of testing') && !resumeTextLower.includes('test') && !resumeTextLower.includes('ci/cd') && !resumeTextLower.includes('pytest') && !resumeTextLower.includes('junit')) {
        detectedRedFlags.push(flag);
      }
    }

    const hotkeyRatio = company.resumeHotkeys.length > 0 ? matchedHotkeys.length / company.resumeHotkeys.length : 1.0;
    const hotkeyScore = Math.min(1.0, Math.max(0.2, parseFloat(hotkeyRatio.toFixed(3))));

    return {
      matchedHotkeys,
      missingHotkeys,
      detectedRedFlags,
      hotkeyScore,
    };
  }

  /**
   * Main True RAG Layer 2 Evaluation Pipeline (Async with LLM & Vector Store)
   */
  public async evaluateLayer2Async(
    resume: Resume,
    job: Job,
    precomputedLayer1?: Layer1EvaluationResult
  ): Promise<Layer2EvaluationResult> {
    const startTime = Date.now();

    // 1. Run or retrieve Layer 1 baseline stated fit
    const layer1Result = precomputedLayer1 || layer1RagEngine.evaluateLayer1(resume, job);

    // 2. Formulate RAG query from Job Description + Candidate Profile + Target Company
    const ragQuery = this.constructRagQuery(resume, job);

    // 3. Semantic / Hybrid Retrieval from Company Knowledge Vector Store
    const searchResults = companyVectorStore.searchHybrid(ragQuery, {
      company: job.company,
      topK: 6,
    });
    const retrievedEvidence: Layer2RetrievedEvidence[] = companyVectorStore.toRetrievedEvidence(searchResults);

    // 4. Resolve Company Insight (leveraging vector results if needed)
    const companyInsight = this.resolveCompanyInsight(job.company, job.title);

    // 5. Technical & DSA Bar Evaluation
    const dsaEvaluation = this.evaluateDsaBar(companyInsight, resume);

    // 6. Online Assessment (OA) Profiling & Risk
    const oaEvaluation = this.evaluateOaRisk(companyInsight, dsaEvaluation, resume);

    // 7. Unspoken Recruiter Screening Filters
    const filterEvaluation = this.evaluateUnspokenFilters(companyInsight, resume);

    // 8. ATS Resume Hotkeys & Red Flags
    const hotkeyResult = this.evaluateHotkeysAndRedFlags(companyInsight, resume);

    // 9. Deterministic reality reasoning
    const llmReasoning = await layer2LLMReasoningEngine.synthesizeReality(
      resume,
      job,
      retrievedEvidence,
      layer1Result
    );

    // 10. Calculate final Layer 2 score blended with LLM reasoning
    const filterCombined =
      filterEvaluation.targetSchoolAssessment.score * 0.35 +
      filterEvaluation.gpaAssessment.score * 0.35 +
      filterEvaluation.experienceTierAssessment.score * 0.30;

    let layer2Raw =
      dsaEvaluation.technicalAlignmentScore * 0.30 +
      filterCombined * 0.20 +
      hotkeyResult.hotkeyScore * 0.15 +
      oaEvaluation.predictedPassProbability * 0.15 +
      (llmReasoning.company_reality_score / 100) * 0.15 +
      0.05;

    if (hotkeyResult.detectedRedFlags.length > 0) {
      layer2Raw -= hotkeyResult.detectedRedFlags.length * 0.06;
    }

    const finalLayer2Score = Math.min(1.0, Math.max(0.10, parseFloat(layer2Raw.toFixed(4))));
    const layer2Percentage = parseFloat((finalLayer2Score * 100).toFixed(1));

    // 11. Compute Alignment Delta
    const alignmentDelta = parseFloat((finalLayer2Score - layer1Result.layer1Score).toFixed(4));
    const alignmentDeltaPercentage = parseFloat((alignmentDelta * 100).toFixed(1));

    // 12. Composite Overall Score (40% Layer 1 + 60% Layer 2)
    const compositeRaw = (layer1Result.layer1Score * 0.40) + (finalLayer2Score * 0.60);
    const finalCompositeScore = Math.min(1.0, Math.max(0.10, parseFloat(compositeRaw.toFixed(4))));
    const compositePercentage = parseFloat((finalCompositeScore * 100).toFixed(1));

    // 13. Warnings & Positive Signals
    const specificWarnings = this.buildWarnings(companyInsight, dsaEvaluation, oaEvaluation, filterEvaluation, hotkeyResult, llmReasoning);
    const positiveSignals = this.buildPositiveSignals(companyInsight, dsaEvaluation, filterEvaluation, hotkeyResult);

    const cultureTraits = companyInsight.cultureTraits.map((t) => {
      const resumeText = (resume.content || '').toLowerCase();
      const hasKeywords = t.trait.toLowerCase().split(' ').some((kw) => resumeText.includes(kw));
      return {
        trait: t.trait,
        description: t.description,
        importance: t.importance,
        candidateMatchLevel: hasKeywords ? ('Strong' as const) : ('Moderate' as const),
      };
    });

    // 14. Human-Readable Reality Check Summary & Action Plan
    const deltaSign = alignmentDelta >= 0 ? '+' : '';
    let summary = llmReasoning.reasoning_synthesis;
    if (!summary) {
      if (alignmentDelta < -0.15) {
        summary = `Reality Downgrade (${deltaSign}${alignmentDeltaPercentage}%): While candidate scores ${layer1Result.layer1Percentage}% on stated JD keywords, ${companyInsight.companyName}'s informal ${companyInsight.dsaBar.difficulty} bar and ${companyInsight.oaType.platform} threshold (${oaEvaluation.cutoffDescription}) creates significant interview friction.`;
      } else if (alignmentDelta > 0.10) {
        summary = `Reality Boost (${deltaSign}${alignmentDeltaPercentage}%): Candidate's strong technical depth (${dsaEvaluation.candidateCoveredTopics.join(', ')}) and target school pedigree gives them an informal advantage over generic applicants.`;
      } else {
        summary = `Balanced Alignment (${deltaSign}${alignmentDeltaPercentage}%): Candidate's background closely matches both the stated requirements and the informal hiring bar for ${companyInsight.companyName}.`;
      }
    }

    const actionPlan = llmReasoning.recommendations.length > 0
      ? llmReasoning.recommendations
      : [
          `1. Review OA preparation guide: ${oaEvaluation.preparationGuide}`,
          `2. Target high-signal resume hotkeys: Add missing items [${hotkeyResult.missingHotkeys.slice(0, 3).join(', ')}] where applicable.`,
          `3. Practice ${companyInsight.dsaBar.focusAreas} prior to technical screens.`,
        ];

    const semanticAlignmentScore = searchResults.length > 0 ? searchResults[0].similarityScore : 0.85;

    return {
      jobId: job.id,
      resumeId: resume.id,
      jobTitle: job.title,
      company: job.company,
      companyInsightId: companyInsight.id,
      companyTier: companyInsight.tier,
      industry: companyInsight.industry,
      layer1Score: layer1Result.layer1Score,
      layer1Percentage: layer1Result.layer1Percentage,
      layer2Score: finalLayer2Score,
      layer2Percentage,
      alignmentDelta,
      alignmentDeltaPercentage,
      compositeScore: finalCompositeScore,
      compositePercentage,
      ragQuery,
      retrievedEvidence,
      llmReasoning,
      semanticAlignmentScore,
      dsaEvaluation,
      oaEvaluation,
      filterEvaluation,
      matchedHotkeys: hotkeyResult.matchedHotkeys,
      missingHotkeys: hotkeyResult.missingHotkeys,
      detectedRedFlags: hotkeyResult.detectedRedFlags,
      specificWarnings,
      positiveSignals,
      cultureTraits,
      realityCheckSummary: summary,
      actionPlan,
      compensationContext: {
        verifiedHourlyRate: companyInsight.compensationRange.hourlyRateUsd,
        housingStipendMonthly: companyInsight.compensationRange.housingStipendMonthlyUsd,
        relocationBonus: companyInsight.compensationRange.relocationBonusUsd,
      },
      applicationTimeline: {
        typicalOpenDate: companyInsight.applicationTimeline.typicalOpenDate,
        typicalCloseDate: companyInsight.applicationTimeline.typicalCloseDate,
        urgencyRating: companyInsight.applicationTimeline.urgencyRating,
        recruiterVelocity: companyInsight.applicationTimeline.recruiterVelocity,
      },
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Synchronous Layer 2 Evaluation Pipeline (Fast deterministic hybrid vector retrieval + heuristic synthesis)
   */
  public evaluateLayer2(
    resume: Resume,
    job: Job,
    precomputedLayer1?: Layer1EvaluationResult
  ): Layer2EvaluationResult {
    const startTime = Date.now();

    const layer1Result = precomputedLayer1 || layer1RagEngine.evaluateLayer1(resume, job);
    const ragQuery = this.constructRagQuery(resume, job);

    const searchResults = companyVectorStore.searchHybrid(ragQuery, {
      company: job.company,
      topK: 5,
    });
    const retrievedEvidence: Layer2RetrievedEvidence[] = companyVectorStore.toRetrievedEvidence(searchResults);

    const companyInsight = this.resolveCompanyInsight(job.company, job.title);
    const dsaEvaluation = this.evaluateDsaBar(companyInsight, resume);
    const oaEvaluation = this.evaluateOaRisk(companyInsight, dsaEvaluation, resume);
    const filterEvaluation = this.evaluateUnspokenFilters(companyInsight, resume);
    const hotkeyResult = this.evaluateHotkeysAndRedFlags(companyInsight, resume);

    const llmReasoning = layer2LLMReasoningEngine.deterministicReasoningFallback(
      resume,
      job,
      retrievedEvidence,
      layer1Result
    );

    const filterCombined =
      filterEvaluation.targetSchoolAssessment.score * 0.35 +
      filterEvaluation.gpaAssessment.score * 0.35 +
      filterEvaluation.experienceTierAssessment.score * 0.30;

    let layer2Raw =
      dsaEvaluation.technicalAlignmentScore * 0.35 +
      filterCombined * 0.25 +
      hotkeyResult.hotkeyScore * 0.20 +
      oaEvaluation.predictedPassProbability * 0.15 +
      0.05;

    if (hotkeyResult.detectedRedFlags.length > 0) {
      layer2Raw -= hotkeyResult.detectedRedFlags.length * 0.06;
    }

    const finalLayer2Score = Math.min(1.0, Math.max(0.10, parseFloat(layer2Raw.toFixed(4))));
    const layer2Percentage = parseFloat((finalLayer2Score * 100).toFixed(1));

    const alignmentDelta = parseFloat((finalLayer2Score - layer1Result.layer1Score).toFixed(4));
    const alignmentDeltaPercentage = parseFloat((alignmentDelta * 100).toFixed(1));

    const compositeRaw = (layer1Result.layer1Score * 0.40) + (finalLayer2Score * 0.60);
    const finalCompositeScore = Math.min(1.0, Math.max(0.10, parseFloat(compositeRaw.toFixed(4))));
    const compositePercentage = parseFloat((finalCompositeScore * 100).toFixed(1));

    const specificWarnings = this.buildWarnings(companyInsight, dsaEvaluation, oaEvaluation, filterEvaluation, hotkeyResult, llmReasoning);
    const positiveSignals = this.buildPositiveSignals(companyInsight, dsaEvaluation, filterEvaluation, hotkeyResult);

    const cultureTraits = companyInsight.cultureTraits.map((t) => {
      const resumeText = (resume.content || '').toLowerCase();
      const hasKeywords = t.trait.toLowerCase().split(' ').some((kw) => resumeText.includes(kw));
      return {
        trait: t.trait,
        description: t.description,
        importance: t.importance,
        candidateMatchLevel: hasKeywords ? ('Strong' as const) : ('Moderate' as const),
      };
    });

    const deltaSign = alignmentDelta >= 0 ? '+' : '';
    let summary = '';
    if (alignmentDelta < -0.15) {
      summary = `Reality Downgrade (${deltaSign}${alignmentDeltaPercentage}%): While candidate scores ${layer1Result.layer1Percentage}% on stated JD keywords, ${companyInsight.companyName}'s informal ${companyInsight.dsaBar.difficulty} bar and ${companyInsight.oaType.platform} threshold (${oaEvaluation.cutoffDescription}) creates significant interview friction.`;
    } else if (alignmentDelta > 0.10) {
      summary = `Reality Boost (${deltaSign}${alignmentDeltaPercentage}%): Candidate's strong technical depth (${dsaEvaluation.candidateCoveredTopics.join(', ')}) and target school pedigree gives them an informal advantage over generic applicants.`;
    } else {
      summary = `Balanced Alignment (${deltaSign}${alignmentDeltaPercentage}%): Candidate's background closely matches both the stated requirements and the informal hiring bar for ${companyInsight.companyName}.`;
    }

    const actionPlan: string[] = [
      `1. Review OA preparation guide: ${oaEvaluation.preparationGuide}`,
      `2. Target high-signal resume hotkeys: Add missing items [${hotkeyResult.missingHotkeys.slice(0, 3).join(', ')}] where applicable.`,
      `3. Practice ${companyInsight.dsaBar.focusAreas} prior to technical screens.`,
    ];

    const semanticAlignmentScore = searchResults.length > 0 ? searchResults[0].similarityScore : 0.85;

    return {
      jobId: job.id,
      resumeId: resume.id,
      jobTitle: job.title,
      company: job.company,
      companyInsightId: companyInsight.id,
      companyTier: companyInsight.tier,
      industry: companyInsight.industry,
      layer1Score: layer1Result.layer1Score,
      layer1Percentage: layer1Result.layer1Percentage,
      layer2Score: finalLayer2Score,
      layer2Percentage,
      alignmentDelta,
      alignmentDeltaPercentage,
      compositeScore: finalCompositeScore,
      compositePercentage,
      ragQuery,
      retrievedEvidence,
      llmReasoning,
      semanticAlignmentScore,
      dsaEvaluation,
      oaEvaluation,
      filterEvaluation,
      matchedHotkeys: hotkeyResult.matchedHotkeys,
      missingHotkeys: hotkeyResult.missingHotkeys,
      detectedRedFlags: hotkeyResult.detectedRedFlags,
      specificWarnings,
      positiveSignals,
      cultureTraits,
      realityCheckSummary: summary,
      actionPlan,
      compensationContext: {
        verifiedHourlyRate: companyInsight.compensationRange.hourlyRateUsd,
        housingStipendMonthly: companyInsight.compensationRange.housingStipendMonthlyUsd,
        relocationBonus: companyInsight.compensationRange.relocationBonusUsd,
      },
      applicationTimeline: {
        typicalOpenDate: companyInsight.applicationTimeline.typicalOpenDate,
        typicalCloseDate: companyInsight.applicationTimeline.typicalCloseDate,
        urgencyRating: companyInsight.applicationTimeline.urgencyRating,
        recruiterVelocity: companyInsight.applicationTimeline.recruiterVelocity,
      },
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
    };
  }

  private buildWarnings(
    companyInsight: CompanyInsight,
    dsaEvaluation: Layer2DsaEvaluation,
    oaEvaluation: Layer2OaEvaluation,
    filterEvaluation: Layer2FilterEvaluation,
    hotkeyResult: { detectedRedFlags: string[] },
    llmReasoning?: Layer2LLMReasoningSummary
  ): Layer2Warning[] {
    const specificWarnings: Layer2Warning[] = [];

    if (companyInsight.dsaBar.difficulty === 'Hard' || companyInsight.dsaBar.difficulty === 'Extreme') {
      if (dsaEvaluation.technicalAlignmentScore < 0.70) {
        specificWarnings.push({
          id: `warn-dsa-${Date.now()}-1`,
          category: 'OA_DIFFICULTY',
          severity: 'critical',
          title: `High likelihood of hard ${companyInsight.dsaBar.primaryTopics[0]} OA`,
          message: `${companyInsight.companyName} enforces a strict ${companyInsight.dsaBar.difficulty} DSA threshold. Candidates lacking low-level algorithms or dynamic programming depth face high OA attrition.`,
          recommendation: `Grind 20+ ${companyInsight.dsaBar.primaryTopics.join(', ')} LeetCode Medium/Hard problems before attempting OA.`,
        });
      }
    }

    if (oaEvaluation.webcamRequired || oaEvaluation.screenRecording) {
      specificWarnings.push({
        id: `warn-proc-${Date.now()}-2`,
        category: 'PROCTORING_RISK',
        severity: 'warning',
        title: `Strict Proctoring Enforced (${oaEvaluation.platform})`,
        message: `${oaEvaluation.cutoffDescription}. Assessment enforces active ${oaEvaluation.webcamRequired ? 'webcam' : ''}${oaEvaluation.screenRecording ? ' & screen capture' : ''} with copy-paste locks.`,
        recommendation: `Complete assessment in a quiet room on a single-monitor setup with stable fiber internet.`,
      });
    }

    if (!filterEvaluation.gpaAssessment.meetsCutoff) {
      specificWarnings.push({
        id: `warn-gpa-${Date.now()}-3`,
        category: 'GPA_CUTOFF',
        severity: companyInsight.tier === 'Tier 1 Quant/HFT' || companyInsight.tier === 'Top Finance / Wall St' ? 'critical' : 'warning',
        title: `Unspoken GPA Screening Barrier (${companyInsight.unspokenFilters.minimumGpa})`,
        message: `Candidate GPA (${filterEvaluation.gpaAssessment.candidateGpa}) falls below ${companyInsight.companyName}'s typical transcript cutoff.`,
        recommendation: `Highlight Putnam/ICPC competition awards or open-source GitHub contributions to offset transcript filter.`,
      });
    }

    for (const flag of hotkeyResult.detectedRedFlags) {
      specificWarnings.push({
        id: `warn-flag-${Date.now()}-4`,
        category: 'RED_FLAG',
        severity: 'warning',
        title: `ATS Resume Vulnerability Detected`,
        message: `Resume exhibits pattern flagged by recruiters: "${flag}".`,
        recommendation: `Refactor resume bullets to emphasize quantifiable production metrics and deep systems architecture.`,
      });
    }

    if (companyInsight.applicationTimeline.urgencyRating === 'CRITICAL_ROLLING') {
      specificWarnings.push({
        id: `warn-velo-${Date.now()}-5`,
        category: 'RECRUITING_VELOCITY',
        severity: 'info',
        title: `Critical Rolling Basis — Fast Application Recommended`,
        message: `${companyInsight.companyName} fills interview slots on a rolling wave. Typical open window: ${companyInsight.applicationTimeline.typicalOpenDate}.`,
        recommendation: `Submit application immediately; OA invitations are triggered automatically within 48-72 hours.`,
      });
    }

    return specificWarnings;
  }

  private buildPositiveSignals(
    companyInsight: CompanyInsight,
    dsaEvaluation: Layer2DsaEvaluation,
    filterEvaluation: Layer2FilterEvaluation,
    hotkeyResult: { matchedHotkeys: string[] }
  ): Layer2PositiveSignal[] {
    const positiveSignals: Layer2PositiveSignal[] = [];

    if (filterEvaluation.targetSchoolAssessment.matched) {
      positiveSignals.push({
        category: 'SCHOOL_MATCH',
        title: `Target University Representation (${filterEvaluation.targetSchoolAssessment.candidateSchool})`,
        description: `Candidate's university matches ${companyInsight.companyName}'s primary campus recruiting pipelines.`,
      });
    }

    if (dsaEvaluation.technicalAlignmentScore >= 0.85) {
      positiveSignals.push({
        category: 'TECH_DEPTH',
        title: `Deep Algorithmic & Systems Foundation`,
        description: `Candidate resume exhibits verified coverage across ${dsaEvaluation.candidateCoveredTopics.join(', ')}.`,
      });
    }

    if (hotkeyResult.matchedHotkeys.length >= 3) {
      positiveSignals.push({
        category: 'HOTKEY_MATCH',
        title: `High-Signal Keywords Matched (${hotkeyResult.matchedHotkeys.slice(0, 4).join(', ')})`,
        description: `Resume aligns with internal engineering stack and recruiter search queries.`,
      });
    }

    return positiveSignals;
  }
}

export const layer2RagEngine = new Layer2RagEngine();
