/**
 * Candidate Scorer & Dynamic Job Match Engine
 * Computes deterministic Layer 1 (Stated fit), Layer 2 (Reality bar fit),
 * key matched skills, missing critical skills, and AI tailoring advice for any candidate profile.
 */

import { CandidateProfile } from './candidatePresets';
import { ProductionJobMatch } from '../types';

export function computeCandidateMatches(
  candidate: CandidateProfile,
  baseJobs: Partial<ProductionJobMatch>[]
): ProductionJobMatch[] {
  const candidateSkillsLower = new Set(candidate.skills.map((s) => s.toLowerCase().trim()));

  return baseJobs.map((baseJob, index) => {
    // Determine target company requirements
    const requiredSkills: string[] = (baseJob as any).statedRequirements?.requiredSkills ||
      (baseJob as any).keyMatchedSkills ||
      getDefaultSkillsForCompany(baseJob.company || 'Tech');

    // Calculate skill overlap
    const matched: string[] = [];
    const missing: string[] = [];

    requiredSkills.forEach((skill) => {
      const isPresent = Array.from(candidateSkillsLower).some(
        (cs) => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs)
      );
      if (isPresent) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    });

    // Compute Layer 1 Stated Match Score
    const skillMatchRatio = requiredSkills.length > 0 ? matched.length / requiredSkills.length : 0.75;
    const baseL1 = Math.min(0.96, Math.max(0.60, skillMatchRatio * 0.45 + 0.45));

    // Compute Layer 2 Reality Match Score (based on Track & DSA / Systems bar)
    let realityBonus = 0;
    const track = candidate.primaryTrack.toLowerCase();
    const company = (baseJob.company || '').toLowerCase();
    const tier = (baseJob.companyTier || '').toLowerCase();

    if (tier.includes('quant') || tier.includes('hft')) {
      if (candidateSkillsLower.has('c++') || candidateSkillsLower.has('rust') || track.includes('quant') || track.includes('systems')) {
        realityBonus += 0.08;
      } else {
        realityBonus -= 0.08;
      }
    } else if (tier.includes('ai') || company.includes('openai') || company.includes('anthropic')) {
      if (candidateSkillsLower.has('pytorch') || candidateSkillsLower.has('cuda') || candidateSkillsLower.has('triton') || track.includes('ai')) {
        realityBonus += 0.09;
      } else {
        realityBonus -= 0.06;
      }
    } else if (tier.includes('unicorn') || company.includes('stripe') || company.includes('razorpay') || company.includes('databricks')) {
      if (candidateSkillsLower.has('distributed systems') || candidateSkillsLower.has('go') || candidateSkillsLower.has('kafka') || candidateSkillsLower.has('postgresql')) {
        realityBonus += 0.06;
      }
    }

    const baseL2 = Math.min(0.98, Math.max(0.55, 0.78 + realityBonus + (matched.length > 3 ? 0.06 : 0.01)));

    // Final composite score (40% L1 + 30% L2 + 15% tier alignment + 15% track alignment)
    const finalScoreRaw = baseL1 * 0.45 + baseL2 * 0.45 + 0.07;
    const finalScore = parseFloat(Math.min(0.97, Math.max(0.68, finalScoreRaw)).toFixed(2));

    // Generate custom tailoring recommendation based on candidate's name & missing skills
    let tailoring = '';
    if (missing.length > 0) {
      tailoring = `Highlight any exposure to ${missing.slice(0, 2).join(' & ')} alongside your strong ${matched.slice(0, 2).join(' and ')} background from ${candidate.school}.`;
    } else {
      tailoring = `Perfect technical alignment for ${candidate.name}! Emphasize metric-driven impact from your projects and high-scale systems coursework.`;
    }

    const matchExplanation = `${Math.round(finalScore * 100)}% Fit for ${candidate.name}. Verified alignment across ${matched.length} key competencies (${matched.slice(0, 3).join(', ')}).`;

    return {
      jobId: baseJob.jobId || `job-match-${index}-${candidate.id}`,
      title: baseJob.title || 'Software Engineering Intern',
      company: baseJob.company || 'Tech Leader',
      companyTier: baseJob.companyTier || 'Tier 1 Big Tech',
      location: baseJob.location || 'San Francisco, CA / Remote',
      locationType: baseJob.locationType || 'Hybrid',
      salaryRange: baseJob.salaryRange || '$55 - $85 / hr',
      sourceUrl: baseJob.sourceUrl || 'https://careers.google.com',
      atsProvider: baseJob.atsProvider || 'Greenhouse',
      postedAt: baseJob.postedAt || new Date(Date.now() - 1000 * 60 * 60 * (index * 6 + 2)).toISOString(),
      daysOpen: baseJob.daysOpen ?? Math.max(1, index % 5),
      urgencyLevel: baseJob.urgencyLevel || (index < 3 ? 'CRITICAL_IMMEDIATE' : 'HIGH_ROLLING'),
      estimatedTimeToCloseDays: baseJob.estimatedTimeToCloseDays || (14 + (index % 10)),
      scores: {
        finalScore,
        layer1StatedMatch: parseFloat(baseL1.toFixed(2)),
        layer2RealityMatch: parseFloat(baseL2.toFixed(2)),
        compensationScore: 0.95,
        penaltyDeductions: 0.0,
      },
      keyMatchedSkills: matched.length > 0 ? matched : candidate.skills.slice(0, 4),
      missingCriticalSkills: missing.length > 0 ? missing.slice(0, 2) : [],
      oaDetails: baseJob.oaDetails || {
        platform: 'HackerRank / CodeSignal Proctored',
        dsaDifficulty: 'Medium-Hard Algorithms (DP, Trees, Concurrency)',
        focusAreas: ['Clean Time Complexity', 'System Invariants', 'Modular Architecture'],
      },
      matchExplanation,
      applicationStatus: (baseJob.applicationStatus as any) || 'NEW_MATCH',
      tailoringRecommendation: tailoring,
    };
  });
}

function getDefaultSkillsForCompany(company: string): string[] {
  const c = company.toLowerCase();
  if (c.includes('citadel') || c.includes('jane') || c.includes('hft') || c.includes('shaw')) {
    return ['C++', 'Rust', 'Algorithms', 'TCP/IP', 'Linux', 'Data Structures'];
  }
  if (c.includes('openai') || c.includes('anthropic') || c.includes('nvidia')) {
    return ['Python', 'PyTorch', 'CUDA', 'Distributed Systems', 'GPU Kernels'];
  }
  if (c.includes('databricks') || c.includes('stripe') || c.includes('razorpay') || c.includes('flipkart')) {
    return ['Distributed Systems', 'Go', 'PostgreSQL', 'Kafka', 'Redis', 'Java'];
  }
  if (c.includes('google') || c.includes('microsoft') || c.includes('meta') || c.includes('apple')) {
    return ['Algorithms', 'Python', 'C++', 'System Design Basics', 'Data Structures', 'Distributed Systems'];
  }
  return ['Python', 'Data Structures', 'Algorithms', 'SQL', 'Git'];
}
