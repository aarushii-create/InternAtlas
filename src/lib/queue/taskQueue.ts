/**
 * AI Internship Scout - Phase 10: Asynchronous Task Queue Engine
 * Concurrency-controlled, priority-aware background worker queue with exponential backoff retries,
 * dead-letter routing, granular event logging, and execution telemetry.
 */

import {
  QueueTask,
  TaskStatus,
  TaskPriority,
  ScraperJobType,
  ScraperTaskPayload,
  TaskResultSummary,
  TaskLogEntry,
  TaskQueueMetrics,
} from '../../types';

export type TaskHandler = (task: QueueTask, log: (level: TaskLogEntry['level'], msg: string, meta?: any) => void) => Promise<TaskResultSummary>;

const PRIORITY_SCORES: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export class TaskQueueEngine {
  private tasks: Map<string, QueueTask> = new Map();
  private handlers: Map<ScraperJobType, TaskHandler> = new Map();
  private concurrencyLimit: number = 3;
  private activeWorkers: number = 0;
  private isRunning: boolean = true;
  private totalEnqueued: number = 0;
  private startedAtTimestamp: number = Date.now();
  private dispatchIntervalHandle?: NodeJS.Timeout;

  constructor(concurrencyLimit: number = 3) {
    this.concurrencyLimit = concurrencyLimit;
    this.startDispatcher();
  }

  /**
   * Registers a task execution handler for a specific job type
   */
  public registerHandler(type: ScraperJobType, handler: TaskHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Starts background dispatch loop to process queued and retriable tasks
   */
  private startDispatcher(): void {
    if (this.dispatchIntervalHandle) {
      clearInterval(this.dispatchIntervalHandle);
    }

    this.dispatchIntervalHandle = setInterval(() => {
      if (this.isRunning) {
        this.processNext();
      }
    }, 500); // Check every 500ms
  }

  /**
   * Enqueues a new background task
   */
  public enqueue(options: {
    type: ScraperJobType;
    payload: ScraperTaskPayload;
    priority?: TaskPriority;
    maxAttempts?: number;
    backoffMs?: number;
  }): QueueTask {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const task: QueueTask = {
      id,
      type: options.type,
      priority: options.priority || 'normal',
      status: 'queued',
      payload: options.payload,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      backoffMs: options.backoffMs ?? 2000,
      logs: [
        {
          timestamp: now,
          level: 'info',
          message: `Task enqueued for ${options.payload.companyName} (${options.type}) with priority ${options.priority || 'normal'}.`,
        },
      ],
      createdAt: now,
    };

    this.tasks.set(id, task);
    this.totalEnqueued++;

    // Immediately trigger worker dispatch
    setTimeout(() => this.processNext(), 10);
    return task;
  }

  /**
   * Appends a log line to a specific task
   */
  public appendLog(taskId: string, level: TaskLogEntry['level'], message: string, metadata?: Record<string, any>): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
    });
  }

  /**
   * Picks the next highest-priority eligible task and executes it within concurrency bounds
   */
  public async processNext(): Promise<void> {
    if (this.activeWorkers >= this.concurrencyLimit) {
      return;
    }

    const now = Date.now();
    const candidateTasks = Array.from(this.tasks.values()).filter((t) => {
      if (t.status === 'queued') return true;
      if (t.status === 'retrying' && t.nextRetryAt) {
        return new Date(t.nextRetryAt).getTime() <= now;
      }
      return false;
    });

    if (candidateTasks.length === 0) {
      return;
    }

    // Sort by Priority (descending), then CreatedAt (ascending FIFO)
    candidateTasks.sort((a, b) => {
      const priorityDiff = PRIORITY_SCORES[b.priority] - PRIORITY_SCORES[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const task = candidateTasks[0];
    const handler = this.handlers.get(task.type);

    if (!handler) {
      task.status = 'failed';
      task.lastError = `No registered worker handler for task type: ${task.type}`;
      this.appendLog(task.id, 'error', task.lastError);
      return;
    }

    // Mark as running
    this.activeWorkers++;
    task.status = 'running';
    task.attempts++;
    task.startedAt = new Date().toISOString();
    const workerId = `worker-${Math.floor(Math.random() * 8) + 1}`;
    task.assignedWorkerId = workerId;

    this.appendLog(
      task.id,
      'info',
      `Worker ${workerId} picked up execution (Attempt ${task.attempts}/${task.maxAttempts}).`
    );

    const execStart = Date.now();

    try {
      const result = await handler(task, (level, msg, meta) => this.appendLog(task.id, level, msg, meta));
      const durationMs = Date.now() - execStart;

      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.durationMs = durationMs;
      task.result = {
        ...result,
        durationMs,
      };

      this.appendLog(
        task.id,
        'info',
        `Task completed successfully in ${durationMs}ms. Fetched: ${result.jobsFetched}, Normalized: ${result.jobsNormalized}, Inserted: ${result.jobsInserted}.`,
        result
      );
    } catch (err: any) {
      const durationMs = Date.now() - execStart;
      const errorMsg = err.message || 'Worker execution failed';
      task.lastError = errorMsg;
      task.durationMs = durationMs;

      // Classify error taxonomy
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
        task.errorTaxonomy = 'RATE_LIMIT_429';
      } else if (errorMsg.includes('403') || errorMsg.toLowerCase().includes('forbidden')) {
        task.errorTaxonomy = 'FORBIDDEN_403';
      } else if (errorMsg.includes('404')) {
        task.errorTaxonomy = 'NOT_FOUND_404';
      } else if (errorMsg.toLowerCase().includes('timeout')) {
        task.errorTaxonomy = 'TIMEOUT';
      } else if (errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
        task.errorTaxonomy = 'SERVER_ERROR_5XX';
      } else {
        task.errorTaxonomy = 'UNKNOWN';
      }

      if (task.attempts < task.maxAttempts) {
        task.status = 'retrying';
        const jitterMultiplier = 1.0 + (Math.random() * 0.4 - 0.2); // +/- 20% jitter
        const delayMs = Math.round(task.backoffMs * Math.pow(2, task.attempts - 1) * jitterMultiplier);
        task.nextRetryAt = new Date(Date.now() + delayMs).toISOString();

        this.appendLog(
          task.id,
          'warn',
          `Task attempt ${task.attempts} failed: ${errorMsg}. Backing off for ${delayMs}ms (Next retry at ${task.nextRetryAt}).`
        );
      } else {
        task.status = 'dead_letter';
        task.completedAt = new Date().toISOString();
        this.appendLog(
          task.id,
          'error',
          `Max attempts (${task.maxAttempts}) exhausted. Routing to Dead-Letter Queue (DLQ). Last error: ${errorMsg}.`
        );
      }
    } finally {
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
      // Immediately schedule next available job
      setTimeout(() => this.processNext(), 20);
    }
  }

  /**
   * Manually retries a failed or dead-letter task
   */
  public retryTask(taskId: string, resetAttempts: boolean = true): QueueTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (resetAttempts) {
      task.attempts = 0;
    }
    task.status = 'queued';
    task.lastError = undefined;
    task.errorTaxonomy = undefined;
    task.nextRetryAt = undefined;
    task.completedAt = undefined;

    this.appendLog(task.id, 'info', `Task manually re-queued for execution.`);
    setTimeout(() => this.processNext(), 10);
    return task;
  }

  /**
   * Cancels a queued or retrying task
   */
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'running' || task.status === 'completed') {
      return false;
    }

    task.status = 'failed';
    task.lastError = 'Task manually cancelled by user.';
    task.completedAt = new Date().toISOString();
    this.appendLog(task.id, 'warn', 'Task manually cancelled.');
    return true;
  }

  /**
   * Retrieves all tasks with optional filtering
   */
  public getTasks(filter?: {
    status?: TaskStatus;
    type?: ScraperJobType;
    priority?: TaskPriority;
    limit?: number;
  }): QueueTask[] {
    let list = Array.from(this.tasks.values());

    if (filter?.status) {
      list = list.filter((t) => t.status === filter.status);
    }
    if (filter?.type) {
      list = list.filter((t) => t.type === filter.type);
    }
    if (filter?.priority) {
      list = list.filter((t) => t.priority === filter.priority);
    }

    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter?.limit && filter.limit > 0) {
      list = list.slice(0, filter.limit);
    }

    return list;
  }

  /**
   * Gets specific task by ID
   */
  public getTaskById(id: string): QueueTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Returns real-time telemetry metrics
   */
  public getMetrics(): TaskQueueMetrics {
    const all = Array.from(this.tasks.values());
    let queued = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;
    let retrying = 0;
    let deadLetter = 0;
    let totalDuration = 0;
    let completedWithDuration = 0;

    for (const t of all) {
      if (t.status === 'queued') queued++;
      else if (t.status === 'running') running++;
      else if (t.status === 'completed') {
        completed++;
        if (t.durationMs) {
          totalDuration += t.durationMs;
          completedWithDuration++;
        }
      } else if (t.status === 'failed') failed++;
      else if (t.status === 'retrying') retrying++;
      else if (t.status === 'dead_letter') deadLetter++;
    }

    const uptimeSeconds = Math.floor((Date.now() - this.startedAtTimestamp) / 1000);
    const throughputPerMinute = uptimeSeconds > 0
      ? parseFloat(((completed / Math.max(1, uptimeSeconds)) * 60).toFixed(1))
      : 0;

    return {
      queuedCount: queued,
      runningCount: running,
      completedCount: completed,
      failedCount: failed,
      retryingCount: retrying,
      deadLetterCount: deadLetter,
      totalEnqueued: this.totalEnqueued,
      concurrencyLimit: this.concurrencyLimit,
      activeWorkers: this.activeWorkers,
      averageExecutionMs: completedWithDuration > 0 ? Math.round(totalDuration / completedWithDuration) : 0,
      throughputPerMinute,
      uptimeSeconds,
    };
  }

  /**
   * Sets concurrency limit for workers
   */
  public setConcurrency(limit: number): void {
    this.concurrencyLimit = Math.max(1, Math.min(10, limit));
    this.processNext();
  }

  /**
   * Clears old completed and failed tasks
   */
  public clearCompleted(): number {
    let count = 0;
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'dead_letter') {
        this.tasks.delete(id);
        count++;
      }
    }
    return count;
  }
}

export const taskQueue = new TaskQueueEngine(3);
