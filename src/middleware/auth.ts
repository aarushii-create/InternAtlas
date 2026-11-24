/**
 * AI Internship Scout - Phase 2 Authentication & Security Middleware
 * Handles JWT verification, Bearer Token parsing, and strict Tenant/User Isolation rules.
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { JWTPayload, User } from '../types';

function resolveJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!configuredSecret || configuredSecret.length < 32 || /replace-with|change-me|example/i.test(configuredSecret)) {
      throw new Error('JWT_SECRET must be configured as a unique secret of at least 32 characters in production.');
    }
    return configuredSecret;
  }

  return configuredSecret || randomBytes(32).toString('hex');
}

export const JWT_SECRET = resolveJwtSecret();
export const JWT_EXPIRES_IN = '7d';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const AUTH_COOKIE_NAME = 'internatlas_session';

export function setAuthCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=604800${secure}`
  );
}

export function clearAuthCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${AUTH_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`
  );
}

function readAuthCookie(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const cookie = cookieHeader.split(';').map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!cookie) return undefined;
  try {
    return decodeURIComponent(cookie.slice(AUTH_COOKIE_NAME.length + 1));
  } catch {
    return undefined;
  }
}

// Generate JWT for authenticated user
export function generateUserToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    fullName: user.fullName,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Express Middleware: Authenticate Bearer Token
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const tokenMatch = typeof authHeader === 'string' ? /^Bearer ([^\s]+)$/i.exec(authHeader) : null;
  const token = tokenMatch?.[1] ?? readAuthCookie(req);

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token required. Please provide a valid Bearer token in the Authorization header.',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (
      typeof decoded === 'string' ||
      typeof decoded.userId !== 'string' ||
      typeof decoded.tenantId !== 'string' ||
      typeof decoded.email !== 'string' ||
      typeof decoded.fullName !== 'string'
    ) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token claims are invalid.',
        code: 'AUTH_TOKEN_INVALID',
      });
    }
    req.user = decoded as JWTPayload;
    next();
  } catch {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token. Please sign in again.',
      code: 'AUTH_TOKEN_INVALID',
    });
  }
}

// Security Enforcement Helper: Enforce Multi-Tenant & User Row Isolation
export function enforceTenantAndUserSecurity(
  req: AuthenticatedRequest,
  res: Response,
  options: { targetUserId?: string; targetTenantId?: string }
): boolean {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'User context missing.' });
    return false;
  }

  const { targetUserId, targetTenantId } = options;

  // 1. Cross-Tenant Security Enforcement
  if (targetTenantId && req.user.tenantId !== targetTenantId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this resource.',
      code: 'TENANT_ISOLATION_VIOLATION',
    });
    return false;
  }

  // 2. Cross-User Data Security Enforcement
  if (targetUserId && req.user.userId !== targetUserId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this user data.',
      code: 'USER_ISOLATION_VIOLATION',
    });
    return false;
  }

  return true;
}
