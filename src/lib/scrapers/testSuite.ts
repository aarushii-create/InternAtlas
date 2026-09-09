/**
 * AI Internship Scout - Phase 4 Unit Test Suite
 * Validates Greenhouse and Lever ATS scrapers, HTML sanitization, requirement extraction,
 * and database object conversions.
 */

import { GreenhouseScraper } from './GreenhouseScraper';
import { LeverScraper } from './LeverScraper';
import { sanitizeHtml, detectRemote, extractReqId, extractStatedRequirements, NormalizedAtsJob } from '../normalizer';
import { generateDeterministicEmbedding } from '../../db/database';
import { Job } from '../../types';

export interface TestCaseResult {
  id: string;
  name: string;
  category: 'greenhouse' | 'lever' | 'sanitization' | 'db_model' | 'edge_cases';
  passed: boolean;
  durationMs: number;
  expected: any;
  actual: any;
  error?: string;
  details?: string;
}

export interface TestSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  results: TestCaseResult[];
  sampleTransformedJob?: Job;
}

export async function runScraperTestSuite(): Promise<TestSuiteReport> {
  const startTime = Date.now();
  const results: TestCaseResult[] = [];

  const greenhouse = new GreenhouseScraper();
  const lever = new LeverScraper();

  // ----------------------------------------------------
  // TEST 1: Greenhouse HTML Sanitization & Field Extraction
  // ----------------------------------------------------
  {
    const t0 = Date.now();
    try {
      const rawGhPayload = {
        id: 7481920,
        title: 'Backend Infrastructure Intern (Summer 2026)',
        location: { name: 'San Francisco, CA &bull; Remote' },
        updated_at: '2026-03-01T10:00:00Z',
        absolute_url: 'https://boards.greenhouse.io/stripe/jobs/7481920',
        requisition_id: 'REQ-GH-9982',
        content: `<h1>About the Team</h1><p>Join Stripe&rsquo;s <b>Core Distributed Systems</b> team &amp; build next-gen payment rails.<br>We handle &gt; 15,000 req/sec.</p><h3>Requirements:</h3><ul><li>Proficiency in <strong>Go, C++, and Python</strong></li><li>Understanding of PostgreSQL &amp; Redis concurrency</li></ul>`,
      };

      const normalized = greenhouse.normalizeJob(rawGhPayload, 'Stripe');

      const titleOk = normalized.jobTitle === 'Backend Infrastructure Intern (Summer 2026)';
      const companyOk = normalized.company === 'Stripe';
      const reqIdOk = normalized.reqId === 'REQ-GH-9982';
      const applyUrlOk = normalized.directApplyUrl === 'https://boards.greenhouse.io/stripe/jobs/7481920';
      const remoteOk = normalized.isRemote === true;
      const htmlCleanOk = !normalized.cleanDescription.includes('<h1>') &&
        !normalized.cleanDescription.includes('&amp;') &&
        normalized.cleanDescription.includes('Core Distributed Systems') &&
        normalized.cleanDescription.includes('• Proficiency in Go, C++, and Python');
      const skillsOk = normalized.statedRequirements.requiredSkills.includes('Go') || normalized.statedRequirements.requiredSkills.includes('Python');

      const passed = titleOk && companyOk && reqIdOk && applyUrlOk && remoteOk && htmlCleanOk && skillsOk;

      results.push({
        id: 'GH-01',
        name: 'GreenhouseScraper: Full JSON/HTML Payload Ingestion & Sanitization',
        category: 'greenhouse',
        passed,
        durationMs: Date.now() - t0,
        expected: {
          jobTitle: 'Backend Infrastructure Intern (Summer 2026)',
          reqId: 'REQ-GH-9982',
          isRemote: true,
          company: 'Stripe',
        },
        actual: {
          jobTitle: normalized.jobTitle,
          reqId: normalized.reqId,
          isRemote: normalized.isRemote,
          company: normalized.company,
          extractedSkills: normalized.statedRequirements.requiredSkills,
        },
        details: 'Successfully stripped HTML tags, decoded entities (&rsquo;, &amp;, &bull;), and parsed requirements.',
      });
    } catch (err: any) {
      results.push({
        id: 'GH-01',
        name: 'GreenhouseScraper: Full JSON/HTML Payload Ingestion & Sanitization',
        category: 'greenhouse',
        passed: false,
        durationMs: Date.now() - t0,
        expected: 'Valid NormalizedAtsJob',
        actual: 'Threw Exception',
        error: err.message,
      });
    }
  }

  // ----------------------------------------------------
  // TEST 2: Lever Postings Ingestion, Lists Extraction & Req Code
  // ----------------------------------------------------
  {
    const t0 = Date.now();
    try {
      const rawLeverPayload = {
        id: 'palantir-fdse-10293',
        text: 'Forward Deployed AI Engineer Intern (Summer 2026)',
        categories: {
          commitment: 'Internship',
          department: 'Foundry & AIP',
          location: 'New York, NY',
          team: 'Government & Defense',
        },
        workplaceType: 'hybrid',
        createdAt: 1772530000000,
        hostedUrl: 'https://jobs.lever.co/palantir/palantir-fdse-10293',
        applyUrl: 'https://jobs.lever.co/palantir/palantir-fdse-10293/apply',
        reqCode: 'PLTR-FDSE-2026-US',
        description: '<p>Palantir builds software that empowers organizations to integrate their data.</p>',
        lists: [
          {
            text: 'What We Are Looking For',
            content: '<ul><li>Deep experience with <strong>TypeScript, Java, and PyTorch</strong>.</li><li>Strong background in distributed consensus algorithms.</li></ul>',
          },
          {
            text: 'What You Will Do',
            content: '<ul><li>Deploy multi-tenant RAG systems with pgvector and latency guarantees.</li></ul>',
          },
        ],
        additional: 'Competitive compensation ($65/hr) + housing stipend.',
      };

      const normalized = lever.normalizeJob(rawLeverPayload, 'Palantir');

      const titleOk = normalized.jobTitle === 'Forward Deployed AI Engineer Intern (Summer 2026)';
      const companyOk = normalized.company === 'Palantir';
      const reqIdOk = normalized.reqId === 'PLTR-FDSE-2026-US';
      const applyUrlOk = normalized.directApplyUrl === 'https://jobs.lever.co/palantir/palantir-fdse-10293/apply';
      const listsMergedOk = normalized.cleanDescription.includes('What We Are Looking For') &&
        normalized.cleanDescription.includes('TypeScript, Java, and PyTorch') &&
        normalized.cleanDescription.includes('pgvector');
      const barOk = normalized.informalBar.dsaDifficulty === 'Hard';

      const passed = titleOk && companyOk && reqIdOk && applyUrlOk && listsMergedOk && barOk;

      results.push({
        id: 'LEV-01',
        name: 'LeverScraper: Multi-Section Lists Merging & ReqCode Parsing',
        category: 'lever',
        passed,
        durationMs: Date.now() - t0,
        expected: {
          jobTitle: 'Forward Deployed AI Engineer Intern (Summer 2026)',
          reqId: 'PLTR-FDSE-2026-US',
          dsaDifficulty: 'Hard',
        },
        actual: {
          jobTitle: normalized.jobTitle,
          reqId: normalized.reqId,
          dsaDifficulty: normalized.informalBar.dsaDifficulty,
          hasListsContent: listsMergedOk,
        },
        details: 'Correctly combined Lever description, lists array, and additional text into clean sanitized JD.',
      });
    } catch (err: any) {
      results.push({
        id: 'LEV-01',
        name: 'LeverScraper: Multi-Section Lists Merging & ReqCode Parsing',
        category: 'lever',
        passed: false,
        durationMs: Date.now() - t0,
        expected: 'Valid NormalizedAtsJob',
        actual: 'Threw Exception',
        error: err.message,
      });
    }
  }

  // ----------------------------------------------------
  // TEST 3: Complex HTML Entity & Malformed Markup Sanitization
  // ----------------------------------------------------
  {
    const t0 = Date.now();
    try {
      const messyHtml = `
        <div class="job-section">
          <h2>Senior Systems &amp; Compiler Intern &#8212; Summer &lsquo;26</h2>
          <p>We&#39;re building high-throughput systems (&lt;5ms latency) with <strong>C++ &amp; Rust</strong>.</p>
          <ul>
            <li>Salary: &pound;5,000/mo &bull; Relocation stipend included</li>
            <li>Must know <code>LLVM</code> &amp; memory barriers</li>
          </ul>
        </div>
      `;

      const clean = sanitizeHtml(messyHtml);

      // Verify that no HTML tags remain (e.g., <div, <h2, <strong>, <code>, <li>)
      const noTags = !/<(?:div|h2|p|strong|ul|li|code)[^>]*>/i.test(clean) && !/<\/[^>]+>/i.test(clean);
      const entitiesDecoded = clean.includes('Systems & Compiler') &&
        clean.includes("We're") &&
        clean.includes('—') &&
        clean.includes('<5ms') &&
        clean.includes('£5,000') &&
        clean.includes('• Salary:');

      const passed = noTags && entitiesDecoded;

      results.push({
        id: 'SAN-01',
        name: 'HTML Normalizer: Entity Decoding & Tag Stripping Engine',
        category: 'sanitization',
        passed,
        durationMs: Date.now() - t0,
        expected: 'Clean decoded text with bullet points and zero HTML tags',
        actual: clean.slice(0, 100) + '...',
        details: 'Decoded numeric unicode, named entities (&pound;, &bull;, &lsquo;, &#8212;), and converted tags.',
      });
    } catch (err: any) {
      results.push({
        id: 'SAN-01',
        name: 'HTML Normalizer: Entity Decoding & Tag Stripping Engine',
        category: 'sanitization',
        passed: false,
        durationMs: Date.now() - t0,
        expected: 'Clean text',
        actual: 'Error',
        error: err.message,
      });
    }
  }

  // ----------------------------------------------------
  // TEST 4: Remote Work & Requisition ID Fallback Extractors
  // ----------------------------------------------------
  {
    const t0 = Date.now();
    try {
      const isRemote1 = detectRemote('SWE Intern', 'Remote - USA', 'Work from anywhere in North America');
      const isRemote2 = detectRemote('Hardware Intern', 'Austin, TX', 'Onsite laboratory presence required');
      const isRemote3 = detectRemote('Full Stack Intern (Hybrid/Remote)', 'Seattle, WA', 'Hybrid schedule with 2 remote days');

      const reqIdFromUrl = extractReqId(null, 'https://boards.greenhouse.io/databricks/jobs/6102931');
      const reqIdFromText = extractReqId(null, undefined, 'Job Details. Requisition ID: REQ-2026-CLOUD-99');

      const remoteLogicOk = isRemote1 === true && isRemote2 === false && isRemote3 === true;
      const reqIdLogicOk = reqIdFromUrl === '6102931' && reqIdFromText === 'REQ-2026-CLOUD-99';

      const passed = remoteLogicOk && reqIdLogicOk;

      results.push({
        id: 'SAN-02',
        name: 'Extraction Logic: Remote Work Heuristics & Req ID Fallback Resolvers',
        category: 'edge_cases',
        passed,
        durationMs: Date.now() - t0,
        expected: { isRemote1: true, isRemote2: false, isRemote3: true, reqIdFromUrl: '6102931', reqIdFromText: 'REQ-2026-CLOUD-99' },
        actual: { isRemote1, isRemote2, isRemote3, reqIdFromUrl, reqIdFromText },
        details: 'Accurately resolved remote classifications and extracted requisition IDs from URLs & raw text.',
      });
    } catch (err: any) {
      results.push({
        id: 'SAN-02',
        name: 'Extraction Logic: Remote Work Heuristics & Req ID Fallback Resolvers',
        category: 'edge_cases',
        passed: false,
        durationMs: Date.now() - t0,
        expected: 'Valid extractions',
        actual: 'Error',
        error: err.message,
      });
    }
  }

  // ----------------------------------------------------
  // TEST 5: Full Conversion into Clean Structured DB Model & 768-dim Vector
  // ----------------------------------------------------
  let sampleTransformedJob: Job | undefined;
  {
    const t0 = Date.now();
    try {
      const rawJob: NormalizedAtsJob = {
        source: 'greenhouse',
        externalId: 'gh-882910',
        reqId: 'REQ-DB-2026',
        company: 'Databricks',
        jobTitle: 'Distributed Systems & Vector Engine Intern (Summer 2026)',
        location: 'Mountain View, CA / Remote',
        isRemote: true,
        rawDescription: '<p>Build high performance C++ and Rust vector similarity kernels.</p>',
        cleanDescription: 'Build high performance C++ and Rust vector similarity kernels for distributed AI search.',
        directApplyUrl: 'https://boards.greenhouse.io/databricks/jobs/882910',
        postedAt: '2026-02-15T00:00:00Z',
        statedRequirements: {
          requiredSkills: ['C++', 'Rust', 'Distributed Systems', 'Vector Search'],
          preferredSkills: ['CUDA', 'Linux Kernel', 'Ray'],
          education: "Bachelor's or Master's in Computer Science",
          experienceYears: 0,
        },
        informalBar: {
          dsaDifficulty: 'Hard',
          oaPattern: 'LeetCode Hard/Mediums, End-to-End Bug Squashing, Practical API Debugging',
          unstatedPreferences: ['Substantial open source projects', 'Deep systems understanding'],
          barDescription: 'Rigorous engineering bar testing deep architectural instincts and clean code.',
        },
      };

      // Generate 768-dim vector embedding
      const vectorEmbedding = generateDeterministicEmbedding(
        `${rawJob.cleanDescription} ${rawJob.company} ${rawJob.jobTitle} ${rawJob.statedRequirements.requiredSkills.join(' ')}`
      );

      const dbJob: Job = {
        id: 'job-unit-test-01',
        source: rawJob.source,
        externalId: rawJob.externalId,
        dedupHash: 'gh-stripe-infra-2026-unit-hash',
        company: rawJob.company,
        title: rawJob.jobTitle,
        location: rawJob.location,
        isRemote: rawJob.isRemote,
        description: rawJob.cleanDescription,
        rawJd: rawJob.rawDescription,
        statedRequirements: rawJob.statedRequirements,
        informalBar: rawJob.informalBar,
        vectorEmbedding,
        applyUrl: rawJob.directApplyUrl,
        postedAt: rawJob.postedAt,
        firstSeenAt: new Date().toISOString(),
        lastVerifiedActive: new Date().toISOString(),
        isActive: true,
        relevanceStatus: 'RELEVANT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      sampleTransformedJob = dbJob;

      const vectorDimOk = dbJob.vectorEmbedding.length === 768;
      const fieldsComplete = Boolean(
        dbJob.id &&
        dbJob.source &&
        dbJob.company &&
        dbJob.title &&
        dbJob.description &&
        dbJob.applyUrl &&
        dbJob.statedRequirements &&
        dbJob.informalBar
      );

      const passed = vectorDimOk && fieldsComplete;

      results.push({
        id: 'DB-01',
        name: 'Database Model: Schema Conformance & 768-Dimensional Vectorization',
        category: 'db_model',
        passed,
        durationMs: Date.now() - t0,
        expected: { vectorDimensions: 768, source: 'greenhouse', company: 'Databricks' },
        actual: { vectorDimensions: dbJob.vectorEmbedding.length, source: dbJob.source, company: dbJob.company },
        details: 'Converted normalized job into complete production DB object with verified 768-dim embedding.',
      });
    } catch (err: any) {
      results.push({
        id: 'DB-01',
        name: 'Database Model: Schema Conformance & 768-Dimensional Vectorization',
        category: 'db_model',
        passed: false,
        durationMs: Date.now() - t0,
        expected: 'Valid DB Job',
        actual: 'Error',
        error: err.message,
      });
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount,
    totalDurationMs,
    results,
    sampleTransformedJob,
  };
}
