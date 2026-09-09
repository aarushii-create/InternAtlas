/**
 * AI Internship Scout - Stale Job Bloat Cleanup & Retention Engine
 * 
 * Solves: Storage growing indefinitely with 6-month-old closed job postings.
 * Implementation: Executes deterministic cleanup query & archival partitioning:
 *   DELETE FROM jobs WHERE is_active = FALSE AND updated_at < NOW() - INTERVAL '60 days'
 */

import { Job, ArchivedJob, CleanupResult, StorageBloatStats } from '../types';

export interface CleanupOptions {
  retentionDays?: number; // default 60
  mode?: 'delete' | 'archive'; // default 'delete'
  forceAllInactive?: boolean;
}

export class StaleJobCleanupEngine {
  private static instance: StaleJobCleanupEngine;
  private autoCleanupTimer: NodeJS.Timeout | null = null;
  private isAutoCleanupRunning: boolean = false;
  private cleanupIntervalMinutes: number = 60 * 24; // Daily default (1440 mins)

  private constructor() {}

  public static getInstance(): StaleJobCleanupEngine {
    if (!StaleJobCleanupEngine.instance) {
      StaleJobCleanupEngine.instance = new StaleJobCleanupEngine();
    }
    return StaleJobCleanupEngine.instance;
  }

  /**
   * Generates the precise SQL statement for the user's inspection
   */
  public getSqlStatement(retentionDays: number = 60, mode: 'delete' | 'archive' = 'delete'): string {
    if (mode === 'archive') {
      return `-- 1. Archive inactive jobs older than ${retentionDays} days into cold storage partition
INSERT INTO archived_jobs (
  id, source, external_id, dedup_hash, company, title, location,
  is_remote, description, raw_jd, stated_requirements, informal_bar,
  apply_url, posted_at, first_seen_at, last_verified_active, is_active,
  relevance_status, prefilter_reason, created_at, updated_at, archive_reason
)
SELECT *, 'Retention policy: Closed > ${retentionDays}d'
FROM jobs
WHERE is_active = FALSE AND updated_at < NOW() - INTERVAL '${retentionDays} days'
ON CONFLICT (id) DO NOTHING;

-- 2. Delete the archived rows from hot table
DELETE FROM jobs 
WHERE is_active = FALSE AND updated_at < NOW() - INTERVAL '${retentionDays} days';`;
    }

    return `-- Clean up stale closed jobs older than ${retentionDays} days to eliminate storage bloat
DELETE FROM jobs 
WHERE is_active = FALSE AND updated_at < NOW() - INTERVAL '${retentionDays} days';`;
  }

  /**
   * Partitioning DDL for PostgreSQL (Range partitioning by updated_at / posted_at)
   */
  public getPartitioningDdl(): string {
    return `-- Optional High-Throughput Table Partitioning Strategy (Range Partition by Quarter)
CREATE TABLE IF NOT EXISTS jobs_partitioned (
    id UUID NOT NULL,
    source job_source NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    dedup_hash VARCHAR(64) NOT NULL,
    company VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    is_remote BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT NOT NULL,
    raw_jd TEXT NOT NULL,
    stated_requirements JSONB NOT NULL,
    informal_bar JSONB NOT NULL,
    apply_url TEXT NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL,
    last_verified_active TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    relevance_status relevance_status NOT NULL,
    prefilter_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, updated_at)
) PARTITION BY RANGE (updated_at);

-- Create quarterly rolling partition tables
CREATE TABLE jobs_2026_q1 PARTITION OF jobs_partitioned
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE jobs_2026_q2 PARTITION OF jobs_partitioned
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE jobs_2026_q3 PARTITION OF jobs_partitioned
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

-- Pruning command for expired quarters:
-- DROP TABLE jobs_2025_q4; -- Instant zero-cost drop of 3-month chunk!`;
  }

  /**
   * Core cleanup logic that evaluates jobs against the retention window
   */
  public evaluateJobStaleness(
    job: Job,
    retentionDays: number = 60,
    referenceDate: Date = new Date()
  ): { isStale: boolean; daysSinceUpdate: number; daysSinceVerification: number } {
    const updatedAtTime = new Date(job.updatedAt || job.createdAt).getTime();
    const lastActiveTime = new Date(job.lastVerifiedActive || job.updatedAt || job.createdAt).getTime();
    const nowTime = referenceDate.getTime();

    const daysSinceUpdate = Math.floor((nowTime - updatedAtTime) / (1000 * 60 * 60 * 24));
    const daysSinceVerification = Math.floor((nowTime - lastActiveTime) / (1000 * 60 * 60 * 24));

    // Rule: is_active = FALSE AND updated_at < NOW() - INTERVAL '60 days'
    const isStale = (!job.isActive) && (daysSinceUpdate >= retentionDays);

    return {
      isStale,
      daysSinceUpdate,
      daysSinceVerification,
    };
  }

  /**
   * Calculates comprehensive storage bloat metrics across the job database
   */
  public computeBloatStats(
    jobs: Job[],
    archivedJobs: ArchivedJob[],
    lastCleanup?: StorageBloatStats['lastCleanupRun']
  ): StorageBloatStats {
    const now = new Date();
    let activeJobs = 0;
    let inactiveJobs = 0;
    let staleJobsOver60Days = 0;
    let staleJobsOver90Days = 0;
    let staleJobsOver180Days = 0;

    let totalRawBytes = 0;
    let reclaimableBytes = 0;

    for (const j of jobs) {
      const jdLength = (j.rawJd?.length || 0) + (j.description?.length || 0) + (j.vectorEmbedding ? 768 * 8 : 0);
      const rowSizeBytes = Math.max(1024, jdLength + 512); // Approximate row size
      totalRawBytes += rowSizeBytes;

      if (j.isActive) {
        activeJobs++;
      } else {
        inactiveJobs++;
        const updateDate = new Date(j.updatedAt || j.createdAt);
        const daysOld = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOld >= 60) {
          staleJobsOver60Days++;
          reclaimableBytes += rowSizeBytes;
        }
        if (daysOld >= 90) {
          staleJobsOver90Days++;
        }
        if (daysOld >= 180) {
          staleJobsOver180Days++;
        }
      }
    }

    return {
      totalJobs: jobs.length,
      activeJobs,
      inactiveJobs,
      staleJobsOver60Days,
      staleJobsOver90Days,
      staleJobsOver180Days,
      estimatedDiskSizeBytes: totalRawBytes,
      reclaimableBytes,
      archivedJobsCount: archivedJobs.length,
      lastCleanupRun: lastCleanup,
    };
  }
}

export const cleanupEngine = StaleJobCleanupEngine.getInstance();
