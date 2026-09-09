import { NotificationPayload, FormattedAlertMessage } from '../../types';
import { formatTelegramAlert, formatEmailAlert, formatAlertMessage } from './alertFormatter';
import { telegramAlertService } from './telegramService';
import { emailAlertService } from './emailService';
import { NotificationDispatcher } from './notificationDispatcher';

export interface AlertTestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  expected: string;
  actual: string;
  errorDetails?: string;
}

export interface AlertTestSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  averageLatencyMs: number;
  results: AlertTestResult[];
}

export async function runAlertTestSuite(): Promise<AlertTestSuiteReport> {
  const startTime = Date.now();
  const results: AlertTestResult[] = [];

  const mockPayload: NotificationPayload = {
    jobId: 'job-test-quant-001',
    jobTitle: 'Quantitative Research Intern (Machine Learning)',
    companyName: 'Citadel Securities',
    location: 'New York, NY / Miami, FL',
    applyUrl: 'https://citadelsecurities.com/careers/quant-ml-intern',
    matchScore: 0.96,
    matchPercentage: 96,
    verdict: 'STRONG_MATCH',
    matchedSkills: ['C++', 'Stochastic Calculus', 'Python', 'PyTorch', 'Distributed Systems', 'Kernel Optimization'],
    missingSkills: ['FPGA Programming', 'Verilog'],
    layer2Expectations: {
      oaDifficulty: 'Extreme (Math Olympiad / Putnam level probability + LeetCode Hard C++)',
      unspokenCriteria: 'Top 1% STEM GPA, Putnam Honorable Mention or ICPC World Finals strongly preferred',
      gpaBar: '3.9+ GPA strict screen',
      timeWindow: '24-hour OA completion limit from invite',
    },
    candidateName: 'Alex Rivera',
    candidateEmail: 'alex.rivera@stanford.edu',
    matchedAt: new Date().toISOString(),
    salarySnippet: '$125 / hr + Relocation + Sign-on bonus',
    sourceAts: 'greenhouse',
  };

  // TEST 1: Telegram MarkdownV2 & HTML Alert Formatting
  const t1Start = Date.now();
  try {
    const tgFormatted = formatTelegramAlert(mockPayload);
    const hasScore = tgFormatted.html.includes('96%') && tgFormatted.markdownV2.includes('96%');
    const hasCompany = tgFormatted.html.includes('Citadel Securities');
    const hasMatchedSkills = tgFormatted.html.includes('Stochastic Calculus') && tgFormatted.html.includes('C++');
    const hasMissingSkills = tgFormatted.html.includes('FPGA Programming');
    const hasLayer2 = tgFormatted.html.includes('Extreme (Math Olympiad') && tgFormatted.html.includes('Layer 2 Reality Check');
    const hasApplyLink = tgFormatted.inlineButtons.some((b) => b.url === mockPayload.applyUrl);

    const passed = hasScore && hasCompany && hasMatchedSkills && hasMissingSkills && hasLayer2 && hasApplyLink;

    results.push({
      id: 'ALERT-TEST-001',
      name: 'Telegram Rich Alert Formatting (Skills, Apply CTA, Layer 2 Note)',
      category: 'TELEGRAM_FORMATTING',
      passed,
      durationMs: Date.now() - t1Start,
      expected: 'Telegram payload formatted with 96% match score, matched & missing skills, Layer 2 Reality Check, and direct apply link',
      actual: passed
        ? `Formatted HTML (${tgFormatted.html.length} chars) and MarkdownV2 (${tgFormatted.markdownV2.length} chars) with 2 inline action buttons`
        : 'Missing required formatting fields in Telegram alert',
    });
  } catch (err: any) {
    results.push({
      id: 'ALERT-TEST-001',
      name: 'Telegram Rich Alert Formatting (Skills, Apply CTA, Layer 2 Note)',
      category: 'TELEGRAM_FORMATTING',
      passed: false,
      durationMs: Date.now() - t1Start,
      expected: 'Valid Telegram format output',
      actual: `Error: ${err?.message}`,
    });
  }

  // TEST 2: Responsive HTML Email Template Generation
  const t2Start = Date.now();
  try {
    const emailFormatted = formatEmailAlert(mockPayload);
    const hasSubject = emailFormatted.subject.includes('96% Match') && emailFormatted.subject.includes('Citadel Securities');
    const hasHtmlDoctype = emailFormatted.html.includes('<!DOCTYPE html>');
    const hasScoreBadge = emailFormatted.html.includes('96%') && emailFormatted.html.includes('#10b981');
    const hasPills = emailFormatted.html.includes('Stochastic Calculus') && emailFormatted.html.includes('FPGA Programming');
    const hasApplyCTA = emailFormatted.html.includes(mockPayload.applyUrl);
    const hasRealityNote = emailFormatted.html.includes('Layer 2 Reality Expectation Note');

    const passed = hasSubject && hasHtmlDoctype && hasScoreBadge && hasPills && hasApplyCTA && hasRealityNote;

    results.push({
      id: 'ALERT-TEST-002',
      name: 'Responsive Mobile-First HTML Email Template Generation',
      category: 'EMAIL_TEMPLATE',
      passed,
      durationMs: Date.now() - t2Start,
      expected: 'Mobile-responsive dark HTML template with embedded CSS, score badge, skill pills, and Layer 2 card',
      actual: passed
        ? `Generated Subject: "${emailFormatted.subject}" and HTML (${emailFormatted.html.length} bytes)`
        : 'Email template failed structural validation checks',
    });
  } catch (err: any) {
    results.push({
      id: 'ALERT-TEST-002',
      name: 'Responsive Mobile-First HTML Email Template Generation',
      category: 'EMAIL_TEMPLATE',
      passed: false,
      durationMs: Date.now() - t2Start,
      expected: 'Valid Email format output',
      actual: `Error: ${err?.message}`,
    });
  }

  // TEST 3: Score Threshold Trigger Invariant
  const t3Start = Date.now();
  try {
    const dispatcher = new NotificationDispatcher();
    dispatcher.updateRules({ minScoreThreshold: 0.80, dedupWindowHours: 0 }); // 80% threshold

    // High score candidate (90% >= 80% -> should dispatch)
    const highScorePayload: NotificationPayload = {
      ...mockPayload,
      jobId: 'job-high-80',
      matchScore: 0.90,
      matchPercentage: 90,
    };
    const highRecord = await dispatcher.dispatchPayload(highScorePayload, 'cand-1', { forceSimulated: true });

    // Low score candidate (65% < 80% -> should filter via evaluateAndDispatch)
    const lowScoreEvaluation: any = {
      jobId: 'job-low-65',
      jobTitle: 'Junior Data Clerk',
      companyName: 'Legacy Corp',
      finalScore: 0.65,
      finalPercentage: 65,
      verdict: 'WEAK_MATCH',
      isDisqualified: false,
      breakdown: { layer1Semantic: { matchedKeywords: ['Excel'], missingKeywords: ['C++'] } },
    };
    const lowRecord = await dispatcher.evaluateAndDispatch(lowScoreEvaluation, { name: 'Alex Rivera', id: 'cand-1' }, { forceSimulated: true });

    const passed = !!highRecord && highRecord.channels.telegram?.status === 'delivered' && lowRecord === null;

    results.push({
      id: 'ALERT-TEST-003',
      name: 'Real-Time Score Threshold Evaluation Invariant',
      category: 'THRESHOLD_EVALUATION',
      passed,
      durationMs: Date.now() - t3Start,
      expected: 'Score >= 80% triggers instant dispatch; Score < 80% is suppressed by threshold filter',
      actual: passed
        ? `Verified: 90% match -> Dispatched (${highRecord.id}), 65% match -> Suppressed (null)`
        : `Threshold check failed: High: ${!!highRecord}, Low: ${!!lowRecord}`,
    });
  } catch (err: any) {
    results.push({
      id: 'ALERT-TEST-003',
      name: 'Real-Time Score Threshold Evaluation Invariant',
      category: 'THRESHOLD_EVALUATION',
      passed: false,
      durationMs: Date.now() - t3Start,
      expected: 'Threshold evaluation completes without errors',
      actual: `Error: ${err?.message}`,
    });
  }

  // TEST 4: Anti-Spam Deduplication Guard
  const t4Start = Date.now();
  try {
    const dispatcher = new NotificationDispatcher();
    dispatcher.updateRules({ minScoreThreshold: 0.70, dedupWindowHours: 48 });

    const evalJob: any = {
      jobId: 'job-dedup-check-001',
      jobTitle: 'AI Research Intern',
      companyName: 'Anthropic',
      finalScore: 0.92,
      finalPercentage: 92,
      verdict: 'STRONG_MATCH',
      isDisqualified: false,
      breakdown: { layer1Semantic: { matchedKeywords: ['RLHF', 'Constitutional AI'] } },
    };

    // First evaluation: should deliver
    const firstDispatch = await dispatcher.evaluateAndDispatch(evalJob, { name: 'Alex Rivera', id: 'cand-dedup-1' }, { forceSimulated: true });
    // Second evaluation for SAME job & SAME candidate: should be deduplicated / suppressed
    const secondDispatch = await dispatcher.evaluateAndDispatch(evalJob, { name: 'Alex Rivera', id: 'cand-dedup-1' }, { forceSimulated: true });

    const passed = firstDispatch !== null && secondDispatch === null;

    results.push({
      id: 'ALERT-TEST-004',
      name: 'Anti-Spam Alert Deduplication within 48h Window',
      category: 'ANTI_SPAM_DEDUP',
      passed,
      durationMs: Date.now() - t4Start,
      expected: 'Subsequent alerts for identical (jobId, candidateId) pair within 48 hours are suppressed',
      actual: passed
        ? `Pass: First dispatch ID=${firstDispatch?.id}, Second dispatch suppressed (null)`
        : `Dedup failed: First=${!!firstDispatch}, Second=${!!secondDispatch}`,
    });
  } catch (err: any) {
    results.push({
      id: 'ALERT-TEST-004',
      name: 'Anti-Spam Alert Deduplication within 48h Window',
      category: 'ANTI_SPAM_DEDUP',
      passed: false,
      durationMs: Date.now() - t4Start,
      expected: 'Dedup check succeeds',
      actual: `Error: ${err?.message}`,
    });
  }

  // TEST 5: Parallel Multi-Channel Dispatch (Telegram & Email)
  const t5Start = Date.now();
  try {
    const dispatcher = new NotificationDispatcher();
    const dispatchRecord = await dispatcher.dispatchPayload(mockPayload, 'cand-multi-1', { forceSimulated: true });

    const tgDelivered = dispatchRecord.channels.telegram?.status === 'delivered';
    const emDelivered = dispatchRecord.channels.email?.status === 'delivered';
    const sub150ms = (dispatchRecord.channels.telegram?.latencyMs || 0) < 150 && (dispatchRecord.channels.email?.latencyMs || 0) < 150;

    const passed = tgDelivered && emDelivered && sub150ms;

    results.push({
      id: 'ALERT-TEST-005',
      name: 'Concurrent Multi-Channel Dispatch (Telegram & Email)',
      category: 'MULTI_CHANNEL_DISPATCH',
      passed,
      durationMs: Date.now() - t5Start,
      expected: 'Telegram & Email dispatched in parallel with valid delivery receipts and < 150ms latency',
      actual: passed
        ? `Telegram: ${dispatchRecord.channels.telegram?.messageId} (${dispatchRecord.channels.telegram?.latencyMs}ms), Email: ${dispatchRecord.channels.email?.messageId} (${dispatchRecord.channels.email?.latencyMs}ms)`
        : 'Multi-channel dispatch failed verification',
    });
  } catch (err: any) {
    results.push({
      id: 'ALERT-TEST-005',
      name: 'Concurrent Multi-Channel Dispatch (Telegram & Email)',
      category: 'MULTI_CHANNEL_DISPATCH',
      passed: false,
      durationMs: Date.now() - t5Start,
      expected: 'Parallel dispatch execution',
      actual: `Error: ${err?.message}`,
    });
  }

  // TEST 6: Channel Config Health-Check & Error Resilience
  const t6Start = Date.now();
  try {
    const tgHealth = await telegramAlertService.testConnection();
    const emHealth = await emailAlertService.testConnection();

    const passed = tgHealth.ok && emHealth.ok;

    results.push({
      id: 'ALERT-TEST-006',
      name: 'Channel Health Verification & Sandbox Fallback',
      category: 'CHANNEL_HEALTH',
      passed,
      durationMs: Date.now() - t6Start,
      expected: 'Telegram & Email connection checks verify valid credentials or graceful sandbox mode',
      actual: passed
        ? `Telegram Bot: "${tgHealth.botName}" (Simulated: ${tgHealth.isSimulated}), Email Provider: ${emHealth.provider} (Simulated: ${emHealth.isSimulated})`
        : 'Channel health checks failed',
    });
  } catch (err: any) {
    results.push({
      id: 'ALERT-TEST-006',
      name: 'Channel Health Verification & Sandbox Fallback',
      category: 'CHANNEL_HEALTH',
      passed: false,
      durationMs: Date.now() - t6Start,
      expected: 'Health checks complete',
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
