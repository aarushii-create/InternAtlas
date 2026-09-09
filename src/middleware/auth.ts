/**
 * AI Internship Scout - Phase 2 Authentication & Security Middleware
 * Handles JWT verification, Bearer Token parsing, and strict Tenant/User Isolation rules.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, User } from '../types';

export const JWT_SECRET = process.env.JWT_SECRET || 'ai-internship-scout-secret-key-phase2-2026';
export const JWT_EXPIRES_IN = '7d';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
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
  let token = authHeader && authHeader.split(' ')[1];

  // Allow query parameter token for easy API testing
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token required. Please provide a valid Bearer token in the Authorization header.',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid or expired token. Authentication failed.',
      code: 'AUTH_TOKEN_INVALID',
      details: err.message,
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
