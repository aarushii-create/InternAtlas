/**
 * AI Internship Scout - Phase 10: Scraper Scheduler & Polling Engine
 * Manages opt-in polling through the same timeout, retry, and provider-throttled ATS adapters
 * used by direct ingestion.
 */

import { ScraperSchedule, ScraperTaskPayload, TaskResultSummary, QueueTask, ScraperBoardHealth } from '../../types';
import { taskQueue } from './taskQueue';
import { GreenhouseScraper } from '../scrapers/GreenhouseScraper';
import { LeverScraper } from '../scrapers/LeverScraper';
import { db } from '../../db/database';
import { TARGET_COMPANIES_CATALOG } from '../scrapers/targetCompaniesCatalog';

const DEFAULT_SCHEDULES_SEED: Omit<ScraperSchedule, 'lastRunAt' | 'nextRunAt' | 'consecutiveFailures' | 'totalRuns' | 'successfulRuns'>[] = [
  {
    id: 'sched-gh-openai',
    name: 'OpenAI Greenhouse Scraper',
    source: 'greenhouse',
    boardToken: 'openai',
    companyName: 'OpenAI',
    intervalMinutes: 15,
    staggerOffsetSeconds: 0,
    cronExpression: '*/15 * * * *',
    isEnabled: true,
    batchGroup: 'tier1_unicorns',
  },
  {
    id: 'sched-gh-stripe',
    name: 'Stripe Greenhouse Scraper',
    source: 'greenhouse',
    boardToken: 'stripe',
    companyName: 'Stripe',
    intervalMinutes: 15,
    staggerOffsetSeconds: 30,
    cronExpression: '*/15 * * * *',
    isEnabled: true,
    batchGroup: 'tier1_unicorns',
  },
  {
    id: 'sched-gh-figma',
    name: 'Figma Greenhouse Scraper',
    source: 'greenhouse',
    boardToken: 'figma',
    companyName: 'Figma',
    intervalMinutes: 15,
    staggerOffsetSeconds: 60,
    cronExpression: '*/15 * * * *',
    isEnabled: true,
    batchGroup: 'tier1_unicorns',
  },
  {
    id: 'sched-gh-databricks',
    name: 'Databricks Greenhouse Scraper',
    source: 'greenhouse',
    boardToken: 'databricks',
    companyName: 'Databricks',
    intervalMinutes: 20,
    staggerOffsetSeconds: 90,
    cronExpression: '*/20 * * * *',
    isEnabled: true,
    batchGroup: 'enterprise_ai',
  },
  {
    id: 'sched-gh-anthropic',
    name: 'Anthropic Greenhouse Scraper',
    source: 'greenhouse',
    boardToken: 'anthropic',
    companyName: 'Anthropic',
    intervalMinutes: 10,
    staggerOffsetSeconds: 120,
    cronExpression: '*/10 * * * *',
    isEnabled: true,
    batchGroup: 'tier1_unicorns',
  },
  {
    id: 'sched-gh-scaleai',
    name: 'Scale AI Greenhouse Scraper',
    source: 'greenhouse',
    boardToken: 'scaleai',
    companyName: 'Scale AI',
    intervalMinutes: 15,
    staggerOffsetSeconds: 150,
    cronExpression: '*/15 * * * *',
    isEnabled: true,
    batchGroup: 'enterprise_ai',
  },
  {
    id: 'sched-lever-palantir',
    name: 'Palantir Lever Scraper',
    source: 'lever',
    boardToken: 'palantir',
    companyName: 'Palantir Technologies',
    intervalMinutes: 20,
    staggerOffsetSeconds: 180,
    cronExpression: '*/20 * * * *',
    isEnabled: true,
    batchGroup: 'tier1_unicorns',
  },
  {
    id: 'sched-lever-coinbase',
    name: 'Coinbase Lever Scraper',
    source: 'lever',
    boardToken: 'coinbase',
    companyName: 'Coinbase',
    intervalMinutes: 30,
    staggerOffsetSeconds: 210,
    cronExpression: '*/30 * * * *',
    isEnabled: true,
    batchGroup: 'tier1_unicorns',
  },
  {
    id: 'sched-gh-snowflake',
    name: 'Snowflake Greenhouse Scraper',
    source: 'greenhouse',
    boardToken: 'snowflake',
    companyName: 'Snowflake',
    intervalMinutes: 30,
    staggerOffsetSeconds: 240,
    cronExpression: '*/30 * * * *',
    isEnabled: true,
    batchGroup: 'enterprise_ai',
  },
  {
    id: 'sched-gh-robinhood',
    name: 'Robinhood Greenhouse Scraper',
    source: 'greenhouse',
    boardToken: 'robinhood',
    companyName: 'Robinhood',
    intervalMinutes: 20,
    staggerOffsetSeconds: 270,
    cronExpression: '*/20 * * * *',
    isEnabled: true,
    batchGroup: 'tier1_unicorns',
  },
];

export class ScraperSchedulerEngine {
  private schedules: Map<string, ScraperSchedule> = new Map();
  private greenhouseScraper = new GreenhouseScraper();
  private leverScraper = new LeverScraper();
  private schedulerTimerHandle?: NodeJS.Timeout;
  private isRunning: boolean =
    process.env.ENABLE_LIVE_SCRAPING === 'true' &&
    process.env.ATS_TERMS_REVIEWED === 'true' &&
    process.env.ENABLE_SCRAPER_SCHEDULER === 'true';

  constructor() {
    this.initializeSchedules();
    this.registerWorkerHandlers();
    if (this.isRunning) this.startSchedulerLoop();
  }

  /**
   * Initializes default schedules with staggered nextRunAt offsets
   */
  public initializeSchedules(): void {
    const baseNow = Date.now();
    DEFAULT_SCHEDULES_SEED.forEach((seed, idx) => {
      // Calculate initial nextRunAt with stagger offset (e.g. + idx * 30 seconds)
      const staggerMs = (seed.staggerOffsetSeconds || idx * 30) * 1000;
      const nextRun = new Date(baseNow + staggerMs + 2000).toISOString();

      this.schedules.set(seed.id, {
        ...seed,
        isEnabled: seed.isEnabled && this.isRunning,
        lastRunAt: undefined,
        nextRunAt: nextRun,
        consecutiveFailures: 0,
        totalRuns: 0,
        successfulRuns: 0,
        lastRunStatus: undefined,
      });
    });
  }

  /**
   * Registers worker execution handlers with the TaskQueue
   */
  private registerWorkerHandlers(): void {
    taskQueue.registerHandler('greenhouse_poll', (task, log) => this.executeGreenhouseTask(task, log));
    taskQueue.registerHandler('lever_poll', (task, log) => this.executeLeverTask(task, log));
    taskQueue.registerHandler('custom_poll', async () => {
      throw new Error('No custom REST scraper connector is implemented.');
    });
    taskQueue.registerHandler('batch_poll', (task, log) => this.executeBatchPollTask(task, log));
  }

  /**
   * Background tick loop that evaluates schedules and enqueues due tasks
   */
  private startSchedulerLoop(): void {
    if (this.schedulerTimerHandle) {
      clearInterval(this.schedulerTimerHandle);
    }

    this.schedulerTimerHandle = setInterval(() => {
      if (this.isRunning) {
        this.evaluateDueSchedules();
      }
    }, 1000); // Check every second
  }

  /**
   * Evaluates if any active schedules have reached their nextRunAt timestamp
   */
  public evaluateDueSchedules(): ScraperSchedule[] {
    const now = Date.now();
    const dueSchedules: ScraperSchedule[] = [];

    for (const schedule of this.schedules.values()) {
      if (!schedule.isEnabled) continue;

      const nextTime = new Date(schedule.nextRunAt).getTime();
      if (now >= nextTime) {
        dueSchedules.push(schedule);
        this.triggerSchedule(schedule.id, false);
      }
    }

    return dueSchedules;
  }

  /**
   * Triggers a specific schedule immediately
   */
  public triggerSchedule(scheduleId: string, isManual: boolean = true): QueueTask | null {
    if (!this.isRunning) return null;
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    const taskType = schedule.source === 'greenhouse' ? 'greenhouse_poll' : 'lever_poll';
    const payload: ScraperTaskPayload = {
      source: schedule.source,
      boardToken: schedule.boardToken,
      companyName: schedule.companyName,
      scheduleId: schedule.id,
      forceFresh: isManual,
    };

    // Calculate next run time (current time + intervalMinutes + stagger offset jitter)
    const nextIntervalMs = schedule.intervalMinutes * 60 * 1000;
    const jitterOffsetMs = Math.floor(Math.random() * 10000 - 5000); // +/- 5s jitter
    schedule.nextRunAt = new Date(Date.now() + nextIntervalMs + jitterOffsetMs).toISOString();

    const task = taskQueue.enqueue({
      type: taskType,
      payload,
      priority: isManual ? 'high' : 'normal',
      maxAttempts: 1,
      backoffMs: 2000,
    });

    return task;
  }

  /**
   * Poll a configured Greenhouse board and persist its verified job snapshot.
   */
  private async executeGreenhouseTask(
    task: QueueTask,
    log: (level: 'info' | 'warn' | 'error' | 'debug', msg: string, meta?: any) => void
  ): Promise<TaskResultSummary> {
    const startTime = Date.now();
    const { boardToken, companyName } = task.payload;

    log('info', `Initiating Greenhouse poll for ${companyName} (${boardToken}).`);
    let normalizedJobs;
    try {
      normalizedJobs = await this.greenhouseScraper.fetchBoard(boardToken, companyName);
    } catch (error) {
      this.recordBoardHealth('greenhouse', boardToken, companyName, 'failed', undefined, error);
      throw error;
    }
    const rejectedJobCount = normalizedJobs.filter((job) =>
      !job.externalId || !job.jobTitle.trim() || !job.directApplyUrl
    ).length;
    this.recordBoardHealth(
      'greenhouse',
      boardToken,
      companyName,
      rejectedJobCount > 0 ? 'failed' : normalizedJobs.length > 0 ? 'healthy' : 'empty',
      normalizedJobs.length,
      rejectedJobCount > 0 ? new Error(`${rejectedJobCount} records lacked required job fields.`) : undefined
    );
    log('info', `Fetched ${normalizedJobs.length} postings from Greenhouse; ${rejectedJobCount} incomplete records.`);

    // Filter relevant software engineering & intern postings
    const internAndSweJobs = normalizedJobs.filter((job) => {
      const titleLower = job.jobTitle.toLowerCase();
      return (
        Boolean(job.externalId && job.jobTitle.trim() && job.directApplyUrl) && (
        titleLower.includes('intern') ||
        titleLower.includes('software') ||
        titleLower.includes('engineer') ||
        titleLower.includes('developer') ||
        titleLower.includes('ml') ||
        titleLower.includes('ai'))
      );
    });

    let insertedCount = 0;
    let deduplicatedCount = 0;

    for (const job of internAndSweJobs) {
      const upserted = db.upsertJob({
        source: 'greenhouse',
        atsProvider: 'greenhouse',
        dataOrigin: 'live',
        externalId: job.externalId,
        company: job.company,
        title: job.jobTitle,
        location: job.location,
        isRemote: job.isRemote,
        description: job.cleanDescription,
        rawJd: job.rawDescription,
        statedRequirements: job.statedRequirements,
        informalBar: job.informalBar,
        applyUrl: job.directApplyUrl,
        postedAt: job.postedAt,
      });
      if (upserted.isNew) insertedCount++;
      else deduplicatedCount++;
    }
    if (rejectedJobCount === 0) {
      db.deactivateMissingBoardJobs(companyName, 'greenhouse', internAndSweJobs.map((job) => job.externalId));
    }

    log('info', `Ingestion complete for ${companyName}: ${insertedCount} inserted, ${deduplicatedCount} deduplicated.`);

    // Update schedule stats if attached
    if (task.payload.scheduleId) {
      const schedule = this.schedules.get(task.payload.scheduleId);
      if (schedule) {
        schedule.lastRunAt = new Date().toISOString();
        schedule.totalRuns++;
        if (rejectedJobCount === 0) {
          schedule.successfulRuns++;
          schedule.consecutiveFailures = 0;
          schedule.lastRunStatus = 'success';
        } else {
          schedule.consecutiveFailures++;
          schedule.lastRunStatus = 'failure';
        }
        schedule.lastRunDurationMs = Date.now() - startTime;
      }
    }

    return {
      jobsFetched: normalizedJobs.length,
      jobsNormalized: internAndSweJobs.length,
      jobsInserted: insertedCount,
      jobsDeduplicated: deduplicatedCount,
      jobsDropped: Math.max(rejectedJobCount, normalizedJobs.length - internAndSweJobs.length),
      durationMs: Date.now() - startTime,
      proxyUsed: 'direct-egress',
      httpStatusCode: 200,
    };
  }

  /**
   * Worker Execution: Lever ATS Polling
   */
  private async executeLeverTask(
    task: QueueTask,
    log: (level: 'info' | 'warn' | 'error' | 'debug', msg: string, meta?: any) => void
  ): Promise<TaskResultSummary> {
    const startTime = Date.now();
    const { boardToken, companyName } = task.payload;

    log('info', `Initiating Lever poll for ${companyName} (${boardToken}).`);
    let normalizedJobs;
    try {
      normalizedJobs = await this.leverScraper.fetchBoard(boardToken, companyName);
    } catch (error) {
      this.recordBoardHealth('lever', boardToken, companyName, 'failed', undefined, error);
      throw error;
    }
    const rejectedJobCount = normalizedJobs.filter((job) =>
      !job.externalId || !job.jobTitle.trim() || !job.directApplyUrl
    ).length;
    this.recordBoardHealth(
      'lever',
      boardToken,
      companyName,
      rejectedJobCount > 0 ? 'failed' : normalizedJobs.length > 0 ? 'healthy' : 'empty',
      normalizedJobs.length,
      rejectedJobCount > 0 ? new Error(`${rejectedJobCount} records lacked required job fields.`) : undefined
    );
    log('info', `Fetched ${normalizedJobs.length} postings from Lever; ${rejectedJobCount} incomplete records.`);

    let insertedCount = 0;
    let deduplicatedCount = 0;

    for (const job of normalizedJobs) {
      if (!job.externalId || !job.jobTitle.trim() || !job.directApplyUrl) continue;
      const upserted = db.upsertJob({
        source: 'lever',
        atsProvider: 'lever',
        dataOrigin: 'live',
        externalId: job.externalId,
        company: job.company,
        title: job.jobTitle,
        location: job.location,
        isRemote: job.isRemote,
        description: job.cleanDescription,
        rawJd: job.rawDescription,
        statedRequirements: job.statedRequirements,
        informalBar: job.informalBar,
        applyUrl: job.directApplyUrl,
        postedAt: job.postedAt,
      });
      if (upserted.isNew) insertedCount++;
      else deduplicatedCount++;
    }

    if (rejectedJobCount === 0) {
      db.deactivateMissingBoardJobs(companyName, 'lever', normalizedJobs.map((job) => job.externalId));
    }

    // Update schedule stats if attached
    if (task.payload.scheduleId) {
      const schedule = this.schedules.get(task.payload.scheduleId);
      if (schedule) {
        schedule.lastRunAt = new Date().toISOString();
        schedule.totalRuns++;
        if (rejectedJobCount === 0) {
          schedule.successfulRuns++;
          schedule.consecutiveFailures = 0;
          schedule.lastRunStatus = 'success';
        } else {
          schedule.consecutiveFailures++;
          schedule.lastRunStatus = 'failure';
        }
        schedule.lastRunDurationMs = Date.now() - startTime;
      }
    }

    return {
      jobsFetched: normalizedJobs.length,
      jobsNormalized: normalizedJobs.length,
      jobsInserted: insertedCount,
      jobsDeduplicated: deduplicatedCount,
      jobsDropped: rejectedJobCount,
      durationMs: Date.now() - startTime,
      proxyUsed: 'direct-egress',
      httpStatusCode: 200,
    };
  }

  private recordBoardHealth(
    provider: 'greenhouse' | 'lever',
    boardToken: string,
    companyName: string,
    status: 'healthy' | 'empty' | 'failed',
    fetchedCount?: number,
    error?: unknown
  ): void {
    const company = TARGET_COMPANIES_CATALOG.find((entry) =>
      entry.atsProvider === provider &&
      (entry.name.toLowerCase() === companyName.toLowerCase() || entry.boardToken.toLowerCase() === boardToken.toLowerCase())
    );
    const previous = company
      ? db.getScraperBoardHealth().find((entry) => entry.companyId === company.id)
      : undefined;
    const health: ScraperBoardHealth = {
      companyId: company?.id ?? `${provider}-${boardToken}`,
      company: companyName,
      provider,
      connectorStatus: 'supported',
      verificationStatus: status,
      lastAttemptAt: new Date().toISOString(),
      ...(status === 'healthy' || status === 'empty'
        ? { lastSuccessfulFetchAt: new Date().toISOString(), lastFetchedJobCount: fetchedCount }
        : {
            lastSuccessfulFetchAt: previous?.lastSuccessfulFetchAt,
            lastFetchedJobCount: previous?.lastFetchedJobCount,
          }),
      ...(error
        ? { lastError: error instanceof Error ? error.message : 'Unknown board fetch error.' }
        : status === 'failed' ? { lastError: 'Board fetch failed.' } : {}),
    };
    db.upsertScraperBoardHealth(health);
  }

  /**
   * Worker Execution: Batch Poll All Active Schedules
   */
  private async executeBatchPollTask(
    task: QueueTask,
    log: (level: 'info' | 'warn' | 'error' | 'debug', msg: string, meta?: any) => void
  ): Promise<TaskResultSummary> {
    const startTime = Date.now();
    log('info', `Batch poll initiated across all enabled schedules.`);

    const enabled = Array.from(this.schedules.values()).filter((s) => s.isEnabled);
    let totalFetched = 0;
    let totalInserted = 0;
    let totalDedup = 0;

    for (const sched of enabled) {
      this.triggerSchedule(sched.id, true);
    }

    return {
      jobsFetched: totalFetched,
      jobsNormalized: totalFetched,
      jobsInserted: totalInserted,
      jobsDeduplicated: totalDedup,
      jobsDropped: 0,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Gets list of all configured schedules
   */
  public getAllSchedules(): ScraperSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Gets specific schedule by ID
   */
  public getScheduleById(id: string): ScraperSchedule | undefined {
    return this.schedules.get(id);
  }

  /**
   * Updates schedule parameters (interval, isEnabled, staggerOffsetSeconds)
   */
  public updateSchedule(
    id: string,
    updates: Partial<Pick<ScraperSchedule, 'intervalMinutes' | 'isEnabled' | 'staggerOffsetSeconds' | 'batchGroup'>>
  ): ScraperSchedule | null {
    const sched = this.schedules.get(id);
    if (!sched) return null;

    if (typeof updates.intervalMinutes === 'number') {
      sched.intervalMinutes = Math.max(5, Math.min(120, updates.intervalMinutes));
      sched.cronExpression = `*/${sched.intervalMinutes} * * * *`;
    }
    if (typeof updates.isEnabled === 'boolean') {
      sched.isEnabled = updates.isEnabled;
    }
    if (typeof updates.staggerOffsetSeconds === 'number') {
      sched.staggerOffsetSeconds = updates.staggerOffsetSeconds;
    }
    if (updates.batchGroup) {
      sched.batchGroup = updates.batchGroup;
    }

    return sched;
  }

  /**
   * Toggles schedule enabled state
   */
  public toggleSchedule(id: string): ScraperSchedule | null {
    const sched = this.schedules.get(id);
    if (!sched) return null;
    sched.isEnabled = !sched.isEnabled;
    return sched;
  }

  /**
   * Trigger batch stagger run for all schedules with offset intervals
   */
  public triggerStaggeredBatch(): { triggeredCount: number; schedules: string[] } {
    const active = Array.from(this.schedules.values()).filter((s) => s.isEnabled);
    const triggeredIds: string[] = [];

    active.forEach((sched, index) => {
      // Stagger each task by 200ms in queue priority
      setTimeout(() => {
        this.triggerSchedule(sched.id, true);
      }, index * 200);
      triggeredIds.push(sched.id);
    });

    return {
      triggeredCount: active.length,
      schedules: triggeredIds,
    };
  }
}

export const scraperScheduler = new ScraperSchedulerEngine();
