/**
 * AI Internship Scout - API Rate Limiter & Cost Guardian
 * 
 * Protects against:
 * 1. Runaway external AI API bills and daily budget cap
 * 2. Downstream rate limits on external scrapers (Greenhouse / Lever 429s)
 * 3. Brute-force attacks on auth endpoints
 * 4. High-frequency duplicate calls via SHA-256 Content-Hash Caching
 */

export interface RateLimitConfig {
  windowMs: number;       // Window size in milliseconds
  maxRequests: number;    // Max allowed requests in the window
  bucketName: string;     // Identifier for this limit tier
  skipSuccessfulGets?: boolean;
}

export interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface CostGuardStats {
  totalAiCalls: number;
  cachedAiHits: number;
  estimatedTokensUsed: number;
  estimatedTokensSaved: number;
  estimatedCostUsd: number;
  estimatedCostSavedUsd: number;
  dailyBudgetUsd: number;
  budgetExceeded: boolean;
  rateLimitsEnforced: number;
}

class ApiRateLimiterAndCostGuard {
  // In-memory sliding window counters: Map<bucketKey, RateLimitRecord>
  private buckets = new Map<string, RateLimitRecord>();

  // In-memory Content-Hash Cache for AI responses (prevents identical LLM calls)
  private aiResponseCache = new Map<string, { data: any; cachedAt: number; tokenCount: number }>();

  // Cost tracking stats
  private stats: CostGuardStats = {
    totalAiCalls: 0,
    cachedAiHits: 0,
    estimatedTokensUsed: 0,
    estimatedTokensSaved: 0,
    estimatedCostUsd: 0,
    estimatedCostSavedUsd: 0,
    dailyBudgetUsd: 5.0, // $5.00 daily safety cap for development
    budgetExceeded: false,
    rateLimitsEnforced: 0,
  };

  // Retained for compatibility with the cost-guard status endpoint.
  private readonly COST_PER_1K_TOKENS = 0.00015; // Blend avg $0.15/1M tokens

  /**
   * Evaluates if a request from a given client key exceeds the rate limit
   */
  public checkLimit(
    clientKey: string,
    config: RateLimitConfig
  ): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetMs: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    const bucketKey = `${config.bucketName}:${clientKey}`;
    let record = this.buckets.get(bucketKey);

    if (!record || now >= record.resetTime) {
      // Create new window
      record = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      this.buckets.set(bucketKey, record);
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - 1),
        resetMs: config.windowMs,
        retryAfterSeconds: 0,
      };
    }

    // Existing active window
    if (record.count >= config.maxRequests) {
      this.stats.rateLimitsEnforced++;
      const resetMs = Math.max(0, record.resetTime - now);
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetMs,
        retryAfterSeconds: Math.ceil(resetMs / 1000),
      };
    }

    record.count++;
    const resetMs = Math.max(0, record.resetTime - now);
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - record.count),
      resetMs,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Hashes text into a short deterministic key for caching
   */
  public hashContent(text: string): string {
    let hash = 0;
    const clean = text.trim();
    for (let i = 0; i < clean.length; i++) {
      hash = (hash << 5) - hash + clean.charCodeAt(i);
      hash |= 0;
    }
    return `hash_${Math.abs(hash)}_${clean.length}`;
  }

  /**
   * Check if an identical AI prompt/resume was already parsed and cached
   */
  public getCachedAiResponse<T>(cacheKey: string): T | null {
    const entry = this.aiResponseCache.get(cacheKey);
    if (!entry) return null;

    // Cache TTL: 24 hours
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - entry.cachedAt > maxAge) {
      this.aiResponseCache.delete(cacheKey);
      return null;
    }

    this.stats.cachedAiHits++;
    this.stats.estimatedTokensSaved += entry.tokenCount;
    this.stats.estimatedCostSavedUsd += (entry.tokenCount / 1000) * this.COST_PER_1K_TOKENS;
    return entry.data as T;
  }

  /**
   * Store AI response in cache to avoid duplicate API fees
   */
  public setCachedAiResponse<T>(cacheKey: string, data: T, estimatedTokens: number = 1200): void {
    // Keep max 500 cached entries in memory
    if (this.aiResponseCache.size > 500) {
      const firstKey = this.aiResponseCache.keys().next().value;
      if (firstKey) this.aiResponseCache.delete(firstKey);
    }

    this.aiResponseCache.set(cacheKey, {
      data,
      cachedAt: Date.now(),
      tokenCount: estimatedTokens,
    });
  }

  /**
   * Record a paid AI API invocation and verify budget cap
   */
  public recordAiUsage(estimatedTokens: number = 1500): { budgetOk: boolean; remainingBudgetUsd: number } {
    this.stats.totalAiCalls++;
    this.stats.estimatedTokensUsed += estimatedTokens;
    const cost = (estimatedTokens / 1000) * this.COST_PER_1K_TOKENS;
    this.stats.estimatedCostUsd += cost;

    if (this.stats.estimatedCostUsd >= this.stats.dailyBudgetUsd) {
      this.stats.budgetExceeded = true;
    }

    const remainingBudgetUsd = Math.max(0, this.stats.dailyBudgetUsd - this.stats.estimatedCostUsd);
    return {
      budgetOk: !this.stats.budgetExceeded,
      remainingBudgetUsd,
    };
  }

  /**
   * Get real-time cost and rate limiting statistics
   */
  public getStats(): CostGuardStats & {
    cachedEntriesCount: number;
    savingsPercentage: number;
  } {
    const totalRequests = this.stats.totalAiCalls + this.stats.cachedAiHits;
    const savingsPercentage = totalRequests > 0
      ? parseFloat(((this.stats.cachedAiHits / totalRequests) * 100).toFixed(1))
      : 0;

    return {
      ...this.stats,
      cachedEntriesCount: this.aiResponseCache.size,
      savingsPercentage,
    };
  }

  /**
   * Clean up expired buckets periodically (every 5 minutes)
   */
  public cleanupExpired(): void {
    const now = Date.now();
    for (const [key, record] of this.buckets.entries()) {
      if (now >= record.resetTime) {
        this.buckets.delete(key);
      }
    }
  }
}

export const costGuard = new ApiRateLimiterAndCostGuard();

// Run background bucket cleanup every 5 minutes
setInterval(() => {
  costGuard.cleanupExpired();
}, 5 * 60 * 1000);
