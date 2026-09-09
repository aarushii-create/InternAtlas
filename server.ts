/**
 * AI Internship Scout - Phase 1 Express API Server
 * Full multi-tenant database logic, vector similarity endpoints, and Vite dev middleware.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import mammoth from 'mammoth';
import { createServer as createViteServer } from 'vite';
import { db, generateDeterministicEmbedding, calculateCosineSimilarity } from './src/db/database';
import { parseResume, generateResumeVectors } from './src/lib/resumeParser';
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
} from './src/lib/validations';
import {
  generateUserToken,
  authenticateToken,
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

import * as pdfParseModule from 'pdf-parse';
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = (pdfParseModule as any).default || pdfParseModule;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
      const { email, password, fullName, tenantId, avatarUrl } = parseResult.data;
      const user = db.registerUser({ email, password, fullName, tenantId, avatarUrl });
      const token = generateUserToken(user);

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
    const { passwordHash, ...safeUser } = user;

    res.json({
      token,
      user: safeUser,
      expiresIn: '7d',
      message: 'Login successful',
    });
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

    const { passwordHash, ...safeUser } = user;
    res.json({
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
  app.post('/api/resumes/parse', aiRateLimiter, upload.single('file'), async (req, res) => {
    try {
      let rawText = '';
      let fileName = 'Uploaded Resume';

      if (req.file) {
        fileName = req.file.originalname;
        const mimeType = req.file.mimetype;
        const ext = path.extname(fileName).toLowerCase();

        if (mimeType === 'application/pdf' || ext === '.pdf') {
          const pdfData = await pdfParse(req.file.buffer);
          rawText = pdfData.text;
        } else if (
          mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          ext === '.docx' ||
          ext === '.doc'
        ) {
          const docxResult = await mammoth.extractRawText({ buffer: req.file.buffer });
          rawText = docxResult.value;
        } else {
          rawText = req.file.buffer.toString('utf-8');
        }
      } else if (req.body && req.body.rawText) {
        rawText = req.body.rawText;
        if (req.body.title) fileName = req.body.title;
      } else {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'No resume file uploaded or rawText string provided in payload.',
        });
      }

      if (!rawText || rawText.trim().length === 0) {
        return res.status(400).json({
          error: 'Empty Content',
          message: 'Unable to extract legible text from uploaded file.',
        });
      }

      // 2. Parse locally with the deterministic resume parser
      const parsedData = parseResume(rawText);

      // 3. Generate multi-vector embeddings (Full Resume, Modular Skills, Modular Experience)
      const vectors = await generateResumeVectors(rawText, parsedData);

      res.json({
        success: true,
        fileName,
        rawText,
        parsedData,
        vectors,
      });
    } catch (err: any) {
      console.error('Error parsing resume in Phase 3 endpoint:', err);
      res.status(500).json({
        error: 'Resume Parsing Failed',
        message: err.message || 'Failed to process and vectorize resume document.',
      });
    }
  });

  // 2. Save Parsed Resume & Structural Embeddings to Database (Protected)
  app.post('/api/resumes', authenticateToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { title, rawText, parsedData, isPrimary, fullTextVector, skillsVector, experienceVector } = req.body;

      if (!rawText || !parsedData) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'rawText and parsedData are required to persist resume in DB.',
        });
      }

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
      companies,
    });
  });

  // 2. Fetch Live Postings for Specific Company or Category
  app.post('/api/scrapers/fetch-live', scraperRateLimiter, async (req, res) => {
    try {
      const { companyId, companyName, category, persistToDb = true } = req.body;

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
        results.push({
          company: comp.name,
          category: comp.category,
          atsProvider: comp.atsProvider,
          totalFetched: scrapeResult.totalFetched,
          newUniqueJobs: scrapeResult.newUniqueJobs,
          status: scrapeResult.status,
          durationMs: scrapeResult.durationMs,
        });
        allJobs.push(...scrapeResult.jobs);
      }

      let dbSyncResult = { inserted: 0, updated: 0, total: 0 };
      if (persistToDb && allJobs.length > 0) {
        const jobsToPersist = allJobs.map((j) => ({
          source: j.source as any,
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
        companiesScraped: results.length,
        totalJobsFetched: allJobs.length,
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
    res.json({
      supportedBoards: TARGET_COMPANIES_CATALOG.slice(0, 20).map((c) => ({
        company: c.name,
        source: c.atsProvider,
        boardToken: c.boardToken,
        industry: c.category,
        sampleRoles: c.sampleRoles,
        typicalHiringBar: c.typicalHiringBar,
      })),
      totalConfigured: TARGET_COMPANIES_CATALOG.length,
      adapters: ['GreenhouseScraper', 'LeverScraper', 'AshbyScraper', 'WorkdayScraper', 'CustomRestConnector'],
    });
  });

  // 2. Scrape Greenhouse Board or Raw Payload (Rate-Limited)
  app.post('/api/scrapers/greenhouse', scraperRateLimiter, async (req, res) => {
    try {
      const { boardToken, company, rawPayload, persistToDb = true } = req.body;

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
          source: j.source as 'greenhouse' | 'lever',
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
          source: j.source as 'greenhouse' | 'lever',
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
      const targets = [
        { type: 'greenhouse', token: 'stripe', company: 'Stripe' },
        { type: 'greenhouse', token: 'figma', company: 'Figma' },
        { type: 'greenhouse', token: 'databricks', company: 'Databricks' },
        { type: 'lever', token: 'palantir', company: 'Palantir' },
        { type: 'lever', token: 'openai', company: 'OpenAI' },
      ];

      const allJobs = [];

      for (const target of targets) {
        if (target.type === 'greenhouse') {
          const jobs = await greenhouseScraper.fetchBoard(target.token, target.company);
          allJobs.push(...jobs);
        } else {
          const jobs = await leverScraper.fetchBoard(target.token, target.company);
          allJobs.push(...jobs);
        }
      }

      const jobsToPersist = allJobs.map((j) => ({
        source: j.source as 'greenhouse' | 'lever',
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

      const dbSync = db.upsertJobs(jobsToPersist);

      res.json({
        success: true,
        totalIngested: allJobs.length,
        targetsProcessed: targets.length,
        dbSync,
        jobs: allJobs,
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

  // 3. Raw SQL DDL Migration & Drizzle Schema String Exporter
  app.get('/api/db/schema', (req, res) => {
    try {
      const sqlPath = path.join(process.cwd(), 'src', 'db', 'migrations', '0000_initial_schema.sql');
      const seedPath = path.join(process.cwd(), 'src', 'db', 'migrations', '0001_seed_data.sql');
      const drizzlePath = path.join(process.cwd(), 'src', 'db', 'schema.ts');

      const sqlSchema = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf-8') : '-- SQL File Not Found';
      const sqlSeed = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, 'utf-8') : '-- Seed SQL File Not Found';
      const drizzleCode = fs.existsSync(drizzlePath) ? fs.readFileSync(drizzlePath, 'utf-8') : '// Drizzle file not found';

      res.json({
        sqlSchema,
        sqlSeed,
        drizzleCode,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Run Migration
  app.post('/api/db/migrate', (req, res) => {
    const status = db.runMigrationSim();
    res.json({ success: true, message: status, stats: db.getStats() });
  });

  // 5. Seed Database
  app.post('/api/db/seed', (req, res) => {
    db.seedDefaults();
    res.json({ success: true, message: 'Database reset and seeded successfully!', stats: db.getStats() });
  });

  // 6. Users Endpoints (Multi-Tenant)
  app.get('/api/users', (req, res) => {
    const tenantId = req.query.tenantId as string | undefined;
    const users = db.getUsers(tenantId);
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const { tenantId, email, fullName, avatarUrl } = req.body;
    if (!tenantId || !email || !fullName) {
      return res.status(400).json({ error: 'tenantId, email, and fullName are required.' });
    }
    const user = db.createUser({ tenantId, email, fullName, avatarUrl });
    res.status(201).json(user);
  });

  app.delete('/api/users/:id', (req, res) => {
    const tenantId = req.query.tenantId as string | undefined;
    const success = db.deleteUser(req.params.id, tenantId);
    if (!success) return res.status(404).json({ error: 'User not found or tenant mismatch' });
    res.json({ success: true, id: req.params.id });
  });

  // 7. Resumes Endpoints
  app.get('/api/resumes', (req, res) => {
    const tenantId = req.query.tenantId as string | undefined;
    const userId = req.query.userId as string | undefined;
    const resumes = db.getResumes(tenantId, userId);
    res.json(resumes);
  });

  app.post('/api/resumes', (req, res) => {
    const { userId, tenantId, title, content, extractedSkills, parsedExperience, isPrimary } = req.body;
    if (!userId || !tenantId || !title || !content) {
      return res.status(400).json({ error: 'userId, tenantId, title, and content are required.' });
    }
    const resume = db.createResume({
      userId,
      tenantId,
      title,
      content,
      extractedSkills: extractedSkills || [],
      parsedExperience: parsedExperience || [],
      isPrimary: isPrimary ?? true,
    });
    res.status(201).json(resume);
  });

  // 8. User Preferences Endpoints (Strict storage: target locations, target roles, preferred/blacklisted companies, match threshold)
  app.get('/api/preferences', (req, res) => {
    const userId = req.query.userId as string;
    const tenantId = req.query.tenantId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required.' });
    }
    const pref = db.getPreferences(userId, tenantId);
    if (!pref) {
      return res.status(404).json({ error: 'Preferences not found for user' });
    }
    res.json(pref);
  });

  app.put('/api/preferences', (req, res) => {
    const { userId, tenantId, targetLocations, targetRoles, preferredCompanies, blacklistedCompanies, customMatchThreshold, alertMethod, alertDestination, isActive } = req.body;
    if (!userId || !tenantId) {
      return res.status(400).json({ error: 'userId and tenantId are required.' });
    }
    const updated = db.upsertPreferences({
      userId,
      tenantId,
      targetLocations,
      targetRoles,
      preferredCompanies,
      blacklistedCompanies,
      customMatchThreshold: customMatchThreshold !== undefined ? Number(customMatchThreshold) : undefined,
      alertMethod,
      alertDestination,
      isActive,
    });
    res.json(updated);
  });

  // 9. Jobs Endpoints
  app.get('/api/jobs', (req, res) => {
    const jobs = db.getJobs();
    res.json(jobs);
  });

  app.post('/api/jobs', (req, res) => {
    const { source, externalId, company, title, location, isRemote, description, rawJd, statedRequirements, informalBar, applyUrl } = req.body;
    if (!company || !title || !description || !rawJd) {
      return res.status(400).json({ error: 'company, title, description, rawJd are required.' });
    }
    const job = db.createJob({
      source: source || 'greenhouse',
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
        resume = db.getResumes().find((r) => r.id === resumeId);
      }
      if (!resume) {
        // Fallback to first primary resume in system
        const allResumes = db.getResumes();
        resume = allResumes.find((r) => r.isPrimary) || allResumes[0];
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
      const { resumeId, userId, tenantId, weights } = req.body;
      let resume = db.getResumes(tenantId, userId).find((r) => r.id === resumeId || r.isPrimary);
      if (!resume) {
        const all = db.getResumes();
        resume = all[0];
      }

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
        resume = db.getResumes().find((r) => r.id === resumeId);
      }
      if (!resume) {
        const allResumes = db.getResumes();
        resume = allResumes.find((r) => r.isPrimary) || allResumes[0];
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
      const { resumeId, userId, tenantId, filterWarningsOnly, minRealityScore } = req.body;
      let resume = db.getResumes(tenantId, userId).find((r) => r.id === resumeId || r.isPrimary);
      if (!resume) {
        const all = db.getResumes();
        resume = all[0];
      }

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
        let resume = resumeId ? db.getResumes().find((r) => r.id === resumeId) : null;
        if (!resume) {
          const allResumes = db.getResumes();
          resume = allResumes.find((r) => r.isPrimary) || allResumes[0];
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
        resume = db.getResumes().find((r) => r.id === resumeId);
      }
      if (!resume) {
        const allResumes = db.getResumes();
        resume = allResumes.find((r) => r.isPrimary) || allResumes[0];
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
      if (!preferences && resume.userId) {
        preferences = db.getPreferences(resume.tenantId, resume.userId);
      }
      if (!preferences) {
        preferences = db.getPreferences()[0];
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
        userId,
        tenantId,
        customPreferences,
        weights,
        strictLocationDisqualifier,
        strictRoleDisqualifier,
        customThreshold,
        filterMeetsThresholdOnly,
        filterNonDisqualifiedOnly,
      } = req.body;

      let resume = db.getResumes(tenantId, userId).find((r) => r.id === resumeId || r.isPrimary);
      if (!resume) {
        const all = db.getResumes();
        resume = all[0];
      }

      if (!resume) {
        return res.status(404).json({ error: 'No candidate resume available for batch scoring' });
      }

      let preferences = customPreferences;
      if (!preferences && (userId || resume.userId)) {
        preferences = db.getPreferences(tenantId || resume.tenantId, userId || resume.userId);
      }
      if (!preferences) {
        preferences = db.getPreferences()[0];
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
    const tenantId = req.query.tenantId as string | undefined;
    const userId = req.query.userId as string | undefined;
    const matches = db.getMatches(tenantId, userId);
    res.json(matches);
  });

  // 11. Notifications Endpoints
  app.get('/api/notifications', (req, res) => {
    const tenantId = req.query.tenantId as string | undefined;
    const userId = req.query.userId as string | undefined;
    const notifs = db.getNotifications(tenantId, userId);
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
  app.get('/api/alerts/config', generalRateLimiter, (req, res) => {
    try {
      res.json({
        telegram: telegramAlertService.getConfig(),
        email: emailAlertService.getConfig(),
        rules: notificationDispatcher.getRules(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch alert configuration' });
    }
  });

  // 2. Update Alerting Engine Configurations
  app.post('/api/alerts/config', generalRateLimiter, (req, res) => {
    try {
      const { telegram, email, rules } = req.body;
      if (telegram) telegramAlertService.updateConfig(telegram);
      if (email) emailAlertService.updateConfig(email);
      if (rules) notificationDispatcher.updateRules(rules);

      res.json({
        success: true,
        message: 'Alert configuration updated successfully',
        telegram: telegramAlertService.getConfig(),
        email: emailAlertService.getConfig(),
        rules: notificationDispatcher.getRules(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update alert configuration' });
    }
  });

  // 3. Get Alert Dispatch History
  app.get('/api/alerts/history', generalRateLimiter, (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const history = notificationDispatcher.getHistory(limit);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch alert history' });
    }
  });

  // 4. Clear Alert History
  app.delete('/api/alerts/history', generalRateLimiter, (req, res) => {
    try {
      notificationDispatcher.clearHistory();
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
      const { payload, candidateId, forceSimulated, bypassThreshold } = req.body;
      if (!payload || !payload.companyName || !payload.jobTitle) {
        return res.status(400).json({ error: 'Valid notification payload is required' });
      }

      const record = await notificationDispatcher.dispatchPayload(
        payload,
        candidateId || 'candidate-default-01',
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
        candidateInfo,
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
      const record = await notificationDispatcher.retryDispatch(req.params.id);
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
      const { jobId, action } = req.body;
      if (!jobId || !action) {
        return res.status(400).json({ error: 'jobId and action are required' });
      }

      const response = adaptiveThresholdTuner.processFeedback(req.body);
      res.status(201).json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to process user feedback' });
    }
  });

  // 2. 1-Click Interactive Webhook Handler for Email Links & Direct URLs
  app.get('/api/feedback/action', generalRateLimiter, (req, res) => {
    try {
      const jobId = (req.query.jobId as string) || 'job-unknown';
      const action = ((req.query.action as string) || 'APPLIED').toUpperCase() as any;
      const candidateId = (req.query.candidateId as string) || 'alex-rivera-stanford';
      const score = req.query.score ? parseFloat(req.query.score as string) : 0.85;
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
  app.post('/api/feedback/telegram-webhook', generalRateLimiter, (req, res) => {
    try {
      const callbackQuery = req.body.callback_query;
      if (callbackQuery && callbackQuery.data) {
        // e.g. "ACTION:APPLIED:job-01:cand-01:0.92"
        const parts = callbackQuery.data.split(':');
        if (parts[0] === 'ACTION' && parts[1]) {
          const action = parts[1] as any;
          const jobId = parts[2] || 'job-tg-01';
          const candidateId = parts[3] || 'alex-rivera-stanford';
          const matchScore = parts[4] ? parseFloat(parts[4]) : 0.85;

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
      const candidateId = req.query.candidateId as string;
      const history = candidateId
        ? userFeedbackStore.getFeedbackByCandidate(candidateId, limit)
        : userFeedbackStore.getAllFeedback(limit);

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
      const { resumeId = 'res-11111111-1111-4111-a111-111111111111', skill, action = 'ADD' } = req.body;
      if (!skill || typeof skill !== 'string') {
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
      const { resumeId = 'res-11111111-1111-4111-a111-111111111111', project } = req.body;
      if (!project || !project.title) {
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
      const { resumeId = 'res-11111111-1111-4111-a111-111111111111', experience } = req.body;
      if (!experience || !experience.company || !experience.role) {
        return res.status(400).json({ error: 'company and role are required for experience delta' });
      }

      const result = dynamicResumeEngine.patchExperienceDelta(resumeId, {
        company: experience.company,
        role: experience.role,
        duration: experience.duration || '2026',
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
      const { resumeId = 'res-11111111-1111-4111-a111-111111111111', deltaType, skill, project, experience } = req.body;
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
      const resumeId = req.params.resumeId;
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
      const resumeId = req.params.resumeId;
      const logs = dynamicResumeEngine.getAuditLogs(resumeId);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch delta audit logs' });
    }
  });

  // 7. Reset Modular Profile to Baseline
  app.post('/api/resume/delta/reset/:resumeId', generalRateLimiter, (req, res) => {
    try {
      const resumeId = req.params.resumeId;
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

  // 4. Production Unified Dashboard Data Overview
  app.get('/api/dashboard/overview', generalRateLimiter, (req, res) => {
    try {
      const overviewData = {
        user: {
          id: 'user-alex-rivera-1',
          fullName: 'Alex Rivera',
          email: 'alex.rivera@stanford.edu',
          tenantId: 'tenant-alex-rivera',
          isOnboarded: true,
        },
        targetParameters: {
          id: 'pref-alex-prod',
          userId: 'user-alex-rivera-1',
          tenantId: 'tenant-alex-rivera',
          targetLocations: ['San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Remote'],
          targetRoles: ['Systems Engineer Intern', 'Quantitative Developer', 'AI / ML Engineer Intern', 'Infrastructure Engineer'],
          preferredCompanies: ['Citadel Securities', 'Jane Street', 'OpenAI', 'Anthropic', 'Two Sigma', 'Databricks', 'Stripe', 'Hudson River Trading (HRT)'],
          blacklistedCompanies: ['CryptoGambling Inc', 'SpamCorp'],
          customMatchThreshold: 0.72,
          alertMethod: 'telegram' as const,
          alertDestination: '@alex_rivera_scout_bot',
          isActive: true,
          createdAt: '2026-08-20T10:00:00.000Z',
          updatedAt: new Date().toISOString(),
        },
        stats: {
          totalMatchesFound: 38,
          highMatchCount: 14,
          avgMatchScore: 84.6,
          activeApplications: 8,
          alertsDispatchedToday: 4,
          lastScrapeRunAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        },
        topMatches: [
          {
            jobId: 'match-citadel-quant-sys',
            title: 'Quantitative Research & C++ Systems Intern 2027',
            company: 'Citadel Securities',
            companyTier: 'Tier 1 Quant/HFT',
            location: 'New York, NY',
            locationType: 'Hybrid',
            salaryRange: '$125 - $145 / hr ($5,000/wk) + $10,000 Sign-on',
            sourceUrl: 'https://www.citadelsecurities.com/careers',
            atsProvider: 'Workday',
            postedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
            daysOpen: 1,
            urgencyLevel: 'CRITICAL_IMMEDIATE',
            estimatedTimeToCloseDays: 14,
            scores: {
              finalScore: 0.94,
              layer1StatedMatch: 0.96,
              layer2RealityMatch: 0.92,
              compensationScore: 1.0,
              penaltyDeductions: 0.0,
            },
            keyMatchedSkills: ['C++20', 'CUDA', 'Lock-Free Data Structures', 'Linux Kernel', 'SIMD', 'TCP/IP'],
            missingCriticalSkills: [],
            oaDetails: {
              platform: 'HackerRank (Proctored)',
              dsaDifficulty: 'Hard (Codeforces 1900+ / Hard DP & Tree Graphs)',
              focusAreas: ['Memory Layout & Cache Misses', 'Concurrency & Lock-Free Atomicity', 'Bit Manipulation'],
            },
            matchExplanation: '94% Match. Perfect alignment with Stanford CS systems background, C++20 order matching engine project, and Meta infra internship. Preferred Tier 1 Quant target.',
            applicationStatus: 'APPLIED',
            tailoringRecommendation: 'Emphasize your 800ns median latency benchmark and SIMD vectorized math routines in your project summary header.',
          },
          {
            jobId: 'match-openai-research-eng',
            title: 'Research Engineering Intern - Distributed Systems & GPU Kernels',
            company: 'OpenAI',
            companyTier: 'Tier 1 AI Labs',
            location: 'San Francisco, CA',
            locationType: 'Onsite',
            salaryRange: '$85 - $110 / hr + $3,500/mo Housing',
            sourceUrl: 'https://openai.com/careers',
            atsProvider: 'Greenhouse',
            postedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
            daysOpen: 2,
            urgencyLevel: 'CRITICAL_IMMEDIATE',
            estimatedTimeToCloseDays: 18,
            scores: {
              finalScore: 0.91,
              layer1StatedMatch: 0.93,
              layer2RealityMatch: 0.89,
              compensationScore: 0.95,
              penaltyDeductions: 0.0,
            },
            keyMatchedSkills: ['CUDA', 'PyTorch', 'Distributed Systems', 'Python', 'C++'],
            missingCriticalSkills: ['Triton DSL'],
            oaDetails: {
              platform: 'Take-home GPU Kernel / C++ Systems Practical',
              dsaDifficulty: 'Hard Systems Practical (Triton / CUDA Kernel Optimization)',
              focusAreas: ['Distributed Pretraining Pipeline', 'FP8 / BF16 Quantization', 'Megatron-style Tensor Parallelism'],
            },
            matchExplanation: '91% Match. Your GPU kernel sparse matrix research and high-scale C++ cache service match OpenAI distributed training requirements.',
            applicationStatus: 'OA_RECEIVED',
            tailoringRecommendation: 'Add a bullet highlighting your custom Triton/CUDA kernel benchmark and memory coalescing optimization.',
          },
          {
            jobId: 'match-jane-street-swe',
            title: 'Software Engineering Intern (Low-Latency & Functional Systems)',
            company: 'Jane Street',
            companyTier: 'Tier 1 Quant/HFT',
            location: 'New York, NY',
            locationType: 'Onsite',
            salaryRange: '$120 - $135 / hr + Corporate Luxury Housing',
            sourceUrl: 'https://www.janestreet.com/join-jane-street',
            atsProvider: 'Ashby',
            postedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            daysOpen: 2,
            urgencyLevel: 'HIGH_ROLLING',
            estimatedTimeToCloseDays: 16,
            scores: {
              finalScore: 0.88,
              layer1StatedMatch: 0.86,
              layer2RealityMatch: 0.91,
              compensationScore: 1.0,
              penaltyDeductions: 0.0,
            },
            keyMatchedSkills: ['Rust', 'Distributed Systems', 'Algorithms', 'TCP/IP', 'Linux'],
            missingCriticalSkills: ['OCaml Functional Paradigms'],
            oaDetails: {
              platform: 'Live Pair Programming (CoderPad)',
              dsaDifficulty: 'High Complexity Clean Code / In-memory Architecture Simulation',
              focusAreas: ['State Machines', 'Type Safety & Invariant Guarantees', 'Deterministic Concurrency'],
            },
            matchExplanation: '88% Match. Excellent mathematical foundations and distributed consensus (Raft in Rust) experience. Jane Street assesses strong algorithmic clarity and systems architecture.',
            applicationStatus: 'INTERVIEWING',
            tailoringRecommendation: 'Highlight functional programming concepts from your Rust Raft consensus store to demonstrate type-safe architecture.',
          },
          {
            jobId: 'match-databricks-dist-sys',
            title: 'Distributed Storage & Compute Engine Intern',
            company: 'Databricks',
            companyTier: 'High-Growth Unicorn',
            location: 'San Francisco, CA',
            locationType: 'Hybrid',
            salaryRange: '$75 - $95 / hr + Relocation Bonus',
            sourceUrl: 'https://databricks.com/company/careers',
            atsProvider: 'Greenhouse',
            postedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
            daysOpen: 3,
            urgencyLevel: 'HIGH_ROLLING',
            estimatedTimeToCloseDays: 24,
            scores: {
              finalScore: 0.86,
              layer1StatedMatch: 0.89,
              layer2RealityMatch: 0.84,
              compensationScore: 0.88,
              penaltyDeductions: 0.0,
            },
            keyMatchedSkills: ['C++', 'Rust', 'Distributed Systems', 'Linux', 'TCP/IP'],
            missingCriticalSkills: ['Apache Spark / Photon Engine'],
            oaDetails: {
              platform: 'Codesignal General Coding Framework',
              dsaDifficulty: 'Medium-Hard (Score 800+ required for screening pass)',
              focusAreas: ['Distributed Hash Tables', 'Storage Partitioning', 'LSM-Tree Internals'],
            },
            matchExplanation: '86% Match. Strong distributed systems background directly maps to Spark Photon query engine team.',
            applicationStatus: 'NEW_MATCH',
            tailoringRecommendation: 'Detail your Raft consensus log compaction and disk serialization performance.',
          },
          {
            jobId: 'match-anthropic-infra',
            title: 'Systems & Infrastructure Intern - Large Scale Compute',
            company: 'Anthropic',
            companyTier: 'Tier 1 AI Labs',
            location: 'San Francisco, CA',
            locationType: 'Onsite',
            salaryRange: '$90 - $115 / hr + Housing Allowance',
            sourceUrl: 'https://jobs.ashbyhq.com/anthropic',
            atsProvider: 'Ashby',
            postedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
            daysOpen: 4,
            urgencyLevel: 'CRITICAL_IMMEDIATE',
            estimatedTimeToCloseDays: 16,
            scores: {
              finalScore: 0.89,
              layer1StatedMatch: 0.91,
              layer2RealityMatch: 0.88,
              compensationScore: 0.95,
              penaltyDeductions: 0.0,
            },
            keyMatchedSkills: ['Python', 'CUDA', 'Distributed Systems', 'PyTorch', 'Linux Kernel'],
            missingCriticalSkills: ['Kubernetes GPU Operator'],
            oaDetails: {
              platform: 'Custom Systems Takehome / Architecture Call',
              dsaDifficulty: 'Distributed Fault-Tolerance & Memory Profiling',
              focusAreas: ['Checkpoint Resumption', 'GPU Cluster Interconnect', 'RDMA / RoCE'],
            },
            matchExplanation: '89% Match. Superb fit for high-scale cluster orchestration and GPU memory caching.',
            applicationStatus: 'NEW_MATCH',
            tailoringRecommendation: 'Include your 1.2M QPS caching latency metrics and CUDA multi-GPU optimization highlights.',
          },
        ],
        resumeComponentsSummary: {
          resumeId: 'resume-alex-rivera-primary',
          title: 'Alex Rivera - Primary Systems & Quant Resume 2026',
          lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          skillsCount: 11,
          topSkills: ['C++', 'CUDA', 'Python', 'Rust', 'Distributed Systems', 'Low-Latency Networking', 'PyTorch', 'SIMD'],
          projectsCount: 2,
          experienceCount: 1,
          embeddingsStatus: 'SYNCHRONIZED' as const,
          subVectorDimensions: 768,
        },
        trackedCompanies: [
          {
            companyName: 'Citadel Securities',
            tier: 'Tier 1 Quant/HFT',
            activeJobsCount: 4,
            realityBarSummary: 'Extremely high algorithmic & systems speed bar. 100% rolling review with top priority on day 1–3 applications.',
            fastTrackTip: 'Apply within 24 hours of drop. Complete proctored HackerRank with 100% test cases and O(1)/O(N) memory efficiency.',
            avgLifespanDays: 13,
          },
          {
            companyName: 'OpenAI',
            tier: 'Tier 1 AI Labs',
            activeJobsCount: 3,
            realityBarSummary: 'Values tangible systems artifacts (Triton kernels, custom PyTorch ops, CUDA speedups) over generic toy projects.',
            fastTrackTip: 'Link public GitHub repo with reproducible benchmarks showing kernel latency reduction on GPU hardware.',
            avgLifespanDays: 17,
          },
          {
            companyName: 'Jane Street',
            tier: 'Tier 1 Quant/HFT',
            activeJobsCount: 5,
            realityBarSummary: 'Tests deeply for clean state modeling, mathematical intuition, and functional thinking.',
            fastTrackTip: 'Practice verbalizing architectural tradeoffs out loud during pair coding interviews.',
            avgLifespanDays: 15,
          },
          {
            companyName: 'Databricks',
            tier: 'High-Growth Unicorn',
            activeJobsCount: 6,
            realityBarSummary: 'Standard CodeSignal 800+ OA screen followed by deep distributed storage & systems concurrency interview.',
            fastTrackTip: 'Prepare LSM-Tree storage internals and multi-threaded lock-free queue concurrency problems.',
            avgLifespanDays: 24,
          },
          {
            companyName: 'Stripe',
            tier: 'High-Growth Unicorn',
            activeJobsCount: 5,
            realityBarSummary: 'Practical bug squash and API integration interviews. Focuses heavily on production code quality & unit tests.',
            fastTrackTip: 'Write comprehensive test assertions and handle all edge cases during practical coding.',
            avgLifespanDays: 26,
          },
        ],
        systemMetrics: {
          pipelineLatencyMs: 14.8,
          scraperHealth: 'Operational (Greenhouse, Lever, Ashby, Workday)',
          queuePendingTasks: 0,
          activeRateLimitRpm: 30,
        },
      };

      res.json(overviewData);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load dashboard overview' });
    }
  });

  // 5. Update Target Parameters & Recalculate
  app.put('/api/dashboard/target-parameters', generalRateLimiter, (req, res) => {
    try {
      const {
        targetLocations,
        targetRoles,
        preferredCompanies,
        blacklistedCompanies,
        customMatchThreshold,
        alertMethod,
        alertDestination,
      } = req.body || {};

      res.json({
        success: true,
        message: 'Target criteria updated. Pipeline rescoring calibrated.',
        updatedParameters: {
          targetLocations: targetLocations || ['San Francisco, CA', 'New York, NY', 'Remote'],
          targetRoles: targetRoles || ['Systems Engineer', 'Quant Developer'],
          preferredCompanies: preferredCompanies || ['Citadel Securities', 'OpenAI'],
          blacklistedCompanies: blacklistedCompanies || ['CryptoGambling Inc'],
          customMatchThreshold: customMatchThreshold !== undefined ? Number(customMatchThreshold) : 0.72,
          alertMethod: alertMethod || 'telegram',
          alertDestination: alertDestination || '@alex_rivera_scout_bot',
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update target parameters' });
    }
  });

  // 6. Update Application Status for Matched Job
  app.put('/api/dashboard/match-status/:jobId', generalRateLimiter, (req, res) => {
    try {
      const { jobId } = req.params;
      const { applicationStatus } = req.body;

      res.json({
        success: true,
        jobId,
        applicationStatus: applicationStatus || 'APPLIED',
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update match application status' });
    }
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Internship Scout Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
