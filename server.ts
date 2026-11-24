/**
 * AI Internship Scout - Phase 1 Express API Server
 * Full multi-tenant database logic, vector similarity endpoints, and Vite dev middleware.
 */

import 'dotenv/config';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import express, { Request } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db, generateDeterministicEmbedding, calculateCosineSimilarity } from './src/db/database';
import { PostgresPersistence } from './src/db/postgresPersistence';
import {
  extractResumeText,
  MAX_RESUME_BYTES,
  parseResume,
  generateResumeVectors,
  ResumeProcessingError,
} from './src/lib/resumeParser';
import { GreenhouseScraper } from './src/lib/scrapers/GreenhouseScraper';
import { LeverScraper } from './src/lib/scrapers/LeverScraper';
import { AshbyScraper } from './src/lib/scrapers/AshbyScraper';
import { WorkdayScraper } from './src/lib/scrapers/WorkdayScraper';
import { liveScraperEngine } from './src/lib/scrapers/LiveScraperEngine';
import { TARGET_COMPANIES_CATALOG, CompanyCategory } from './src/lib/scrapers/targetCompaniesCatalog';
import { runScraperTestSuite } from './src/lib/scrapers/testSuite';
import { sanitizeHtml, detectRemote, extractReqId, extractStatedRequirements, extractInformalBarHints } from './src/lib/normalizer';
import { dedupEngine, generateJobDedupHash, matchLocationFilter } from './src/lib/dedupEngine';
import { runDedupTestSuite } from './src/lib/dedupTestSuite';
import { cleanupEngine } from './src/lib/cleanupEngine';
import { runCleanupTestSuite } from './src/lib/cleanupTestSuite';
import { layer1RagEngine } from './src/lib/rag/layer1Engine';
import { runLayer1TestSuite } from './src/lib/rag/layer1TestSuite';
import { layer2RagEngine } from './src/lib/rag/layer2Engine';
import { runLayer2TestSuite } from './src/lib/rag/layer2TestSuite';
import { companyVectorStore } from './src/lib/rag/companyVectorStore';
import { layer2LLMReasoningEngine } from './src/lib/rag/layer2LLMReasoning';
import { compositeScoringEngine, DEFAULT_COMPOSITE_WEIGHTS } from './src/lib/scoring/compositeScoringEngine';
import { runCompositeScoringTestSuite } from './src/lib/scoring/compositeScoringTestSuite';
import { taskQueue } from './src/lib/queue/taskQueue';
import { proxyRotator } from './src/lib/queue/proxyRotator';
import { scraperScheduler } from './src/lib/queue/scraperScheduler';
import { runQueueTestSuite } from './src/lib/queue/queueTestSuite';
import { notificationDispatcher } from './src/lib/alerts/notificationDispatcher';
import { telegramAlertService } from './src/lib/alerts/telegramService';
import { emailAlertService } from './src/lib/alerts/emailService';
import { formatAlertMessage } from './src/lib/alerts/alertFormatter';
import { runAlertTestSuite } from './src/lib/alerts/alertTestSuite';
import { adaptiveThresholdTuner } from './src/lib/feedback/adaptiveThresholdTuner';
import { userFeedbackStore } from './src/lib/feedback/userFeedbackStore';
import { runFeedbackTestSuite } from './src/lib/feedback/feedbackTestSuite';
import { dynamicResumeEngine } from './src/lib/resume/dynamicResumeEngine';
import { ResumeDeltaTestSuite } from './src/lib/resume/resumeDeltaTestSuite';
import { hiringInsightsEngine } from './src/lib/analytics/hiringInsightsEngine';
import { runHiringAnalyticsTestSuite } from './src/lib/analytics/hiringAnalyticsTestSuite';
import {
  runFullEndToEndTestSuite,
  runEndToEndPipelineTrace,
  runLoadAndConcurrencyBenchmark,
} from './src/lib/e2e/e2eIntegrationTestSuite';
import {
  registerSchema,
  loginSchema,
  preferencesSchema,
  profileUpdateSchema,
  resumeCreateSchema,
  applicationStatusSchema,
  requestIdSchema,
  feedbackActionSchema,
  feedbackRecordSchema,
  alertConfigurationSchema,
} from './src/lib/validations';
import {
  generateUserToken,
  authenticateToken,
  setAuthCookie,
  clearAuthCookie,
  enforceTenantAndUserSecurity,
  AuthenticatedRequest,
} from './src/middleware/auth';
import {
  authRateLimiter,
  aiRateLimiter,
  ragRateLimiter,
  scraperRateLimiter,
  generalRateLimiter,
} from './src/middleware/rateLimiter';
import { costGuard } from './src/lib/rateLimiter';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES },
});
const resumeUpload = (req: Request, res: express.Response, next: express.NextFunction) => {
  upload.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Resume Processing Error', message: 'Resume files must be 10 MB or smaller.' });
    }
    if (error) {
      return res.status(400).json({ error: 'Resume Processing Error', message: 'The uploaded file could not be received.' });
    }
    next();
  });
};

function isLiveScrapingEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' ||
    (process.env.ENABLE_LIVE_SCRAPING === 'true' && process.env.ATS_TERMS_REVIEWED === 'true');
}

function isScraperSchedulerEnabled(): boolean {
  return process.env.ENABLE_LIVE_SCRAPING === 'true' &&
    process.env.ATS_TERMS_REVIEWED === 'true' &&
    process.env.ENABLE_SCRAPER_SCHEDULER === 'true';
}

async function startServer() {
  const persistence = new PostgresPersistence(process.env.DATABASE_URL);
  await persistence.initialize(db, userFeedbackStore);

  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error(`Invalid PORT value "${process.env.PORT}". Expected an integer from 1 to 65535.`);
  }

  app.use(express.json({ limit: '1mb' }));
  app.use('/api', (req, res, next) => {
    if (
      req.method === 'POST' &&
      /^\/queue\/schedules(?:\/.*)?$/.test(req.path) &&
      !isScraperSchedulerEnabled()
    ) {
      return res.status(503).json({
        error: 'Scheduled live ingestion is disabled.',
        message: 'Enable live ingestion only after source-specific terms review.',
      });
    }
    if (
      (req.method === 'GET' && req.path === '/health') ||
      (req.method === 'POST' && (
        req.path === '/auth/register' ||
        req.path === '/auth/login' ||
        req.path === '/auth/logout' ||
        req.path === '/feedback/telegram-webhook'
      ))
    ) {
      return next();
    }

    authenticateToken(req as AuthenticatedRequest, res, () => {
      const authenticatedRequest = req as AuthenticatedRequest;
      const user = authenticatedRequest.user
        ? db.getUserById(authenticatedRequest.user.userId, authenticatedRequest.user.tenantId)
        : undefined;
      const isProductionDemoAccount = process.env.NODE_ENV === 'production' && (
        user?.email === 'alex.rivera@stanford.edu' || user?.email === 'jordan.chen@berkeley.edu'
      );
      if (!authenticatedRequest.user || !user || isProductionDemoAccount) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'The account for this session is no longer available. Please sign in again.',
          code: 'AUTH_SESSION_REVOKED',
        });
      }

      const adminOnlyMutation =
        (req.method === 'POST' && /^\/(?:scrapers\/(?:fetch-live|greenhouse|lever|run-all)|jobs(?:\/(?:cleanup|simulate-stale-bloat|mark-inactive|dedup-reset-stats))?|companies\/insights|rag\/layer2\/chunks\/ingest|db\/seed|alerts\/(?:config|dispatch-test|test-connection)|queue(?:\/.*)?)$/.test(req.path)) ||
        ((req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') && /^\/queue(?:\/.*)?$/.test(req.path)) ||
        (req.method === 'GET' && req.path === '/queue/proxies') ||
        (/\/(?:test-suite(?:\/.*)?|simulate-pipeline|load-benchmark)$/.test(req.path));
      if (adminOnlyMutation) {
        const administrators = new Set(
          (process.env.ADMIN_USER_IDS || '').split(',').map((id) => id.trim()).filter(Boolean)
        );
        if (!administrators.has(user.id)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Administrator permission is required for this operation.',
            code: 'ADMIN_PERMISSION_REQUIRED',
          });
        }
      }

      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? req.body as Record<string, unknown>
        : {};
      if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
        return res.status(400).json({ error: 'Validation Error', message: 'Request body must be a JSON object.' });
      }
      for (const value of Object.values(req.query)) {
        if (typeof value !== 'string') {
          return res.status(400).json({ error: 'Validation Error', message: 'Query parameters must be single string values.' });
        }
      }
      for (const [name, value] of Object.entries({ ...req.query, ...body })) {
        if (name === 'userId' || name === 'tenantId') {
          if (typeof value !== 'string') {
            return res.status(400).json({ error: 'Validation Error', message: `${name} must be a string.` });
          }
          const expectedValue = name === 'userId' ? user.id : user.tenantId;
          if (value !== expectedValue) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'The requested account scope does not match the authenticated account.',
              code: 'USER_ISOLATION_VIOLATION',
            });
          }
        }

        if (['userId', 'tenantId', 'resumeId', 'jobId', 'candidateId'].includes(name)) {
          const parsedId = requestIdSchema.safeParse(value);
          if (!parsedId.success) {
            return res.status(400).json({ error: 'Validation Error', message: `${name} is invalid.` });
          }
        }
        if (name === 'candidateId' && value !== user.id) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You may only access feedback associated with your own account.',
            code: 'USER_ISOLATION_VIOLATION',
          });
        }
      }

      const feedbackCandidateFromPath = /^\/feedback\/(?:profile|reset)\/([^/]+)$/.exec(req.path)?.[1];
      if (feedbackCandidateFromPath && feedbackCandidateFromPath !== user.id) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You may only access feedback associated with your own account.',
          code: 'USER_ISOLATION_VIOLATION',
        });
      }

      const resumeIdFromPath = /^\/(?:resumes|resume\/(?:modular-vectors|delta\/audit|delta\/reset))\/([^/]+)$/.exec(req.path)?.[1];
      const suppliedResumeId = body.resumeId ?? req.query.resumeId ?? resumeIdFromPath;
      if (suppliedResumeId !== undefined) {
        const parsedResumeId = requestIdSchema.safeParse(suppliedResumeId);
        if (!parsedResumeId.success) {
          return res.status(400).json({ error: 'Validation Error', message: 'resumeId is invalid.' });
        }
        const resume = db.getResumeById(parsedResumeId.data, user.tenantId);
        if (resume && resume.userId !== user.id) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have permission to access this resume.',
            code: 'USER_ISOLATION_VIOLATION',
          });
        }
      }

      next();
    });
  });
  const getAuthenticatedResumes = (req: Request) => {
    const identity = (req as AuthenticatedRequest).user;
    return identity ? db.getResumes(identity.tenantId, identity.userId) : [];
  };
  const requireOwnedResume = (req: Request, res: express.Response, value: unknown): string | undefined => {
    const identity = (req as AuthenticatedRequest).user;
    const parsedId = requestIdSchema.safeParse(value);
    if (!parsedId.success) {
      res.status(400).json({ error: 'Validation Error', message: 'A valid resume ID is required.' });
      return undefined;
    }
    if (!identity) {
      res.status(401).json({ error: 'Unauthorized' });
      return undefined;
    }
    const resume = db.getResumeById(parsedId.data, identity.tenantId);
    if (!resume || resume.userId !== identity.userId) {
      res.status(404).json({ error: 'Resume not found.' });
      return undefined;
    }
    return parsedId.data;
  };

  app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    const shouldPersist = req.method !== 'GET' || req.path === '/api/dashboard/overview';
    if (shouldPersist) {
      res.json = ((body: unknown) => {
        void persistence.persist(db, userFeedbackStore)
          .then(() => originalJson(body))
          .catch((error: unknown) => {
            console.error('Failed to persist application state:', error);
            if (!res.headersSent) {
              res.status(500);
              originalJson({ error: 'Database persistence failed' });
            }
          });

        return res;
      }) as typeof res.json;
    }
    next();
  });

  // 1. Health Check & API Cost/Rate Limit Guard Status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AI Internship Scout - Phase 1 & 2 API (Auth & Onboarding)',
      timestamp: new Date().toISOString(),
      costGuard: costGuard.getStats(),
    });
  });

  // Real-time Rate Limit & API Cost Metrics for Developer & User Transparency
  app.get('/api/cost-guard/stats', (req, res) => {
    res.json(costGuard.getStats());
  });

  // ==========================================
  // PHASE 2: AUTHENTICATION & ONBOARDING ENDPOINTS
  // ==========================================

  // 1. User Registration (Zod Validated, Password Hashing, Auto JWT Issue, Rate-Limited)
  app.post('/api/auth/register', authRateLimiter, (req, res) => {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid registration parameters',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    try {
      const { email, password, fullName, avatarUrl } = parseResult.data;
      const user = db.registerUser({ email, password, fullName, tenantId: `tenant-${randomUUID()}`, avatarUrl });
      const token = generateUserToken(user);
      setAuthCookie(res, token);

      // Create default preferences
      db.upsertPreferences({
        userId: user.id,
        tenantId: user.tenantId,
        targetLocations: ['San Francisco, CA', 'Remote'],
        targetRoles: ['Software Engineering Intern'],
        preferredCompanies: [],
        blacklistedCompanies: [],
        customMatchThreshold: 0.70,
        alertMethod: 'email',
        alertDestination: user.email,
        isActive: true,
      });

      const { passwordHash, ...safeUser } = user;
      res.status(201).json({
        token,
        user: safeUser,
        expiresIn: '7d',
        message: 'User registered successfully',
      });
    } catch (err: any) {
      res.status(400).json({ error: 'Registration Failed', message: err.message });
    }
  });

  // 2. User Login (Zod Validated, Bcrypt Verification, JWT Token, Rate-Limited)
  app.post('/api/auth/login', authRateLimiter, (req, res) => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid login parameters',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parseResult.data;
    const user = db.verifyCredentials(email, password);

    if (!user) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid email address or password.',
      });
    }

    const token = generateUserToken(user);
    setAuthCookie(res, token);
    const { passwordHash, ...safeUser } = user;

    res.json({
      token,
      user: safeUser,
      expiresIn: '7d',
      message: 'Login successful',
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  // 3. Get Current Authenticated User Profile (Protected by JWT)
  app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const user = db.getUserById(req.user.userId, req.user.tenantId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const preferences = db.getPreferences(user.id, user.tenantId);
    const resumes = db.getResumes(user.tenantId, user.id);
    const token = generateUserToken(user);
    setAuthCookie(res, token);

    const { passwordHash, ...safeUser } = user;
    res.json({
      token,
      user: safeUser,
      tenantId: req.user.tenantId,
      preferences,
      resumesCount: resumes.length,
    });
  });

  // 4. Update Profile Info (Protected by JWT)
  app.put('/api/auth/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const parseResult = profileUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const updatedUser = db.updateUser(req.user.userId, parseResult.data, req.user.tenantId);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found or tenant mismatch' });
    }

    const { passwordHash, ...safeUser } = updatedUser;
    res.json({ success: true, user: safeUser });
  });

  // 5. Save Initial Onboarding Target Criteria & Preferences (Zod Validated, Protected)
  app.post('/api/auth/onboarding', authenticateToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const parseResult = preferencesSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid onboarding target preferences',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const prefData = parseResult.data;
    const updatedPref = db.upsertPreferences({
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      ...prefData,
    });

    // Mark user as onboarded
    db.updateUser(req.user.userId, { isOnboarded: true }, req.user.tenantId);

    res.json({
      success: true,
      message: 'Onboarding target criteria configured successfully!',
      preferences: updatedPref,
    });
  });

  // ==========================================
  // PHASE 3: RESUME INGESTION & STRUCTURAL VECTORIZATION ENDPOINTS
  // ==========================================

  // 1. Resume Parsing & Multi-Vector Generation Endpoint (Rate-Limited, Supports PDF, DocX, Text Upload)
  app.post('/api/resumes/parse', authenticateToken, aiRateLimiter, resumeUpload, async (req, res) => {
    try {
      let rawText = '';
      let fileName = 'Uploaded Resume';

      if (req.file) {
        fileName = req.file.originalname;
        rawText = await extractResumeText(req.file.buffer, fileName, req.file.mimetype);
      } else if (req.body && req.body.rawText) {
        if (typeof req.body.rawText !== 'string') {
          throw new ResumeProcessingError('Resume text must be a string.');
        }
        rawText = req.body.rawText.trim();
        if (rawText.length > 100_000) {
          throw new ResumeProcessingError('Resume text exceeds the 100,000 character limit.', 413);
        }
        if (req.body.title && typeof req.body.title === 'string') fileName = req.body.title;
      } else {
        throw new ResumeProcessingError('Upload a resume file or provide resume text.');
      }

      if (!rawText) throw new ResumeProcessingError('Resume text is empty.');

      // Resume parsing and embedding are local; no resume text is sent to an AI provider.
      const parsedData = parseResume(rawText);
      const vectors = generateResumeVectors(rawText, parsedData);

      res.json({
        success: true,
        fileName,
        rawText,
        parsedData,
        vectors,
      });
    } catch (error: unknown) {
      if (error instanceof ResumeProcessingError) {
        return res.status(error.statusCode).json({ error: 'Resume Processing Error', message: error.message });
      }
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Resume Processing Error', message: 'Resume files must be 10 MB or smaller.' });
      }
      return res.status(400).json({
        error: 'Resume Processing Error',
        message: 'The resume could not be processed. Check that the file is valid and try again.',
      });
    }
  });

  // 2. Save Parsed Resume & Structural Embeddings to Database (Protected)
  app.post('/api/resumes', authenticateToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const parsedBody = resumeCreateSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({
          error: 'Validation Error',
          details: parsedBody.error.flatten().fieldErrors,
        });
      }
      const { title, rawText, parsedData, isPrimary, fullTextVector, skillsVector, experienceVector } = parsedBody.data;

      const newResume = db.createResume({
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        title: title || 'Parsed Engineering Resume',
        content: rawText,
        extractedSkills: parsedData.skills || [],
        parsedExperience: (parsedData.experience || []).map((e: any) => ({
          company: e.company,
          role: e.role,
          duration: e.duration,
          highlights: e.highlights || [],
          technologies: e.technologies || [],
        })),
        parsedData,
        embedding: fullTextVector || generateDeterministicEmbedding(rawText),
        skillsVector: skillsVector || generateDeterministicEmbedding((parsedData.skills || []).join(', ')),
        experienceVector: experienceVector || generateDeterministicEmbedding(rawText),
        isPrimary: isPrimary ?? true,
      });

      res.status(201).json({
        success: true,
        message: 'Resume and structural multi-vectors persisted to database successfully!',
        resume: newResume,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Database Save Error', message: err.message });
    }
  });

  // 3. Get All Resumes for Authenticated User (Protected)
  app.get('/api/resumes', authenticateToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const resumesList = db.getResumes(req.user.tenantId, req.user.userId);
    res.json({
      resumes: resumesList,
      count: resumesList.length,
      tenantId: req.user.tenantId,
    });
  });

  // 4. Get Specific Resume by ID (Protected & Isolated)
  app.get('/api/resumes/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const resume = db.getResumeById(req.params.id, req.user.tenantId);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found or tenant access forbidden' });
    }

    if (!enforceTenantAndUserSecurity(req, res, { targetTenantId: resume.tenantId, targetUserId: resume.userId })) {
      return;
    }

    res.json(resume);
  });

  app.delete('/api/resumes/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const resume = db.getResumeById(req.params.id, req.user.tenantId);
    if (!resume || resume.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Resume not found.' });
    }
    if (!db.deleteResume(resume.id, req.user.tenantId, req.user.userId)) {
      return res.status(404).json({ error: 'Resume not found.' });
    }
    dynamicResumeEngine.deleteResumeData(resume.id);
    return res.json({ success: true });
  });

  // ==========================================
  // PHASE 4: TARGET JOB BOARD SCRAPERS (LIVE WEB & MULTI-ATS INTEGRATION)
  // ==========================================

  const greenhouseScraper = new GreenhouseScraper();
  const leverScraper = new LeverScraper();
  const ashbyScraper = new AshbyScraper();
  const workdayScraper = new WorkdayScraper();

  // 1. Target Companies Full Catalog (Categorized by 5 Tiers)
  app.get('/api/scrapers/target-companies', (req, res) => {
    const category = req.query.category as CompanyCategory | undefined;
    const search = req.query.search as string | undefined;

    const companies = liveScraperEngine.getCompaniesByCategory(category, search);
    const categories = [
      'Tech Giants & Big Tech',
      'Finance & Quant/HFT',
      'High-Growth / Indian Tech Unicorns',
      'AI & Analytics',
      'Enterprise Services & IT',
    ];

    const categoryStats = categories.map((cat) => ({
      category: cat,
      count: TARGET_COMPANIES_CATALOG.filter((c) => c.category === cat).length,
    }));

    res.json({
      totalCount: TARGET_COMPANIES_CATALOG.length,
      filteredCount: companies.length,
      categories: categoryStats,
      companies: companies.map((company) => ({
        ...company,
        isRealtimeEnabled: liveScraperEngine.isBoardVerified(company.id),
        connectorStatus: liveScraperEngine.hasConfiguredConnector(company)
          ? 'supported_unverified'
          : 'unsupported',
        verificationStatus: liveScraperEngine.getBoardHealth().find((health) => health.companyId === company.id)?.verificationStatus ?? 'not_checked',
        syntheticDataAvailable: false,
      })),
    });
  });

  // 2. Fetch Live Postings for Specific Company or Category
  app.post('/api/scrapers/fetch-live', scraperRateLimiter, async (req, res) => {
    try {
      const { companyId, companyName, category, persistToDb = true } = req.body;
      if (!isLiveScrapingEnabled()) {
        return res.status(503).json({
          error: 'Live job ingestion is disabled.',
          message: 'Production live scraping requires ENABLE_LIVE_SCRAPING=true and ATS_TERMS_REVIEWED=true after source-specific terms review.',
        });
      }

      let targetCompanies = TARGET_COMPANIES_CATALOG;
      if (companyId) {
        targetCompanies = targetCompanies.filter((c) => c.id === companyId);
      } else if (companyName) {
        targetCompanies = targetCompanies.filter(
          (c) => c.name.toLowerCase() === companyName.toLowerCase() || c.boardToken.toLowerCase() === companyName.toLowerCase()
        );
      } else if (category) {
        targetCompanies = targetCompanies.filter((c) => c.category === category);
      } else {
        // Default batch top 10 companies
        targetCompanies = targetCompanies.slice(0, 10);
      }

      if (targetCompanies.length === 0) {
        return res.status(404).json({ error: 'No matching target companies found' });
      }

      const results = [];
      const allJobs = [];

      for (const comp of targetCompanies) {
        const scrapeResult = await liveScraperEngine.scrapeCompany(comp);
        const inactiveCount = persistToDb && scrapeResult.completeSnapshot &&
          (scrapeResult.status === 'SUCCESS' || scrapeResult.status === 'EMPTY')
          ? db.deactivateMissingBoardJobs(
              comp.name,
              scrapeResult.provider === 'greenhouse' || scrapeResult.provider === 'lever'
                ? scrapeResult.provider
                : 'custom',
              scrapeResult.jobs.map((job) => job.externalId)
            )
          : 0;
        results.push({
          companyId: comp.id,
          company: comp.name,
          category: comp.category,
          atsProvider: comp.atsProvider,
          totalFetched: scrapeResult.totalFetched,
          newUniqueJobs: scrapeResult.newUniqueJobs,
          status: scrapeResult.status,
          error: scrapeResult.error,
          completeSnapshot: scrapeResult.completeSnapshot,
          previouslyActiveJobsClosed: inactiveCount,
          durationMs: scrapeResult.durationMs,
        });
        allJobs.push(...scrapeResult.jobs);
      }

      let dbSyncResult = { inserted: 0, updated: 0, total: 0 };
      if (persistToDb && allJobs.length > 0) {
        const jobsToPersist = allJobs.map((j) => ({
          source: j.source === 'greenhouse' || j.source === 'lever' ? j.source : 'custom',
          atsProvider: j.source,
          dataOrigin: 'live' as const,
          externalId: j.externalId,
          company: j.company,
          title: j.jobTitle,
          location: j.location,
          isRemote: j.isRemote,
          description: j.cleanDescription,
          rawJd: j.rawDescription,
          statedRequirements: j.statedRequirements,
          informalBar: j.informalBar,
          applyUrl: j.directApplyUrl,
          postedAt: j.postedAt,
        }));
        dbSyncResult = db.upsertJobs(jobsToPersist);
      }

      const failedCount = results.filter((result) => result.status === 'FAILED' || result.status === 'PARTIAL').length;
      const unsupportedCount = results.filter((result) => result.status === 'UNSUPPORTED').length;
      res.status(failedCount > 0 || unsupportedCount > 0 ? 207 : 200).json({
        success: failedCount === 0 && unsupportedCount === 0,
        status: failedCount > 0 ? 'PARTIAL_FAILURE' : unsupportedCount > 0 ? 'PARTIAL_UNSUPPORTED' : 'SUCCESS',
        companiesScraped: results.length,
        totalJobsFetched: allJobs.length,
        failedCount,
        unsupportedCount,
        dbSync: dbSyncResult,
        companyResults: results,
      });
    } catch (err: any) {
      console.error('Live scraping error:', err);
      res.status(500).json({ error: 'Live Scraping Failed', message: err.message });
    }
  });

  // 3. Supported ATS Boards Metadata List
  app.get('/api/scrapers/supported-boards', (req, res) => {
    const healthById = new Map(liveScraperEngine.getBoardHealth().map((board) => [board.companyId, board]));
    const supportedBoards = TARGET_COMPANIES_CATALOG.map((company) => ({
      companyId: company.id,
      company: company.name,
      provider: company.atsProvider,
      boardToken: company.boardToken,
      careersUrl: company.careersUrl,
      connectorStatus: liveScraperEngine.hasConfiguredConnector(company) ? 'supported_unverified' : 'unsupported',
      verificationStatus: healthById.get(company.id)?.verificationStatus ?? 'not_checked',
      isRealtimeEnabled: liveScraperEngine.isBoardVerified(company.id),
      sampleRoles: company.sampleRoles,
    }));
    const verifiedBoardCount = supportedBoards.filter((board) =>
      board.verificationStatus === 'healthy' || board.verificationStatus === 'empty'
    ).length;
    res.json({
      supportedBoards,
      totalConfigured: TARGET_COMPANIES_CATALOG.length,
      configuredConnectorCount: supportedBoards.filter((board) => board.connectorStatus === 'supported_unverified').length,
      verifiedBoardCount,
      adapters: ['GreenhouseScraper', 'LeverScraper', 'AshbyScraper', 'WorkdayScraper'],
      termsReviewStatus: process.env.ATS_TERMS_REVIEWED === 'true' ? 'approved_by_operator' : 'not_reviewed',
      note: 'Connector support means an adapter exists; individual boards are unverified until a successful live fetch. Sample roles are not job listings. Terms status is an operator attestation, not a legal determination.',
    });
  });

  app.get('/api/scrapers/health', (req, res) => {
    res.json({
      freshnessWindowHours: 72,
      boards: liveScraperEngine.getBoardHealth(),
    });
  });

  // 2. Scrape Greenhouse Board or Raw Payload (Rate-Limited)
  app.post('/api/scrapers/greenhouse', scraperRateLimiter, async (req, res) => {
    try {
      const { boardToken, company, rawPayload, persistToDb = true } = req.body;
      if (!rawPayload && !isLiveScrapingEnabled()) {
        return res.status(503).json({ error: 'Live job ingestion is disabled pending source-specific terms review.' });
      }

      if (!boardToken && !rawPayload) {
        return res.status(400).json({ error: 'boardToken or rawPayload is required.' });
      }

      let normalizedJobs = [];
      const companyName = company || (boardToken ? boardToken.charAt(0).toUpperCase() + boardToken.slice(1) : 'Company');

      if (rawPayload) {
        normalizedJobs = greenhouseScraper.parseRawPayload(companyName, rawPayload);
      } else {
        normalizedJobs = await greenhouseScraper.fetchBoard(boardToken, companyName);
      }

      let dbSyncResult = { inserted: 0, updated: 0, total: 0 };
      if (persistToDb && normalizedJobs.length > 0) {
        const jobsToPersist = normalizedJobs.map((j) => ({
          source: 'greenhouse' as const,
          atsProvider: 'greenhouse',
          dataOrigin: rawPayload ? 'manual' as const : 'live' as const,
          externalId: j.externalId,
          company: j.company,
          title: j.jobTitle,
          location: j.location,
          isRemote: j.isRemote,
          description: j.cleanDescription,
          rawJd: j.rawDescription,
          statedRequirements: j.statedRequirements,
          informalBar: j.informalBar,
          applyUrl: j.directApplyUrl,
          postedAt: j.postedAt,
        }));
        dbSyncResult = db.upsertJobs(jobsToPersist);
      }

      res.json({
        success: true,
        source: 'greenhouse',
        company: companyName,
        jobsCount: normalizedJobs.length,
        dbSync: dbSyncResult,
        jobs: normalizedJobs,
      });
    } catch (err: any) {
      console.error('Greenhouse scraping error:', err);
      res.status(500).json({ error: 'Greenhouse Scraping Failed', message: err.message });
    }
  });

  // 3. Scrape Lever Board or Raw Payload (Rate-Limited)
  app.post('/api/scrapers/lever', scraperRateLimiter, async (req, res) => {
    try {
      const { companySite, company, rawPayload, persistToDb = true } = req.body;
      if (!rawPayload && !isLiveScrapingEnabled()) {
        return res.status(503).json({ error: 'Live job ingestion is disabled pending source-specific terms review.' });
      }

      if (!companySite && !rawPayload) {
        return res.status(400).json({ error: 'companySite or rawPayload is required.' });
      }

      let normalizedJobs = [];
      const companyName = company || (companySite ? companySite.charAt(0).toUpperCase() + companySite.slice(1) : 'Company');

      if (rawPayload) {
        normalizedJobs = leverScraper.parseRawPayload(companyName, rawPayload);
      } else {
        normalizedJobs = await leverScraper.fetchBoard(companySite, companyName);
      }

      let dbSyncResult = { inserted: 0, updated: 0, total: 0 };
      if (persistToDb && normalizedJobs.length > 0) {
        const jobsToPersist = normalizedJobs.map((j) => ({
          source: 'lever' as const,
          atsProvider: 'lever',
          dataOrigin: rawPayload ? 'manual' as const : 'live' as const,
          externalId: j.externalId,
          company: j.company,
          title: j.jobTitle,
          location: j.location,
          isRemote: j.isRemote,
          description: j.cleanDescription,
          rawJd: j.rawDescription,
          statedRequirements: j.statedRequirements,
          informalBar: j.informalBar,
          applyUrl: j.directApplyUrl,
          postedAt: j.postedAt,
        }));
        dbSyncResult = db.upsertJobs(jobsToPersist);
      }

      res.json({
        success: true,
        source: 'lever',
        company: companyName,
        jobsCount: normalizedJobs.length,
        dbSync: dbSyncResult,
        jobs: normalizedJobs,
      });
    } catch (err: any) {
      console.error('Lever scraping error:', err);
      res.status(500).json({ error: 'Lever Scraping Failed', message: err.message });
    }
  });

  // 4. Batch Scrape All Target Boards
  app.post('/api/scrapers/run-all', async (req, res) => {
    try {
      if (!isLiveScrapingEnabled()) {
        return res.status(503).json({ error: 'Live job ingestion is disabled pending source-specific terms review.' });
      }
      const targets = TARGET_COMPANIES_CATALOG
        .filter((company) => liveScraperEngine.hasConfiguredConnector(company))
        .slice(0, 5);
      const results = [];
      const allJobs = [];

      for (const company of targets) {
        const result = await liveScraperEngine.scrapeCompany(company);
        results.push({
          companyId: company.id,
          company: company.name,
          provider: company.atsProvider,
          status: result.status,
          error: result.error,
          totalFetched: result.totalFetched,
          rejectedJobCount: result.rejectedJobCount,
        });
        if (result.completeSnapshot && (result.status === 'SUCCESS' || result.status === 'EMPTY')) {
          db.deactivateMissingBoardJobs(
            company.name,
            result.provider === 'greenhouse' || result.provider === 'lever' ? result.provider : 'custom',
            result.jobs.map((job) => job.externalId)
          );
        }
        allJobs.push(...result.jobs);
      }

      const jobsToPersist = allJobs.map((job) => ({
        source: job.source === 'greenhouse' || job.source === 'lever' ? job.source : 'custom',
        atsProvider: job.source,
        dataOrigin: 'live' as const,
        externalId: job.externalId,
        company: job.company,
        title: job.jobTitle,
        location: job.location,
        isRemote: job.isRemote,
        description: job.cleanDescription,
        rawJd: job.rawDescription,
        statedRequirements: job.statedRequirements,
        informalBar: job.informalBar,
        applyUrl: job.directApplyUrl,
        postedAt: job.postedAt,
      }));
      const dbSync = db.upsertJobs(jobsToPersist);
      const failedCount = results.filter((result) => result.status === 'FAILED' || result.status === 'PARTIAL').length;
      res.status(failedCount > 0 ? 207 : 200).json({
        success: failedCount === 0,
        totalIngested: allJobs.length,
        targetsProcessed: targets.length,
        failedCount,
        dbSync,
        companyResults: results,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Batch Ingestion Error', message: err.message });
    }
  });

  // 5. Automated Unit Test Suite Endpoint
  app.post('/api/scrapers/test-suite', async (req, res) => {
    try {
      const report = await runScraperTestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: 'Unit Test Execution Failed', message: err.message });
    }
  });

  // 6. Live Normalization Preview Endpoint
  app.post('/api/scrapers/normalize-preview', (req, res) => {
    try {
      const { rawHtml, company = 'Sample Tech', jobTitle = 'Software Engineering Intern' } = req.body;
      if (!rawHtml) {
        return res.status(400).json({ error: 'rawHtml string is required.' });
      }

      const cleanDescription = sanitizeHtml(rawHtml);
      const isRemote = detectRemote(jobTitle, 'San Francisco, CA', cleanDescription);
      const reqId = extractReqId(null, undefined, rawHtml);
      const statedRequirements = extractStatedRequirements(cleanDescription);
      const informalBar = extractInformalBarHints(company, jobTitle, cleanDescription);
      const vectorEmbedding = generateDeterministicEmbedding(`${cleanDescription} ${company} ${jobTitle}`);

      res.json({
        success: true,
        company,
        jobTitle,
        reqId,
        isRemote,
        cleanDescription,
        statedRequirements,
        informalBar,
        vectorPreview: {
          dimensions: vectorEmbedding.length,
          sample: vectorEmbedding.slice(0, 8),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Normalization Preview Error', message: err.message });
    }
  });

  // ==============================================================
  // PHASE 5: JOB DEDUPLICATION, STORAGE & PRE-FILTER ENGINE ROUTES
  // ==============================================================

  // 1. Process candidate job(s) through Deduplication & Location Pre-Filter Engine
  app.post('/api/jobs/dedup-process', (req, res) => {
    try {
      const { jobs, job, userPreferences } = req.body;

      if (jobs && Array.isArray(jobs)) {
        const batchResult = dedupEngine.processBatch(jobs, userPreferences);
        return res.json({
          success: true,
          mode: 'batch',
          stats: dedupEngine.getStats(),
          result: batchResult,
        });
      }

      if (job) {
        const singleResult = dedupEngine.processJob(job, userPreferences);
        return res.json({
          success: true,
          mode: 'single',
          stats: dedupEngine.getStats(),
          result: singleResult,
        });
      }

      return res.status(400).json({ error: 'Either "job" object or "jobs" array is required.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Dedup Processing Error', message: err.message });
    }
  });

  // 2. Deduplication Engine Runtime Stats & Cumulative Savings
  app.get('/api/jobs/dedup-stats', (req, res) => {
    try {
      const stats = dedupEngine.getStats();
      const allJobs = db.getJobs();
      res.json({
        success: true,
        stats,
        totalJobsInDb: allJobs.length,
        relevantJobsCount: allJobs.filter((j) => j.relevanceStatus === 'RELEVANT').length,
        droppedJobsCount: allJobs.filter((j) => j.relevanceStatus === 'DROPPED_LOCATION_MISMATCH').length,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve stats', message: err.message });
    }
  });

  // 3. Reset Dedup Engine Runtime Stats
  app.post('/api/jobs/dedup-reset-stats', (req, res) => {
    dedupEngine.resetStats();
    res.json({ success: true, message: 'Dedup engine stats reset.', stats: dedupEngine.getStats() });
  });

  // 4. Run Phase 5 Automated Test Suite
  app.post('/api/jobs/test-suite-phase5', async (req, res) => {
    try {
      const report = await runDedupTestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: 'Phase 5 Test Suite Failed', message: err.message });
    }
  });

  // 5. Simulate Location Pre-Filter Rules against Candidate
  app.post('/api/jobs/prefilter-simulate', (req, res) => {
    try {
      const { location, isRemote = false, targetLocations = ['San Francisco, CA', 'New York, NY', 'Remote'] } = req.body;
      if (!location && location !== '') {
        return res.status(400).json({ error: 'location string is required.' });
      }

      const matchResult = matchLocationFilter(location, isRemote, targetLocations);
      const hashSample = generateJobDedupHash('Sample Company', 'Software Intern', location, 'https://example.com/jobs/123');

      res.json({
        success: true,
        input: {
          location,
          isRemote,
          targetLocations,
        },
        matched: matchResult.matched,
        matchedToken: matchResult.matchedToken || null,
        reason: matchResult.reason,
        willComputeEmbedding: matchResult.matched,
        simulatedDedupHash: hashSample,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Pre-Filter Simulation Failed', message: err.message });
    }
  });

  // 2. Database Stats & Info
  app.get('/api/db/stats', (req, res) => {
    const stats = db.getStats();
    res.json(stats);
  });

  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/db/schema', (req, res) => {
      try {
        const sqlPath = path.join(process.cwd(), 'src', 'db', 'migrations', '0000_initial_schema.sql');
        const drizzlePath = path.join(process.cwd(), 'src', 'db', 'schema.ts');
        const sqlSchema = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf-8') : '-- SQL File Not Found';
        const drizzleCode = fs.existsSync(drizzlePath) ? fs.readFileSync(drizzlePath, 'utf-8') : '// Drizzle file not found';
        res.json({ sqlSchema, drizzleCode });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/db/seed', (req, res) => {
      db.seedDefaults();
      res.json({ success: true, message: 'Development database reset and seeded.', stats: db.getStats() });
    });
  }

  // 6. Users Endpoints (Multi-Tenant)
  app.get('/api/users', (req, res) => {
    const user = db.getUserById((req as AuthenticatedRequest).user!.userId, (req as AuthenticatedRequest).user!.tenantId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { passwordHash, ...safeUser } = user;
    res.json([safeUser]);
  });

  app.post('/api/users', (req, res) => {
    res.status(404).json({ error: 'Use /api/auth/register to create an account.' });
  });

  app.delete('/api/users/:id', (req, res) => {
    const authenticatedRequest = req as AuthenticatedRequest;
    const identity = authenticatedRequest.user;
    if (!identity || req.params.id !== identity.userId) {
      return res.status(403).json({ error: 'You may only delete your own account.' });
    }
    const resumesToDelete = db.getResumes(identity.tenantId, identity.userId);
    if (!db.deleteUser(identity.userId, identity.tenantId)) {
      return res.status(404).json({ error: 'User not found.' });
    }
    notificationDispatcher.clearHistoryForCandidate(identity.userId);
    resumesToDelete.forEach((resume) => dynamicResumeEngine.deleteResumeData(resume.id));
    userFeedbackStore.deleteCandidate(identity.userId);
    return res.json({ success: true, id: identity.userId });
  });

  // 8. User Preferences Endpoints (Strict storage: target locations, target roles, preferred/blacklisted companies, match threshold)
  app.get('/api/preferences', (req, res) => {
    const authenticatedRequest = req as AuthenticatedRequest;
    const userId = authenticatedRequest.user!.userId;
    const tenantId = authenticatedRequest.user!.tenantId;
    const pref = db.getPreferences(userId, tenantId);
    if (!pref) {
      return res.status(404).json({ error: 'Preferences not found for user' });
    }
    res.json(pref);
  });

  app.put('/api/preferences', (req, res) => {
    const authenticatedRequest = req as AuthenticatedRequest;
    const parseResult = preferencesSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation Error', details: parseResult.error.flatten().fieldErrors });
    }
    const updated = db.upsertPreferences({
      userId: authenticatedRequest.user!.userId,
      tenantId: authenticatedRequest.user!.tenantId,
      ...parseResult.data,
    });
    res.json(updated);
  });

  // 9. Jobs Endpoints
  app.get('/api/jobs', (req, res) => {
    const jobs = db.getJobs().filter((job) => job.isActive);
    res.json(jobs);
  });

  app.post('/api/jobs', (req, res) => {
    const { source, externalId, company, title, location, isRemote, description, rawJd, statedRequirements, informalBar, applyUrl } = req.body;
    if (!company || !title || !description || !rawJd) {
      return res.status(400).json({ error: 'company, title, description, rawJd are required.' });
    }
    const job = db.createJob({
      source: source || 'greenhouse',
      atsProvider: source || 'greenhouse',
      dataOrigin: 'manual',
      externalId: externalId || `ext-${Date.now()}`,
      company,
      title,
      location: location || 'Remote',
      isRemote: isRemote ?? true,
      description,
      rawJd,
      statedRequirements: statedRequirements || { requiredSkills: [], preferredSkills: [], education: 'BS CS', experienceYears: 0 },
      informalBar: informalBar || { dsaDifficulty: 'Medium', oaPattern: 'General LeetCode Mediums', unstatedPreferences: [], barDescription: 'Standard engineering bar' },
      applyUrl: applyUrl || 'https://careers.example.com',
      postedAt: new Date().toISOString(),
    });

    // Automatically trigger 2-layer match evaluation against all users
    const users = db.getUsers();
    users.forEach((u) => {
      const userResumes = db.getResumes(u.tenantId, u.id);
      const userPref = db.getPreferences(u.id, u.tenantId);
      if (userResumes.length > 0) {
        const primaryResume = userResumes.find((r) => r.isPrimary) || userResumes[0];
        const evalResult = db.evaluateTwoLayerMatch(primaryResume, job, userPref);

        if (!evalResult.isBlacklisted) {
          const match = db.createMatch({
            userId: u.id,
            tenantId: u.tenantId,
            jobId: job.id,
            resumeId: primaryResume.id,
            layer1Score: evalResult.layer1Score,
            layer2Score: evalResult.layer2Score,
            compositeScore: evalResult.compositeScore,
            matchedSkills: evalResult.matchedSkills,
            missingSkills: evalResult.missingSkills,
            status: evalResult.compositeScore >= ((userPref?.customMatchThreshold || 0.7) * 100) ? 'alerted' : 'pending',
          });

          // If composite score clears threshold, queue instant alert notification
          if (match.status === 'alerted' && userPref) {
            db.createNotification({
              userId: u.id,
              tenantId: u.tenantId,
              matchId: match.id,
              type: userPref.alertMethod,
              recipient: userPref.alertDestination,
              subject: `[High Match ${match.compositeScore}%] New Job: ${job.company} - ${job.title}`,
              body: `Instant Alert for ${u.fullName}:\n\nNew job posted at ${job.company} clearing your threshold (${userPref.customMatchThreshold * 100}%).\nLayer 1 Fit: ${match.layer1Score * 100}%\nLayer 2 Informal Bar Fit: ${match.layer2Score * 100}%\n\nApply now: ${job.applyUrl}`,
              sentAt: new Date().toISOString(),
              status: 'sent',
              metadata: { matchScore: match.compositeScore, company: job.company },
            });
          }
        }
      }
    });

    res.status(201).json(job);
  });

  // 9b. Stale Job Bloat Cleanup & Retention Endpoints
  // Executes: DELETE FROM jobs WHERE is_active = FALSE AND updated_at < NOW() - INTERVAL '60 days'
  app.post('/api/jobs/cleanup', (req, res) => {
    try {
      const { retentionDays, mode, forceAllInactive } = req.body;
      const result = db.cleanupStaleJobs({
        retentionDays: retentionDays !== undefined ? Number(retentionDays) : 60,
        mode: mode === 'archive' ? 'archive' : 'delete',
        forceAllInactive: Boolean(forceAllInactive),
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Cleanup operation failed' });
    }
  });

  app.get('/api/jobs/storage-bloat-stats', (req, res) => {
    try {
      const stats = db.getStorageBloatStats();
      const sqlDelete = cleanupEngine.getSqlStatement(60, 'delete');
      const sqlArchive = cleanupEngine.getSqlStatement(60, 'archive');
      const partitioningDdl = cleanupEngine.getPartitioningDdl();

      res.json({
        stats,
        sqlStatements: {
          deleteQuery: sqlDelete,
          archiveQuery: sqlArchive,
          partitioningDdl,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch storage bloat stats' });
    }
  });

  app.post('/api/jobs/simulate-stale-bloat', (req, res) => {
    try {
      const simResult = db.simulateStaleJobBloat();
      const updatedStats = db.getStorageBloatStats();
      res.json({
        ...simResult,
        updatedStats,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to simulate stale job bloat' });
    }
  });

  app.post('/api/jobs/mark-inactive', (req, res) => {
    try {
      const { jobIds, jobId, reason } = req.body;
      if (jobId) {
        const success = db.markJobInactive(jobId, reason);
        return res.json({ success, markedCount: success ? 1 : 0 });
      }
      if (Array.isArray(jobIds)) {
        const markedCount = db.markJobsInactiveBulk(jobIds);
        return res.json({ success: true, markedCount });
      }
      return res.status(400).json({ error: 'jobId or jobIds array required' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to mark jobs inactive' });
    }
  });

  app.get('/api/jobs/archived', (req, res) => {
    try {
      const archived = db.getArchivedJobs();
      res.json({ total: archived.length, archivedJobs: archived });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch archived jobs' });
    }
  });

  app.post('/api/jobs/test-suite-cleanup', (req, res) => {
    try {
      const report = runCleanupTestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run cleanup test suite' });
    }
  });

  // 9c. Phase 6: Layer 1 RAG Engine (Stated Requirement Matching)
  // Evaluates resume vs job via 768-dim dense vector embedding + lexical keyword & synonym match (Rate-Limited)
  app.post('/api/rag/layer1/evaluate', ragRateLimiter, (req, res) => {
    try {
      const { resumeId, jobId, customResume, customJob, weights } = req.body;

      let resume: any = customResume;
      if (!resume && resumeId) {
        resume = getAuthenticatedResumes(req).find((r) => r.id === resumeId);
      }
      if (!resume) {
        // Fallback to first primary resume in system
        const ownResumes = getAuthenticatedResumes(req);
        resume = ownResumes.find((r) => r.isPrimary) || ownResumes[0];
      }

      let job: any = customJob;
      if (!job && jobId) {
        job = db.getJobById(jobId);
      }
      if (!job) {
        const allJobs = db.getJobs();
        job = allJobs[0];
      }

      if (!resume || !job) {
        return res.status(400).json({ error: 'Both resume and job data are required for evaluation' });
      }

      const evaluation = layer1RagEngine.evaluateLayer1(resume, job, weights);
      res.json(evaluation);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute Layer 1 RAG evaluation' });
    }
  });

  app.post('/api/rag/layer1/batch-evaluate', ragRateLimiter, (req, res) => {
    try {
      const { resumeId, weights } = req.body;
      const ownResumes = getAuthenticatedResumes(req);
      const resume = resumeId
        ? ownResumes.find((r) => r.id === resumeId)
        : ownResumes.find((r) => r.isPrimary) || ownResumes[0];

      if (!resume) {
        return res.status(404).json({ error: 'No resume found for candidate' });
      }

      const jobs = db.getJobs().filter((j) => j.isActive);
      const evaluations = jobs.map((job) => layer1RagEngine.evaluateLayer1(resume!, job, weights));

      // Sort by Layer 1 score descending
      evaluations.sort((a, b) => b.layer1Score - a.layer1Score);

      res.json({
        resumeId: resume.id,
        candidateName: resume.title || 'Candidate',
        totalJobsEvaluated: evaluations.length,
        evaluations,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute batch Layer 1 evaluation' });
    }
  });

  app.post('/api/rag/layer1/test-suite', (req, res) => {
    try {
      const report = runLayer1TestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run Layer 1 test suite' });
    }
  });

  // ==========================================
  // PHASE 7: COMPANY EXPECTATIONS KNOWLEDGE GRAPH (LAYER 2 SEED DATA) ENDPOINTS
  // ==========================================

  // 1. List Company Profiles with Multi-Criteria Filtering & Search
  app.get('/api/companies/insights', generalRateLimiter, (req, res) => {
    try {
      const { tier, industry, dsaDifficulty, oaPlatform, search } = req.query as Record<string, string>;
      const insights = db.getCompanyInsights({
        tier,
        industry,
        dsaDifficulty,
        oaPlatform,
        search,
      });
      res.json({
        total: insights.length,
        companies: insights,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch company insights' });
    }
  });

  // 2. Company Knowledge Graph Statistics & Distributions
  app.get('/api/companies/insights/stats', generalRateLimiter, (req, res) => {
    try {
      const stats = db.getCompanyInsightsStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch knowledge graph statistics' });
    }
  });

  // 3. Empirical Data Sources & Provenance Attribution
  app.get('/api/companies/insights/data-sources', generalRateLimiter, (req, res) => {
    try {
      const sources = db.getDataSources();
      res.json({
        totalSources: sources.length,
        sources,
        methodology: {
          description: 'Layer 2 informal requirements are derived through multi-source validation combining historical recruiting repos, verified candidate debriefs, algorithmic assessment score bands, and public compensation indices.',
          primaryRepositories: ['SimplifyJobs/Summer2025-Internships', 'pittcsc/Summer2024-Internships'],
          compensationIndex: 'Levels.fyi verified offer letters',
          assessmentStandards: 'CodeSignal GCA 4-task rubric & HackerRank benchmarks',
          cultureValidation: 'Official corporate engineering blogs & Leadership Principles',
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch data sources' });
    }
  });

  // 4. Get Detailed Single Company Profile by ID or Name
  app.get('/api/companies/insights/:id', generalRateLimiter, (req, res) => {
    try {
      const insight = db.getCompanyInsightById(req.params.id) || db.getCompanyInsightByName(req.params.id);
      if (!insight) {
        return res.status(404).json({ error: `Company profile not found for "${req.params.id}"` });
      }
      res.json(insight);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch company insight profile' });
    }
  });

  // 5. Upsert / Contribute to Company Expectation Profile
  app.post('/api/companies/insights', generalRateLimiter, (req, res) => {
    try {
      const insightData = req.body;
      if (!insightData.companyName || !insightData.tier || !insightData.dsaBar) {
        return res.status(400).json({ error: 'Missing required company insight fields (companyName, tier, dsaBar)' });
      }
      const updated = db.upsertCompanyInsight(insightData);
      res.status(200).json({
        message: 'Company profile updated successfully in knowledge graph',
        company: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to upsert company insight' });
    }
  });

  // ==========================================
  // PHASE 8: TRUE RAG LAYER 2 ENGINE (COMPANY REALITY & VECTOR KNOWLEDGE BASE) ENDPOINTS
  // ==========================================

  // 1. Single Job vs Resume Layer 2 Evaluation (Async LLM Reasoning + Hybrid Vector Retrieval)
  app.post('/api/rag/layer2/evaluate', ragRateLimiter, async (req, res) => {
    try {
      const { resumeId, jobId, customResume, customJob, asyncReasoning = true } = req.body;

      let resume: any = customResume;
      if (!resume && resumeId) {
        resume = getAuthenticatedResumes(req).find((r) => r.id === resumeId);
      }
      if (!resume) {
        const ownResumes = getAuthenticatedResumes(req);
        resume = ownResumes.find((r) => r.isPrimary) || ownResumes[0];
      }

      let job: any = customJob;
      if (!job && jobId) {
        job = db.getJobById(jobId);
      }
      if (!job) {
        const allJobs = db.getJobs();
        job = allJobs[0];
      }

      if (!resume || !job) {
        return res.status(400).json({ error: 'Both resume and job data are required for Layer 2 evaluation' });
      }

      const evaluation = asyncReasoning
        ? await layer2RagEngine.evaluateLayer2Async(resume, job)
        : layer2RagEngine.evaluateLayer2(resume, job);

      res.json(evaluation);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute Layer 2 RAG evaluation' });
    }
  });

  // 2. Batch Layer 2 Reality Evaluation Across All Active Jobs
  app.post('/api/rag/layer2/batch-evaluate', ragRateLimiter, (req, res) => {
    try {
      const { resumeId, filterWarningsOnly, minRealityScore } = req.body;
      const ownResumes = getAuthenticatedResumes(req);
      const resume = resumeId
        ? ownResumes.find((r) => r.id === resumeId)
        : ownResumes.find((r) => r.isPrimary) || ownResumes[0];

      if (!resume) {
        return res.status(404).json({ error: 'No candidate resume found for Layer 2 evaluation' });
      }

      const jobs = db.getJobs().filter((j) => j.isActive);
      let evaluations = jobs.map((job) => layer2RagEngine.evaluateLayer2(resume!, job));

      if (filterWarningsOnly) {
        evaluations = evaluations.filter((e) => e.specificWarnings.length > 0);
      }

      if (typeof minRealityScore === 'number') {
        evaluations = evaluations.filter((e) => e.layer2Score >= minRealityScore);
      }

      // Sort by Composite Reality Score descending
      evaluations.sort((a, b) => b.compositeScore - a.compositeScore);

      // Compute matrix aggregates
      const avgDelta = evaluations.length > 0
        ? evaluations.reduce((acc, curr) => acc + curr.alignmentDelta, 0) / evaluations.length
        : 0;

      const totalWarnings = evaluations.reduce((acc, curr) => acc + curr.specificWarnings.length, 0);
      const downgradedJobsCount = evaluations.filter((e) => e.alignmentDelta < -0.05).length;
      const boostedJobsCount = evaluations.filter((e) => e.alignmentDelta > 0.05).length;

      res.json({
        resumeId: resume.id,
        candidateName: resume.title || 'Candidate',
        totalJobsEvaluated: evaluations.length,
        aggregates: {
          averageAlignmentDelta: parseFloat(avgDelta.toFixed(4)),
          averageAlignmentDeltaPercentage: parseFloat((avgDelta * 100).toFixed(1)),
          totalWarningsGenerated: totalWarnings,
          downgradedJobsCount,
          boostedJobsCount,
        },
        evaluations,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute batch Layer 2 evaluation' });
    }
  });

  // 3. RAG Knowledge Base Chunks Explorer (Search, Filter, Inspect Vectors)
  app.get('/api/rag/layer2/chunks', generalRateLimiter, (req, res) => {
    try {
      const { company, category, role, minConfidence, search } = req.query as Record<string, string>;
      let chunks = companyVectorStore.getAllChunks();

      if (company) {
        const cLower = company.toLowerCase().trim();
        chunks = chunks.filter((c) =>
          c.company.toLowerCase().includes(cLower) ||
          (c.companyAliases || []).some((a) => a.toLowerCase().includes(cLower))
        );
      }

      if (category) {
        chunks = chunks.filter((c) => c.category === category);
      }

      if (role) {
        chunks = chunks.filter((c) => c.role.includes(role.toLowerCase()));
      }

      if (minConfidence) {
        chunks = chunks.filter((c) => c.confidence === minConfidence);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        chunks = chunks.filter((c) =>
          c.title.toLowerCase().includes(searchLower) ||
          c.content.toLowerCase().includes(searchLower) ||
          c.tags.some((t) => t.toLowerCase().includes(searchLower))
        );
      }

      res.json({
        totalChunks: chunks.length,
        chunks,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch knowledge chunks' });
    }
  });

  // 4. Test Semantic / Hybrid RAG Vector Search with LLM Reasoning
  app.post('/api/rag/layer2/chunks/query', ragRateLimiter, async (req, res) => {
    try {
      const { query, company, category, topK = 5, synthesizeLlm = true, resumeId } = req.body;

      if (!query && !company) {
        return res.status(400).json({ error: 'A search "query" or "company" is required' });
      }

      const searchQuery = query || `${company} software engineering interview experiences, OA patterns, DSA difficulty, and recruiter filters`;
      const searchResults = companyVectorStore.searchHybrid(searchQuery, {
        company,
        category,
        topK: Number(topK) || 5,
      });

      const retrievedEvidence = companyVectorStore.toRetrievedEvidence(searchResults);

      let reasoningSummary = null;
      if (synthesizeLlm) {
        let resume = resumeId ? getAuthenticatedResumes(req).find((r) => r.id === resumeId) : null;
        if (!resume) {
          const ownResumes = getAuthenticatedResumes(req);
          resume = ownResumes.find((r) => r.isPrimary) || ownResumes[0];
        }

        const dummyJob: any = {
          id: 'test-query-job',
          company: company || (searchResults[0]?.chunk.company || 'Tech Company'),
          title: 'Software Engineering Intern',
          location: 'United States',
          statedRequirements: { requiredSkills: ['Data Structures', 'Algorithms'], preferredSkills: [], education: 'BS CS', experienceYears: 0 },
        };

        if (resume) {
          reasoningSummary = await layer2LLMReasoningEngine.synthesizeReality(
            resume,
            dummyJob,
            retrievedEvidence
          );
        }
      }

      res.json({
        query: searchQuery,
        totalRetrieved: searchResults.length,
        searchResults,
        retrievedEvidence,
        llmReasoning: reasoningSummary,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute RAG query' });
    }
  });

  // 5. Ingest New Empirical Company Observation / Debrief into Vector Store
  app.post('/api/rag/layer2/chunks/ingest', generalRateLimiter, (req, res) => {
    try {
      const { company, category, source, role, title, content, tags, metadata, confidence } = req.body;

      if (!company || !category || !content || !title) {
        return res.status(400).json({ error: 'Missing required fields (company, category, title, content)' });
      }

      const newChunk = companyVectorStore.ingestChunk({
        id: `chunk-${company.toLowerCase().replace(/\s+/g, '-')}-${category}-${Date.now()}`,
        company,
        category,
        source: source || 'candidate_report',
        role: role || 'software_engineering',
        date: new Date().getFullYear().toString(),
        confidence: confidence || 'high',
        title,
        content,
        tags: tags || [company, category],
        metadata: metadata || {},
      });

      res.status(201).json({
        message: 'Knowledge chunk ingested and 768-dim vector calculated successfully',
        chunk: newChunk,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to ingest knowledge chunk' });
    }
  });

  // 6. Automated Layer 2 Test Suite Runner
  app.post('/api/rag/layer2/test-suite', (req, res) => {
    try {
      const report = runLayer2TestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run Layer 2 test suite' });
    }
  });

  app.get('/api/rag/layer2/test-suite', (req, res) => {
    try {
      const report = runLayer2TestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run Layer 2 test suite' });
    }
  });

  // ==========================================
  // PHASE 9: DETERMINISTIC COMPOSITE MATCH SCORING ENGINE ENDPOINTS
  // ==========================================

  // 1. Get Default & Configured Weights
  app.get('/api/scoring/weights', generalRateLimiter, (req, res) => {
    try {
      res.json({
        defaultWeights: DEFAULT_COMPOSITE_WEIGHTS,
        descriptions: {
          layer1Weight: '40% - Layer 1 Vector Embedding Cosine Similarity & Stated Requirements Fit',
          layer2Weight: '30% - Layer 2 Context Score (Informal DSA Bar, OA Difficulty, Unspoken Screen, Alignment Delta)',
          preferredCompanyBoostWeight: '15% - Preferred Company Target Alignment (100% boost if on target list)',
          locationRoleFilterWeight: '15% - Candidate Location Match & Target Engineering Role Match',
        },
        presetProfiles: [
          {
            name: 'Balanced Core (Default)',
            description: '40% Vector/JD, 30% Reality, 15% Target Company, 15% Location/Role',
            weights: { layer1Weight: 0.40, layer2Weight: 0.30, preferredCompanyBoostWeight: 0.15, locationRoleFilterWeight: 0.15 },
          },
          {
            name: 'Reality & Informal Bar Heavy',
            description: 'Focus heavily on informal hiring bar, LeetCode difficulty, and OA filters',
            weights: { layer1Weight: 0.25, layer2Weight: 0.45, preferredCompanyBoostWeight: 0.15, locationRoleFilterWeight: 0.15 },
          },
          {
            name: 'Dream Companies First',
            description: 'Maximum emphasis on user target/preferred companies and vector alignment',
            weights: { layer1Weight: 0.35, layer2Weight: 0.20, preferredCompanyBoostWeight: 0.30, locationRoleFilterWeight: 0.15 },
          },
          {
            name: 'Strict Location & Role First',
            description: 'Prioritizes tight geographic alignment and exact role keywords',
            weights: { layer1Weight: 0.30, layer2Weight: 0.25, preferredCompanyBoostWeight: 0.15, locationRoleFilterWeight: 0.30 },
          },
        ],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch scoring weights' });
    }
  });

  // 2. Validate and Normalize Weights
  app.post('/api/scoring/weights/normalize', generalRateLimiter, (req, res) => {
    try {
      const inputWeights = req.body;
      const normalized = compositeScoringEngine.normalizeWeights(inputWeights);
      res.json({
        input: inputWeights,
        normalized,
        sum: parseFloat((normalized.layer1Weight + normalized.layer2Weight + normalized.preferredCompanyBoostWeight + normalized.locationRoleFilterWeight).toFixed(4)),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to normalize weights' });
    }
  });

  // 3. Single Job vs Candidate Deterministic Composite Score Evaluation
  app.post('/api/scoring/evaluate', ragRateLimiter, (req, res) => {
    try {
      const {
        resumeId,
        jobId,
        customResume,
        customJob,
        customPreferences,
        weights,
        strictLocationDisqualifier,
        strictRoleDisqualifier,
        customThreshold,
      } = req.body;

      let resume: any = customResume;
      if (!resume && resumeId) {
        resume = getAuthenticatedResumes(req).find((r) => r.id === resumeId);
      }
      if (!resume) {
        const ownResumes = getAuthenticatedResumes(req);
        resume = ownResumes.find((r) => r.isPrimary) || ownResumes[0];
      }

      let job: any = customJob;
      if (!job && jobId) {
        job = db.getJobById(jobId);
      }
      if (!job) {
        const allJobs = db.getJobs();
        job = allJobs[0];
      }

      if (!resume || !job) {
        return res.status(400).json({ error: 'Both candidate resume and job posting are required' });
      }

      let preferences = customPreferences;
      if (!preferences) {
        const identity = (req as AuthenticatedRequest).user!;
        preferences = db.getPreferences(identity.userId, identity.tenantId);
      }

      const evaluation = compositeScoringEngine.evaluateCompositeMatch(
        resume,
        job,
        preferences,
        {
          weights,
          strictLocationDisqualifier: Boolean(strictLocationDisqualifier),
          strictRoleDisqualifier: Boolean(strictRoleDisqualifier),
          customThreshold: typeof customThreshold === 'number' ? customThreshold : undefined,
        }
      );

      res.json(evaluation);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to compute composite match score' });
    }
  });

  // 4. Batch Deterministic Match Leaderboard Across Active Database Jobs
  app.post('/api/scoring/batch-evaluate', ragRateLimiter, (req, res) => {
    try {
      const {
        resumeId,
        customPreferences,
        weights,
        strictLocationDisqualifier,
        strictRoleDisqualifier,
        customThreshold,
        filterMeetsThresholdOnly,
        filterNonDisqualifiedOnly,
      } = req.body;

      const ownResumes = getAuthenticatedResumes(req);
      const resume = resumeId
        ? ownResumes.find((r) => r.id === resumeId)
        : ownResumes.find((r) => r.isPrimary) || ownResumes[0];

      if (!resume) {
        return res.status(404).json({ error: 'No candidate resume available for batch scoring' });
      }

      let preferences = customPreferences;
      if (!preferences) {
        const identity = (req as AuthenticatedRequest).user!;
        preferences = db.getPreferences(identity.userId, identity.tenantId);
      }

      const allJobs = db.getJobs(); // Evaluates all jobs (active & inactive) so hard disqualifier can be audited
      const batchResult = compositeScoringEngine.batchEvaluate(
        resume,
        allJobs,
        preferences,
        {
          weights,
          strictLocationDisqualifier: Boolean(strictLocationDisqualifier),
          strictRoleDisqualifier: Boolean(strictRoleDisqualifier),
          customThreshold: typeof customThreshold === 'number' ? customThreshold : undefined,
        }
      );

      let filteredEvaluations = batchResult.evaluations;
      if (filterMeetsThresholdOnly) {
        filteredEvaluations = filteredEvaluations.filter((e) => e.meetsCustomThreshold);
      }
      if (filterNonDisqualifiedOnly) {
        filteredEvaluations = filteredEvaluations.filter((e) => !e.isDisqualified);
      }

      res.json({
        ...batchResult,
        candidateTitle: resume.title || 'Candidate Profile',
        resumeId: resume.id,
        evaluations: filteredEvaluations,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute batch deterministic scoring' });
    }
  });

  // 5. Automated Phase 9 Test Suite
  app.post('/api/scoring/test-suite', (req, res) => {
    try {
      const report = runCompositeScoringTestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run composite scoring test suite' });
    }
  });

  app.get('/api/scoring/test-suite', (req, res) => {
    try {
      const report = runCompositeScoringTestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run composite scoring test suite' });
    }
  });

  // ==========================================
  // PHASE 10: ASYNCHRONOUS POLLING & TASK QUEUE INFRASTRUCTURE ENDPOINTS
  // ==========================================

  // 1. Task Queue Telemetry Metrics
  app.get('/api/queue/metrics', generalRateLimiter, (req, res) => {
    try {
      const metrics = taskQueue.getMetrics();
      const proxyStats = proxyRotator.getPoolStats();
      const schedules = scraperScheduler.getAllSchedules();
      res.json({
        queue: metrics,
        proxies: proxyStats,
        schedulesSummary: {
          totalSchedules: schedules.length,
          enabledCount: schedules.filter((s) => s.isEnabled).length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch queue metrics' });
    }
  });

  // 2. List Tasks
  app.get('/api/queue/tasks', generalRateLimiter, (req, res) => {
    try {
      const { status, type, priority, limit } = req.query;
      const tasks = taskQueue.getTasks({
        status: status as any,
        type: type as any,
        priority: priority as any,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch tasks' });
    }
  });

  // 3. Get Single Task with Execution Logs
  app.get('/api/queue/tasks/:id', generalRateLimiter, (req, res) => {
    try {
      const task = taskQueue.getTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch task details' });
    }
  });

  // 4. Manually Enqueue Task
  app.post('/api/queue/enqueue', scraperRateLimiter, (req, res) => {
    try {
      const { type, payload, priority, maxAttempts, backoffMs } = req.body;
      if (!type || !payload || !payload.companyName || !payload.boardToken) {
        return res.status(400).json({ error: 'type, payload.companyName, and payload.boardToken are required' });
      }

      const task = taskQueue.enqueue({
        type: type || 'greenhouse_poll',
        payload,
        priority: priority || 'high',
        maxAttempts,
        backoffMs,
      });

      res.status(201).json(task);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to enqueue task' });
    }
  });

  // 5. Retry Task
  app.post('/api/queue/tasks/:id/retry', scraperRateLimiter, (req, res) => {
    try {
      const task = taskQueue.retryTask(req.params.id, true);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retry task' });
    }
  });

  // 6. Cancel Task
  app.post('/api/queue/tasks/:id/cancel', generalRateLimiter, (req, res) => {
    try {
      const success = taskQueue.cancelTask(req.params.id);
      if (!success) {
        return res.status(400).json({ error: 'Task cannot be cancelled (either not found or already running/completed)' });
      }
      res.json({ success: true, message: `Task ${req.params.id} cancelled` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to cancel task' });
    }
  });

  // 7. Clear Completed Tasks
  app.post('/api/queue/clear', generalRateLimiter, (req, res) => {
    try {
      const clearedCount = taskQueue.clearCompleted();
      res.json({ clearedCount, message: `Cleared ${clearedCount} completed / dead-letter tasks.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to clear queue' });
    }
  });

  // 8. Set Queue Concurrency Limit
  app.post('/api/queue/concurrency', generalRateLimiter, (req, res) => {
    try {
      const { limit } = req.body;
      if (typeof limit !== 'number' || limit < 1 || limit > 10) {
        return res.status(400).json({ error: 'Concurrency limit must be a number between 1 and 10' });
      }
      taskQueue.setConcurrency(limit);
      res.json({ success: true, concurrencyLimit: limit });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update concurrency limit' });
    }
  });

  // 9. Scraper Schedules List
  app.get('/api/queue/schedules', generalRateLimiter, (req, res) => {
    try {
      const schedules = scraperScheduler.getAllSchedules();
      res.json(schedules);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch schedules' });
    }
  });

  // 10. Update Scraper Schedule
  app.post('/api/queue/schedules/:id/update', generalRateLimiter, (req, res) => {
    try {
      const updated = scraperScheduler.updateSchedule(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update schedule' });
    }
  });

  // 11. Toggle Scraper Schedule
  app.post('/api/queue/schedules/:id/toggle', generalRateLimiter, (req, res) => {
    try {
      const updated = scraperScheduler.toggleSchedule(req.params.id);
      if (!updated) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to toggle schedule' });
    }
  });

  // 12. Trigger Immediate Schedule Poll
  app.post('/api/queue/schedules/:id/trigger', scraperRateLimiter, (req, res) => {
    try {
      const task = scraperScheduler.triggerSchedule(req.params.id, true);
      if (!task) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to trigger schedule' });
    }
  });

  // 13. Trigger Staggered Batch Run Across All Schedules
  app.post('/api/queue/schedules/batch-trigger', scraperRateLimiter, (req, res) => {
    try {
      const result = scraperScheduler.triggerStaggeredBatch();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to trigger batch schedule' });
    }
  });

  // 14. Proxy Pool Nodes & Telemetry
  app.get('/api/queue/proxies', generalRateLimiter, (req, res) => {
    try {
      const proxies = proxyRotator.getAllProxies();
      const stats = proxyRotator.getPoolStats();
      res.json({ stats, proxies });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch proxies' });
    }
  });

  // 15. Reset Proxy Pool State
  app.post('/api/queue/proxies/reset', generalRateLimiter, (req, res) => {
    try {
      proxyRotator.initializePool();
      const stats = proxyRotator.getPoolStats();
      res.json({ success: true, message: 'Proxy pool reset to initial seed state', stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reset proxy pool' });
    }
  });

  // 16. Phase 10 Automated Test Suite
  app.get('/api/queue/test-suite', async (req, res) => {
    try {
      const report = await runQueueTestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run queue test suite' });
    }
  });

  app.post('/api/queue/test-suite', async (req, res) => {
    try {
      const report = await runQueueTestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run queue test suite' });
    }
  });

  // 10. Matches Endpoints
  app.get('/api/matches', (req, res) => {
    const authenticatedRequest = req as AuthenticatedRequest;
    const matches = db.getMatches(authenticatedRequest.user!.tenantId, authenticatedRequest.user!.userId);
    res.json(matches);
  });

  // 11. Notifications Endpoints
  app.get('/api/notifications', (req, res) => {
    const authenticatedRequest = req as AuthenticatedRequest;
    const notifs = db.getNotifications(authenticatedRequest.user!.tenantId, authenticatedRequest.user!.userId);
    res.json(notifs);
  });

  // 12. Vector Similarity Engine Endpoint
  app.post('/api/vectors/similarity', (req, res) => {
    const { resumeText, jobText, customResumeEmbedding, customJobEmbedding } = req.body;

    const vecA = customResumeEmbedding || generateDeterministicEmbedding(resumeText || 'Sample Resume C++ Python Machine Learning');
    const vecB = customJobEmbedding || generateDeterministicEmbedding(jobText || 'Sample Job Goldman Sachs C++ Dynamic Programming');

    const similarity = calculateCosineSimilarity(vecA, vecB);

    res.json({
      vectorDimensions: vecA.length,
      cosineSimilarity: parseFloat(similarity.toFixed(4)),
      matchPercentage: parseFloat((similarity * 100).toFixed(1)),
      layer1EstimatedFit: parseFloat((similarity * 0.85).toFixed(2)),
      layer2InformalBarFit: parseFloat((similarity * 0.95).toFixed(2)),
      vectorAPreview: vecA.slice(0, 10),
      vectorBPreview: vecB.slice(0, 10),
    });
  });

  // ==========================================
  // PHASE 11: REAL-TIME ALERTING ENGINE ENDPOINTS
  // ==========================================

  // 1. Get Alerting Engine Configurations
  const getPublicAlertConfiguration = () => {
      const telegram = telegramAlertService.getConfig();
      const email = emailAlertService.getConfig();
      return {
        email: { ...email, apiKey: '', toEmail: '' },
        telegram: { ...telegram, botToken: '', chatId: '' },
        credentialsConfigured: {
          telegram: Boolean(telegram.botToken && !/demo|sandbox/i.test(telegram.botToken)),
          email: Boolean(email.apiKey && !/demo|sandbox/i.test(email.apiKey)),
        },
        rules: notificationDispatcher.getRules(),
      };
  };

  app.get('/api/alerts/config', generalRateLimiter, (_req, res) => {
    try {
      res.json(getPublicAlertConfiguration());
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch alert configuration' });
    }
  });

  // 2. Update Alerting Engine Configurations
  app.post('/api/alerts/config', generalRateLimiter, (req, res) => {
    try {
      const parsedConfiguration = alertConfigurationSchema.safeParse(req.body);
      if (!parsedConfiguration.success) {
        return res.status(400).json({
          error: 'Validation Error',
          details: parsedConfiguration.error.flatten().fieldErrors,
        });
      }
      const { telegram, email, rules } = parsedConfiguration.data;
      if (telegram) {
        telegramAlertService.updateConfig({
          ...telegram,
          botToken: telegram.botToken || telegramAlertService.getConfig().botToken,
        });
      }
      if (email) {
        emailAlertService.updateConfig({
          ...email,
          apiKey: email.apiKey || emailAlertService.getConfig().apiKey,
          toEmail: email.toEmail || emailAlertService.getConfig().toEmail,
        });
      }
      if (rules) notificationDispatcher.updateRules(rules);

      res.json({
        success: true,
        message: 'Alert configuration updated successfully',
        configuration: getPublicAlertConfiguration(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update alert configuration' });
    }
  });

  // 3. Get Alert Dispatch History
  app.get('/api/alerts/history', generalRateLimiter, (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const history = notificationDispatcher.getHistoryForCandidate(
        (req as AuthenticatedRequest).user!.userId,
        limit
      );
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch alert history' });
    }
  });

  // 4. Clear Alert History
  app.delete('/api/alerts/history', generalRateLimiter, (req, res) => {
    try {
      notificationDispatcher.clearHistoryForCandidate((req as AuthenticatedRequest).user!.userId);
      res.json({ success: true, message: 'Alert history cleared' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to clear alert history' });
    }
  });

  // 5. Get Alerting Engine Stats & Telemetry
  app.get('/api/alerts/stats', generalRateLimiter, (req, res) => {
    try {
      const stats = notificationDispatcher.getStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch alert stats' });
    }
  });

  // 6. Live Format & Preview Generator (Telegram + HTML Email)
  app.post('/api/alerts/format-preview', generalRateLimiter, (req, res) => {
    try {
      const payload = req.body;
      if (!payload || !payload.companyName || !payload.jobTitle) {
        return res.status(400).json({ error: 'Valid payload with companyName and jobTitle is required' });
      }

      const formatted = formatAlertMessage(payload);
      res.json(formatted);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to format alert preview' });
    }
  });

  // 7. Dispatch Test Alert (Manual / Simulator)
  app.post('/api/alerts/dispatch-test', generalRateLimiter, async (req, res) => {
    try {
      const { payload, forceSimulated, bypassThreshold } = req.body;
      if (!payload || !payload.companyName || !payload.jobTitle) {
        return res.status(400).json({ error: 'Valid notification payload is required' });
      }

      const record = await notificationDispatcher.dispatchPayload(
        payload,
        (req as AuthenticatedRequest).user!.userId,
        { forceSimulated: Boolean(forceSimulated), bypassThreshold: Boolean(bypassThreshold) }
      );

      res.status(201).json(record);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to dispatch test alert' });
    }
  });

  // 8. Evaluate Composite Score & Trigger Immediate Real-Time Alert
  app.post('/api/alerts/evaluate-and-dispatch', ragRateLimiter, async (req, res) => {
    try {
      const { evaluation, candidateInfo, forceSimulated, bypassThreshold } = req.body;
      if (!evaluation || typeof evaluation.finalScore !== 'number') {
        return res.status(400).json({ error: 'Valid match evaluation is required' });
      }

      const record = await notificationDispatcher.evaluateAndDispatch(
        evaluation,
        {
          ...candidateInfo,
          id: (req as AuthenticatedRequest).user!.userId,
          candidateId: (req as AuthenticatedRequest).user!.userId,
          name: (req as AuthenticatedRequest).user!.fullName,
          email: (req as AuthenticatedRequest).user!.email,
        },
        { forceSimulated: Boolean(forceSimulated), bypassThreshold: Boolean(bypassThreshold) }
      );

      res.json({
        triggered: record !== null,
        record,
        threshold: notificationDispatcher.getRules().minScoreThreshold,
        scoreEvaluated: evaluation.finalScore,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to evaluate and dispatch alert' });
    }
  });

  // 9. Retry Specific Alert
  app.post('/api/alerts/retry/:id', generalRateLimiter, async (req, res) => {
    try {
      const record = await notificationDispatcher.retryDispatch(
        req.params.id,
        (req as AuthenticatedRequest).user!.userId
      );
      if (!record) {
        return res.status(404).json({ error: 'Historical alert record not found' });
      }
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retry alert dispatch' });
    }
  });

  // 10. Test Channel API Connections
  app.post('/api/alerts/test-connection', generalRateLimiter, async (req, res) => {
    try {
      const { channel } = req.body;
      if (channel === 'telegram') {
        const result = await telegramAlertService.testConnection();
        return res.json(result);
      } else if (channel === 'email') {
        const result = await emailAlertService.testConnection();
        return res.json(result);
      } else {
        const [tg, em] = await Promise.all([
          telegramAlertService.testConnection(),
          emailAlertService.testConnection(),
        ]);
        return res.json({ telegram: tg, email: em });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to test channel connection' });
    }
  });

  // 11. Run Phase 11 Alerting Engine Automated Verification Test Suite
  app.get('/api/alerts/test-suite', async (req, res) => {
    try {
      const report = await runAlertTestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run alert test suite' });
    }
  });

  app.post('/api/alerts/test-suite', async (req, res) => {
    try {
      const report = await runAlertTestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run alert test suite' });
    }
  });

  // ==========================================
  // PHASE 12: USER FEEDBACK LOOP & ADAPTIVE TUNING ENDPOINTS
  // ==========================================

  // 1. Submit User Feedback (Applied, Skipped, Irrelevant, Saved)
  app.post('/api/feedback/record', generalRateLimiter, (req, res) => {
    try {
      const parsedFeedback = feedbackRecordSchema.safeParse(req.body);
      if (!parsedFeedback.success) {
        return res.status(400).json({ error: 'Validation Error', details: parsedFeedback.error.flatten().fieldErrors });
      }

      const response = adaptiveThresholdTuner.processFeedback({
        ...parsedFeedback.data,
        candidateId: (req as AuthenticatedRequest).user!.userId,
      });
      res.status(201).json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to process user feedback' });
    }
  });

  // 2. 1-Click Interactive Webhook Handler for Email Links & Direct URLs
  app.get('/api/feedback/action', generalRateLimiter, (req, res) => {
    try {
      const parsedJobId = requestIdSchema.safeParse(req.query.jobId);
      const parsedAction = feedbackActionSchema.safeParse(String(req.query.action || 'APPLIED').toUpperCase());
      const score = req.query.score === undefined ? 0.85 : Number(req.query.score);
      if (!parsedJobId.success || !parsedAction.success || !Number.isFinite(score) || score < 0 || score > 1) {
        return res.status(400).json({ error: 'Validation Error', message: 'Valid jobId, action, and match score are required.' });
      }
      const jobId = parsedJobId.data;
      const action = parsedAction.data;
      const candidateId = (req as AuthenticatedRequest).user!.userId;
      const company = (req.query.company as string) || 'Target Company';

      const response = adaptiveThresholdTuner.processFeedback({
        candidateId,
        jobId,
        action,
        matchScore: score,
        companyName: company,
        feedbackSource: 'email_link',
      });

      const actionColor = action === 'APPLIED' ? '#10b981' : action === 'SKIPPED' ? '#64748b' : '#ef4444';
      const actionEmoji = action === 'APPLIED' ? '✅' : action === 'SKIPPED' ? '⏭️' : '🚫';
      const actionText = action === 'APPLIED' ? 'Marked as Applied' : action === 'SKIPPED' ? 'Skipped Opportunity' : 'Marked as Irrelevant';

      // Render responsive acknowledgment card
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Recorded • AI Internship Scout</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; max-width: 480px; width: 90%; padding: 32px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
    .badge { display: inline-flex; align-items: center; gap: 8px; background-color: ${actionColor}20; color: ${actionColor}; border: 1.5px solid ${actionColor}60; padding: 8px 16px; border-radius: 9999px; font-weight: 700; font-size: 14px; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 8px 0; }
    .desc { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; }
    .meter { background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; }
    .meter-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
    .button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; transition: opacity 0.2s; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span>${actionEmoji}</span>
      <span>${actionText}</span>
    </div>
    <h1 class="title">Feedback Calibrated!</h1>
    <p class="desc">${response.message}</p>
    
    <div class="meter">
      <div class="meter-row">
        <span style="color: #64748b;">Candidate:</span>
        <strong style="color: #e2e8f0;">${response.profile.candidateName}</strong>
      </div>
      <div class="meter-row">
        <span style="color: #64748b;">Current Alert Threshold:</span>
        <strong style="color: #10b981;">${Math.round(response.profile.currentThreshold * 100)}% Match</strong>
      </div>
      <div class="meter-row">
        <span style="color: #64748b;">Interaction Streak:</span>
        <strong style="color: #a5b4fc;">${response.profile.totalInteractions} total logged</strong>
      </div>
    </div>

    <a href="/" class="button">Open Internship Scout App →</a>
  </div>
</body>
</html>`);
    } catch (err: any) {
      res.status(500).send(`<h3>Error recording feedback:</h3><p>${err?.message || 'Server error'}</p>`);
    }
  });

  // 3. Telegram Webhook Callback Handler (for inline keyboard clicks)
  app.post('/api/feedback/telegram-webhook', generalRateLimiter, (req, res, next) => {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const suppliedSecret = req.get('X-Telegram-Bot-Api-Secret-Token');
    if (!webhookSecret) {
      return res.status(503).json({ error: 'Telegram webhook is not configured.' });
    }
    const expectedBytes = Buffer.from(webhookSecret);
    const suppliedBytes = Buffer.from(suppliedSecret || '');
    if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
      return res.status(401).json({ error: 'Invalid webhook secret.' });
    }
    return next();
  }, (req, res) => {
    try {
      const callbackQuery = req.body.callback_query;
      if (callbackQuery && callbackQuery.data) {
        // e.g. "ACTION:APPLIED:job-01:cand-01:0.92"
        const parts = callbackQuery.data.split(':');
        if (parts[0] === 'ACTION' && parts[1]) {
          const parsedAction = feedbackActionSchema.safeParse(parts[1]);
          const parsedJobId = requestIdSchema.safeParse(parts[2]);
          if (!parsedAction.success || !parsedJobId.success) {
            return res.status(400).json({ error: 'Invalid feedback callback action or job ID.' });
          }
          const action = parsedAction.data;
          const jobId = parsedJobId.data;
          const parsedCandidateId = requestIdSchema.safeParse(parts[3]);
          const matchScore = parts[4] ? Number(parts[4]) : 0.85;
          if (!parsedCandidateId.success || !Number.isFinite(matchScore) || matchScore < 0 || matchScore > 1) {
            return res.status(400).json({ error: 'Invalid candidate ID or match score in feedback callback.' });
          }
          const candidateId = parsedCandidateId.data;

          const response = adaptiveThresholdTuner.processFeedback({
            candidateId,
            jobId,
            action,
            matchScore,
            feedbackSource: 'telegram_inline',
          });

          return res.json({
            method: 'answerCallbackQuery',
            callback_query_id: callbackQuery.id,
            text: `✅ ${response.message.slice(0, 180)}`,
            show_alert: true,
          });
        }
      }

      res.json({ ok: true, message: 'Webhook received' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Telegram webhook error' });
    }
  });

  // 4. Get Candidate Adaptive Threshold Profile
  app.get('/api/feedback/profile/:candidateId', generalRateLimiter, (req, res) => {
    try {
      const profile = userFeedbackStore.getProfile(req.params.candidateId);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch candidate profile' });
    }
  });

  // 5. Get User Feedback History Log
  app.get('/api/feedback/history', generalRateLimiter, (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const candidateId = (req as AuthenticatedRequest).user!.userId;
      const history = userFeedbackStore.getFeedbackByCandidate(candidateId, limit);

      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch feedback history' });
    }
  });

  // 6. Reset Adaptive Threshold to Baseline
  app.post('/api/feedback/reset/:candidateId', generalRateLimiter, (req, res) => {
    try {
      const resetProfile = userFeedbackStore.resetProfile(req.params.candidateId);
      res.json({
        success: true,
        message: `Adaptive threshold reset to baseline 75% for ${req.params.candidateId}`,
        profile: resetProfile,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reset profile' });
    }
  });

  // 7. Phase 12 Automated Verification Test Suite
  app.get('/api/feedback/test-suite', async (req, res) => {
    try {
      const report = await runFeedbackTestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run feedback test suite' });
    }
  });

  app.post('/api/feedback/test-suite', async (req, res) => {
    try {
      const report = await runFeedbackTestSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run feedback test suite' });
    }
  });

  // ==========================================
  // PHASE 13: NON-DISRUPTIVE RESUME EVOLUTION ENDPOINTS
  // ==========================================

  // 1. Single Skill Delta Patch
  app.post('/api/resume/delta/skill', generalRateLimiter, (req, res) => {
    try {
      const { skill, action = 'ADD' } = req.body;
      const resumeId = requireOwnedResume(req, res, req.body.resumeId);
      if (!resumeId) return;
      if (typeof skill !== 'string' || !skill.trim() || skill.length > 100 || !['ADD', 'REMOVE'].includes(action)) {
        return res.status(400).json({ error: 'skill name string is required' });
      }

      const result = dynamicResumeEngine.patchSkillDelta(resumeId, skill, action);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to patch skill delta' });
    }
  });

  // 2. Incremental Project Addition Patch
  app.post('/api/resume/delta/project', generalRateLimiter, (req, res) => {
    try {
      const { project } = req.body;
      const resumeId = requireOwnedResume(req, res, req.body.resumeId);
      if (!resumeId) return;
      if (!project || typeof project.title !== 'string' || !project.title.trim()) {
        return res.status(400).json({ error: 'project title and details are required' });
      }

      const result = dynamicResumeEngine.patchProjectDelta(resumeId, {
        title: project.title,
        description: project.description || '',
        technologies: Array.isArray(project.technologies) ? project.technologies : [],
        metrics: project.metrics,
        repoUrl: project.repoUrl,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to patch project delta' });
    }
  });

  // 3. Modular Experience Sub-Vector Patch
  app.post('/api/resume/delta/experience', generalRateLimiter, (req, res) => {
    try {
      const { experience } = req.body;
      const resumeId = requireOwnedResume(req, res, req.body.resumeId);
      if (!resumeId) return;
      if (!experience || typeof experience.company !== 'string' || !experience.company.trim() ||
          typeof experience.role !== 'string' || !experience.role.trim()) {
        return res.status(400).json({ error: 'company and role are required for experience delta' });
      }

      const result = dynamicResumeEngine.patchExperienceDelta(resumeId, {
        company: experience.company,
        role: experience.role,
        duration: typeof experience.duration === 'string' ? experience.duration : '',
        highlights: Array.isArray(experience.highlights) ? experience.highlights : [],
        technologies: Array.isArray(experience.technologies) ? experience.technologies : [],
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to patch experience delta' });
    }
  });

  // 4. Generalized Delta Patch Endpoint
  app.post('/api/resume/delta/patch', generalRateLimiter, (req, res) => {
    try {
      const { deltaType, skill, project, experience } = req.body;
      const resumeId = requireOwnedResume(req, res, req.body.resumeId);
      if (!resumeId) return;
      const result = dynamicResumeEngine.executeDeltaPatch({
        resumeId,
        deltaType,
        skill,
        project,
        experience,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute delta patch' });
    }
  });

  // 5. Get Modular Profile & Sub-Vectors
  app.get('/api/resume/modular-vectors/:resumeId', generalRateLimiter, (req, res) => {
    try {
      const resumeId = requireOwnedResume(req, res, req.params.resumeId);
      if (!resumeId) return;
      const profile = dynamicResumeEngine.getModularProfile(resumeId);
      const projects = dynamicResumeEngine.getResumeProjects(resumeId);
      const experiences = dynamicResumeEngine.getResumeExperiences(resumeId);
      const resume = db.getResumeById(resumeId);

      if (!profile) {
        return res.status(404).json({ error: 'Modular profile not found for resume' });
      }

      res.json({
        profile,
        projects,
        experiences,
        extractedSkills: resume?.extractedSkills || [],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch modular vectors' });
    }
  });

  // 6. Get Delta Update Audit Trail
  app.get('/api/resume/delta/audit/:resumeId', generalRateLimiter, (req, res) => {
    try {
      const resumeId = requireOwnedResume(req, res, req.params.resumeId);
      if (!resumeId) return;
      const logs = dynamicResumeEngine.getAuditLogs(resumeId);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch delta audit logs' });
    }
  });

  // 7. Reset Modular Profile to Baseline
  app.post('/api/resume/delta/reset/:resumeId', generalRateLimiter, (req, res) => {
    try {
      const resumeId = requireOwnedResume(req, res, req.params.resumeId);
      if (!resumeId) return;
      const resetProfile = dynamicResumeEngine.resetToBaseline(resumeId);
      res.json({
        success: true,
        message: `Modular resume vectors reset to initial baseline v1 for resume ${resumeId}`,
        profile: resetProfile,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reset modular resume profile' });
    }
  });

  // 8. Phase 13 Automated Test Suite
  app.get('/api/resume/delta/test-suite', async (req, res) => {
    try {
      const report = await ResumeDeltaTestSuite.runAllTests();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute resume delta test suite' });
    }
  });

  app.post('/api/resume/delta/test-suite', async (req, res) => {
    try {
      const report = await ResumeDeltaTestSuite.runAllTests();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute resume delta test suite' });
    }
  });

  // ==========================================
  // PHASE 14: HISTORICAL HIRING PATTERN INSIGHTS ENDPOINTS
  // ==========================================

  // 1. Comprehensive Hiring Patterns Analytics Report
  app.get('/api/analytics/hiring-patterns', generalRateLimiter, (req, res) => {
    try {
      const { company, roleCategory, tier, timeWindowDays } = req.query;
      const filters = {
        company: company ? String(company) : undefined,
        roleCategory: roleCategory ? String(roleCategory) : undefined,
        tier: tier ? String(tier) : undefined,
        timeWindowDays: timeWindowDays ? parseInt(String(timeWindowDays), 10) : undefined,
      };

      const report = hiringInsightsEngine.generateInsightsReport(filters);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate hiring patterns report' });
    }
  });

  // 2. Posting Velocity Breakdown (Hours of Day, Days of Week, 7x24 Matrix)
  app.get('/api/analytics/posting-velocity', generalRateLimiter, (req, res) => {
    try {
      const { company, roleCategory, tier } = req.query;
      const report = hiringInsightsEngine.generateInsightsReport({
        company: company ? String(company) : undefined,
        roleCategory: roleCategory ? String(roleCategory) : undefined,
        tier: tier ? String(tier) : undefined,
      });
      res.json(report.postingVelocity);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve posting velocity' });
    }
  });

  // 3. Skills Demand Ranking & Category Distributions
  app.get('/api/analytics/skills-demand', generalRateLimiter, (req, res) => {
    try {
      const { roleCategory, tier } = req.query;
      const report = hiringInsightsEngine.generateInsightsReport({
        roleCategory: roleCategory ? String(roleCategory) : undefined,
        tier: tier ? String(tier) : undefined,
      });
      res.json(report.skillsDemand);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve skills demand' });
    }
  });

  // 4. Application Lifespan & Time-To-Close Distributions
  app.get('/api/analytics/application-lifespan', generalRateLimiter, (req, res) => {
    try {
      const report = hiringInsightsEngine.generateInsightsReport();
      res.json(report.applicationLifespans);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve application lifespans' });
    }
  });

  // 5. Company-Specific Hiring Intelligence Profile
  app.get('/api/analytics/company/:companyName', generalRateLimiter, (req, res) => {
    try {
      const companyName = decodeURIComponent(req.params.companyName);
      const profile = hiringInsightsEngine.getCompanyDetail(companyName);
      if (!profile) {
        return res.status(404).json({ error: `No historical hiring metrics found for company '${companyName}'` });
      }
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve company hiring metrics' });
    }
  });

  // 6. Automated Analytics Test Suite Runner
  app.get('/api/analytics/test-suite', async (req, res) => {
    try {
      const results = await runHiringAnalyticsTestSuite();
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run hiring analytics test suite' });
    }
  });

  app.post('/api/analytics/test-suite', async (req, res) => {
    try {
      const results = await runHiringAnalyticsTestSuite();
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run hiring analytics test suite' });
    }
  });

  // ==========================================
  // PHASE 15: PRODUCTION DASHBOARD & E2E INTEGRATION TEST ENDPOINTS
  // ==========================================

  // 1. Run Full End-to-End Test Suite (including 50-Job Load Test)
  app.get('/api/e2e/test-suite', async (req, res) => {
    try {
      const suiteResults = await runFullEndToEndTestSuite();
      res.json(suiteResults);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute E2E test suite' });
    }
  });

  app.post('/api/e2e/test-suite', async (req, res) => {
    try {
      const suiteResults = await runFullEndToEndTestSuite();
      res.json(suiteResults);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute E2E test suite' });
    }
  });

  // 2. Interactive Step-by-Step E2E Pipeline Simulator
  app.post('/api/e2e/simulate-pipeline', generalRateLimiter, async (req, res) => {
    try {
      const {
        atsProvider = 'Greenhouse',
        company = 'Citadel Securities',
        tier = 'Tier 1 Quant/HFT',
        title = 'Quantitative Systems & C++ Infrastructure Intern 2027',
        location = 'New York, NY (Hybrid)',
        salary = '$125/hr + $10,000 Sign-on',
        rawHtmlContent = '<p>Deep C++20, CUDA kernel programming, lock-free queues, low-latency SIMD optimization.</p>',
      } = req.body || {};

      const trace = await runEndToEndPipelineTrace({
        atsProvider,
        company,
        tier,
        title,
        location,
        salary,
        rawHtmlContent,
      });

      res.json(trace);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to simulate pipeline trace' });
    }
  });

  // 3. Concurrency & Load Stress Test Runner
  app.post('/api/e2e/load-benchmark', generalRateLimiter, async (req, res) => {
    try {
      const concurrency = parseInt(String(req.query.concurrency || req.body?.concurrency || 50), 10);
      const benchmark = await runLoadAndConcurrencyBenchmark(Math.min(100, Math.max(10, concurrency)));
      res.json(benchmark);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute load stress benchmark' });
    }
  });

  // 4. User-specific Dashboard Data Overview
  app.get('/api/dashboard/overview', generalRateLimiter, authenticateToken, (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const user = db.getUserById(req.user.userId, req.user.tenantId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const preferences = db.getPreferences(user.id, user.tenantId);
      if (!preferences) return res.status(404).json({ error: 'User preferences not found' });

      const resumes = db.getResumes(user.tenantId, user.id);
      const primaryResume = resumes.find((resume) => resume.isPrimary) ??
        [...resumes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      const now = Date.now();
      const jobTokens = (value: string) => value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
      const roleTerms = preferences.targetRoles
        .flatMap((role) => jobTokens(role))
        .filter((term) => !['intern', 'internship', 'summer', 'position', 'role', 'the', 'and'].includes(term));
      const userMatches: Array<Omit<import('./src/types').Match, 'id' | 'createdAt' | 'updatedAt'>> = [];

      if (primaryResume) {
        for (const job of db.getJobs()) {
          if (!job.isActive || job.relevanceStatus !== 'RELEVANT') continue;

          const locationMatch = matchLocationFilter(job.location, job.isRemote, preferences.targetLocations);
          if (!locationMatch.matched) continue;

          const jobRoleTerms = jobTokens(`${job.title} ${job.description}`);
          const roleMatch = roleTerms.length === 0 || roleTerms.some((term) =>
            jobRoleTerms.some((jobTerm) => jobTerm === term || jobTerm.startsWith(term) || term.startsWith(jobTerm))
          );
          if (!roleMatch) continue;

          const score = db.evaluateTwoLayerMatch(primaryResume, job, preferences);
          if (score.isBlacklisted) continue;

          userMatches.push({
            userId: user.id,
            tenantId: user.tenantId,
            jobId: job.id,
            resumeId: primaryResume.id,
            layer1Score: score.layer1Score,
            layer2Score: score.layer2Score,
            compositeScore: score.compositeScore,
            matchedSkills: score.matchedSkills,
            missingSkills: score.missingSkills,
            status: score.compositeScore >= preferences.customMatchThreshold * 100 ? 'alerted' : 'pending',
          });
        }
      }

      db.replaceUserMatches(user.id, user.tenantId, userMatches);
      const savedMatches = db.getMatches(user.tenantId, user.id)
        .filter((match) => match.job)
        .sort((a, b) => b.compositeScore - a.compositeScore);
      const topMatches = savedMatches.map((match) => {
        const job = match.job!;
        const postedAt = new Date(job.postedAt).getTime();
        const daysOpen = Number.isFinite(postedAt)
          ? Math.max(0, Math.floor((now - postedAt) / (1000 * 60 * 60 * 24)))
          : 0;
        const applicationStatus = match.applicationStatus ?? 'NEW_MATCH';
        const scorePercent = Math.round(match.compositeScore);
        const skillsForRecommendation = match.missingSkills.length > 0 ? match.missingSkills : match.matchedSkills;

        return {
          jobId: job.id,
          title: job.title,
          company: job.company,
          companyTier: 'Not classified',
          location: job.location,
          locationType: job.isRemote ? 'Remote' as const : 'Onsite' as const,
          sourceUrl: job.applyUrl,
          atsProvider: job.atsProvider || job.source,
          postedAt: job.postedAt,
          dataOrigin: job.dataOrigin ?? 'live',
          daysOpen,
          urgencyLevel: daysOpen <= 1 ? 'CRITICAL_IMMEDIATE' as const : daysOpen <= 3 ? 'HIGH_ROLLING' as const : daysOpen <= 7 ? 'MODERATE' as const : 'STANDARD_CYCLE' as const,
          scores: {
            finalScore: match.compositeScore / 100,
            layer1StatedMatch: match.layer1Score,
            layer2RealityMatch: match.layer2Score,
          },
          keyMatchedSkills: match.matchedSkills,
          missingCriticalSkills: match.missingSkills,
          oaDetails: {
            platform: 'Not specified in job record',
            dsaDifficulty: job.informalBar.dsaDifficulty,
            focusAreas: job.informalBar.unstatedPreferences,
          },
          matchExplanation: `Two-layer score (${scorePercent}%) calculated from ${primaryResume?.title ?? 'the saved resume'} and this job's stored requirements.`,
          applicationStatus,
          tailoringRecommendation: skillsForRecommendation.length > 0
            ? `${match.missingSkills.length > 0 ? 'Address' : 'Highlight'} ${skillsForRecommendation.join(', ')} for this role.`
            : 'No skills data is available for a tailored recommendation.',
        };
      });
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const alertsDispatchedToday = db.getNotifications(user.tenantId, user.id).filter((notification) =>
        notification.status === 'sent' && new Date(notification.sentAt).getTime() >= todayStart.getTime()
      ).length;
      const activeApplications = topMatches.filter((match) =>
        ['APPLIED', 'OA_RECEIVED', 'INTERVIEWING', 'OFFER'].includes(match.applicationStatus)
      ).length;
      const averageScore = topMatches.length > 0
        ? topMatches.reduce((total, match) => total + match.scores.finalScore, 0) / topMatches.length * 100
        : 0;
      const trackedCompanies = [...new Set(savedMatches.map((match) => match.job!.company))].map((companyName) => {
        const companyJobs = savedMatches.filter((match) => match.job!.company === companyName).map((match) => match.job!);
        const representativeJob = companyJobs[0];
        return {
          companyName,
          tier: 'Not classified',
          activeJobsCount: companyJobs.length,
          realityBarSummary: representativeJob.informalBar.barDescription || 'No company-specific evaluation data is available.',
          fastTrackTip: representativeJob.informalBar.oaPattern || 'No assessment guidance is available in the job record.',
        };
      });
      const overviewData = {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          tenantId: user.tenantId,
          isOnboarded: user.isOnboarded,
        },
        targetParameters: preferences,
        stats: {
          totalMatchesFound: topMatches.length,
          highMatchCount: topMatches.filter((match) => match.scores.finalScore >= 0.85).length,
          avgMatchScore: Number(averageScore.toFixed(1)),
          activeApplications,
          alertsDispatchedToday,
          lastScrapeRunAt: null,
        },
        topMatches,
        resumeComponentsSummary: primaryResume ? {
          resumeId: primaryResume.id,
          title: primaryResume.title,
          lastUpdated: primaryResume.updatedAt,
          skillsCount: primaryResume.extractedSkills.length,
          topSkills: primaryResume.extractedSkills.slice(0, 8),
          projectsCount: primaryResume.parsedData?.projects.length ?? 0,
          experienceCount: primaryResume.parsedExperience.length,
          embeddingsStatus: primaryResume.embedding.length > 0 ? 'SYNCHRONIZED' as const : 'PENDING_RECALCULATION' as const,
          subVectorDimensions: primaryResume.embedding.length,
        } : null,
        trackedCompanies,
        systemMetrics: {
          pipelineLatencyMs: null,
          scraperHealth: 'Not measured',
          queuePendingTasks: null,
          activeRateLimitRpm: null,
        },
      };

      res.json(overviewData);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load dashboard overview' });
    }
  });

  // 5. Save authenticated user preferences; overview refresh recalculates matches from these values.
  app.put('/api/dashboard/target-parameters', generalRateLimiter, authenticateToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const user = db.getUserById(req.user.userId, req.user.tenantId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const parseResult = preferencesSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid target preferences',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const updatedParameters = db.upsertPreferences({
      userId: user.id,
      tenantId: user.tenantId,
      ...parseResult.data,
    });
    db.updateUser(user.id, { isOnboarded: true }, user.tenantId);
    res.json({ success: true, updatedParameters });
  });

  // 6. Persist application status only for the authenticated user's saved match.
  app.put('/api/dashboard/match-status/:jobId', generalRateLimiter, authenticateToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const parsedJobId = requestIdSchema.safeParse(req.params.jobId);
    const parsedStatus = applicationStatusSchema.safeParse(req.body);
    if (!parsedJobId.success || !parsedStatus.success) {
      return res.status(400).json({ error: 'Validation Error', message: 'A valid job ID and application status are required.' });
    }

    const updatedMatch = db.updateMatchApplicationStatus(
      req.user.userId,
      req.user.tenantId,
      parsedJobId.data,
      parsedStatus.data.applicationStatus
    );
    if (!updatedMatch) return res.status(404).json({ error: 'Match not found for this user' });

    res.json({
      success: true,
      jobId: parsedJobId.data,
      applicationStatus: updatedMatch.applicationStatus,
      updatedAt: updatedMatch.updatedAt,
    });
  });

  app.use((error: unknown, _req: Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request Too Large', message: 'The request exceeds the allowed size.' });
    }
    if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
      return res.status(400).json({ error: 'Malformed Request', message: 'Request body must contain valid JSON.' });
    }
    return next(error);
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Internship Scout Server listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    httpServer.close(() => {
      void persistence.close().catch((error: unknown) => {
        console.error('Failed to close PostgreSQL connection pool:', error);
        process.exitCode = 1;
      });
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((error: unknown) => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});
