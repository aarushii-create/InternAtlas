import {
  FeedbackSubmissionRequest,
  FeedbackSubmissionResponse,
  UserFeedback,
  AdaptiveThresholdProfile,
  ThresholdAdjustmentEvent,
  FeedbackActionType,
} from '../../types';
import { userFeedbackStore } from './userFeedbackStore';

export class AdaptiveThresholdTuner {
  /**
   * Main entry point: Records feedback and runs the adaptive tuning algorithm
   */
  public processFeedback(req: FeedbackSubmissionRequest): FeedbackSubmissionResponse {
    const candidateId = req.candidateId || 'alex-rivera-stanford';
    const profile = userFeedbackStore.getProfile(candidateId);
    const prevThreshold = profile.currentThreshold;
    const matchScore = typeof req.matchScore === 'number' ? req.matchScore : 0.75;
    const companyName = req.companyName || 'Target Company';
    const jobTitle = req.jobTitle || 'Software Engineer Intern';

    let newThreshold = prevThreshold;
    let thresholdChanged = false;
    let adjustmentReason = '';
    let delta = 0;

    // 1. Update interaction tallies
    profile.totalInteractions += 1;

    switch (req.action) {
      case 'APPLIED': {
        profile.appliedCount += 1;
        profile.consecutiveSkipStreak = 0;

        // Update running average applied score
        profile.averageAppliedScore =
          profile.appliedCount === 1
            ? matchScore
            : (profile.averageAppliedScore * (profile.appliedCount - 1) + matchScore) / profile.appliedCount;

        // Boost company affinity
        const currentAffinity = profile.companyAffinity[companyName] || 0;
        profile.companyAffinity[companyName] = Math.min(0.30, Number((currentAffinity + 0.06).toFixed(2)));

        // If candidate applied to a job close to or below their threshold, slightly relax threshold to capture more relevant jobs
        if (matchScore <= prevThreshold + 0.02 && prevThreshold > profile.minAllowedThreshold) {
          delta = -0.02;
          newThreshold = Math.max(profile.minAllowedThreshold, Number((prevThreshold + delta).toFixed(2)));
          thresholdChanged = true;
          adjustmentReason = `Applied to ${companyName} (${Math.round(matchScore * 100)}% match). Relaxed alert threshold by -2% to capture similar opportunities.`;
        } else {
          adjustmentReason = `Positive reinforcement: Applied to ${companyName} (${Math.round(matchScore * 100)}% match). Company affinity boosted to +${Math.round(profile.companyAffinity[companyName] * 100)}%.`;
        }
        break;
      }

      case 'SKIPPED': {
        profile.skippedCount += 1;
        profile.consecutiveSkipStreak += 1;

        // Update running average skipped score
        profile.averageSkippedScore =
          profile.skippedCount === 1
            ? matchScore
            : (profile.averageSkippedScore * (profile.skippedCount - 1) + matchScore) / profile.skippedCount;

        // Adaptive Rule: If user skips 5 jobs in a row with scores around threshold, bump threshold
        if (profile.consecutiveSkipStreak >= 5) {
          delta = 0.05;
          newThreshold = Math.min(profile.maxAllowedThreshold, Number((prevThreshold + delta).toFixed(2)));
          thresholdChanged = true;
          adjustmentReason = `User skipped 5 consecutive alerts near ${Math.round(prevThreshold * 100)}% match. Bumped threshold +5% to ${Math.round(newThreshold * 100)}% for higher signal precision.`;
          profile.consecutiveSkipStreak = 0; // Reset streak after auto-adjustment
        } else if (profile.consecutiveSkipStreak >= 3 && matchScore >= prevThreshold) {
          delta = 0.02;
          newThreshold = Math.min(profile.maxAllowedThreshold, Number((prevThreshold + delta).toFixed(2)));
          thresholdChanged = true;
          adjustmentReason = `Minor threshold calibration: 3 consecutive skips. Bumped threshold +2% to ${Math.round(newThreshold * 100)}%.`;
        } else {
          adjustmentReason = `Job skipped (${profile.consecutiveSkipStreak} in streak). Threshold maintained at ${Math.round(prevThreshold * 100)}%.`;
        }
        break;
      }

      case 'IRRELEVANT': {
        profile.irrelevantCount += 1;
        profile.consecutiveSkipStreak += 1;

        // Penalize company affinity
        const currentAffinity = profile.companyAffinity[companyName] || 0;
        profile.companyAffinity[companyName] = Math.max(-0.40, Number((currentAffinity - 0.15).toFixed(2)));

        // Marking as irrelevant provides strong negative signal -> bump threshold up +0.03
        delta = 0.03;
        newThreshold = Math.min(profile.maxAllowedThreshold, Number((prevThreshold + delta).toFixed(2)));
        thresholdChanged = true;
        adjustmentReason = `Marked irrelevant for ${companyName}. Decreased company affinity by -15% and bumped threshold +3% to ${Math.round(newThreshold * 100)}%.`;
        break;
      }

      case 'SAVED': {
        profile.savedCount += 1;
        profile.consecutiveSkipStreak = 0;
        adjustmentReason = `Job saved for later review. Positive intent captured for ${companyName}.`;
        break;
      }
    }

    // 2. Commit profile threshold updates
    profile.currentThreshold = newThreshold;
    profile.lastAdjustedAt = new Date().toISOString();
    profile.lastAdjustmentReason = adjustmentReason;

    // 3. Record threshold adjustment event in tuning log if changed
    if (thresholdChanged) {
      const event: ThresholdAdjustmentEvent = {
        id: `tune-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        previousThreshold: prevThreshold,
        newThreshold,
        delta,
        reason: adjustmentReason,
        triggerAction: req.action,
        jobContext: {
          jobId: req.jobId,
          companyName,
          jobTitle,
          matchScore,
        },
      };
      profile.tuningLog.unshift(event);
      if (profile.tuningLog.length > 50) {
        profile.tuningLog = profile.tuningLog.slice(0, 50);
      }
    }

    userFeedbackStore.updateProfile(profile);

    // 4. Create and persist feedback audit record
    const feedbackRecord: UserFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      candidateId,
      jobId: req.jobId,
      jobTitle,
      companyName,
      matchScore,
      action: req.action,
      reason: req.reason,
      feedbackSource: req.feedbackSource || 'web_ui',
      createdAt: new Date().toISOString(),
      metadata: {
        previousThreshold: prevThreshold,
        newThreshold,
        thresholdShiftDelta: delta,
        triggerReason: adjustmentReason,
      },
    };

    userFeedbackStore.addFeedback(feedbackRecord);

    return {
      success: true,
      feedbackRecord,
      profile,
      thresholdChanged,
      message: adjustmentReason,
    };
  }

  /**
   * Evaluates if a job meets a specific candidate's personalized adaptive threshold
   */
  public evaluateCandidateThreshold(
    candidateId: string,
    rawScore: number,
    companyName?: string
  ): { passesThreshold: boolean; candidateThreshold: number; effectiveScore: number } {
    const profile = userFeedbackStore.getProfile(candidateId);
    let effectiveScore = rawScore;

    // Apply company affinity bonus/penalty
    if (companyName && profile.companyAffinity[companyName]) {
      effectiveScore = Math.min(1.0, Math.max(0.0, effectiveScore + profile.companyAffinity[companyName]));
    }

    const passesThreshold = effectiveScore >= profile.currentThreshold;

    return {
      passesThreshold,
      candidateThreshold: profile.currentThreshold,
      effectiveScore,
    };
  }

  /**
   * Reset candidate's adaptive threshold back to baseline
   */
  public resetCandidateThreshold(candidateId: string): AdaptiveThresholdProfile {
    return userFeedbackStore.resetProfile(candidateId);
  }
}

export const adaptiveThresholdTuner = new AdaptiveThresholdTuner();
