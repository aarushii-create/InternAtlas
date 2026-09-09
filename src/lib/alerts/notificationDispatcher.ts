import {
  NotificationPayload,
  AlertRuleConfig,
  AlertDispatchRecord,
  AlertingEngineStats,
  CompositeMatchEvaluationResult,
  AlertDeliveryStatus,
} from '../../types';
import { formatAlertMessage } from './alertFormatter';
import { telegramAlertService } from './telegramService';
import { emailAlertService } from './emailService';

export class NotificationDispatcher {
  private ruleConfig: AlertRuleConfig = {
    minScoreThreshold: 0.75, // Default 75% trigger threshold
    requireLayer2Match: false,
    allowDisqualified: false,
    dedupWindowHours: 48, // 48h deduplication window
    maxAlertsPerDay: 50,
    quietHoursEnabled: false,
    quietHoursStartUtc: 2, // 2:00 UTC
    quietHoursEndUtc: 6, // 6:00 UTC
  };

  private history: AlertDispatchRecord[] = [];
  private stats: AlertingEngineStats = {
    totalTriggerEvaluations: 0,
    totalAlertsDispatched: 0,
    telegramDeliveredCount: 0,
    emailDeliveredCount: 0,
    thresholdFilteredCount: 0,
    dedupSuppressedCount: 0,
    failedDeliveriesCount: 0,
    averageDispatchLatencyMs: 0,
    activeChannels: {
      telegram: true,
      email: true,
    },
  };

  constructor() {
    this.seedInitialHistory();
  }

  public getRules(): AlertRuleConfig {
    return { ...this.ruleConfig };
  }

  public updateRules(newRules: Partial<AlertRuleConfig>): AlertRuleConfig {
    this.ruleConfig = { ...this.ruleConfig, ...newRules };
    return this.getRules();
  }

  public getHistory(limit = 100): AlertDispatchRecord[] {
    return [...this.history].slice(0, limit);
  }

  public clearHistory(): void {
    this.history = [];
  }

  public getStats(): AlertingEngineStats {
    const tgConfig = telegramAlertService.getConfig();
    const emConfig = emailAlertService.getConfig();

    return {
      ...this.stats,
      activeChannels: {
        telegram: tgConfig.enabled,
        email: emConfig.enabled,
      },
    };
  }

  /**
   * Evaluates a CompositeMatchEvaluationResult from Phase 9 scoring engine
   * and triggers real-time alerts if criteria are met.
   */
  public async evaluateAndDispatch(
    evaluation: CompositeMatchEvaluationResult,
    candidateInfo?: { name: string; email?: string; id?: string },
    options: { forceSimulated?: boolean; bypassThreshold?: boolean } = {}
  ): Promise<AlertDispatchRecord | null> {
    this.stats.totalTriggerEvaluations++;

    const score = evaluation.finalScore;
    const meetsThreshold = score >= this.ruleConfig.minScoreThreshold;

    // Disqualification filter
    if (evaluation.isDisqualified && !this.ruleConfig.allowDisqualified) {
      this.stats.thresholdFilteredCount++;
      return null;
    }

    // Threshold filter
    if (!meetsThreshold && !options.bypassThreshold) {
      this.stats.thresholdFilteredCount++;
      return null;
    }

    // Deduplication check
    const candidateId = candidateInfo?.id || 'candidate-default-01';
    if (this.isDuplicateAlert(evaluation.jobId, candidateId)) {
      this.stats.dedupSuppressedCount++;
      return null;
    }

    // Extract Layer 2 reality expectations
    const evaluationAny = evaluation as any;
    const l2 = evaluationAny.layer2Insights?.criteria || {};
    const companyName = evaluation.company || evaluationAny.companyName || 'Target Company';
    const payload: NotificationPayload = {
      jobId: evaluation.jobId,
      jobTitle: evaluation.jobTitle,
      companyName,
      location: evaluation.location || 'San Francisco, CA (Hybrid)',
      applyUrl: `https://boards.greenhouse.io/${companyName.toLowerCase().replace(/\s+/g, '')}/jobs/${evaluation.jobId}`,
      matchScore: evaluation.finalScore,
      matchPercentage: evaluation.finalPercentage,
      verdict: evaluation.verdict,
      matchedSkills: evaluationAny.breakdown?.layer1Semantic?.matchedKeywords || ['PyTorch', 'Distributed Systems', 'Python'],
      missingSkills: evaluationAny.breakdown?.layer1Semantic?.missingKeywords || [],
      layer2Expectations: {
        oaDifficulty: l2.oaDifficulty || 'LeetCode Medium/Hard (Graphs & DP)',
        unspokenCriteria: l2.unspokenCriteria || 'Early applicants prioritized; fast OA turnaround required',
        gpaBar: l2.gpaCutoff ? `${l2.gpaCutoff}+ GPA bar` : undefined,
        timeWindow: l2.timeToReview || '48-hour OA Turnaround Window',
      },
      candidateName: candidateInfo?.name || 'Alex Rivera',
      candidateEmail: candidateInfo?.email || 'alex.rivera@stanford.edu',
      matchedAt: new Date().toISOString(),
      salarySnippet: '$55 - $75 / hr + Housing Stipend',
      sourceAts: 'greenhouse',
    };

    return this.dispatchPayload(payload, candidateId, options);
  }

  /**
   * Directly dispatches an alert payload across all enabled notification channels.
   */
  public async dispatchPayload(
    payload: NotificationPayload,
    candidateId = 'candidate-default-01',
    options: { forceSimulated?: boolean; bypassThreshold?: boolean } = {}
  ): Promise<AlertDispatchRecord> {
    const formatted = formatAlertMessage(payload);
    const tgConfig = telegramAlertService.getConfig();
    const emConfig = emailAlertService.getConfig();

    const dispatchStartTime = Date.now();

    // Parallel multi-channel dispatch
    const [tgResult, emResult] = await Promise.all([
      tgConfig.enabled
        ? telegramAlertService.sendAlert(payload, options.forceSimulated)
        : Promise.resolve({
            status: 'suppressed_threshold' as AlertDeliveryStatus,
            chatId: tgConfig.chatId,
            latencyMs: 0,
            isSimulated: true,
            messageId: undefined,
            deliveredAt: undefined,
            error: undefined,
          }),
      emConfig.enabled
        ? emailAlertService.sendAlert(payload, options.forceSimulated)
        : Promise.resolve({
            status: 'suppressed_threshold' as AlertDeliveryStatus,
            provider: emConfig.provider,
            toEmail: payload.candidateEmail || emConfig.toEmail,
            latencyMs: 0,
            isSimulated: true,
            messageId: undefined,
            deliveredAt: undefined,
            error: undefined,
          }),
    ]);

    const totalDuration = Date.now() - dispatchStartTime;

    // Update global telemetry
    this.stats.totalAlertsDispatched++;
    if (tgResult.status === 'delivered') this.stats.telegramDeliveredCount++;
    if (emResult.status === 'delivered') this.stats.emailDeliveredCount++;
    if (tgResult.status === 'failed' || emResult.status === 'failed') {
      this.stats.failedDeliveriesCount++;
    }

    // Moving average of latency
    this.stats.averageDispatchLatencyMs = Math.round(
      (this.stats.averageDispatchLatencyMs * (this.stats.totalAlertsDispatched - 1) + totalDuration) /
        this.stats.totalAlertsDispatched
    );

    const record: AlertDispatchRecord = {
      id: `alert-rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      jobId: payload.jobId,
      candidateId,
      jobTitle: payload.jobTitle,
      companyName: payload.companyName,
      matchScore: payload.matchScore,
      thresholdApplied: this.ruleConfig.minScoreThreshold,
      channels: {
        telegram: tgConfig.enabled
          ? {
              status: tgResult.status,
              chatId: tgResult.chatId,
              messageId: tgResult.messageId,
              deliveredAt: tgResult.deliveredAt,
              error: tgResult.error,
              latencyMs: tgResult.latencyMs,
            }
          : undefined,
        email: emConfig.enabled
          ? {
              status: emResult.status,
              provider: emResult.provider,
              toEmail: emResult.toEmail,
              messageId: emResult.messageId,
              deliveredAt: emResult.deliveredAt,
              error: emResult.error,
              latencyMs: emResult.latencyMs,
            }
          : undefined,
      },
      payload,
      formattedMessage: formatted,
      dispatchedAt: new Date().toISOString(),
      isSimulated: tgResult.isSimulated || emResult.isSimulated,
    };

    this.history.unshift(record);
    if (this.history.length > 200) {
      this.history = this.history.slice(0, 200);
    }

    return record;
  }

  /**
   * Anti-spam deduplication: Returns true if the same job was notified to the same candidate within window
   */
  private isDuplicateAlert(jobId: string, candidateId: string): boolean {
    const cutoff = Date.now() - this.ruleConfig.dedupWindowHours * 60 * 60 * 1000;
    return this.history.some(
      (rec) =>
        rec.jobId === jobId &&
        rec.candidateId === candidateId &&
        new Date(rec.dispatchedAt).getTime() > cutoff &&
        (rec.channels.telegram?.status === 'delivered' || rec.channels.email?.status === 'delivered')
    );
  }

  /**
   * Retries an alert dispatch for a historical record
   */
  public async retryDispatch(recordId: string): Promise<AlertDispatchRecord | null> {
    const existing = this.history.find((r) => r.id === recordId);
    if (!existing) return null;

    return this.dispatchPayload(existing.payload, existing.candidateId, { bypassThreshold: true });
  }

  /**
   * Seeds demo delivery history
   */
  private seedInitialHistory(): void {
    const demoPayload1: NotificationPayload = {
      jobId: 'job-gh-openai-01',
      jobTitle: 'Research Engineer Intern - Pretraining & Reasoning',
      companyName: 'OpenAI',
      location: 'San Francisco, CA (In-person)',
      applyUrl: 'https://openai.com/careers/research-engineer-intern',
      matchScore: 0.94,
      matchPercentage: 94,
      verdict: 'STRONG_MATCH',
      matchedSkills: ['PyTorch', 'Distributed Training', 'CUDA', 'Transformer Architectures', 'LLM Alignment'],
      missingSkills: ['Triton', 'vLLM'],
      layer2Expectations: {
        oaDifficulty: 'Codeforces 1800+ / Hard DP & Graph Theory',
        unspokenCriteria: 'Strong preference for NeurIPS/ICLR/CVPR first-author papers or major open source contributions',
        gpaBar: '3.8+ GPA preferred',
        timeWindow: '48-hour OA Turnaround Window',
      },
      candidateName: 'Alex Rivera',
      candidateEmail: 'alex.rivera@stanford.edu',
      matchedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      salarySnippet: '$80 - $95 / hr + Housing',
      sourceAts: 'greenhouse',
    };

    const formatted1 = formatAlertMessage(demoPayload1);

    this.history.push({
      id: 'alert-rec-seed-01',
      jobId: demoPayload1.jobId,
      candidateId: 'candidate-default-01',
      jobTitle: demoPayload1.jobTitle,
      companyName: demoPayload1.companyName,
      matchScore: 0.94,
      thresholdApplied: 0.75,
      channels: {
        telegram: {
          status: 'delivered',
          chatId: '@ai_internship_scout_alerts',
          messageId: 'tg_msg_9812401',
          deliveredAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
          latencyMs: 42,
        },
        email: {
          status: 'delivered',
          provider: 'resend',
          toEmail: 'alex.rivera@stanford.edu',
          messageId: 're_msg_884129',
          deliveredAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
          latencyMs: 65,
        },
      },
      payload: demoPayload1,
      formattedMessage: formatted1,
      dispatchedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      isSimulated: true,
    });

    const demoPayload2: NotificationPayload = {
      jobId: 'job-gh-stripe-02',
      jobTitle: 'Software Engineering Intern - Infrastructure & Core APIs',
      companyName: 'Stripe',
      location: 'San Francisco, CA / Seattle, WA',
      applyUrl: 'https://stripe.com/jobs/swe-intern',
      matchScore: 0.88,
      matchPercentage: 88,
      verdict: 'STRONG_MATCH',
      matchedSkills: ['Distributed Systems', 'Go', 'Ruby', 'gRPC', 'Database Indexing', 'Kafka'],
      missingSkills: ['Sorbet Typechecker', 'Bento'],
      layer2Expectations: {
        oaDifficulty: 'Custom Practical Coding Challenge (API building + Unit testing)',
        unspokenCriteria: 'Emphasis on clean code, edge-case coverage, and clear variable naming over raw algorithmic speed',
        gpaBar: 'No strict GPA cutoff',
        timeWindow: '7-day submission window',
      },
      candidateName: 'Alex Rivera',
      candidateEmail: 'alex.rivera@stanford.edu',
      matchedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      salarySnippet: '$68 / hr + Relocation Bonus',
      sourceAts: 'greenhouse',
    };

    const formatted2 = formatAlertMessage(demoPayload2);

    this.history.push({
      id: 'alert-rec-seed-02',
      jobId: demoPayload2.jobId,
      candidateId: 'candidate-default-01',
      jobTitle: demoPayload2.jobTitle,
      companyName: demoPayload2.companyName,
      matchScore: 0.88,
      thresholdApplied: 0.75,
      channels: {
        telegram: {
          status: 'delivered',
          chatId: '@ai_internship_scout_alerts',
          messageId: 'tg_msg_9812402',
          deliveredAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          latencyMs: 38,
        },
        email: {
          status: 'delivered',
          provider: 'resend',
          toEmail: 'alex.rivera@stanford.edu',
          messageId: 're_msg_884130',
          deliveredAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          latencyMs: 58,
        },
      },
      payload: demoPayload2,
      formattedMessage: formatted2,
      dispatchedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      isSimulated: true,
    });

    this.stats.totalTriggerEvaluations = 6;
    this.stats.totalAlertsDispatched = 2;
    this.stats.telegramDeliveredCount = 2;
    this.stats.emailDeliveredCount = 2;
    this.stats.thresholdFilteredCount = 4;
    this.stats.averageDispatchLatencyMs = 51;
  }
}

export const notificationDispatcher = new NotificationDispatcher();
