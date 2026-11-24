import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { getActiveCandidateProfile, PRESET_CANDIDATES } from '../src/lib/candidatePresets';
import { computeCandidateMatches } from '../src/lib/candidateScorer';
import { buildAllCompanyKnowledgeChunks } from '../src/db/companyKnowledgeChunks';
import { calculateCosineSimilarity, db, generateDeterministicEmbedding, InAppDatabase } from '../src/db/database';
import {
  extractResumeText,
  MAX_RESUME_BYTES,
  parseResume,
  generateResumeVectors,
  ResumeProcessingError,
} from '../src/lib/resumeParser';
import { decryptPersistedState, encryptPersistedState } from '../src/db/postgresPersistence';
import { dynamicResumeEngine } from '../src/lib/resume/dynamicResumeEngine';
import { LiveScraperEngine } from '../src/lib/scrapers/LiveScraperEngine';
import { GreenhouseScraper } from '../src/lib/scrapers/GreenhouseScraper';
import { fetchAtsResponse, parsePostedAt } from '../src/lib/scrapers/atsHttp';
import { TARGET_COMPANIES_CATALOG } from '../src/lib/scrapers/targetCompaniesCatalog';
import { generateJobDedupHash } from '../src/lib/dedupEngine';
import { ProductionJobMatch } from '../src/types';
import { AUTH_COOKIE_NAME, authenticateToken, generateUserToken, JWT_SECRET, AuthenticatedRequest } from '../src/middleware/auth';
import { applicationStatusSchema, registerSchema, requestIdSchema } from '../src/lib/validations';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';

function createTextPdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

describe('project core behavior', () => {
  it('provides a default candidate profile outside the browser', () => {
    assert.equal(getActiveCandidateProfile().id, PRESET_CANDIDATES[0].id);
  });

  it('re-scores a job match while preserving its application status', () => {
    const match: ProductionJobMatch = {
      jobId: 'job-test',
      title: 'Software Engineering Intern',
      company: 'Example',
      companyTier: 'Technology',
      location: 'Remote',
      locationType: 'Remote',
      sourceUrl: 'https://example.com/jobs/1',
      atsProvider: 'Greenhouse',
      postedAt: new Date(0).toISOString(),
      daysOpen: 1,
      urgencyLevel: 'STANDARD_CYCLE',
      estimatedTimeToCloseDays: 30,
      scores: {
        finalScore: 0.8,
        layer1StatedMatch: 0.8,
        layer2RealityMatch: 0.8,
        compensationScore: 0.8,
        penaltyDeductions: 0,
      },
      keyMatchedSkills: ['Python'],
      missingCriticalSkills: ['Rust'],
      oaDetails: { platform: 'Not specified', dsaDifficulty: 'Medium', focusAreas: [] },
      matchExplanation: 'Original explanation',
      applicationStatus: 'APPLIED',
      tailoringRecommendation: 'Use relevant examples.',
    };

    const rescored = computeCandidateMatches(
      { ...PRESET_CANDIDATES[0], skills: ['Python', 'Rust'] },
      [match]
    );

    assert.equal(rescored.length, 1);
    assert.equal(rescored[0].applicationStatus, 'APPLIED');
    assert.ok(rescored[0].scores.finalScore >= 0.68);
    assert.deepEqual(rescored[0].missingCriticalSkills, []);
    assert.match(rescored[0].matchExplanation, /Alex Rivera/);
  });

  it('generates stable normalized 768-dimensional text vectors', () => {
    const vector = generateDeterministicEmbedding('C++ distributed systems');
    assert.equal(vector.length, 768);
    assert.deepEqual(vector, generateDeterministicEmbedding('C++ distributed systems'));
    assert.ok(calculateCosineSimilarity(vector, vector) > 0.999);
  });

  it('parses resume text and produces vectors matching the declared dimensions', () => {
    const parsed = parseResume('Technical Skills: Python, TypeScript');
    const vectors = generateResumeVectors('Experienced Python and TypeScript developer.', parsed);

    assert.ok(parsed.skills.includes('Python'));
    assert.deepEqual(parsed.inferences, []);
    assert.deepEqual(parsed.projects, []);
    assert.deepEqual(parsed.experience, []);
    assert.deepEqual(parsed.education, []);
    assert.equal(parsed.metrics.totalYearsExperience, undefined);
    assert.equal(vectors.fullTextVector.length, 768);
    assert.equal(vectors.skillsVector.length, 768);
    assert.equal(vectors.experienceVector.length, 768);
  });

  it('extracts only document-provided resume facts without sample fallbacks', () => {
    const parsed = parseResume([
      'Technical Skills:',
      'Languages: Python, TypeScript',
      'Experience:',
      'Backend Intern @ Example Labs (May 2024 - Aug 2024)',
      '- Built a cache reducing latency by 20%.',
      'Projects:',
      'Study Tracker: Built with React.',
      'Education:',
      'B.S. Computer Science, Example University (GPA 3.7, Class of 2026)',
      'Latency Reduction: 20%',
      'Total Years of Experience: 1.5',
    ].join('\n'));

    assert.deepEqual(parsed.skills, ['Python', 'TypeScript']);
    assert.deepEqual(parsed.experience, [{
      role: 'Backend Intern',
      company: 'Example Labs',
      duration: 'May 2024 - Aug 2024',
      highlights: ['Built a cache reducing latency by 20%.'],
      technologies: [],
    }]);
    assert.deepEqual(parsed.projects, [{
      title: 'Study Tracker',
      description: 'Built with React.',
      technologies: [],
      outcomes: [],
    }]);
    assert.equal(parsed.education[0].institution, 'Example University');
    assert.equal(parsed.education[0].gpa, '3.7');
    assert.equal(parsed.metrics.latencyReduction, '20%');
    assert.equal(parsed.metrics.totalYearsExperience, 1.5);
    assert.deepEqual(parsed.inferences, []);
  });

  it('extracts resume text from plain text and DOCX files', async () => {
    const plainText = Buffer.from('Skills: Python, Rust', 'utf8');
    assert.equal(await extractResumeText(plainText, 'resume.txt', 'text/plain'), 'Skills: Python, Rust');

    const docx = Buffer.from(
      'UEsDBBQAAAAIAEKEVV15bjPX6AAAAK0BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU7DMBD9FWuuKHHggBCK0wPLETiUDxjZk8SqN3nc0v49Tlt6QIXjzFv1+tXeO7GjzDYGBbdtB4KCjsaGScHn+rV5AMEFg0EXAyk4EMNq6NeHRCyqNrCCuZT0KCXrmTxyGxOFiowxeyz1zJNMqDc4kbzrunupYygUSlMWDxj6Zxpx64p42df3qUcmxyCeTsQlSwGm5KzGUnG5C+ZXSnNOaKvyyOHZJr6pBJBXExbk74Cz7r0Ok60h8YG5vKGvLPkVs5Em6q2vyvZ/mys94zhaTRf94pZy1MRcF/euvSAebfjpL49zD99QSwMEFAAAAAgAQoRVXZv9N+qtAAAAKQEAAAsAAABfcmVscy8ucmVsc43POw7CMAwG4KtE3mlaBoRQ0y4IqSsqB7ASN61oHkrCo7cnAwNFDIy2f3+W6/ZpZnanECdnBVRFCYysdGqyWsClP232wGJCq3B2lgQsFKFt6jPNmPJKHCcfWTZsFDCm5A+cRzmSwVg4TzZPBhcMplwGzT3KK2ri27Lc8fBpwNpknRIQOlUB6xdP/9huGCZJRydvhmz6ceIrkWUMmpKAhwuKq3e7yCzwpuarF5sXUEsDBBQAAAAIAEKEVV1LY/IipgAAAN0AAAARAAAAd29yZC9kb2N1bWVudC54bWxFjssOwiAQRX+FsNZSXRjTlHbn2vj4ACzYNsIMYai1fy/UhZtzM7m5J1O3H2fZ2wQaESTfFSVnBjrUI/SS32+n7ZEzigq0sghG8sUQb5t6rjR2kzMQWRIAVbPkQ4y+EoK6wThFBXoDqXticCqmM/RixqB9wM4QJb+zYl+WB+HUCDwrH6iXnD4jZMTm+hqtpYqdlzggbNhloliL3GSGlX7lby3+nzVfUEsBAhQAFAAAAAgAQoRVXXluM9foAAAArQEAABMAAAAAAAAAAAAAAIABAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAUAAAACABChFVdm/036q0AAAApAQAACwAAAAAAAAAAAAAAgAEZAQAAX3JelsvLnJlbHNQSwECFAAUAAAACABChFVdS2PyIqYAAADdAAAAEQAAAAAAAAAAAAAAgAHvAQAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAMAAwC5AAAAxAIAAAAA',
      'base64'
    );
    const validDocx = await readFile(new URL('../node_modules/mammoth/test/test-data/single-paragraph.docx', import.meta.url));
    assert.match(await extractResumeText(validDocx, 'resume.docx'), /Walking on imported air/);
    await assert.rejects(
      extractResumeText(docx, 'damaged.docx'),
      (error: unknown) => error instanceof ResumeProcessingError && /DOCX document could not be read/i.test(error.message)
    );
  });

  it('rejects empty, malformed, oversized, and unsupported resume documents', async () => {
    await assert.rejects(
      extractResumeText(Buffer.alloc(0), 'empty.txt'),
      (error: unknown) => error instanceof ResumeProcessingError && /empty/i.test(error.message)
    );
    await assert.rejects(
      extractResumeText(Buffer.from('not a PDF'), 'resume.pdf'),
      (error: unknown) => error instanceof ResumeProcessingError && /valid PDF/i.test(error.message)
    );
    await assert.rejects(
      extractResumeText(Buffer.from('PK\x03\x04'), 'resume.docx'),
      (error: unknown) => error instanceof ResumeProcessingError && /DOCX document could not be read/i.test(error.message)
    );
    await assert.rejects(
      extractResumeText(Buffer.from('   '), 'resume.txt', 'text/plain'),
      (error: unknown) => error instanceof ResumeProcessingError && /No readable text/i.test(error.message)
    );
    await assert.rejects(
      extractResumeText(Buffer.from('binary'), 'resume.doc'),
      (error: unknown) => error instanceof ResumeProcessingError && /Unsupported file type/i.test(error.message)
    );
    await assert.rejects(
      extractResumeText(Buffer.alloc(MAX_RESUME_BYTES + 1), 'resume.txt'),
      (error: unknown) => error instanceof ResumeProcessingError && error.statusCode === 413
    );
    await assert.rejects(
      extractResumeText(Buffer.from([0xff, 0xfe]), 'resume.txt', 'text/plain'),
      (error: unknown) => error instanceof ResumeProcessingError && /UTF-8/i.test(error.message)
    );
  });

  it('extracts text from a PDF resume', async () => {
    const extracted = await extractResumeText(createTextPdf('Skills: Python, Rust'), 'resume.pdf', 'application/pdf');
    assert.match(extracted, /Skills:\s*Python,\s*Rust/);
  });

  it('encrypts runtime state so resume text is not visible in PostgreSQL snapshots', () => {
    const key = Buffer.alloc(32, 7);
    const plainText = JSON.stringify({ resume: 'private resume text' });
    const encrypted = encryptPersistedState(plainText, key);

    assert.equal(encrypted.version, 2);
    assert.equal(JSON.stringify(encrypted).includes('private resume text'), false);
    assert.equal(decryptPersistedState(encrypted, key), plainText);
    assert.throws(
      () => decryptPersistedState(encrypted, Buffer.alloc(32, 8)),
      /could not be decrypted/
    );
  });

  it('encrypts and decrypts backup files with the configured backup key', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'internatlas-backup-test-'));
    const source = path.join(directory, 'source.dump');
    const encrypted = path.join(directory, 'encrypted.dump');
    const restored = path.join(directory, 'restored.dump');
    const key = Buffer.alloc(32, 9).toString('hex');
    const cryptoScript = fileURLToPath(new URL('../scripts/backup-crypto.mjs', import.meta.url));
    try {
      await writeFile(source, 'confidential backup content');
      const encrypt = spawnSync(process.execPath, [cryptoScript, 'encrypt', source, encrypted], {
        env: { ...process.env, BACKUP_ENCRYPTION_KEY: key },
      });
      assert.equal(encrypt.status, 0, encrypt.stderr.toString());
      assert.equal((await readFile(encrypted)).includes(Buffer.from('confidential backup content')), false);

      const decrypt = spawnSync(process.execPath, [cryptoScript, 'decrypt', encrypted, restored], {
        env: { ...process.env, BACKUP_ENCRYPTION_KEY: key },
      });
      assert.equal(decrypt.status, 0, decrypt.stderr.toString());
      assert.equal((await readFile(restored, 'utf8')), 'confidential backup content');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('normalizes job URL tracking parameters for deduplication', () => {
    const first = generateJobDedupHash(
      'Example Co',
      'Software Engineer',
      'Remote',
      'https://jobs.example.com/role/1?source=board'
    );
    const second = generateJobDedupHash(
      ' example co ',
      'software engineer',
      'remote',
      'https://jobs.example.com/role/1?campaign=mail'
    );

    assert.equal(first, second);
    assert.match(first, /^[a-f0-9]{64}$/);
  });

  it('builds company knowledge chunks from the seeded company profiles', () => {
    const chunks = buildAllCompanyKnowledgeChunks();

    assert.ok(chunks.length > 0);
    assert.ok(chunks.some((chunk) => chunk.category === 'dsa'));
    assert.ok(chunks.every((chunk) => chunk.id && chunk.content && chunk.tags.length > 0));
  });

  it('persists application status across match recalculation without crossing accounts', () => {
    const userId = '11111111-1111-4111-a111-111111111111';
    const tenantId = 'tenant-alex-rivera';
    const otherUserId = '22222222-2222-4222-a222-222222222222';
    const job = db.getJobs()[0];
    const resume = db.getResumes(tenantId, userId)[0];
    const match = {
      userId,
      tenantId,
      jobId: job.id,
      resumeId: resume.id,
      layer1Score: 0.8,
      layer2Score: 0.75,
      compositeScore: 78,
      matchedSkills: ['Python'],
      missingSkills: ['Rust'],
      status: 'alerted' as const,
    };

    try {
      db.replaceUserMatches(userId, tenantId, [match]);
      assert.equal(db.updateMatchApplicationStatus(userId, tenantId, job.id, 'INTERVIEWING')?.applicationStatus, 'INTERVIEWING');
      db.replaceUserMatches(userId, tenantId, [{ ...match, compositeScore: 82 }]);

      const savedMatch = db.getMatches(tenantId, userId).find((entry) => entry.jobId === job.id);
      assert.equal(savedMatch?.compositeScore, 82);
      assert.equal(savedMatch?.applicationStatus, 'INTERVIEWING');
      assert.equal(db.getMatches('tenant-jordan-chen', otherUserId).some((entry) => entry.jobId === job.id), false);
      assert.equal(db.updateMatchApplicationStatus(otherUserId, 'tenant-jordan-chen', job.id, 'APPLIED'), undefined);
    } finally {
      db.replaceUserMatches(userId, tenantId, []);
    }
  });

  it('deletes only an owned resume and its associated matches', () => {
    const isolatedDatabase = new InAppDatabase();
    const userId = '11111111-1111-4111-a111-111111111111';
    const tenantId = 'tenant-alex-rivera';
    const resume = isolatedDatabase.getResumes(tenantId, userId)[0];
    const job = isolatedDatabase.getJobs()[0];
    isolatedDatabase.replaceUserMatches(userId, tenantId, [{
      userId,
      tenantId,
      jobId: job.id,
      resumeId: resume.id,
      layer1Score: 0.8,
      layer2Score: 0.75,
      compositeScore: 78,
      matchedSkills: ['Python'],
      missingSkills: ['Rust'],
      status: 'alerted',
    }]);

    assert.equal(isolatedDatabase.deleteResume(resume.id, tenantId, 'another-user'), false);
    assert.equal(isolatedDatabase.getResumeById(resume.id, tenantId)?.userId, userId);
    assert.equal(isolatedDatabase.deleteResume(resume.id, tenantId, userId), true);
    assert.equal(isolatedDatabase.getResumeById(resume.id, tenantId), undefined);
    assert.equal(isolatedDatabase.getMatches(tenantId, userId).length, 0);
  });

  it('builds modular resume data only from the uploaded resume content', () => {
    const userId = '11111111-1111-4111-a111-111111111111';
    const tenantId = 'tenant-alex-rivera';
    const content = 'Projects:\nCourse Planner: Built a course schedule tool.';
    const parsedData = parseResume(content);
    const resume = db.createResume({
      userId,
      tenantId,
      title: 'parser-test-resume.txt',
      content,
      extractedSkills: parsedData.skills,
      parsedExperience: [],
      parsedData,
      isPrimary: false,
    });

    try {
      const profile = dynamicResumeEngine.getModularProfile(resume.id);
      assert.equal(profile?.totalProjectsCount, 1);
      assert.equal(profile?.totalExperienceCount, 0);
      assert.deepEqual(dynamicResumeEngine.getResumeProjects(resume.id).map(({ title }) => title), ['Course Planner']);
      assert.deepEqual(dynamicResumeEngine.getResumeExperiences(resume.id), []);
    } finally {
      dynamicResumeEngine.deleteResumeData(resume.id);
      db.deleteResume(resume.id, tenantId, userId);
    }
  });

  it('does not synthesize postings for unsupported catalog providers', async () => {
    const scraper = new LiveScraperEngine();
    const unsupportedBoard = TARGET_COMPANIES_CATALOG.find((company) => company.atsProvider === 'custom_rest');
    assert.ok(unsupportedBoard);

    const result = await scraper.scrapeCompany(unsupportedBoard);
    assert.equal(result.status, 'UNSUPPORTED');
    assert.equal(result.totalFetched, 0);
    assert.equal(result.jobs.length, 0);
    assert.match(result.error ?? '', /No configured live connector/);
    assert.equal(scraper.getBoardHealth().find((board) => board.companyId === unsupportedBoard.id)?.verificationStatus, 'unsupported');
    assert.equal(scraper.getCatalog().every((company) => company.isRealtimeEnabled === false), true);
    const restored = new InAppDatabase(false);
    restored.importState(db.exportState());
    assert.equal(
      restored.getScraperBoardHealth().find((board) => board.companyId === unsupportedBoard.id)?.verificationStatus,
      'unsupported'
    );
  });

  it('does not fill missing ATS fields with fabricated live job facts', () => {
    const normalized = new GreenhouseScraper().normalizeJob(
      { id: 'job-1', title: '' },
      'Example'
    );

    assert.equal(normalized.jobTitle, '');
    assert.equal(normalized.location, 'Location not specified');
    assert.equal(normalized.directApplyUrl, '');
    assert.equal(normalized.postedAt, '');
  });

  it('reports non-retryable ATS HTTP errors instead of converting them to empty results', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('', { status: 404 })) as typeof fetch;
    try {
      await assert.rejects(
        fetchAtsResponse('greenhouse', 'https://boards-api.greenhouse.io/example'),
        /greenhouse request failed with HTTP 404/
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
    assert.equal(parsePostedAt('not-a-date'), '');
    assert.equal(parsePostedAt(undefined), '');
  });

  it('caps provider retries at the configured limit', async () => {
    const originalFetch = globalThis.fetch;
    let attempts = 0;
    globalThis.fetch = (async () => {
      attempts++;
      return new Response('', { status: 503, headers: { 'retry-after': '0' } });
    }) as typeof fetch;
    try {
      await assert.rejects(fetchAtsResponse('ashby', 'https://api.ashbyhq.com/example'), /HTTP 503/);
    } finally {
      globalThis.fetch = originalFetch;
    }
    assert.equal(attempts, 3);
  });

  it('deactivates live postings after the verification freshness window, not demo or manual records', () => {
    const database = new InAppDatabase(false);
    const common = {
      source: 'greenhouse' as const,
      externalId: 'freshness-test',
      company: 'Example',
      title: 'Software Intern',
      location: 'Remote',
      isRemote: true,
      description: 'Role description',
      rawJd: 'Role description',
      statedRequirements: { requiredSkills: [], preferredSkills: [], education: '', experienceYears: 0 },
      informalBar: { dsaDifficulty: 'Medium' as const, oaPattern: '', unstatedPreferences: [], barDescription: '' },
      applyUrl: 'https://example.test/jobs/1',
      postedAt: '',
      isActive: true,
    };
    database.createJob({ ...common, dataOrigin: 'live', lastVerifiedActive: '2020-01-01T00:00:00.000Z' });
    database.createJob({ ...common, externalId: 'demo-test', dataOrigin: 'demo', lastVerifiedActive: '2020-01-01T00:00:00.000Z' });
    database.createJob({ ...common, externalId: 'manual-test', dataOrigin: 'manual', lastVerifiedActive: '2020-01-01T00:00:00.000Z' });

    assert.equal(database.deactivateJobsNotVerifiedBefore('2021-01-01T00:00:00.000Z'), 1);
    assert.equal(database.getJobByExternalId('greenhouse', 'freshness-test')?.isActive, false);
    assert.equal(database.getJobByExternalId('greenhouse', 'demo-test')?.isActive, true);
    assert.equal(database.getJobByExternalId('greenhouse', 'manual-test')?.isActive, true);
  });

  it('includes company insight records in the persisted database state', () => {
    const original = new InAppDatabase();
    const restored = new InAppDatabase(false);

    restored.importState(JSON.parse(JSON.stringify(original.exportState())));

    assert.ok(original.getCompanyInsights().length > 0);
    assert.deepEqual(restored.getCompanyInsights(), original.getCompanyInsights());
  });

  it('accepts bearer and HttpOnly-cookie sessions but rejects query tokens and expired tokens', () => {
    const user = {
      id: '33333333-3333-4333-a333-333333333333',
      tenantId: 'tenant-test',
      email: 'test@example.com',
      fullName: 'Test User',
      isOnboarded: false,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
    const token = generateUserToken(user);
    const capture = () => {
      const state = { statusCode: 200, body: undefined as unknown };
      const response = {
        status(code: number) { state.statusCode = code; return this; },
        json(body: unknown) { state.body = body; return this; },
      } as unknown as Response;
      return { state, response };
    };

    const bearer = capture();
    let bearerNext = false;
    authenticateToken(
      { headers: { authorization: `Bearer ${token}` }, query: {} } as AuthenticatedRequest,
      bearer.response,
      () => { bearerNext = true; }
    );
    assert.equal(bearerNext, true);

    const cookie = capture();
    let cookieNext = false;
    authenticateToken(
      { headers: { cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}` }, query: {} } as AuthenticatedRequest,
      cookie.response,
      () => { cookieNext = true; }
    );
    assert.equal(cookieNext, true);

    const queryToken = capture();
    authenticateToken(
      { headers: {}, query: { token } } as unknown as AuthenticatedRequest,
      queryToken.response,
      () => assert.fail('Query string tokens must not authenticate requests')
    );
    assert.equal(queryToken.state.statusCode, 401);

    const expiredToken = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, email: user.email, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: -1 }
    );
    const expired = capture();
    authenticateToken(
      { headers: { authorization: `Bearer ${expiredToken}` }, query: {} } as AuthenticatedRequest,
      expired.response,
      () => assert.fail('Expired tokens must not authenticate requests')
    );
    assert.equal(expired.state.statusCode, 401);
  });

  it('validates registration fields, account status values, and path identifiers', () => {
    const validRegistration = {
      email: 'new.user@example.com',
      password: 'correct-horse-battery',
      fullName: 'New User',
    };
    assert.equal(registerSchema.safeParse(validRegistration).success, true);
    assert.equal(registerSchema.safeParse({ ...validRegistration, tenantId: 'tenant-other' }).success, false);
    assert.equal(registerSchema.safeParse({ ...validRegistration, password: 'short' }).success, false);
    assert.equal(applicationStatusSchema.safeParse({ applicationStatus: 'APPLIED' }).success, true);
    assert.equal(applicationStatusSchema.safeParse({ applicationStatus: 'ADMIN' }).success, false);
    assert.equal(requestIdSchema.safeParse('valid-resume_123').success, true);
    assert.equal(requestIdSchema.safeParse('../other-account').success, false);
  });

  it('removes persisted demo accounts and their private records in production mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'development';
      const seededDatabase = new InAppDatabase();
      const seededState = seededDatabase.exportState();

      process.env.NODE_ENV = 'production';
      const productionDatabase = new InAppDatabase(false);
      productionDatabase.importState(seededState);

      assert.equal(productionDatabase.getUsers().length, 0);
      assert.equal(productionDatabase.getResumes().length, 0);
      assert.equal(productionDatabase.getMatches().length, 0);
      assert.equal(productionDatabase.getNotifications().length, 0);
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
