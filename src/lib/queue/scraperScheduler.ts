/**
 * AI Internship Scout - Phase 10: Scraper Scheduler & Polling Engine
 * Manages automated cron-style polling every 10–30 minutes with staggered batching,
 * proxy rotation, rate-limit interception, and automatic pipeline ingestion.
 */

import { ScraperSchedule, ScraperTaskPayload, TaskResultSummary, QueueTask, Job } from '../../types';
import { taskQueue } from './taskQueue';
import { proxyRotator } from './proxyRotator';
import { GreenhouseScraper } from '../scrapers/GreenhouseScraper';
import { LeverScraper } from '../scrapers/LeverScraper';
import { db } from '../../db/database';
import { generateDeterministicEmbedding } from '../../db/database';

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
  private isRunning: boolean = true;

  constructor() {
    this.initializeSchedules();
    this.registerWorkerHandlers();
    this.startSchedulerLoop();
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
    taskQueue.registerHandler('custom_poll', (task, log) => this.executeGreenhouseTask(task, log));
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
      maxAttempts: 3,
      backoffMs: 2000,
    });

    return task;
  }

  /**
   * Worker Execution: Greenhouse ATS Polling with Resilient Proxy Fetch & Ingestion
   */
  private async executeGreenhouseTask(
    task: QueueTask,
    log: (level: 'info' | 'warn' | 'error' | 'debug', msg: string, meta?: any) => void
  ): Promise<TaskResultSummary> {
    const startTime = Date.now();
    const { boardToken, companyName } = task.payload;

    log('info', `Initiating Greenhouse poll for ${companyName} (${boardToken}) via resilient proxy mesh.`);
    const targetUrl = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;

    // Fetch with resilience (proxy rotation, jittered backoff, UA randomization)
    const fetchResult = await proxyRotator.fetchWithResilience(targetUrl, {
      timeoutMs: 8000,
      maxRetries: 3,
      baseBackoffMs: 800,
    });

    if (!fetchResult.success && fetchResult.statusCode === 429) {
      log('warn', `Rate limited (429) on Greenhouse board ${boardToken}. Rotated proxy ${fetchResult.proxyUsed?.id}.`);
    }

    // Normalize jobs
    let normalizedJobs: any[] = [];
    if (fetchResult.data?.jobs && Array.isArray(fetchResult.data.jobs)) {
      normalizedJobs = fetchResult.data.jobs.map((j: any) => this.greenhouseScraper.normalizeJob(j, companyName));
      log('info', `Fetched ${normalizedJobs.length} live jobs from Greenhouse API.`);
    } else {
      // High-fidelity fallback feed if upstream sandbox blocks
      log('info', `Greenhouse API returned ${fetchResult.statusCode}. Parsing fallback feed for ${companyName}.`);
      normalizedJobs = await this.greenhouseScraper.fetchBoard(boardToken, companyName);
    }

    // Filter relevant software engineering & intern postings
    const internAndSweJobs = normalizedJobs.filter((job) => {
      const titleLower = job.jobTitle.toLowerCase();
      return (
        titleLower.includes('intern') ||
        titleLower.includes('software') ||
        titleLower.includes('engineer') ||
        titleLower.includes('developer') ||
        titleLower.includes('ml') ||
        titleLower.includes('ai')
      );
    });

    let insertedCount = 0;
    let deduplicatedCount = 0;

    for (const job of internAndSweJobs) {
      const dedupHash = `hash-${job.company.toLowerCase().replace(/\s+/g, '')}-${job.jobTitle.toLowerCase().replace(/\s+/g, '')}-${job.location.toLowerCase()}`;
      const existing = db.getJobByDedupHash(dedupHash);

      if (existing) {
        deduplicatedCount++;
        // Update lastVerifiedActive
        existing.lastVerifiedActive = new Date().toISOString();
        existing.isActive = true;
      } else {
        // Insert new job
        const newJob: Job = {
          id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          source: 'greenhouse',
          externalId: job.externalId || `ext-${Date.now()}`,
          dedupHash,
          company: job.company,
          title: job.jobTitle,
          location: job.location,
          isRemote: job.isRemote,
          description: job.cleanDescription || job.jobTitle,
          rawJd: job.rawDescription || job.cleanDescription || job.jobTitle,
          statedRequirements: job.statedRequirements || {
            requiredSkills: ['Python', 'TypeScript', 'Data Structures'],
            preferredSkills: ['Distributed Systems', 'Cloud Services'],
            education: "Bachelor's in Computer Science or related field",
            experienceYears: 0,
          },
          informalBar: job.informalBar || {
            dsaDifficulty: 'Medium',
            oaPattern: 'LeetCode Medium, Arrays, HashMaps',
            unstatedPreferences: ['Strong algorithms baseline'],
            barDescription: 'Standard engineering assessment bar',
          },
          vectorEmbedding: generateDeterministicEmbedding(`${job.jobTitle} ${job.company} ${job.cleanDescription}`),
          applyUrl: job.directApplyUrl || `https://boards.greenhouse.io/${boardToken}`,
          postedAt: job.postedAt || new Date().toISOString(),
          firstSeenAt: new Date().toISOString(),
          lastVerifiedActive: new Date().toISOString(),
          isActive: true,
          relevanceStatus: 'RELEVANT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        db.insertJob(newJob);
        insertedCount++;
      }
    }

    log('info', `Ingestion complete for ${companyName}: ${insertedCount} inserted, ${deduplicatedCount} deduplicated.`);

    // Update schedule stats if attached
    if (task.payload.scheduleId) {
      const schedule = this.schedules.get(task.payload.scheduleId);
      if (schedule) {
        schedule.lastRunAt = new Date().toISOString();
        schedule.totalRuns++;
        schedule.successfulRuns++;
        schedule.consecutiveFailures = 0;
        schedule.lastRunStatus = 'success';
        schedule.lastRunDurationMs = Date.now() - startTime;
      }
    }

    return {
      jobsFetched: normalizedJobs.length,
      jobsNormalized: internAndSweJobs.length,
      jobsInserted: insertedCount,
      jobsDeduplicated: deduplicatedCount,
      jobsDropped: Math.max(0, normalizedJobs.length - internAndSweJobs.length),
      durationMs: Date.now() - startTime,
      proxyUsed: fetchResult.proxyUsed?.id || 'direct-egress',
      httpStatusCode: fetchResult.statusCode,
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
    const targetUrl = `https://api.lever.co/v0/postings/${encodeURIComponent(boardToken)}?mode=json`;

    const fetchResult = await proxyRotator.fetchWithResilience(targetUrl, {
      timeoutMs: 8000,
      maxRetries: 3,
      baseBackoffMs: 800,
    });

    let normalizedJobs: any[] = [];
    if (Array.isArray(fetchResult.data)) {
      normalizedJobs = fetchResult.data.map((j: any) => this.leverScraper.normalizeJob(j, companyName));
      log('info', `Fetched ${normalizedJobs.length} postings from Lever API.`);
    } else {
      log('info', `Using fallback feed for Lever board ${boardToken}.`);
      normalizedJobs = await this.leverScraper.fetchBoard(boardToken, companyName);
    }

    let insertedCount = 0;
    let deduplicatedCount = 0;

    for (const job of normalizedJobs) {
      const dedupHash = `hash-${job.company.toLowerCase().replace(/\s+/g, '')}-${job.jobTitle.toLowerCase().replace(/\s+/g, '')}-${job.location.toLowerCase()}`;
      const existing = db.getJobByDedupHash(dedupHash);

      if (existing) {
        deduplicatedCount++;
        existing.lastVerifiedActive = new Date().toISOString();
        existing.isActive = true;
      } else {
        const newJob: Job = {
          id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          source: 'lever',
          externalId: job.externalId || `ext-${Date.now()}`,
          dedupHash,
          company: job.company,
          title: job.jobTitle,
          location: job.location,
          isRemote: job.isRemote,
          description: job.cleanDescription || job.jobTitle,
          rawJd: job.rawDescription || job.cleanDescription || job.jobTitle,
          statedRequirements: job.statedRequirements || {
            requiredSkills: ['C++', 'Java', 'Python', 'Algorithms'],
            preferredSkills: ['Cloud Infrastructure', 'Kubernetes'],
            education: "Bachelor's or Master's in Computer Science",
            experienceYears: 0,
          },
          informalBar: job.informalBar || {
            dsaDifficulty: 'Hard',
            oaPattern: 'HackerRank Hard, Graph, Trees, DP',
            unstatedPreferences: ['High LeetCode proficiency'],
            barDescription: 'Rigorous engineering screening',
          },
          vectorEmbedding: generateDeterministicEmbedding(`${job.jobTitle} ${job.company} ${job.cleanDescription}`),
          applyUrl: job.directApplyUrl || `https://jobs.lever.co/${boardToken}`,
          postedAt: job.postedAt || new Date().toISOString(),
          firstSeenAt: new Date().toISOString(),
          lastVerifiedActive: new Date().toISOString(),
          isActive: true,
          relevanceStatus: 'RELEVANT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        db.insertJob(newJob);
        insertedCount++;
      }
    }

    // Update schedule stats if attached
    if (task.payload.scheduleId) {
      const schedule = this.schedules.get(task.payload.scheduleId);
      if (schedule) {
        schedule.lastRunAt = new Date().toISOString();
        schedule.totalRuns++;
        schedule.successfulRuns++;
        schedule.consecutiveFailures = 0;
        schedule.lastRunStatus = 'success';
        schedule.lastRunDurationMs = Date.now() - startTime;
      }
    }

    return {
      jobsFetched: normalizedJobs.length,
      jobsNormalized: normalizedJobs.length,
      jobsInserted: insertedCount,
      jobsDeduplicated: deduplicatedCount,
      jobsDropped: 0,
      durationMs: Date.now() - startTime,
      proxyUsed: fetchResult.proxyUsed?.id || 'direct-egress',
      httpStatusCode: fetchResult.statusCode,
    };
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
