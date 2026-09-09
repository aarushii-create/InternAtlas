/**
 * AI Internship Scout - Phase 6: Layer 1 RAG Engine (Stated Requirement Matching)
 * 
 * Compares what the user's resume offers vs. what the job description directly asks for:
 * 1. Embeds incoming clean JD text into 768-dim dense vector.
 * 2. Hybrid search: Combines dense vector cosine similarity with lexical keyword & synonym matching.
 * 3. Extracts structured breakdown: matched required skills vs. missing required skills.
 * 4. Outputs raw Layer 1 baseline vector match score (0.0 to 1.0) with explainable heuristics.
 */

import { Job, Resume, Layer1EvaluationResult, Layer1SkillMatch, ParsedResumeData } from '../../types';
import { generateDeterministicEmbedding, calculateCosineSimilarity } from '../../db/database';

export interface HybridWeights {
  vectorWeight: number;        // Default: 0.45
  requiredSkillWeight: number; // Default: 0.40
  preferredSkillWeight: number;// Default: 0.10
  educationExpWeight: number;  // Default: 0.05
}

export const DEFAULT_HYBRID_WEIGHTS: HybridWeights = {
  vectorWeight: 0.45,
  requiredSkillWeight: 0.40,
  preferredSkillWeight: 0.10,
  educationExpWeight: 0.05,
};

// Common tech synonyms & alias mapping for high-recall skill matching
const SKILL_SYNONYMS: Record<string, string[]> = {
  'react': ['reactjs', 'react.js', 'react native'],
  'react.js': ['react', 'reactjs'],
  'vue': ['vuejs', 'vue.js'],
  'angular': ['angularjs', 'angular.io'],
  'node': ['nodejs', 'node.js'],
  'node.js': ['node', 'nodejs', 'express.js', 'express'],
  'go': ['golang'],
  'golang': ['go'],
  'c++': ['cpp', 'c/c++', 'modern c++'],
  'cpp': ['c++', 'c/c++'],
  'c#': ['csharp', '.net', 'dotnet'],
  'python': ['python3', 'py', 'django', 'flask', 'fastapi'],
  'java': ['jvm', 'spring', 'spring boot', 'core java'],
  'typescript': ['ts'],
  'javascript': ['js', 'ecmascript'],
  'sql': ['rdbms', 'relational database', 'postgres', 'postgresql', 'mysql', 'sqlite'],
  'postgresql': ['postgres', 'psql', 'pg'],
  'postgres': ['postgresql', 'psql'],
  'redis': ['in-memory cache', 'key-value store'],
  'kafka': ['apache kafka', 'message queue', 'event streaming', 'pub/sub', 'rabbitmq'],
  'docker': ['containerization', 'containers', 'docker compose'],
  'kubernetes': ['k8s', 'container orchestration'],
  'k8s': ['kubernetes'],
  'aws': ['amazon web services', 'ec2', 's3', 'lambda', 'cloud computing'],
  'azure': ['microsoft azure', 'azure devops'],
  'gcp': ['google cloud', 'google cloud platform', 'bigquery'],
  'machine learning': ['ml', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn', 'ai'],
  'ml': ['machine learning', 'deep learning', 'pytorch', 'tensorflow'],
  'pytorch': ['torch', 'deep learning', 'neural networks'],
  'tensorflow': ['tf', 'keras'],
  'graphql': ['gql', 'apollo'],
  'distributed systems': ['concurrency', 'high throughput', 'microservices', 'distributed computing', 'sharding', 'replication'],
  'algorithms': ['data structures', 'dsa', 'algorithm design', 'leetcode', 'problem solving'],
  'system design': ['architecture', 'scalability', 'distributed architecture', 'api design'],
  'api design': ['rest', 'restful api', 'rest api', 'grpc', 'openapi'],
  'ci/cd': ['github actions', 'jenkins', 'gitlab ci', 'continuous integration', 'continuous deployment'],
  'git': ['version control', 'github', 'gitlab'],
  'linux': ['unix', 'bash', 'shell scripting'],
};

// Skill categorization lookup
const SKILL_CATEGORIES: Record<string, Layer1SkillMatch['category']> = {
  'python': 'core_language',
  'c++': 'core_language',
  'cpp': 'core_language',
  'c#': 'core_language',
  'java': 'core_language',
  'go': 'core_language',
  'golang': 'core_language',
  'typescript': 'core_language',
  'javascript': 'core_language',
  'rust': 'core_language',
  'scala': 'core_language',
  'ruby': 'core_language',
  'swift': 'core_language',
  'kotlin': 'core_language',

  'react': 'framework',
  'react.js': 'framework',
  'node': 'framework',
  'node.js': 'framework',
  'django': 'framework',
  'flask': 'framework',
  'fastapi': 'framework',
  'spring': 'framework',
  'spring boot': 'framework',
  'express': 'framework',

  'distributed systems': 'distributed_systems',
  'concurrency': 'distributed_systems',
  'microservices': 'distributed_systems',
  'api design': 'distributed_systems',
  'grpc': 'distributed_systems',
  'idempotency': 'distributed_systems',

  'sql': 'database',
  'postgresql': 'database',
  'postgres': 'database',
  'mysql': 'database',
  'redis': 'database',
  'mongodb': 'database',
  'dynamodb': 'database',
  'cassandra': 'database',

  'machine learning': 'ai_ml',
  'ml': 'ai_ml',
  'deep learning': 'ai_ml',
  'pytorch': 'ai_ml',
  'tensorflow': 'ai_ml',
  'llm': 'ai_ml',
  'nlp': 'ai_ml',

  'docker': 'tools_devops',
  'kubernetes': 'tools_devops',
  'k8s': 'tools_devops',
  'aws': 'tools_devops',
  'azure': 'tools_devops',
  'gcp': 'tools_devops',
  'ci/cd': 'tools_devops',
  'git': 'tools_devops',
  'linux': 'tools_devops',
};

export class Layer1RagEngine {
  /**
   * Generates a 768-dimensional dense vector embedding from cleaned JD text
   */
  public embedJobText(job: Pick<Job, 'title' | 'company' | 'description' | 'statedRequirements'>): number[] {
    const skills = (job.statedRequirements?.requiredSkills || []).join(' ');
    const preferred = (job.statedRequirements?.preferredSkills || []).join(' ');
    const cleanText = `${job.company} ${job.title} ${job.description} ${skills} ${preferred}`;
    return generateDeterministicEmbedding(cleanText);
  }

  /**
   * Generates a 768-dimensional dense vector embedding from parsed resume text & structured entities
   */
  public embedResumeText(resume: Resume): number[] {
    const parsed = resume.parsedData;
    const skills = (parsed?.skills || resume.extractedSkills || []).join(' ');
    const projects = (parsed?.projects || []).map((p) => `${p.title} ${p.technologies?.join(' ')} ${p.description}`).join(' ');
    const work = (parsed?.experience || resume.parsedExperience || []).map((w) => `${w.company} ${w.role || ''} ${w.technologies?.join(' ')}`).join(' ');
    const text = `${resume.title || ''} ${skills} ${projects} ${work} ${(resume.content || '').slice(0, 1500)}`;
    return generateDeterministicEmbedding(text);
  }

  /**
   * Performs fuzzy / synonym-aware check to see if a candidate resume possesses a target skill
   */
  public matchSkillAgainstResume(
    targetSkill: string,
    resumeSkillsLower: Set<string>,
    resumeFullTextLower: string
  ): { matched: boolean; matchedToken?: string; confidence: number } {
    const rawTarget = targetSkill.toLowerCase().trim();
    if (!rawTarget) return { matched: false, confidence: 0 };

    // 1. Direct match in candidate's structured skill array
    if (resumeSkillsLower.has(rawTarget)) {
      return { matched: true, matchedToken: rawTarget, confidence: 1.0 };
    }

    // 2. Direct exact whole-word regex match in resume full text
    const escaped = rawTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundaryRegex = new RegExp(`(?:^|[^a-zA-Z0-9#+.-])${escaped}(?:$|[^a-zA-Z0-9#+.-])`, 'i');
    if (wordBoundaryRegex.test(resumeFullTextLower)) {
      return { matched: true, matchedToken: rawTarget, confidence: 0.95 };
    }

    // 3. Synonym / Alias lookup
    const synonyms = SKILL_SYNONYMS[rawTarget] || [];
    for (const syn of synonyms) {
      if (resumeSkillsLower.has(syn)) {
        return { matched: true, matchedToken: `${syn} (alias for ${rawTarget})`, confidence: 0.90 };
      }
      const synEscaped = syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const synRegex = new RegExp(`(?:^|[^a-zA-Z0-9#+.-])${synEscaped}(?:$|[^a-zA-Z0-9#+.-])`, 'i');
      if (synRegex.test(resumeFullTextLower)) {
        return { matched: true, matchedToken: `${syn} (alias for ${rawTarget})`, confidence: 0.85 };
      }
    }

    // 4. Special cases (e.g. C++ vs Cpp, Node vs Node.js)
    if (rawTarget.includes('c++') && (resumeFullTextLower.includes('c++') || resumeFullTextLower.includes('cpp'))) {
      return { matched: true, matchedToken: 'c++/cpp', confidence: 0.95 };
    }
    if (rawTarget.includes('node') && (resumeFullTextLower.includes('node.js') || resumeFullTextLower.includes('nodejs'))) {
      return { matched: true, matchedToken: 'node.js', confidence: 0.95 };
    }

    return { matched: false, confidence: 0 };
  }

  /**
   * Evaluates Education Match (BS/MS in progress vs JD requirements)
   */
  public evaluateEducation(
    requiredEducation: string = "Bachelor's in Computer Science",
    candidateEducationList: ParsedResumeData['education'] = []
  ): { meetsRequirement: boolean; score: number; candidateSummary: string } {
    if (!requiredEducation || requiredEducation === 'N/A') {
      return { meetsRequirement: true, score: 1.0, candidateSummary: 'No strict requirement specified' };
    }

    const reqLower = requiredEducation.toLowerCase();
    const candidateSummary = candidateEducationList && candidateEducationList.length > 0
      ? candidateEducationList.map((e) => `${e.degree} (${e.institution})`).join(', ')
      : 'Undergraduate Computer Science';

    const candidateText = candidateSummary.toLowerCase();

    // Check if degree aligns (CS, EE, EECS, Software Engineering, STEM)
    const isCsStem = candidateText.includes('computer science') ||
      candidateText.includes('eecs') ||
      candidateText.includes('electrical') ||
      candidateText.includes('software') ||
      candidateText.includes('data science') ||
      candidateText.includes('mathematics') ||
      candidateText.includes('bachelor') ||
      candidateText.includes('bs') ||
      candidateText.includes('stem');

    if (isCsStem) {
      if (reqLower.includes('phd') && !candidateText.includes('phd')) {
        return { meetsRequirement: false, score: 0.6, candidateSummary };
      }
      if (reqLower.includes('master') && (!candidateText.includes('master') && !candidateText.includes('ms'))) {
        return { meetsRequirement: true, score: 0.85, candidateSummary };
      }
      return { meetsRequirement: true, score: 1.0, candidateSummary };
    }

    return { meetsRequirement: false, score: 0.5, candidateSummary };
  }

  /**
   * Evaluates Experience Level (Years of experience vs. Internship / New Grad expectations)
   */
  public evaluateExperience(
    requiredYears: number = 0,
    candidateExp: ParsedResumeData['experience'] = []
  ): { meetsRequirement: boolean; score: number; candidateYears: number } {
    // For student internships, baseline expectation is 0-1 years
    const candidateYears = Math.min((candidateExp?.length || 0) * 0.5, 3.0);

    if (candidateYears >= requiredYears) {
      return { meetsRequirement: true, score: 1.0, candidateYears };
    }

    const deficit = requiredYears - candidateYears;
    const score = Math.max(0.4, 1.0 - deficit * 0.25);
    return { meetsRequirement: deficit <= 1.0, score, candidateYears };
  }

  /**
   * Main Layer 1 Evaluation Pipeline:
   * Compares candidate resume with clean job description via Dense Vector Cosine Similarity + Lexical Keyword Matching.
   */
  public evaluateLayer1(
    resume: Resume,
    job: Job,
    customWeights: Partial<HybridWeights> = {}
  ): Layer1EvaluationResult {
    const startTime = Date.now();
    const weights: HybridWeights = { ...DEFAULT_HYBRID_WEIGHTS, ...customWeights };

    // 1. Vector Cosine Similarity
    const resumeVec = resume.embedding || this.embedResumeText(resume);
    const jobVec = job.vectorEmbedding || this.embedJobText(job);
    const rawCosine = calculateCosineSimilarity(resumeVec, jobVec);
    // Normalize cosine similarity to 0.0 - 1.0 range (dense embeddings typically range 0.40 - 0.95)
    const normalizedVectorSim = Math.min(1.0, Math.max(0.0, parseFloat(rawCosine.toFixed(4))));

    // 2. Lexical & Synonym Skill Matching
    const resumeSkillsLower = new Set(
      (resume.parsedData?.skills || resume.extractedSkills || []).map((s) => s.toLowerCase().trim())
    );
    const resumeFullTextLower = `${resume.content || ''} ${(resume.extractedSkills || []).join(' ')} ${(resume.parsedData?.projects || []).map((p) => p.title + ' ' + (p.technologies || []).join(' ')).join(' ')}`.toLowerCase();

    const requiredSkills = job.statedRequirements?.requiredSkills || [];
    const preferredSkills = job.statedRequirements?.preferredSkills || [];

    const matchedRequired: string[] = [];
    const missingRequired: string[] = [];
    const matchedPreferred: string[] = [];
    const missingPreferred: string[] = [];
    const skillBreakdown: Layer1SkillMatch[] = [];

    // Evaluate Required Skills
    for (const skill of requiredSkills) {
      const match = this.matchSkillAgainstResume(skill, resumeSkillsLower, resumeFullTextLower);
      const cat = SKILL_CATEGORIES[skill.toLowerCase().trim()] || 'general_cs';

      skillBreakdown.push({
        skill,
        category: cat,
        matched: match.matched,
        matchedTokenInResume: match.matchedToken,
        confidence: match.confidence,
        isRequired: true,
      });

      if (match.matched) {
        matchedRequired.push(skill);
      } else {
        missingRequired.push(skill);
      }
    }

    // Evaluate Preferred Skills
    for (const skill of preferredSkills) {
      const match = this.matchSkillAgainstResume(skill, resumeSkillsLower, resumeFullTextLower);
      const cat = SKILL_CATEGORIES[skill.toLowerCase().trim()] || 'general_cs';

      skillBreakdown.push({
        skill,
        category: cat,
        matched: match.matched,
        matchedTokenInResume: match.matchedToken,
        confidence: match.confidence,
        isRequired: false,
      });

      if (match.matched) {
        matchedPreferred.push(skill);
      } else {
        missingPreferred.push(skill);
      }
    }

    const requiredRatio = requiredSkills.length > 0
      ? matchedRequired.length / requiredSkills.length
      : 1.0;

    const preferredRatio = preferredSkills.length > 0
      ? matchedPreferred.length / preferredSkills.length
      : 1.0;

    // 3. Education & Experience Checks
    const eduEval = this.evaluateEducation(
      job.statedRequirements?.education,
      resume.parsedData?.education
    );

    const expEval = this.evaluateExperience(
      job.statedRequirements?.experienceYears || 0,
      resume.parsedData?.experience
    );

    const educationExpCombined = (eduEval.score * 0.5) + (expEval.score * 0.5);

    // 4. Composite Layer 1 Match Score (0.0 to 1.0)
    // Formula: (Vector Sim * 0.45) + (Required Skills * 0.40) + (Preferred Skills * 0.10) + (Edu/Exp * 0.05)
    const compositeRaw =
      (normalizedVectorSim * weights.vectorWeight) +
      (requiredRatio * weights.requiredSkillWeight) +
      (preferredRatio * weights.preferredSkillWeight) +
      (educationExpCombined * weights.educationExpWeight);

    const finalLayer1Score = Math.min(1.0, Math.max(0.0, parseFloat(compositeRaw.toFixed(4))));
    const layer1Percentage = parseFloat((finalLayer1Score * 100).toFixed(1));

    // 5. Generate Human-Readable Summary
    let summary = '';
    if (requiredRatio >= 0.8 && normalizedVectorSim >= 0.75) {
      summary = `Strong Layer 1 Stated Fit (${layer1Percentage}%): Matched ${matchedRequired.length}/${requiredSkills.length} required skills (${matchedRequired.join(', ')}). Semantic relevance: ${(normalizedVectorSim * 100).toFixed(1)}%.`;
    } else if (requiredRatio >= 0.5) {
      summary = `Moderate Layer 1 Fit (${layer1Percentage}%): Possesses core stack (${matchedRequired.join(', ')}), but lacks ${missingRequired.length} requirements (${missingRequired.join(', ')}).`;
    } else {
      summary = `Low Layer 1 Stated Fit (${layer1Percentage}%): Missing ${missingRequired.length}/${requiredSkills.length} core requirements (${missingRequired.join(', ')}).`;
    }

    if (missingPreferred.length > 0 && preferredSkills.length > 0) {
      summary += ` Missing preferred additions: ${missingPreferred.join(', ')}.`;
    }

    return {
      jobId: job.id,
      resumeId: resume.id,
      jobTitle: job.title,
      company: job.company,
      vectorSimilarity: normalizedVectorSim,
      matchedRequiredSkills: matchedRequired,
      missingRequiredSkills: missingRequired,
      matchedPreferredSkills: matchedPreferred,
      missingPreferredSkills: missingPreferred,
      requiredSkillsRatio: parseFloat(requiredRatio.toFixed(3)),
      preferredSkillsRatio: parseFloat(preferredRatio.toFixed(3)),
      skillBreakdown,
      educationFit: {
        requiredEducation: job.statedRequirements?.education || "Bachelor's in CS",
        candidateEducation: eduEval.candidateSummary,
        meetsRequirement: eduEval.meetsRequirement,
        score: parseFloat(eduEval.score.toFixed(2)),
      },
      experienceFit: {
        requiredYears: job.statedRequirements?.experienceYears || 0,
        candidateYears: expEval.candidateYears,
        meetsRequirement: expEval.meetsRequirement,
        score: parseFloat(expEval.score.toFixed(2)),
      },
      layer1Score: finalLayer1Score,
      layer1Percentage,
      weights,
      evaluationSummary: summary,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
    };
  }
}

export const layer1RagEngine = new Layer1RagEngine();
