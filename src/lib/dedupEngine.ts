/**
 * AI Internship Scout - Phase 5: Job Deduplication & Storage Engine
 * Prevents duplicate job entries, implements SHA-256 deterministic hashing,
 * tracks first_seen_at / last_verified_active timestamps, and performs strict
 * pre-embedding location filtering to minimize LLM/compute overhead.
 */

import { Job, UserPreferences } from '../types';
import { db, generateDeterministicEmbedding } from '../db/database';

export interface DedupProcessingResult {
  status: 'INGESTED_NEW' | 'DUPLICATE_SKIPPED' | 'DROPPED_LOCATION_MISMATCH';
  dedupHash: string;
  relevanceStatus: 'RELEVANT' | 'IRRELEVANT' | 'DROPPED_LOCATION_MISMATCH' | 'PENDING_PREFILTER';
  reason: string;
  job?: Job;
  skippedCompute: boolean;
  firstSeenAt?: string;
  lastVerifiedActive?: string;
  durationMs: number;
}

export interface DedupEngineStats {
  totalProcessed: number;
  newIngested: number;
  duplicatesCaught: number;
  locationsDropped: number;
  embeddingsComputed: number;
  embeddingsSkipped: number;
  cacheHitRate: number; // 0.0 - 100.0%
  savedComputeSeconds: number;
  savedTokensEstimate: number;
}

/**
 * Universal SHA-256 hash generator (works in Node.js, Web Worker, and Browser)
 */
export function generateJobDedupHash(
  company: string,
  title: string,
  location: string,
  applyUrl: string
): string {
  // Normalize string components
  const normCompany = (company || '').trim().toLowerCase();
  const normTitle = (title || '').trim().toLowerCase();
  const normLocation = (location || '').trim().toLowerCase();
  
  // Clean query tracking params from URL if present (e.g. ?gh_jid=... or ?lever-source=...)
  let cleanUrl = (applyUrl || '').trim().toLowerCase();
  try {
    const urlObj = new URL(cleanUrl);
    // Keep base pathname for stable identity
    cleanUrl = `${urlObj.origin}${urlObj.pathname}`.toLowerCase();
  } catch {
    // If not a full URL, fallback to raw string
  }

  const rawKey = `${normCompany}|${normTitle}|${normLocation}|${cleanUrl}`;

  // Simple deterministic 64-char SHA-256 implementation
  return sha256Hex(rawKey);
}

/**
 * Portable SHA-256 implementation producing standard 64-char hex string
 */
function sha256Hex(input: string): string {
  // Standard SHA-256 constants & round functions
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = input[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let compositeBitLength = asciiBitLength;
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = compositeBitLength;

  for (i = 0; i < input[lengthProperty]; i++) {
    words[i >> 2] |= input.charCodeAt(i) << (24 - (i % 4) * 8);
  }

  const w = new Array(64);
  for (i = 0; i < words[lengthProperty]; i += 16) {
    const oldHash = hash.slice(0);
    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }

      const s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

/**
 * Location Normalization & Aliases Dictionary
 */
const LOCATION_ALIASES: Record<string, string[]> = {
  sf: ['san francisco', 'sf', 'bay area', 'california', 'ca', 'silicon valley', 'mountain view', 'sunnyvale', 'palo alto'],
  nyc: ['new york', 'nyc', 'ny', 'manhattan', 'brooklyn', 'new york city'],
  seattle: ['seattle', 'sea', 'wa', 'washington', 'bellevue', 'redmond'],
  bengaluru: ['bengaluru', 'bangalore', 'blr', 'karnataka', 'india', 'in'],
  london: ['london', 'uk', 'united kingdom', 'england', 'great britain'],
  austin: ['austin', 'atx', 'texas', 'tx'],
  boston: ['boston', 'cambridge', 'massachusetts', 'ma'],
  toronto: ['toronto', 'on', 'ontario', 'canada'],
  remote: ['remote', 'work from anywhere', 'virtual', 'us-remote', 'ca-remote', 'telecommute', 'anywhere', 'global', 'hybrid/remote'],
};

/**
 * Deterministic Location Pre-Filter Engine
 * Matches raw job location against user target locations before invoking any embeddings.
 */
export function matchLocationFilter(
  jobLocation: string,
  isRemote: boolean,
  targetLocations: string[]
): { matched: boolean; reason: string; matchedToken?: string } {
  // If target locations are empty or wildcard, pass all
  if (!targetLocations || targetLocations.length === 0 || targetLocations.includes('*') || targetLocations.includes('Anywhere')) {
    return {
      matched: true,
      reason: 'No location restrictions configured (Wildcard pass)',
    };
  }

  const normJobLoc = (jobLocation || '').toLowerCase().trim();

  // 1. Check if job is Remote and user accepts Remote
  const userAcceptsRemote = targetLocations.some((loc) => {
    const l = loc.toLowerCase().trim();
    return l === 'remote' || l.includes('remote') || l === 'anywhere' || l === 'global';
  });

  const jobIsRemote = isRemote || LOCATION_ALIASES.remote.some((r) => normJobLoc.includes(r));

  if (jobIsRemote && userAcceptsRemote) {
    return {
      matched: true,
      matchedToken: 'Remote / Work From Anywhere',
      reason: 'Matched remote/distributed work preference',
    };
  }

  // 2. Direct string substring match
  for (const userLoc of targetLocations) {
    const normUserLoc = userLoc.toLowerCase().trim();
    if (normUserLoc === 'remote') continue;

    if (normJobLoc.includes(normUserLoc) || normUserLoc.includes(normJobLoc)) {
      return {
        matched: true,
        matchedToken: userLoc,
        reason: `Direct location match with '${userLoc}'`,
      };
    }

    // 3. Alias dictionary check
    for (const [key, aliases] of Object.entries(LOCATION_ALIASES)) {
      const userMatchesAliasGroup = aliases.some((a) => normUserLoc.includes(a) || a.includes(normUserLoc));
      const jobMatchesAliasGroup = aliases.some((a) => normJobLoc.includes(a));

      if (userMatchesAliasGroup && jobMatchesAliasGroup) {
        return {
          matched: true,
          matchedToken: `${userLoc} (via ${key.toUpperCase()} metro alias)`,
          reason: `Matched metro alias group '${key}' for location '${jobLocation}'`,
        };
      }
    }
  }

  // If we reach here, location did NOT match
  return {
    matched: false,
    reason: `Job location '${jobLocation}' did not match target locations: [${targetLocations.join(', ')}]`,
  };
}

/**
 * Deduplication Engine Service Class
 */
export class JobDedupEngine {
  private cache: Map<string, { jobId: string; firstSeenAt: string; lastVerifiedActive: string }> = new Map();
  private stats: DedupEngineStats = {
    totalProcessed: 0,
    newIngested: 0,
    duplicatesCaught: 0,
    locationsDropped: 0,
    embeddingsComputed: 0,
    embeddingsSkipped: 0,
    cacheHitRate: 0,
    savedComputeSeconds: 0,
    savedTokensEstimate: 0,
  };

  constructor() {
    this.hydrateCacheFromDb();
  }

  /**
   * Prime in-memory Redis-style cache with all existing job dedup hashes from the DB
   */
  public hydrateCacheFromDb(): void {
    const allJobs = db.getJobs();
    for (const job of allJobs) {
      if (job.dedupHash) {
        this.cache.set(job.dedupHash, {
          jobId: job.id,
          firstSeenAt: job.firstSeenAt || job.createdAt,
          lastVerifiedActive: job.lastVerifiedActive || job.createdAt,
        });
      } else {
        const hash = generateJobDedupHash(job.company, job.title, job.location, job.applyUrl);
        job.dedupHash = hash;
        job.firstSeenAt = job.firstSeenAt || job.createdAt;
        job.lastVerifiedActive = job.lastVerifiedActive || job.createdAt;
        job.relevanceStatus = job.relevanceStatus || 'RELEVANT';
        this.cache.set(hash, {
          jobId: job.id,
          firstSeenAt: job.firstSeenAt,
          lastVerifiedActive: job.lastVerifiedActive,
        });
      }
    }
  }

  /**
   * Process a single candidate job through:
   * 1. Deterministic SHA-256 hash generation
   * 2. Fast cache / DB deduplication check (ON CONFLICT DO NOTHING -> update last_verified_active)
   * 3. Deterministic location pre-filter against user preferences
   * 4. 768-dim vector embedding generation (ONLY if new & relevant)
   */
  public processJob(
    rawJob: {
      source: 'greenhouse' | 'lever' | 'direct' | 'custom';
      externalId: string;
      company: string;
      title: string;
      location: string;
      isRemote?: boolean;
      description: string;
      rawJd?: string;
      statedRequirements?: any;
      informalBar?: any;
      applyUrl: string;
      postedAt?: string;
    },
    userPreferences?: Partial<UserPreferences> | null
  ): DedupProcessingResult {
    const startTime = Date.now();
    this.stats.totalProcessed++;

    const isRemote = rawJob.isRemote ?? false;
    const dedupHash = generateJobDedupHash(rawJob.company, rawJob.title, rawJob.location, rawJob.applyUrl);

    // ----------------------------------------------------
    // STEP 1: Deduplication Check (Cache & DB ON CONFLICT)
    // ----------------------------------------------------
    if (this.cache.has(dedupHash)) {
      this.stats.duplicatesCaught++;
      this.stats.embeddingsSkipped++;
      this.stats.savedComputeSeconds += 0.85; // ~850ms embedding/RAG latency saved
      this.stats.savedTokensEstimate += 1200; // ~1200 LLM tokens saved per JD

      const cached = this.cache.get(dedupHash)!;
      const nowIso = new Date().toISOString();
      cached.lastVerifiedActive = nowIso;

      // Update DB record timestamp
      const existingJob = db.getJobs().find((j) => j.id === cached.jobId || j.dedupHash === dedupHash);
      if (existingJob) {
        existingJob.lastVerifiedActive = nowIso;
      }

      this.updateCacheHitRate();

      return {
        status: 'DUPLICATE_SKIPPED',
        dedupHash,
        relevanceStatus: existingJob?.relevanceStatus || 'RELEVANT',
        reason: 'Duplicate job detected via deterministic SHA-256 hash. Updated last_verified_active timestamp without re-embedding.',
        job: existingJob,
        skippedCompute: true,
        firstSeenAt: cached.firstSeenAt,
        lastVerifiedActive: nowIso,
        durationMs: Date.now() - startTime,
      };
    }

    // ----------------------------------------------------
    // STEP 2: Deterministic Location Pre-Filter
    // ----------------------------------------------------
    const targetLocations = userPreferences?.targetLocations || ['San Francisco, CA', 'New York, NY', 'Remote'];
    const locationCheck = matchLocationFilter(rawJob.location, isRemote, targetLocations);

    if (!locationCheck.matched) {
      this.stats.locationsDropped++;
      this.stats.embeddingsSkipped++;
      this.stats.savedComputeSeconds += 0.85;
      this.stats.savedTokensEstimate += 1200;

      // Store dropped job with IRRELEVANT / DROPPED_LOCATION_MISMATCH status without generating embeddings
      const nowIso = new Date().toISOString();
      const droppedJob: Job = {
        id: `job-dropped-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        source: rawJob.source,
        externalId: rawJob.externalId,
        dedupHash,
        company: rawJob.company,
        title: rawJob.title,
        location: rawJob.location,
        isRemote,
        description: rawJob.description,
        rawJd: rawJob.rawJd || rawJob.description,
        statedRequirements: rawJob.statedRequirements || {
          requiredSkills: [],
          preferredSkills: [],
          education: 'N/A',
          experienceYears: 0,
        },
        informalBar: rawJob.informalBar || {
          dsaDifficulty: 'Medium',
          oaPattern: 'Standard Assessment',
          unstatedPreferences: [],
          barDescription: 'Prefiltered',
        },
        vectorEmbedding: undefined, // Explicitly undefined to save compute & storage
        applyUrl: rawJob.applyUrl,
        postedAt: rawJob.postedAt || nowIso,
        firstSeenAt: nowIso,
        lastVerifiedActive: nowIso,
        isActive: false, // Dropped location mismatch
        relevanceStatus: 'DROPPED_LOCATION_MISMATCH',
        prefilterReason: locationCheck.reason,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Add to cache so we don't re-evaluate dropped jobs either
      this.cache.set(dedupHash, {
        jobId: droppedJob.id,
        firstSeenAt: nowIso,
        lastVerifiedActive: nowIso,
      });

      this.updateCacheHitRate();

      return {
        status: 'DROPPED_LOCATION_MISMATCH',
        dedupHash,
        relevanceStatus: 'DROPPED_LOCATION_MISMATCH',
        reason: locationCheck.reason,
        job: droppedJob,
        skippedCompute: true,
        firstSeenAt: nowIso,
        lastVerifiedActive: nowIso,
        durationMs: Date.now() - startTime,
      };
    }

    // ----------------------------------------------------
    // STEP 3: Passed Pre-Filter -> Generate Vector Embedding & Upsert
    // ----------------------------------------------------
    this.stats.newIngested++;
    this.stats.embeddingsComputed++;

    const nowIso = new Date().toISOString();
    const skillsText = (rawJob.statedRequirements?.requiredSkills || []).join(' ');
    const vectorEmbedding = generateDeterministicEmbedding(
      `${rawJob.description} ${rawJob.company} ${rawJob.title} ${skillsText}`
    );

    const newJob: Job = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source: rawJob.source,
      externalId: rawJob.externalId,
      dedupHash,
      company: rawJob.company,
      title: rawJob.title,
      location: rawJob.location,
      isRemote,
      description: rawJob.description,
      rawJd: rawJob.rawJd || rawJob.description,
      statedRequirements: rawJob.statedRequirements || {
        requiredSkills: ['Problem Solving', 'Data Structures', 'Algorithms'],
        preferredSkills: [],
        education: "Bachelor's in Computer Science",
        experienceYears: 0,
      },
      informalBar: rawJob.informalBar || {
        dsaDifficulty: 'Medium',
        oaPattern: 'LeetCode Mediums & Clean Code',
        unstatedPreferences: ['Project building experience'],
        barDescription: 'Engineering internship standard evaluation',
      },
      vectorEmbedding,
      applyUrl: rawJob.applyUrl,
      postedAt: rawJob.postedAt || nowIso,
      firstSeenAt: nowIso,
      lastVerifiedActive: nowIso,
      isActive: true,
      relevanceStatus: 'RELEVANT',
      prefilterReason: locationCheck.reason,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Upsert into DB and cache
    db.upsertJob(newJob as any);
    this.cache.set(dedupHash, {
      jobId: newJob.id,
      firstSeenAt: nowIso,
      lastVerifiedActive: nowIso,
    });

    this.updateCacheHitRate();

    return {
      status: 'INGESTED_NEW',
      dedupHash,
      relevanceStatus: 'RELEVANT',
      reason: `Passed location pre-filter (${locationCheck.reason}). Computed 768-dim vector embedding and stored job.`,
      job: newJob,
      skippedCompute: false,
      firstSeenAt: nowIso,
      lastVerifiedActive: nowIso,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Process a batch of candidate jobs
   */
  public processBatch(
    rawJobs: Array<any>,
    userPreferences?: Partial<UserPreferences> | null
  ): {
    total: number;
    ingested: number;
    duplicates: number;
    dropped: number;
    results: DedupProcessingResult[];
  } {
    const results = rawJobs.map((j) => this.processJob(j, userPreferences));
    const ingested = results.filter((r) => r.status === 'INGESTED_NEW').length;
    const duplicates = results.filter((r) => r.status === 'DUPLICATE_SKIPPED').length;
    const dropped = results.filter((r) => r.status === 'DROPPED_LOCATION_MISMATCH').length;

    return {
      total: rawJobs.length,
      ingested,
      duplicates,
      dropped,
      results,
    };
  }

  public getStats(): DedupEngineStats {
    return { ...this.stats };
  }

  public resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      newIngested: 0,
      duplicatesCaught: 0,
      locationsDropped: 0,
      embeddingsComputed: 0,
      embeddingsSkipped: 0,
      cacheHitRate: 0,
      savedComputeSeconds: 0,
      savedTokensEstimate: 0,
    };
  }

  private updateCacheHitRate(): void {
    const hits = this.stats.duplicatesCaught;
    const total = this.stats.totalProcessed;
    this.stats.cacheHitRate = total > 0 ? Number(((hits / total) * 100).toFixed(1)) : 0;
  }
}

// Global Singleton Dedup Engine Instance
export const dedupEngine = new JobDedupEngine();
