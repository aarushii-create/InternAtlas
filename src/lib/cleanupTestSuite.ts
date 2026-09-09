/**
 * AI Internship Scout - Stale Job Cleanup & Storage Bloat Unit Test Suite
 * 
 * Tests the exact SQL cleanup query and retention criteria:
 *   DELETE FROM jobs WHERE is_active = FALSE AND updated_at < NOW() - INTERVAL '60 days'
 */

import { Job, ArchivedJob, CleanupResult } from '../types';
import { cleanupEngine } from './cleanupEngine';

export interface CleanupTestCaseResult {
  id: string;
  name: string;
  category: 'RETENTION_CRITERIA' | 'ACTIVE_PRESERVATION' | 'GRACE_PERIOD' | 'COLD_ARCHIVAL' | 'STORAGE_RECLAMATION';
  passed: boolean;
  durationMs: number;
  expected: any;
  actual: any;
  error?: string;
}

export interface CleanupTestSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  results: CleanupTestCaseResult[];
  sqlStatementTested: string;
}

export function runCleanupTestSuite(): CleanupTestSuiteReport {
  const startTime = Date.now();
  const results: CleanupTestCaseResult[] = [];
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Test 1: Inactive jobs older than 60 days are flagged as stale
  (() => {
    const tStart = Date.now();
    const mockStaleJob: Job = {
      id: 'job-stale-180d',
      source: 'greenhouse',
      externalId: 'gh-closed-180d',
      dedupHash: 'hash-closed-180d',
      company: 'Uber',
      title: 'SWE Intern (Closed)',
      location: 'San Francisco, CA',
      isRemote: false,
      description: 'Closed job JD',
      rawJd: 'Closed job raw JD',
      statedRequirements: { requiredSkills: ['C++'], preferredSkills: [], education: 'BS', experienceYears: 0 },
      informalBar: { dsaDifficulty: 'Hard', oaPattern: 'DP', unstatedPreferences: [], barDescription: 'Bar' },
      applyUrl: 'https://uber.com/jobs/closed',
      postedAt: new Date(now.getTime() - 180 * dayMs).toISOString(),
      firstSeenAt: new Date(now.getTime() - 180 * dayMs).toISOString(),
      lastVerifiedActive: new Date(now.getTime() - 180 * dayMs).toISOString(),
      isActive: false, // Closed!
      relevanceStatus: 'RELEVANT',
      createdAt: new Date(now.getTime() - 180 * dayMs).toISOString(),
      updatedAt: new Date(now.getTime() - 180 * dayMs).toISOString(),
    };

    const evaluation = cleanupEngine.evaluateJobStaleness(mockStaleJob, 60, now);
    const passed = evaluation.isStale === true && evaluation.daysSinceUpdate >= 180;

    results.push({
      id: 'STALE-01',
      name: 'SQL Rule: Inactive Job (>60d old) is marked stale and eligible for purge',
      category: 'RETENTION_CRITERIA',
      passed,
      durationMs: Date.now() - tStart,
      expected: { isStale: true, minDays: 60 },
      actual: { isStale: evaluation.isStale, daysSinceUpdate: evaluation.daysSinceUpdate },
    });
  })();

  // Test 2: Active jobs (is_active = true) older than 60 days MUST NOT be pruned
  (() => {
    const tStart = Date.now();
    const mockActiveOldJob: Job = {
      id: 'job-active-90d',
      source: 'lever',
      externalId: 'lv-active-90d',
      dedupHash: 'hash-active-90d',
      company: 'Microsoft',
      title: 'SWE Intern (Active Evergreen)',
      location: 'Redmond, WA',
      isRemote: true,
      description: 'Evergreen posting still open',
      rawJd: 'Evergreen raw JD',
      statedRequirements: { requiredSkills: ['C#'], preferredSkills: [], education: 'BS', experienceYears: 0 },
      informalBar: { dsaDifficulty: 'Medium', oaPattern: 'Trees', unstatedPreferences: [], barDescription: 'Bar' },
      applyUrl: 'https://microsoft.com/jobs/active',
      postedAt: new Date(now.getTime() - 90 * dayMs).toISOString(),
      firstSeenAt: new Date(now.getTime() - 90 * dayMs).toISOString(),
      lastVerifiedActive: now.toISOString(),
      isActive: true, // ACTIVE!
      relevanceStatus: 'RELEVANT',
      createdAt: new Date(now.getTime() - 90 * dayMs).toISOString(),
      updatedAt: new Date(now.getTime() - 90 * dayMs).toISOString(),
    };

    const evaluation = cleanupEngine.evaluateJobStaleness(mockActiveOldJob, 60, now);
    const passed = evaluation.isStale === false;

    results.push({
      id: 'STALE-02',
      name: 'Active Preservation: Active evergreen jobs (>60d) are NEVER purged',
      category: 'ACTIVE_PRESERVATION',
      passed,
      durationMs: Date.now() - tStart,
      expected: { isStale: false, reason: 'is_active is TRUE' },
      actual: { isStale: evaluation.isStale, isActive: mockActiveOldJob.isActive },
    });
  })();

  // Test 3: Inactive jobs younger than 60 days (e.g. 20 days old) are preserved in grace period
  (() => {
    const tStart = Date.now();
    const mockRecentClosedJob: Job = {
      id: 'job-closed-20d',
      source: 'direct',
      externalId: 'dir-closed-20d',
      dedupHash: 'hash-closed-20d',
      company: 'Amazon',
      title: 'SDE Intern (Closed Recently)',
      location: 'Seattle, WA',
      isRemote: false,
      description: 'Closed 20 days ago',
      rawJd: 'Closed 20 days ago raw',
      statedRequirements: { requiredSkills: ['Java'], preferredSkills: [], education: 'BS', experienceYears: 0 },
      informalBar: { dsaDifficulty: 'Medium', oaPattern: 'Arrays', unstatedPreferences: [], barDescription: 'Bar' },
      applyUrl: 'https://amazon.com/jobs/closed-20d',
      postedAt: new Date(now.getTime() - 25 * dayMs).toISOString(),
      firstSeenAt: new Date(now.getTime() - 25 * dayMs).toISOString(),
      lastVerifiedActive: new Date(now.getTime() - 20 * dayMs).toISOString(),
      isActive: false, // Inactive but recent
      relevanceStatus: 'RELEVANT',
      createdAt: new Date(now.getTime() - 25 * dayMs).toISOString(),
      updatedAt: new Date(now.getTime() - 20 * dayMs).toISOString(), // 20 days ago
    };

    const evaluation = cleanupEngine.evaluateJobStaleness(mockRecentClosedJob, 60, now);
    const passed = evaluation.isStale === false && evaluation.daysSinceUpdate === 20;

    results.push({
      id: 'STALE-03',
      name: 'Grace Period: Recently closed jobs (<60d old) are protected in grace period',
      category: 'GRACE_PERIOD',
      passed,
      durationMs: Date.now() - tStart,
      expected: { isStale: false, daysSinceUpdate: 20 },
      actual: { isStale: evaluation.isStale, daysSinceUpdate: evaluation.daysSinceUpdate },
    });
  })();

  // Test 4: SQL Query Inspection & Partitioning DDL Generation
  (() => {
    const tStart = Date.now();
    const deleteSql = cleanupEngine.getSqlStatement(60, 'delete');
    const archiveSql = cleanupEngine.getSqlStatement(60, 'archive');
    const partitionDdl = cleanupEngine.getPartitioningDdl();

    const passed = 
      deleteSql.includes("DELETE FROM jobs") &&
      deleteSql.includes("is_active = FALSE") &&
      deleteSql.includes("INTERVAL '60 days'") &&
      archiveSql.includes("INSERT INTO archived_jobs") &&
      partitionDdl.includes("PARTITION BY RANGE (updated_at)");

    results.push({
      id: 'STALE-04',
      name: 'Query & Partition DDL: Validated exact SQL purge and cold partition statements',
      category: 'COLD_ARCHIVAL',
      passed,
      durationMs: Date.now() - tStart,
      expected: { hasDeleteClause: true, hasPartitionDdl: true, matchesRequestedSql: true },
      actual: { hasDeleteClause: deleteSql.includes("DELETE FROM jobs"), hasPartitionDdl: partitionDdl.includes("PARTITION BY RANGE"), deleteSqlPreview: deleteSql },
    });
  })();

  // Test 5: Storage Bloat Metrics & Reclaimable Bytes Computation
  (() => {
    const tStart = Date.now();
    const mockJobs: Job[] = [
      {
        id: '1', source: 'greenhouse', externalId: '1', dedupHash: 'h1', company: 'Meta', title: 'SWE',
        location: 'Menlo Park, CA', isRemote: false, description: 'Long JD '.repeat(100), rawJd: 'Raw JD '.repeat(200),
        statedRequirements: { requiredSkills: ['C++'], preferredSkills: [], education: 'BS', experienceYears: 0 },
        informalBar: { dsaDifficulty: 'Hard', oaPattern: 'OA', unstatedPreferences: [], barDescription: 'Bar' },
        vectorEmbedding: new Array(768).fill(0.01), applyUrl: 'https://meta.com', postedAt: now.toISOString(),
        firstSeenAt: now.toISOString(), lastVerifiedActive: now.toISOString(), isActive: true, relevanceStatus: 'RELEVANT',
        createdAt: now.toISOString(), updatedAt: now.toISOString(),
      },
      {
        id: '2', source: 'greenhouse', externalId: '2', dedupHash: 'h2', company: 'Uber', title: 'SWE (Old)',
        location: 'SF, CA', isRemote: false, description: 'Old JD '.repeat(100), rawJd: 'Old Raw '.repeat(200),
        statedRequirements: { requiredSkills: ['Go'], preferredSkills: [], education: 'BS', experienceYears: 0 },
        informalBar: { dsaDifficulty: 'Hard', oaPattern: 'OA', unstatedPreferences: [], barDescription: 'Bar' },
        vectorEmbedding: new Array(768).fill(0.01), applyUrl: 'https://uber.com', postedAt: new Date(now.getTime() - 100 * dayMs).toISOString(),
        firstSeenAt: new Date(now.getTime() - 100 * dayMs).toISOString(), lastVerifiedActive: new Date(now.getTime() - 100 * dayMs).toISOString(),
        isActive: false, relevanceStatus: 'RELEVANT', createdAt: new Date(now.getTime() - 100 * dayMs).toISOString(),
        updatedAt: new Date(now.getTime() - 100 * dayMs).toISOString(),
      },
    ];

    const stats = cleanupEngine.computeBloatStats(mockJobs, []);
    const passed = stats.totalJobs === 2 && stats.activeJobs === 1 && stats.inactiveJobs === 1 && stats.staleJobsOver60Days === 1 && stats.reclaimableBytes > 0;

    results.push({
      id: 'STALE-05',
      name: 'Storage Reclamation: Accurate computation of reclaimable bytes and stale count',
      category: 'STORAGE_RECLAMATION',
      passed,
      durationMs: Date.now() - tStart,
      expected: { totalJobs: 2, activeJobs: 1, staleJobsOver60Days: 1 },
      actual: { totalJobs: stats.totalJobs, activeJobs: stats.activeJobs, staleJobsOver60Days: stats.staleJobsOver60Days, reclaimableBytes: stats.reclaimableBytes },
    });
  })();

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount,
    totalDurationMs: Date.now() - startTime,
    results,
    sqlStatementTested: cleanupEngine.getSqlStatement(60, 'delete'),
  };
}
