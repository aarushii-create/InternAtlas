import { Request, Response, NextFunction } from 'express';
import { costGuard, RateLimitConfig } from '../lib/rateLimiter';
import { AuthenticatedRequest } from './auth';

/**
 * Higher-order middleware factory for rate limiting API endpoints
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Determine unique client identifier: Authenticated user ID, or client IP, or forwarded IP
    const authReq = req as AuthenticatedRequest;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-client';
    const clientKey = authReq.user ? `usr_${authReq.user.userId}` : `ip_${clientIp}`;

    const check = costGuard.checkLimit(clientKey, config);

    // Set standard rate limit headers (RFC 6585 & IETF draft)
    res.setHeader('X-RateLimit-Limit', check.limit.toString());
    res.setHeader('X-RateLimit-Remaining', check.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000 + check.resetMs / 1000).toString());

    if (!check.allowed) {
      res.setHeader('Retry-After', check.retryAfterSeconds.toString());
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded.". Please slow down to maintain API stability and cost budget.`,
        tier: config.bucketName,
        limit: check.limit,
        windowMs: config.windowMs,
        retryAfterSeconds: check.retryAfterSeconds,
      });
    }

    next();
  };
}

// 1. Auth Rate Limiter (Brute-force protection: 20 requests per 15 minutes)
export const authRateLimiter = createRateLimiter({
  bucketName: 'auth_tier',
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
});

// 2. AI & Resume Parsing Limiter (Budget protection: 20 requests per minute)
export const aiRateLimiter = createRateLimiter({
  bucketName: 'ai_llm_tier',
  windowMs: 60 * 1000,
  maxRequests: 20,
});

// 3. RAG Search & Vector Matching Limiter (60 requests per minute)
export const ragRateLimiter = createRateLimiter({
  bucketName: 'rag_eval_tier',
  windowMs: 60 * 1000,
  maxRequests: 60,
});

// 4. Scraper Limiter (Target board protection: 10 runs per minute)
export const scraperRateLimiter = createRateLimiter({
  bucketName: 'scraper_tier',
  windowMs: 60 * 1000,
  maxRequests: 10,
});

// 5. General API Limiter (120 requests per minute)
export const generalRateLimiter = createRateLimiter({
  bucketName: 'general_api_tier',
  windowMs: 60 * 1000,
  maxRequests: 120,
});
