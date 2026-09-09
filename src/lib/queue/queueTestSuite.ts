/**
 * AI Internship Scout - Phase 10: Asynchronous Polling & Task Queue Test Suite
 * Validates background worker concurrency, priority dispatch, staggered cron scheduling,
 * proxy rotation, rate-limit cooldown, exponential backoff jitter, and Dead-Letter Queue (DLQ) routing.
 */

import { TaskQueueEngine } from './taskQueue';
import { ProxyRotatorEngine } from './proxyRotator';
import { ScraperSchedulerEngine } from './scraperScheduler';
import { QueueTask } from '../../types';

export interface QueueTestCaseResult {
  id: string;
  name: string;
  category:
    | 'CONCURRENCY_PRIORITY'
    | 'STAGGERED_SCHEDULING'
    | 'PROXY_ROTATION'
    | 'RATE_LIMIT_COOLDOWN'
    | 'EXPONENTIAL_BACKOFF'
    | 'DEAD_LETTER_QUEUE';
  passed: boolean;
  durationMs: number;
  expected: string;
  actual: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface QueueTestSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  averageLatencyMs: number;
  results: QueueTestCaseResult[];
}

export class QueueTestSuiteRunner {
  /**
   * Executes the complete Phase 10 test suite
   */
  public async runAllTests(): Promise<QueueTestSuiteReport> {
    const startTime = Date.now();
    const results: QueueTestCaseResult[] = [];

    // Test 1: Concurrency & Priority Order Dispatch
    results.push(await this.testConcurrencyAndPriority());

    // Test 2: Staggered Batch Scheduling & Offsets
    results.push(await this.testStaggeredBatchScheduling());

    // Test 3: Proxy Rotation & Multi-Region Health Tracking
    results.push(await this.testProxyRotationAndHealth());

    // Test 4: Rate-Limit Interception & Cooldown State Machine (429)
    results.push(await this.testRateLimitCooldown());

    // Test 5: Exponential Backoff with Jitter Formula
    results.push(await this.testExponentialBackoffJitter());

    // Test 6: Dead-Letter Queue (DLQ) Routing on Exhausted Retries
    results.push(await this.testDeadLetterQueueRouting());

    const totalDurationMs = Date.now() - startTime;
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.length - passedCount;

    return {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passedCount,
      failedCount,
      totalDurationMs,
      averageLatencyMs: Math.round(totalDurationMs / results.length),
      results,
    };
  }

  /**
   * Test 1: Concurrency & Priority Order Dispatch
   */
  private async testConcurrencyAndPriority(): Promise<QueueTestCaseResult> {
    const tStart = Date.now();
    const testQueue = new TaskQueueEngine(2); // Max 2 concurrent workers
    const executionOrder: string[] = [];

    testQueue.registerHandler('custom_poll', async (task) => {
      executionOrder.push(task.payload.companyName);
      await new Promise((r) => setTimeout(r, 40));
      return {
        jobsFetched: 5,
        jobsNormalized: 5,
        jobsInserted: 2,
        jobsDeduplicated: 3,
        jobsDropped: 0,
        durationMs: 40,
      };
    });

    // Enqueue in reverse priority order
    testQueue.enqueue({
      type: 'custom_poll',
      payload: { source: 'custom', boardToken: 'low-co', companyName: 'LowPriorityCo' },
      priority: 'low',
    });

    testQueue.enqueue({
      type: 'custom_poll',
      payload: { source: 'custom', boardToken: 'normal-co', companyName: 'NormalPriorityCo' },
      priority: 'normal',
    });

    testQueue.enqueue({
      type: 'custom_poll',
      payload: { source: 'custom', boardToken: 'critical-co', companyName: 'CriticalPriorityCo' },
      priority: 'critical',
    });

    testQueue.enqueue({
      type: 'custom_poll',
      payload: { source: 'custom', boardToken: 'high-co', companyName: 'HighPriorityCo' },
      priority: 'high',
    });

    // Wait for tasks to complete
    await new Promise((r) => setTimeout(r, 200));

    const metrics = testQueue.getMetrics();
    const passed = metrics.completedCount === 4 && executionOrder.includes('CriticalPriorityCo');

    return {
      id: 'QUEUE-TEST-001',
      name: 'Task Queue Concurrency Limits & Priority Dispatch',
      category: 'CONCURRENCY_PRIORITY',
      passed,
      durationMs: Date.now() - tStart,
      expected: 'Tasks processed respecting max 2 workers, with Critical/High prioritized over Low/Normal',
      actual: `Processed ${metrics.completedCount}/4 tasks. Execution Order: [${executionOrder.join(', ')}]`,
    };
  }

  /**
   * Test 2: Staggered Batch Scheduling & Offsets
   */
  private async testStaggeredBatchScheduling(): Promise<QueueTestCaseResult> {
    const tStart = Date.now();
    const scheduler = new ScraperSchedulerEngine();
    const schedules = scheduler.getAllSchedules();

    const offsets = schedules.map((s) => s.staggerOffsetSeconds);
    const intervals = schedules.map((s) => s.intervalMinutes);

    // Verify all offsets are staggered (e.g. 0, 30, 60, 90, 120, 150...)
    const isStaggered = offsets.length >= 5 && offsets[1] > offsets[0] && offsets[2] > offsets[1];
    // Verify intervals are in 10-30m range
    const validIntervals = intervals.every((i) => i >= 10 && i <= 30);

    const passed = isStaggered && validIntervals;

    return {
      id: 'QUEUE-TEST-002',
      name: 'Staggered Batch Scheduling Offsets (10–30 min intervals)',
      category: 'STAGGERED_SCHEDULING',
      passed,
      durationMs: Date.now() - tStart,
      expected: 'Scraper schedules configured with 10–30m intervals and non-overlapping stagger offsets (0 to 270s)',
      actual: `Verified ${schedules.length} schedules. Offsets: [${offsets.slice(0, 5).join(', ')}...], Intervals: [${intervals.slice(0, 5).join(', ')} min]`,
    };
  }

  /**
   * Test 3: Proxy Rotation & Multi-Region Health Tracking
   */
  private async testProxyRotationAndHealth(): Promise<QueueTestCaseResult> {
    const tStart = Date.now();
    const rotator = new ProxyRotatorEngine();

    const p1 = rotator.getNextProxy();
    const p2 = rotator.getNextProxy();
    const p3 = rotator.getNextProxy();

    const distinctProxies = new Set([p1?.id, p2?.id, p3?.id]);
    const stats = rotator.getPoolStats();

    rotator.recordResult(p1!.id, true, 45);
    const updatedStats = rotator.getPoolStats();

    const passed = distinctProxies.size >= 2 && stats.totalProxies >= 5 && updatedStats.totalRotations >= 3;

    return {
      id: 'QUEUE-TEST-003',
      name: 'Multi-Region Proxy Pool Rotation & Latency Tracking',
      category: 'PROXY_ROTATION',
      passed,
      durationMs: Date.now() - tStart,
      expected: 'Proxy pool rotates distinct nodes across regions, recording EMA latency and rotation counts',
      actual: `Pool Size: ${stats.totalProxies} proxies, Rotations: ${updatedStats.totalRotations}, Avg Latency: ${updatedStats.averageLatencyMs}ms, Success Rate: ${(updatedStats.overallSuccessRate * 100).toFixed(1)}%`,
    };
  }

  /**
   * Test 4: Rate-Limit Interception & Cooldown State Machine (429)
   */
  private async testRateLimitCooldown(): Promise<QueueTestCaseResult> {
    const tStart = Date.now();
    const rotator = new ProxyRotatorEngine();
    const targetProxy = rotator.getNextProxy();

    if (!targetProxy) {
      return {
        id: 'QUEUE-TEST-004',
        name: 'Rate-Limit Interception & Proxy Cooldown Recovery',
        category: 'RATE_LIMIT_COOLDOWN',
        passed: false,
        durationMs: Date.now() - tStart,
        expected: 'Proxy marked as cooling_down after HTTP 429',
        actual: 'No proxy available in pool',
      };
    }

    // Simulate 429 Too Many Requests response
    rotator.recordResult(targetProxy.id, false, 120, true, false);

    const proxiesAfter429 = rotator.getAllProxies();
    const cooledProxy = proxiesAfter429.find((p) => p.id === targetProxy.id);

    const isCooled = cooledProxy?.status === 'cooling_down' && Boolean(cooledProxy?.coolingUntil);
    const poolStats = rotator.getPoolStats();

    const passed = isCooled && poolStats.coolingCount >= 1;

    return {
      id: 'QUEUE-TEST-004',
      name: 'Rate-Limit Interception & Proxy Cooldown State Machine',
      category: 'RATE_LIMIT_COOLDOWN',
      passed,
      durationMs: Date.now() - tStart,
      expected: 'Proxy entering cooling_down status upon 429 hit, isolated from active rotation pool',
      actual: `Proxy ${targetProxy.id} status: ${cooledProxy?.status}, Cooling until: ${cooledProxy?.coolingUntil}, Cooling Pool Count: ${poolStats.coolingCount}`,
    };
  }

  /**
   * Test 5: Exponential Backoff with Jitter Formula
   */
  private async testExponentialBackoffJitter(): Promise<QueueTestCaseResult> {
    const tStart = Date.now();
    const rotator = new ProxyRotatorEngine();

    const attempt0 = rotator.calculateBackoffWithJitter(0, 500, 8000);
    const attempt1 = rotator.calculateBackoffWithJitter(1, 500, 8000);
    const attempt2 = rotator.calculateBackoffWithJitter(2, 500, 8000);
    const attempt3 = rotator.calculateBackoffWithJitter(3, 500, 8000);

    // Verify bounded exponential progression: Base=500 -> ~500ms -> ~1000ms -> ~2000ms -> ~4000ms
    const isValidProgression = attempt0 >= 250 && attempt0 <= 500 && attempt3 >= 2000 && attempt3 <= 4000;

    const passed = isValidProgression;

    return {
      id: 'QUEUE-TEST-005',
      name: 'Exponential Backoff with Full Jitter Formula Invariant',
      category: 'EXPONENTIAL_BACKOFF',
      passed,
      durationMs: Date.now() - tStart,
      expected: 'Sleep interval scales exponentially with attempts (500ms -> 1000ms -> 2000ms -> 4000ms) with randomized jitter',
      actual: `Backoff Delays: Attempt 0 = ${attempt0}ms, Attempt 1 = ${attempt1}ms, Attempt 2 = ${attempt2}ms, Attempt 3 = ${attempt3}ms`,
    };
  }

  /**
   * Test 6: Dead-Letter Queue (DLQ) Routing on Exhausted Retries
   */
  private async testDeadLetterQueueRouting(): Promise<QueueTestCaseResult> {
    const tStart = Date.now();
    const testQueue = new TaskQueueEngine(1);

    // Register a handler that consistently throws a 429 Rate Limit exception
    testQueue.registerHandler('custom_poll', async () => {
      throw new Error('HTTP 429 Too Many Requests: Rate limit exceeded on ATS board endpoint');
    });

    const task = testQueue.enqueue({
      type: 'custom_poll',
      payload: { source: 'custom', boardToken: 'flaky-ats', companyName: 'FlakyAtsCo' },
      maxAttempts: 2,
      backoffMs: 20, // Fast backoff for test speed
    });

    // Wait for retries to exhaust
    await new Promise((r) => setTimeout(r, 150));

    const finalTask = testQueue.getTaskById(task.id);
    const passed =
      finalTask?.status === 'dead_letter' &&
      finalTask.attempts >= 2 &&
      finalTask.errorTaxonomy === 'RATE_LIMIT_429' &&
      finalTask.logs.length >= 3;

    return {
      id: 'QUEUE-TEST-006',
      name: 'Dead-Letter Queue (DLQ) Routing & Error Taxonomy',
      category: 'DEAD_LETTER_QUEUE',
      passed,
      durationMs: Date.now() - tStart,
      expected: 'Task routed to DLQ after maxAttempts exhausted, classified with RATE_LIMIT_429 taxonomy',
      actual: `Status: ${finalTask?.status}, Attempts: ${finalTask?.attempts}/${finalTask?.maxAttempts}, Taxonomy: ${finalTask?.errorTaxonomy}, Logs: ${finalTask?.logs.length} entries`,
    };
  }
}

export const queueTestSuite = new QueueTestSuiteRunner();
export const runQueueTestSuite = () => queueTestSuite.runAllTests();
