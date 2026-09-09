import {
  UserFeedback,
  AdaptiveThresholdProfile,
  FeedbackActionType,
  FeedbackSourceType,
  ThresholdAdjustmentEvent,
} from '../../types';

/**
 * In-Memory & Persistent Storage for User Feedback and Adaptive Threshold Profiles
 */
class UserFeedbackStore {
  private feedbackRecords: UserFeedback[] = [];
  private userProfiles: Map<string, AdaptiveThresholdProfile> = new Map();

  constructor() {
    this.seedDefaultProfile('alex-rivera-stanford', 'Alex Rivera');
  }

  public seedDefaultProfile(candidateId: string, candidateName: string): AdaptiveThresholdProfile {
    const profile: AdaptiveThresholdProfile = {
      candidateId,
      candidateName,
      baselineThreshold: 0.75,
      currentThreshold: 0.75,
      minAllowedThreshold: 0.50,
      maxAllowedThreshold: 0.95,
      totalInteractions: 0,
      appliedCount: 0,
      skippedCount: 0,
      irrelevantCount: 0,
      savedCount: 0,
      consecutiveSkipStreak: 0,
      averageAppliedScore: 0,
      averageSkippedScore: 0,
      companyAffinity: {
        'Citadel Securities': 0.08,
        'OpenAI': 0.05,
        'Stripe': 0.04,
      },
      skillAffinity: {
        'PyTorch': 0.05,
        'Distributed Systems': 0.05,
        'C++': 0.04,
      },
      lastAdjustedAt: new Date().toISOString(),
      lastAdjustmentReason: 'Initial baseline calibrated (75% standard)',
      tuningLog: [
        {
          id: `tune-init-${Date.now()}`,
          timestamp: new Date().toISOString(),
          previousThreshold: 0.75,
          newThreshold: 0.75,
          delta: 0.0,
          reason: 'System initialization baseline set to 75%',
          triggerAction: 'APPLIED',
          jobContext: {
            jobId: 'baseline-init',
            companyName: 'System Baseline',
            jobTitle: 'Scout Engine Default',
            matchScore: 0.75,
          },
        },
      ],
    };

    this.userProfiles.set(candidateId, profile);
    return profile;
  }

  public getProfile(candidateId: string, candidateName = 'Candidate'): AdaptiveThresholdProfile {
    if (!this.userProfiles.has(candidateId)) {
      return this.seedDefaultProfile(candidateId, candidateName);
    }
    return this.userProfiles.get(candidateId)!;
  }

  public updateProfile(profile: AdaptiveThresholdProfile): void {
    this.userProfiles.set(profile.candidateId, profile);
  }

  public addFeedback(feedback: UserFeedback): void {
    this.feedbackRecords.unshift(feedback);
    if (this.feedbackRecords.length > 500) {
      this.feedbackRecords = this.feedbackRecords.slice(0, 500);
    }
  }

  public getFeedbackByCandidate(candidateId: string, limit = 50): UserFeedback[] {
    return this.feedbackRecords
      .filter((r) => r.candidateId === candidateId)
      .slice(0, limit);
  }

  public getAllFeedback(limit = 100): UserFeedback[] {
    return this.feedbackRecords.slice(0, limit);
  }

  public getFeedbackById(id: string): UserFeedback | undefined {
    return this.feedbackRecords.find((r) => r.id === id);
  }

  public resetProfile(candidateId: string): AdaptiveThresholdProfile {
    const existing = this.userProfiles.get(candidateId);
    const candidateName = existing?.candidateName || 'Candidate';
    const profile = this.seedDefaultProfile(candidateId, candidateName);
    return profile;
  }

  public clearHistory(): void {
    this.feedbackRecords = [];
    this.userProfiles.clear();
    this.seedDefaultProfile('alex-rivera-stanford', 'Alex Rivera');
  }
}

export const userFeedbackStore = new UserFeedbackStore();
