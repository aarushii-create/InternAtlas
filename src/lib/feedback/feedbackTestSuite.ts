import { adaptiveThresholdTuner } from './adaptiveThresholdTuner';
import { userFeedbackStore } from './userFeedbackStore';
import { formatTelegramAlert, formatEmailAlert } from '../alerts/alertFormatter';
import { NotificationPayload } from '../../types';

export interface FeedbackTestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  expected: string;
  actual: string;
  errorDetails?: string;
}

export interface FeedbackTestSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  averageLatencyMs: number;
  results: FeedbackTestResult[];
}

export async function runFeedbackTestSuite(): Promise<FeedbackTestSuiteReport> {
  const startTime = Date.now();
  const results: FeedbackTestResult[] = [];
  const testCandidateId = 'cand-phase12-test-01';

  // TEST 1: Positive Feedback & Company Affinity Boost
  const t1Start = Date.now();
  try {
    userFeedbackStore.resetProfile(testCandidateId);

    const response = adaptiveThresholdTuner.processFeedback({
      candidateId: testCandidateId,
      jobId: 'job-test-affirm-01',
      jobTitle: 'Machine Learning Research Intern',
      companyName: 'OpenAI',
      matchScore: 0.92,
      action: 'APPLIED',
      feedbackSource: 'telegram_inline',
    });

    const passed =
      response.success &&
      response.profile.appliedCount === 1 &&
      response.profile.consecutiveSkipStreak === 0 &&
      response.profile.companyAffinity['OpenAI'] > 0;

    results.push({
      id: 'FEEDBACK-TEST-001',
      name: 'Positive Feedback Loop (Applied Action & Affinity Boost)',
      category: 'POSITIVE_REINFORCEMENT',
      passed,
      durationMs: Date.now() - t1Start,
      expected: 'Applied action increments appliedCount, clears skip streak, and boosts company affinity',
      actual: passed
        ? `Applied count: ${response.profile.appliedCount}, Streak: ${response.profile.consecutiveSkipStreak}, OpenAI Affinity: +${Math.round(response.profile.companyAffinity['OpenAI'] * 100)}%`
        : 'Positive feedback assertion failed',
    });
  } catch (err: any) {
    results.push({
      id: 'FEEDBACK-TEST-001',
      name: 'Positive Feedback Loop (Applied Action & Affinity Boost)',
      category: 'POSITIVE_REINFORCEMENT',
      passed: false,
      durationMs: Date.now() - t1Start,
      expected: 'Positive feedback processed without error',
      actual: `Error: ${err?.message}`,
    });
  }

  // TEST 2: 5 Consecutive Skips Dynamic Threshold Bump (75% -> 80%)
  const t2Start = Date.now();
  try {
    userFeedbackStore.resetProfile(testCandidateId);
    const initialThreshold = userFeedbackStore.getProfile(testCandidateId).currentThreshold; // 0.75

    // Perform 4 skips (streak accumulates)
    for (let i = 1; i <= 4; i++) {
      adaptiveThresholdTuner.processFeedback({
        candidateId: testCandidateId,
        jobId: `job-skip-batch-${i}`,
        jobTitle: 'Backend Intern',
        companyName: `Company ${i}`,
        matchScore: 0.76,
        action: 'SKIPPED',
        feedbackSource: 'email_link',
      });
    }

    const midProfile = userFeedbackStore.getProfile(testCandidateId);
    const midStreakValid = midProfile.consecutiveSkipStreak === 4;

    // 5th skip triggers the adaptive bump
    const fifthResponse = adaptiveThresholdTuner.processFeedback({
      candidateId: testCandidateId,
      jobId: 'job-skip-batch-5',
      jobTitle: 'Backend Intern',
      companyName: 'Company 5',
      matchScore: 0.76,
      action: 'SKIPPED',
      feedbackSource: 'email_link',
    });

    const newThreshold = fifthResponse.profile.currentThreshold;
    const bumped = newThreshold >= initialThreshold + 0.04 && fifthResponse.thresholdChanged;

    const passed = midStreakValid && bumped;

    results.push({
      id: 'FEEDBACK-TEST-002',
      name: '5 Consecutive Skips Adaptive Threshold Bump (0.75 -> 0.80)',
      category: 'ADAPTIVE_TUNING',
      passed,
      durationMs: Date.now() - t2Start,
      expected: '5 consecutive skipped jobs near threshold automatically bumps alert threshold up (+5%)',
      actual: passed
        ? `Initial: ${Math.round(initialThreshold * 100)}%, After 5 skips: ${Math.round(newThreshold * 100)}% (Streak reset to ${fifthResponse.profile.consecutiveSkipStreak})`
        : `Threshold bump failed. Initial: ${initialThreshold}, Current: ${newThreshold}`,
    });
  } catch (err: any) {
    results.push({
      id: 'FEEDBACK-TEST-002',
      name: '5 Consecutive Skips Adaptive Threshold Bump (0.75 -> 0.80)',
      category: 'ADAPTIVE_TUNING',
      passed: false,
      durationMs: Date.now() - t2Start,
      expected: 'Threshold bump execution succeeds',
      actual: `Error: ${err?.message}`,
    });
  }

  // TEST 3: Irrelevant Role Penalty & Negative Affinity Weighting
  const t3Start = Date.now();
  try {
    userFeedbackStore.resetProfile(testCandidateId);

    const response = adaptiveThresholdTuner.processFeedback({
      candidateId: testCandidateId,
      jobId: 'job-irrelevant-01',
      jobTitle: 'Legacy Cold-Caller Intern',
      companyName: 'SpamCorp',
      matchScore: 0.77,
      action: 'IRRELEVANT',
      reason: 'Irrelevant domain and skillset',
      feedbackSource: 'telegram_inline',
    });

    const spamAffinity = response.profile.companyAffinity['SpamCorp'];
    const passed =
      response.success &&
      response.profile.irrelevantCount === 1 &&
      spamAffinity <= -0.10 &&
      response.thresholdChanged;

    results.push({
      id: 'FEEDBACK-TEST-003',
      name: 'Irrelevant Feedback Penalty & Negative Company Affinity',
      category: 'NEGATIVE_SIGNAL',
      passed,
      durationMs: Date.now() - t3Start,
      expected: 'Irrelevant action penalizes company affinity (-15%) and adjusts threshold for higher signal precision',
      actual: passed
        ? `SpamCorp affinity: ${Math.round(spamAffinity * 100)}%, Threshold bumped to: ${Math.round(response.profile.currentThreshold * 100)}%`
        : 'Irrelevant penalty failed assertion',
    });
  } catch (err: any) {
    results.push({
      id: 'FEEDBACK-TEST-003',
      name: 'Irrelevant Feedback Penalty & Negative Company Affinity',
      category: 'NEGATIVE_SIGNAL',
      passed: false,
      durationMs: Date.now() - t3Start,
      expected: 'Negative signal processing succeeds',
      actual: `Error: ${err?.message}`,
    });
  }

  // TEST 4: Telegram & Email Action Button Generation
  const t4Start = Date.now();
  try {
    const mockPayload: NotificationPayload = {
      jobId: 'job-gh-stripe-02',
      jobTitle: 'Software Engineering Intern',
      companyName: 'Stripe',
      location: 'San Francisco, CA',
      applyUrl: 'https://stripe.com/jobs/swe-intern',
      matchScore: 0.88,
      matchPercentage: 88,
      verdict: 'STRONG_MATCH',
      matchedSkills: ['Distributed Systems', 'Go'],
      missingSkills: ['Ruby on Rails'],
      layer2Expectations: {
        oaDifficulty: 'Practical debugging + API extension (Karat & take-home)',
        unspokenCriteria: 'Clean code and production reliability over competitive programming speed',
      },
      candidateName: 'Alex Rivera',
      candidateEmail: 'alex.rivera@stanford.edu',
      matchedAt: new Date().toISOString(),
    };

    const tg = formatTelegramAlert(mockPayload);
    const em = formatEmailAlert(mockPayload);

    const hasTgApplied = tg.inlineButtons.some((b) => b.text.includes('Applied'));
    const hasTgSkip = tg.inlineButtons.some((b) => b.text.includes('Skip'));
    const hasTgIrrelevant = tg.inlineButtons.some((b) => b.text.includes('Irrelevant'));

    const hasEmailApplied = em.html.includes('action=APPLIED');
    const hasEmailSkip = em.html.includes('action=SKIPPED');
    const hasEmailIrrelevant = em.html.includes('action=IRRELEVANT');

    const passed = hasTgApplied && hasTgSkip && hasTgIrrelevant && hasEmailApplied && hasEmailSkip && hasEmailIrrelevant;

    results.push({
      id: 'FEEDBACK-TEST-004',
      name: 'Multi-Channel Inline Feedback Action Generation (Telegram & Email)',
      category: 'ACTION_BUTTON_SERIALIZATION',
      passed,
      durationMs: Date.now() - t4Start,
      expected: 'Inline buttons on Telegram and Email include [Applied], [Skipped], [Irrelevant] parameterized with jobId and candidateId',
      actual: passed
        ? `Telegram has ${tg.inlineButtons.length} inline action buttons; Email has 3-button 1-click feedback bar`
        : 'Action button serialization missing required actions',
    });
  } catch (err: any) {
    results.push({
      id: 'FEEDBACK-TEST-004',
      name: 'Multi-Channel Inline Feedback Action Generation (Telegram & Email)',
      category: 'ACTION_BUTTON_SERIALIZATION',
      passed: false,
      durationMs: Date.now() - t4Start,
      expected: 'Action button test completes',
      actual: `Error: ${err?.message}`,
    });
  }

  // TEST 5: Candidate-Specific Adaptive Threshold Invariant
  const t5Start = Date.now();
  try {
    userFeedbackStore.resetProfile(testCandidateId);
    const profile = userFeedbackStore.getProfile(testCandidateId);
    profile.currentThreshold = 0.82; // Set candidate threshold to 82%
    userFeedbackStore.updateProfile(profile);

    // Job with raw score 0.78 (should fail 0.82 threshold)
    const lowCheck = adaptiveThresholdTuner.evaluateCandidateThreshold(testCandidateId, 0.78);
    // Job with raw score 0.86 (should pass 0.82 threshold)
    const highCheck = adaptiveThresholdTuner.evaluateCandidateThreshold(testCandidateId, 0.86);

    const passed = !lowCheck.passesThreshold && highCheck.passesThreshold;

    results.push({
      id: 'FEEDBACK-TEST-005',
      name: 'Candidate-Specific Adaptive Threshold Evaluation Invariant',
      category: 'THRESHOLD_EVALUATION',
      passed,
      durationMs: Date.now() - t5Start,
      expected: 'Personalized candidate threshold (82%) suppresses 78% score and delivers 86% score',
      actual: passed
        ? `Verified: 78% suppressed (pass=${lowCheck.passesThreshold}), 86% approved (pass=${highCheck.passesThreshold})`
        : 'Threshold invariant failed',
    });
  } catch (err: any) {
    results.push({
      id: 'FEEDBACK-TEST-005',
      name: 'Candidate-Specific Adaptive Threshold Evaluation Invariant',
      category: 'THRESHOLD_EVALUATION',
      passed: false,
      durationMs: Date.now() - t5Start,
      expected: 'Evaluation completes',
      actual: `Error: ${err?.message}`,
    });
  }

  // TEST 6: Calibration Reset & Profile History Consistency
  const t6Start = Date.now();
  try {
    const resetProfile = userFeedbackStore.resetProfile(testCandidateId);
    const passed =
      resetProfile.currentThreshold === 0.75 &&
      resetProfile.appliedCount === 0 &&
      resetProfile.skippedCount === 0 &&
      resetProfile.consecutiveSkipStreak === 0;

    results.push({
      id: 'FEEDBACK-TEST-006',
      name: 'Profile Calibration Reset & History Consistency',
      category: 'STATE_MANAGEMENT',
      passed,
      durationMs: Date.now() - t6Start,
      expected: 'Profile reset restores baseline 75% threshold and initializes clean telemetry state',
      actual: passed
        ? `Reset verified. Baseline: ${resetProfile.baselineThreshold}, Current: ${resetProfile.currentThreshold}`
        : 'Profile reset failed',
    });
  } catch (err: any) {
    results.push({
      id: 'FEEDBACK-TEST-006',
      name: 'Profile Calibration Reset & History Consistency',
      category: 'STATE_MANAGEMENT',
      passed: false,
      durationMs: Date.now() - t6Start,
      expected: 'Reset completes',
      actual: `Error: ${err?.message}`,
    });
  }

  const totalDurationMs = Date.now() - startTime;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const averageLatencyMs = Math.round(totalDurationMs / results.length);

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount,
    totalDurationMs,
    averageLatencyMs,
    results,
  };
}
