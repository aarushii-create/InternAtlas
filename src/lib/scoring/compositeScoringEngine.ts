/**
 * AI Internship Scout - Phase 9: Deterministic Composite Match Scoring Engine
 * Combines Layer 1 Vector Score (40%), Layer 2 Context Score (30%),
 * Preferred Company Boost (15%), and Location/Role Filter Match (15%)
 * into an auditable, non-hallucinated score with hard disqualifiers.
 */

import {
  Job,
  Resume,
  UserPreferences,
  CompositeScoringWeights,
  CompositeMatchEvaluationResult,
  HardDisqualificationRecord,
  CompositeVerdict,
  ScoreComponentBreakdown,
  CompanyTier,
} from '../../types';
import { layer1RagEngine } from '../rag/layer1Engine';
import { layer2RagEngine } from '../rag/layer2Engine';

export const DEFAULT_COMPOSITE_WEIGHTS: CompositeScoringWeights = {
  layer1Weight: 0.40, // 40% Layer 1 Vector & Stated JD Fit
  layer2Weight: 0.30, // 30% Layer 2 Company Reality & Informal Bar Fit
  preferredCompanyBoostWeight: 0.15, // 15% Preferred Company Boost
  locationRoleFilterWeight: 0.15, // 15% Location & Role Hard Filter Match
};

export interface ScoringEngineOptions {
  weights?: Partial<CompositeScoringWeights>;
  strictLocationDisqualifier?: boolean; // When true, absolute location mismatch hard-disqualifies to 0%
  strictRoleDisqualifier?: boolean; // When true, non-matching role hard-disqualifies to 0%
  customThreshold?: number; // Overrides user preference threshold if specified
}

export class CompositeScoringEngine {
  private defaultWeights: CompositeScoringWeights;

  constructor(weights: CompositeScoringWeights = DEFAULT_COMPOSITE_WEIGHTS) {
    this.defaultWeights = this.normalizeWeights(weights);
  }

  /**
   * Normalizes weights to guarantee their sum is mathematically equal to 1.0 (100%)
   */
  public normalizeWeights(weights: Partial<CompositeScoringWeights>): CompositeScoringWeights {
    const l1 = Math.max(0, weights.layer1Weight ?? DEFAULT_COMPOSITE_WEIGHTS.layer1Weight);
    const l2 = Math.max(0, weights.layer2Weight ?? DEFAULT_COMPOSITE_WEIGHTS.layer2Weight);
    const comp = Math.max(0, weights.preferredCompanyBoostWeight ?? DEFAULT_COMPOSITE_WEIGHTS.preferredCompanyBoostWeight);
    const loc = Math.max(0, weights.locationRoleFilterWeight ?? DEFAULT_COMPOSITE_WEIGHTS.locationRoleFilterWeight);

    const sum = l1 + l2 + comp + loc;
    if (sum === 0) {
      return { ...DEFAULT_COMPOSITE_WEIGHTS };
    }

    return {
      layer1Weight: parseFloat((l1 / sum).toFixed(4)),
      layer2Weight: parseFloat((l2 / sum).toFixed(4)),
      preferredCompanyBoostWeight: parseFloat((comp / sum).toFixed(4)),
      locationRoleFilterWeight: parseFloat((loc / sum).toFixed(4)),
    };
  }

  /**
   * Evaluates all hard disqualifiers.
   * If any disqualifier is triggered, the candidate receives an immediate 0% score.
   */
  public checkHardDisqualifiers(
    job: Job,
    preferences?: UserPreferences,
    options?: ScoringEngineOptions
  ): HardDisqualificationRecord[] {
    const disqualifications: HardDisqualificationRecord[] = [];

    // 1. Inactive Job Disqualification
    if (job.isActive === false) {
      disqualifications.push({
        type: 'INACTIVE_JOB',
        reason: `Job posting at ${job.company} is marked inactive or closed.`,
        triggeredValue: 'isActive: false',
        requiredValue: 'isActive: true',
      });
    }

    if (!preferences) {
      return disqualifications;
    }

    // 2. Blacklisted Company Hard Disqualification
    if (preferences.blacklistedCompanies && preferences.blacklistedCompanies.length > 0) {
      const companyLower = (job.company || '').toLowerCase().trim();
      const isBlacklisted = preferences.blacklistedCompanies.some((b) => {
        const bLower = (b || '').toLowerCase().trim();
        return bLower && (companyLower.includes(bLower) || bLower.includes(companyLower));
      });

      if (isBlacklisted) {
        disqualifications.push({
          type: 'BLACKLISTED_COMPANY',
          reason: `Company "${job.company}" is on the candidate's explicit blacklist.`,
          triggeredValue: job.company,
          requiredValue: `Excluded from: [${preferences.blacklistedCompanies.join(', ')}]`,
        });
      }
    }

    // 3. Strict Location Mismatch Disqualification
    const targetLocations = (preferences.targetLocations || []).filter(Boolean);
    if (options?.strictLocationDisqualifier && targetLocations.length > 0 && !job.isRemote) {
      const jobLocLower = (job.location || '').toLowerCase();
      const isLocMatched = targetLocations.some((loc) => {
        const targetLocLower = loc.toLowerCase().trim();
        return (
          jobLocLower.includes(targetLocLower) ||
          targetLocLower.includes(jobLocLower) ||
          this.isLocationCityStateMatch(jobLocLower, targetLocLower)
        );
      });

      if (!isLocMatched) {
        disqualifications.push({
          type: 'LOCATION_MISMATCH',
          reason: `Job location "${job.location}" does not match target locations and is not remote.`,
          triggeredValue: job.location,
          requiredValue: targetLocations.join(', '),
        });
      }
    }

    // 4. Strict Role Mismatch Disqualification
    const targetRoles = (preferences.targetRoles || []).filter(Boolean);
    if (options?.strictRoleDisqualifier && targetRoles.length > 0) {
      const jobTitleLower = (job.title || '').toLowerCase();
      const isRoleMatched = targetRoles.some((role) => {
        const roleLower = role.toLowerCase().trim();
        return jobTitleLower.includes(roleLower) || roleLower.includes(jobTitleLower);
      });

      if (!isRoleMatched) {
        disqualifications.push({
          type: 'ROLE_MISMATCH',
          reason: `Job title "${job.title}" does not match candidate's target roles.`,
          triggeredValue: job.title,
          requiredValue: targetRoles.join(', '),
        });
      }
    }

    return disqualifications;
  }

  /**
   * Helper to check city/state location matches
   */
  private isLocationCityStateMatch(jobLoc: string, targetLoc: string): boolean {
    const knownEquivalents: Record<string, string[]> = {
      'sf': ['san francisco', 'bay area', 'california', 'ca'],
      'san francisco': ['sf', 'bay area', 'california', 'ca'],
      'nyc': ['new york', 'new york city', 'ny', 'manhattan'],
      'new york': ['nyc', 'new york city', 'ny', 'manhattan'],
      'seattle': ['wa', 'washington', 'redmond', 'bellevue'],
      'austin': ['tx', 'texas'],
      'boston': ['ma', 'massachusetts', 'cambridge'],
      'remote': ['anywhere', 'us remote', 'remote us', 'united states'],
    };

    for (const [key, aliases] of Object.entries(knownEquivalents)) {
      if (jobLoc.includes(key) && aliases.some((a) => targetLoc.includes(a))) return true;
      if (targetLoc.includes(key) && aliases.some((a) => jobLoc.includes(a))) return true;
    }
    return false;
  }

  /**
   * Evaluates the Preferred Company Boost Score (0.0 to 1.0)
   */
  public evaluatePreferredCompanyScore(
    job: Job,
    companyTier: CompanyTier,
    preferences?: UserPreferences
  ): {
    score: number;
    isPreferred: boolean;
    matchedPreference?: string;
    notes: string;
  } {
    if (!preferences || !preferences.preferredCompanies || preferences.preferredCompanies.length === 0) {
      // If user has no specific preferred list, assign baseline based on tier excellence
      if (companyTier === 'Tier 1 Quant/HFT' || companyTier === 'Tier 1 Big Tech / FAANG+') {
        return {
          score: 0.60,
          isPreferred: false,
          notes: `Baseline high prestige tier (${companyTier})`,
        };
      }
      if (companyTier === 'Tier 1 Enterprise Unicorn / High-Growth') {
        return {
          score: 0.40,
          isPreferred: false,
          notes: `High-growth unicorn tier (${companyTier})`,
        };
      }
      return {
        score: 0.20,
        isPreferred: false,
        notes: 'Standard market company tier',
      };
    }

    const companyLower = (job.company || '').toLowerCase().trim();
    const matchedPref = preferences.preferredCompanies.find((p) => {
      const pLower = (p || '').toLowerCase().trim();
      return pLower && (companyLower.includes(pLower) || pLower.includes(companyLower));
    });

    if (matchedPref) {
      return {
        score: 1.0,
        isPreferred: true,
        matchedPreference: matchedPref,
        notes: `Direct candidate target preference: "${matchedPref}" (+100% boost)`,
      };
    }

    // Secondary tier-based alignment
    if (companyTier === 'Tier 1 Quant/HFT' || companyTier === 'Tier 1 Big Tech / FAANG+') {
      return {
        score: 0.50,
        isPreferred: false,
        notes: `High-prestige industry tier (${companyTier}) without explicit listing`,
      };
    }

    return {
      score: 0.10,
      isPreferred: false,
      notes: 'Non-preferred company',
    };
  }

  /**
   * Evaluates the Location & Role Filter Match Score (0.0 to 1.0)
   */
  public evaluateLocationRoleScore(
    job: Job,
    preferences?: UserPreferences
  ): {
    score: number;
    locationScore: number;
    roleScore: number;
    locationMatched: boolean;
    roleMatched: boolean;
    matchedLocation?: string;
    matchedRole?: string;
    notes: string;
  } {
    let locationScore = 0.5;
    let roleScore = 0.5;
    let locationMatched = false;
    let roleMatched = false;
    let matchedLocation: string | undefined;
    let matchedRole: string | undefined;

    // Location Check
    const targetLocations = (preferences?.targetLocations || []).filter(Boolean);
    if (job.isRemote) {
      locationScore = 1.0;
      locationMatched = true;
      matchedLocation = 'Remote Available';
    } else if (targetLocations.length > 0) {
      const jobLocLower = (job.location || '').toLowerCase();
      const matched = targetLocations.find((loc) => {
        const targetLocLower = loc.toLowerCase().trim();
        return (
          jobLocLower.includes(targetLocLower) ||
          targetLocLower.includes(jobLocLower) ||
          this.isLocationCityStateMatch(jobLocLower, targetLocLower)
        );
      });

      if (matched) {
        locationScore = 1.0;
        locationMatched = true;
        matchedLocation = matched;
      } else {
        locationScore = 0.15; // Low location alignment
        locationMatched = false;
      }
    } else {
      locationScore = 0.60; // Neutral baseline when candidate has no location constraint
      locationMatched = true;
    }

    // Role Check
    const targetRoles = (preferences?.targetRoles || []).filter(Boolean);
    const jobTitleLower = (job.title || '').toLowerCase();

    if (targetRoles.length > 0) {
      const matched = targetRoles.find((role) => {
        const roleLower = role.toLowerCase().trim();
        return jobTitleLower.includes(roleLower) || roleLower.includes(jobTitleLower);
      });

      if (matched) {
        roleScore = 1.0;
        roleMatched = true;
        matchedRole = matched;
      } else {
        // Partial heuristic for engineering roles
        if (
          jobTitleLower.includes('software') ||
          jobTitleLower.includes('engineer') ||
          jobTitleLower.includes('developer') ||
          jobTitleLower.includes('intern')
        ) {
          roleScore = 0.65;
          roleMatched = true;
          matchedRole = 'General Engineering Role Match';
        } else {
          roleScore = 0.10;
          roleMatched = false;
        }
      }
    } else {
      // Default: Check if tech title
      if (
        jobTitleLower.includes('software') ||
        jobTitleLower.includes('engineer') ||
        jobTitleLower.includes('swe') ||
        jobTitleLower.includes('intern')
      ) {
        roleScore = 0.90;
        roleMatched = true;
        matchedRole = 'Standard Tech Internship';
      } else {
        roleScore = 0.50;
      }
    }

    // 50% Location + 50% Role
    const combinedScore = parseFloat((locationScore * 0.5 + roleScore * 0.5).toFixed(4));

    return {
      score: combinedScore,
      locationScore,
      roleScore,
      locationMatched,
      roleMatched,
      matchedLocation,
      matchedRole,
      notes: `Location match: ${(locationScore * 100).toFixed(0)}%, Role match: ${(roleScore * 100).toFixed(0)}%`,
    };
  }

  /**
   * Deterministic SHA-like audit signature for reproducible non-hallucinated verification
   */
  private generateAuditSignature(
    jobId: string,
    resumeId: string,
    l1: number,
    l2: number,
    comp: number,
    loc: number,
    finalScore: number,
    isDisqualified: boolean
  ): string {
    const raw = `${jobId}|${resumeId}|${l1.toFixed(4)}|${l2.toFixed(4)}|${comp.toFixed(4)}|${loc.toFixed(4)}|${finalScore.toFixed(4)}|${isDisqualified}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `SIG-DET-${hex.toUpperCase()}-${finalScore.toFixed(4).replace('.', '')}`;
  }

  /**
   * Computes the complete deterministic match score.
   */
  public evaluateCompositeMatch(
    resume: Resume,
    job: Job,
    preferences?: UserPreferences,
    options?: ScoringEngineOptions
  ): CompositeMatchEvaluationResult {
    const startTime = Date.now();

    // 1. Resolve Weights
    const weights = options?.weights ? this.normalizeWeights(options.weights) : this.defaultWeights;

    // 2. Check Hard Disqualifiers
    const disqualifications = this.checkHardDisqualifiers(job, preferences, options);
    const isDisqualified = disqualifications.length > 0;

    // 3. Layer 1 Baseline Vector & Stated JD Evaluation (40%)
    const layer1Result = layer1RagEngine.evaluateLayer1(resume, job);
    const l1RawScore = Math.min(1.0, Math.max(0.0, layer1Result.layer1Score));

    // 4. Layer 2 Informal Reality & Company Bar Evaluation (30%)
    const layer2Result = layer2RagEngine.evaluateLayer2(resume, job);
    const l2RawScore = Math.min(1.0, Math.max(0.0, layer2Result.layer2Score));

    // 5. Preferred Company Boost (15%)
    const companyEvaluation = this.evaluatePreferredCompanyScore(
      job,
      layer2Result.companyTier,
      preferences
    );
    const companyRawScore = Math.min(1.0, Math.max(0.0, companyEvaluation.score));

    // 6. Location & Role Hard Filter Match (15%)
    const locRoleEvaluation = this.evaluateLocationRoleScore(job, preferences);
    const locRoleRawScore = Math.min(1.0, Math.max(0.0, locRoleEvaluation.score));

    // 7. Weighted Blend Mathematical Computation
    const l1Weighted = l1RawScore * weights.layer1Weight;
    const l2Weighted = l2RawScore * weights.layer2Weight;
    const compWeighted = companyRawScore * weights.preferredCompanyBoostWeight;
    const locWeighted = locRoleRawScore * weights.locationRoleFilterWeight;

    const rawScoreBeforeDisqualification = parseFloat((l1Weighted + l2Weighted + compWeighted + locWeighted).toFixed(4));
    const rawPercentageBeforeDisqualification = parseFloat((rawScoreBeforeDisqualification * 100).toFixed(1));

    // If hard disqualifier triggered -> Score is zeroed
    const finalScore = isDisqualified ? 0.0 : Math.min(1.0, Math.max(0.0, rawScoreBeforeDisqualification));
    const finalPercentage = parseFloat((finalScore * 100).toFixed(1));

    // 8. Custom Threshold & Verdict Classification
    const thresholdValue = options?.customThreshold ?? preferences?.customMatchThreshold ?? 0.70;
    const meetsCustomThreshold = !isDisqualified && finalScore >= thresholdValue;

    let verdict: CompositeVerdict = 'DISQUALIFIED';
    if (!isDisqualified) {
      if (finalPercentage >= 80) verdict = 'STRONG_MATCH';
      else if (finalPercentage >= 65) verdict = 'GOOD_MATCH';
      else if (finalPercentage >= 50) verdict = 'BORDERLINE';
      else verdict = 'WEAK_MATCH';
    }

    // 9. Component Breakdown Structures
    const breakdown = {
      layer1: {
        rawScore: parseFloat(l1RawScore.toFixed(4)),
        weight: weights.layer1Weight,
        weightedScore: parseFloat(l1Weighted.toFixed(4)),
        percentage: parseFloat((l1RawScore * 100).toFixed(1)),
        weightedPercentage: parseFloat((l1Weighted * 100).toFixed(1)),
        vectorSimilarity: layer1Result.vectorSimilarity,
        requiredSkillsMatched: layer1Result.matchedRequiredSkills.length,
        requiredSkillsTotal: layer1Result.matchedRequiredSkills.length + layer1Result.missingRequiredSkills.length,
        notes: `Vector similarity ${(layer1Result.vectorSimilarity * 100).toFixed(1)}% with ${layer1Result.matchedRequiredSkills.length} required skills matched`,
      },
      layer2: {
        rawScore: parseFloat(l2RawScore.toFixed(4)),
        weight: weights.layer2Weight,
        weightedScore: parseFloat(l2Weighted.toFixed(4)),
        percentage: parseFloat((l2RawScore * 100).toFixed(1)),
        weightedPercentage: parseFloat((l2Weighted * 100).toFixed(1)),
        dsaDifficulty: layer2Result.dsaEvaluation.companyBarDifficulty,
        alignmentDelta: layer2Result.alignmentDelta,
        warningsCount: layer2Result.specificWarnings.length,
        notes: `${layer2Result.dsaEvaluation.companyBarDifficulty} informal DSA bar with delta ${layer2Result.alignmentDeltaPercentage}%`,
      },
      preferredCompany: {
        rawScore: parseFloat(companyRawScore.toFixed(4)),
        weight: weights.preferredCompanyBoostWeight,
        weightedScore: parseFloat(compWeighted.toFixed(4)),
        percentage: parseFloat((companyRawScore * 100).toFixed(1)),
        weightedPercentage: parseFloat((compWeighted * 100).toFixed(1)),
        isPreferred: companyEvaluation.isPreferred,
        companyTier: layer2Result.companyTier,
        matchedPreference: companyEvaluation.matchedPreference,
        notes: companyEvaluation.notes,
      },
      locationRole: {
        rawScore: parseFloat(locRoleRawScore.toFixed(4)),
        weight: weights.locationRoleFilterWeight,
        weightedScore: parseFloat(locWeighted.toFixed(4)),
        percentage: parseFloat((locRoleRawScore * 100).toFixed(1)),
        weightedPercentage: parseFloat((locWeighted * 100).toFixed(1)),
        locationMatched: locRoleEvaluation.locationMatched,
        roleMatched: locRoleEvaluation.roleMatched,
        isRemote: job.isRemote,
        matchedLocation: locRoleEvaluation.matchedLocation,
        matchedRole: locRoleEvaluation.matchedRole,
        notes: locRoleEvaluation.notes,
      },
    };

    // 10. Explicit Formula String
    const formulaString = isDisqualified
      ? `DISQUALIFIED [${disqualifications.map((d) => d.type).join(', ')}] -> FINAL SCORE = 0.00% (Raw: ${rawPercentageBeforeDisqualification}%)`
      : `(${weights.layer1Weight.toFixed(2)} * ${(l1RawScore * 100).toFixed(1)}%) + (${weights.layer2Weight.toFixed(2)} * ${(l2RawScore * 100).toFixed(1)}%) + (${weights.preferredCompanyBoostWeight.toFixed(2)} * ${(companyRawScore * 100).toFixed(1)}%) + (${weights.locationRoleFilterWeight.toFixed(2)} * ${(locRoleRawScore * 100).toFixed(1)}%) = ${finalPercentage}%`;

    // 11. Audit Signature
    const auditSignature = this.generateAuditSignature(
      job.id,
      resume.id,
      l1RawScore,
      l2RawScore,
      companyRawScore,
      locRoleRawScore,
      finalScore,
      isDisqualified
    );

    // 12. Summary
    const evaluationSummary = isDisqualified
      ? `Disqualified: ${disqualifications[0]?.reason}`
      : `${job.company} (${job.title}) scores ${finalPercentage}% composite match [L1: ${(l1RawScore * 100).toFixed(0)}%, L2: ${(l2RawScore * 100).toFixed(0)}%, Company: ${(companyRawScore * 100).toFixed(0)}%, Loc/Role: ${(locRoleRawScore * 100).toFixed(0)}%]. Verdict: ${verdict} (Threshold: ${(thresholdValue * 100).toFixed(0)}%).`;

    const latencyMs = Date.now() - startTime;

    return {
      jobId: job.id,
      resumeId: resume.id,
      userId: preferences?.userId,
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      isRemote: job.isRemote,
      finalScore,
      finalPercentage,
      rawScoreBeforeDisqualification,
      rawPercentageBeforeDisqualification,
      isDisqualified,
      disqualifications,
      meetsCustomThreshold,
      thresholdValue,
      verdict,
      weights,
      breakdown,
      formulaString,
      auditSignature,
      evaluationSummary,
      timestamp: new Date().toISOString(),
      latencyMs,
    };
  }

  /**
   * Batch evaluate a candidate resume against all active jobs in the catalog
   */
  public batchEvaluate(
    resume: Resume,
    jobs: Job[],
    preferences?: UserPreferences,
    options?: ScoringEngineOptions
  ): {
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
  } {
    const weights = options?.weights ? this.normalizeWeights(options.weights) : this.defaultWeights;
    const thresholdValue = options?.customThreshold ?? preferences?.customMatchThreshold ?? 0.70;

    const evaluations = jobs.map((job) => this.evaluateCompositeMatch(resume, job, preferences, options));

    // Sort descending by finalScore
    evaluations.sort((a, b) => b.finalScore - a.finalScore);

    const qualified = evaluations.filter((e) => !e.isDisqualified);
    const disqualified = evaluations.filter((e) => e.isDisqualified);
    const meetsThreshold = evaluations.filter((e) => e.meetsCustomThreshold);

    const strongMatchCount = evaluations.filter((e) => e.verdict === 'STRONG_MATCH').length;
    const goodMatchCount = evaluations.filter((e) => e.verdict === 'GOOD_MATCH').length;
    const borderlineCount = evaluations.filter((e) => e.verdict === 'BORDERLINE').length;
    const weakMatchCount = evaluations.filter((e) => e.verdict === 'WEAK_MATCH').length;

    const totalFinalScore = evaluations.reduce((acc, curr) => acc + curr.finalScore, 0);
    const avgFinalScore = evaluations.length > 0 ? totalFinalScore / evaluations.length : 0;

    const totalQualifiedScore = qualified.reduce((acc, curr) => acc + curr.finalScore, 0);
    const avgQualifiedScore = qualified.length > 0 ? totalQualifiedScore / qualified.length : 0;

    const topScore = evaluations.length > 0 ? evaluations[0].finalScore : 0;

    return {
      totalJobsEvaluated: evaluations.length,
      qualifiedJobsCount: qualified.length,
      disqualifiedJobsCount: disqualified.length,
      meetsThresholdCount: meetsThreshold.length,
      thresholdValue,
      weights,
      aggregates: {
        averageFinalScore: parseFloat(avgFinalScore.toFixed(4)),
        averageFinalPercentage: parseFloat((avgFinalScore * 100).toFixed(1)),
        averageQualifiedScore: parseFloat(avgQualifiedScore.toFixed(4)),
        topScore: parseFloat(topScore.toFixed(4)),
        strongMatchCount,
        goodMatchCount,
        borderlineCount,
        weakMatchCount,
      },
      evaluations,
    };
  }
}

export const compositeScoringEngine = new CompositeScoringEngine();
