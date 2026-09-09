/**
 * AI Internship Scout - Phase 5 Test Suite
 * Automated unit & integration tests for Job Deduplication & Storage Engine
 */

import { generateJobDedupHash, matchLocationFilter, JobDedupEngine, DedupEngineStats } from './dedupEngine';

export interface DedupTestCaseResult {
  id: string;
  name: string;
  category: 'SHA256_HASH' | 'UPSERT_ENGINE' | 'LOCATION_PREFILTER' | 'REMOTE_LOGIC' | 'EFFICIENCY_SAVINGS';
  passed: boolean;
  durationMs: number;
  expected: any;
  actual: any;
  error?: string;
}

export interface DedupTestSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  statsSnapshot: DedupEngineStats;
  results: DedupTestCaseResult[];
}

export async function runDedupTestSuite(): Promise<DedupTestSuiteReport> {
  const startTime = Date.now();
  const results: DedupTestCaseResult[] = [];
  const engine = new JobDedupEngine();
  engine.resetStats();

  // ----------------------------------------------------
  // TEST 1: SHA256 Hash Determinism & Normalization
  // ----------------------------------------------------
  const t1Start = Date.now();
  try {
    const hash1 = generateJobDedupHash(
      'Stripe',
      'Software Engineering Intern - Infrastructure',
      'San Francisco, CA',
      'https://stripe.com/jobs/8812?gh_jid=8812&utm_source=internship-board'
    );

    // Variation with mixed casing, extra trailing/leading whitespace, and extra query params
    const hash2 = generateJobDedupHash(
      '  STRIPE  ',
      ' software engineering intern - infrastructure  ',
      'san francisco, ca ',
      'https://stripe.com/jobs/8812?custom_tracker=12345'
    );

    const isMatch = hash1 === hash2 && hash1.length === 64;

    results.push({
      id: 'DEDUP-01',
      name: 'SHA-256 Hash: Deterministic Key Invariance & URL/Whitespace Normalization',
      category: 'SHA256_HASH',
      passed: isMatch,
      durationMs: Date.now() - t1Start,
      expected: {
        hashesMatch: true,
        hashLength: 64,
      },
      actual: {
        hash1,
        hash2,
        hashesMatch: isMatch,
        hashLength: hash1.length,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'DEDUP-01',
      name: 'SHA-256 Hash: Deterministic Key Invariance & URL/Whitespace Normalization',
      category: 'SHA256_HASH',
      passed: false,
      durationMs: Date.now() - t1Start,
      expected: { hashesMatch: true },
      actual: { error: err.message },
      error: err.message,
    });
  }

  // ----------------------------------------------------
  // TEST 2: Upsert & Cache-Layer Deduplication
  // ----------------------------------------------------
  const t2Start = Date.now();
  try {
    const rawJob = {
      source: 'greenhouse' as const,
      externalId: 'gh-palantir-2026-t2',
      company: 'Palantir',
      title: 'Forward Deployed SWE Intern',
      location: 'New York, NY',
      isRemote: false,
      description: 'Palantir FDSE internship building large-scale data platforms in C++ and Python.',
      applyUrl: 'https://palantir.com/careers/fdse-2026',
    };

    const userPrefs = {
      targetLocations: ['New York, NY', 'Remote'],
    };

    // First ingestion (NEW)
    const res1 = engine.processJob(rawJob, userPrefs as any);
    
    // Second ingestion (DUPLICATE)
    const res2 = engine.processJob(rawJob, userPrefs as any);

    const passed =
      res1.status === 'INGESTED_NEW' &&
      !res1.skippedCompute &&
      res2.status === 'DUPLICATE_SKIPPED' &&
      res2.skippedCompute === true &&
      res2.dedupHash === res1.dedupHash &&
      !!res2.lastVerifiedActive;

    results.push({
      id: 'DEDUP-02',
      name: 'Upsert Engine: ON CONFLICT Detection & Timestamp Auto-Update Without Re-Embedding',
      category: 'UPSERT_ENGINE',
      passed,
      durationMs: Date.now() - t2Start,
      expected: {
        firstRunStatus: 'INGESTED_NEW',
        firstRunSkippedCompute: false,
        secondRunStatus: 'DUPLICATE_SKIPPED',
        secondRunSkippedCompute: true,
      },
      actual: {
        firstRunStatus: res1.status,
        firstRunSkippedCompute: res1.skippedCompute,
        secondRunStatus: res2.status,
        secondRunSkippedCompute: res2.skippedCompute,
        dedupHash: res2.dedupHash,
        lastVerifiedActive: res2.lastVerifiedActive,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'DEDUP-02',
      name: 'Upsert Engine: ON CONFLICT Detection & Timestamp Auto-Update Without Re-Embedding',
      category: 'UPSERT_ENGINE',
      passed: false,
      durationMs: Date.now() - t2Start,
      expected: { secondRunStatus: 'DUPLICATE_SKIPPED' },
      actual: { error: err.message },
      error: err.message,
    });
  }

  // ----------------------------------------------------
  // TEST 3: Deterministic Location Pre-Filter (Mismatched Drop)
  // ----------------------------------------------------
  const t3Start = Date.now();
  try {
    const nonMatchingJob = {
      source: 'lever' as const,
      externalId: 'blr-sw-9912',
      company: 'Swiggy',
      title: 'Backend Engineering Intern',
      location: 'Bengaluru, Karnataka, India',
      isRemote: false,
      description: 'High scale distributed food delivery microservices in Java and Go.',
      applyUrl: 'https://careers.swiggy.com/jobs/9912',
    };

    // User preferences strictly targeting US tech hubs
    const userPrefs = {
      targetLocations: ['San Francisco, CA', 'New York, NY', 'Seattle, WA'],
    };

    const res = engine.processJob(nonMatchingJob, userPrefs as any);

    const passed =
      res.status === 'DROPPED_LOCATION_MISMATCH' &&
      res.relevanceStatus === 'DROPPED_LOCATION_MISMATCH' &&
      res.skippedCompute === true &&
      res.job?.vectorEmbedding === undefined;

    results.push({
      id: 'LOC-01',
      name: 'Location Pre-Filter: Strict Location Mismatch Drop Before Vector Compute',
      category: 'LOCATION_PREFILTER',
      passed,
      durationMs: Date.now() - t3Start,
      expected: {
        status: 'DROPPED_LOCATION_MISMATCH',
        relevanceStatus: 'DROPPED_LOCATION_MISMATCH',
        skippedCompute: true,
        vectorEmbedding: undefined,
      },
      actual: {
        status: res.status,
        relevanceStatus: res.relevanceStatus,
        skippedCompute: res.skippedCompute,
        vectorEmbedding: res.job?.vectorEmbedding,
        reason: res.reason,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'LOC-01',
      name: 'Location Pre-Filter: Strict Location Mismatch Drop Before Vector Compute',
      category: 'LOCATION_PREFILTER',
      passed: false,
      durationMs: Date.now() - t3Start,
      expected: { status: 'DROPPED_LOCATION_MISMATCH' },
      actual: { error: err.message },
      error: err.message,
    });
  }

  // ----------------------------------------------------
  // TEST 4: Remote Work & Distributed Work Pass-Through
  // ----------------------------------------------------
  const t4Start = Date.now();
  try {
    const remoteJob = {
      source: 'greenhouse' as const,
      externalId: 'gh-remote-ai-44',
      company: 'Anthropic',
      title: 'AI Alignment Research Intern (Summer 2026)',
      location: 'Remote, US / Global',
      isRemote: true,
      description: 'Model alignment and safety interpretability research in PyTorch.',
      applyUrl: 'https://boards.greenhouse.io/anthropic/jobs/44',
    };

    const userPrefs = {
      targetLocations: ['San Francisco, CA', 'Remote'],
    };

    const res = engine.processJob(remoteJob, userPrefs as any);

    const passed =
      res.status === 'INGESTED_NEW' &&
      res.relevanceStatus === 'RELEVANT' &&
      res.job?.vectorEmbedding !== undefined &&
      res.job.vectorEmbedding.length === 768;

    results.push({
      id: 'LOC-02',
      name: 'Remote Work Engine: Distributed Job Match & Vector Dimension Verification',
      category: 'REMOTE_LOGIC',
      passed,
      durationMs: Date.now() - t4Start,
      expected: {
        status: 'INGESTED_NEW',
        relevanceStatus: 'RELEVANT',
        vectorDimensions: 768,
      },
      actual: {
        status: res.status,
        relevanceStatus: res.relevanceStatus,
        vectorDimensions: res.job?.vectorEmbedding?.length,
        matchedReason: res.reason,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'LOC-02',
      name: 'Remote Work Engine: Distributed Job Match & Vector Dimension Verification',
      category: 'REMOTE_LOGIC',
      passed: false,
      durationMs: Date.now() - t4Start,
      expected: { status: 'INGESTED_NEW' },
      actual: { error: err.message },
      error: err.message,
    });
  }

  // ----------------------------------------------------
  // TEST 5: Batch Processing & Computational Savings
  // ----------------------------------------------------
  const t5Start = Date.now();
  try {
    const batchCandidates = [
      // 1. Relevant new job
      {
        source: 'greenhouse' as const,
        externalId: 'batch-01',
        company: 'Datadog',
        title: 'Core Systems Intern',
        location: 'New York, NY',
        isRemote: false,
        description: 'Telemetry aggregation pipeline in Go.',
        applyUrl: 'https://datadoghq.com/jobs/batch-01',
      },
      // 2. Duplicate of batch-01
      {
        source: 'greenhouse' as const,
        externalId: 'batch-01-dup',
        company: 'Datadog',
        title: 'Core Systems Intern',
        location: 'New York, NY',
        isRemote: false,
        description: 'Telemetry aggregation pipeline in Go.',
        applyUrl: 'https://datadoghq.com/jobs/batch-01?ref=aggregator',
      },
      // 3. Location mismatch
      {
        source: 'lever' as const,
        externalId: 'batch-03',
        company: 'Tokopedia',
        title: 'Mobile Engineer Intern',
        location: 'Jakarta, Indonesia',
        isRemote: false,
        description: 'Android SDK development in Kotlin.',
        applyUrl: 'https://tokopedia.com/jobs/batch-03',
      },
      // 4. Remote pass
      {
        source: 'direct' as const,
        externalId: 'batch-04',
        company: 'Automattic',
        title: 'Fullstack Intern',
        location: 'Work From Anywhere (Global)',
        isRemote: true,
        description: 'React and Node open web systems.',
        applyUrl: 'https://automattic.com/jobs/batch-04',
      },
    ];

    const batchResult = engine.processBatch(batchCandidates, {
      targetLocations: ['New York, NY', 'San Francisco, CA', 'Remote'],
    } as any);

    const stats = engine.getStats();

    const passed =
      batchResult.total === 4 &&
      batchResult.ingested === 2 && // Datadog + Automattic
      batchResult.duplicates === 1 && // Datadog duplicate
      batchResult.dropped === 1 && // Tokopedia (Jakarta)
      stats.embeddingsSkipped >= 2;

    results.push({
      id: 'PERF-01',
      name: 'Batch Pipeline: Deduplication Savings & Compute Optimization Benchmark',
      category: 'EFFICIENCY_SAVINGS',
      passed,
      durationMs: Date.now() - t5Start,
      expected: {
        total: 4,
        ingested: 2,
        duplicates: 1,
        dropped: 1,
        minEmbeddingsSkipped: 2,
      },
      actual: {
        total: batchResult.total,
        ingested: batchResult.ingested,
        duplicates: batchResult.duplicates,
        dropped: batchResult.dropped,
        embeddingsSkipped: stats.embeddingsSkipped,
        savedComputeSeconds: stats.savedComputeSeconds,
        savedTokensEstimate: stats.savedTokensEstimate,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'PERF-01',
      name: 'Batch Pipeline: Deduplication Savings & Compute Optimization Benchmark',
      category: 'EFFICIENCY_SAVINGS',
      passed: false,
      durationMs: Date.now() - t5Start,
      expected: { total: 4, ingested: 2, duplicates: 1, dropped: 1 },
      actual: { error: err.message },
      error: err.message,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount: results.length - passedCount,
    totalDurationMs: Date.now() - startTime,
    statsSnapshot: engine.getStats(),
    results,
  };
}
