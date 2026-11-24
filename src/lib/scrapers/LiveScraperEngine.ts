/**
 * InternAtlas - Master Live Web Scraping Engine
 * Orchestrates live fetching through the Greenhouse, Lever, Ashby, and Workday adapters.
 * Other catalog providers are reported as unsupported until an actual connector is implemented.
 */

import { GreenhouseScraper } from './GreenhouseScraper';
import { LeverScraper } from './LeverScraper';
import { AshbyScraper } from './AshbyScraper';
import { WorkdayScraper } from './WorkdayScraper';
import {
  TARGET_COMPANIES_CATALOG,
  TargetCompanyMetadata,
  CompanyCategory,
  AtsProviderType,
} from './targetCompaniesCatalog';
import { NormalizedAtsJob } from '../normalizer';
import { dedupEngine, generateJobDedupHash } from '../dedupEngine';
import { db } from '../../db/database';
import { layer1RagEngine } from '../rag/layer1Engine';
import { layer2RagEngine } from '../rag/layer2Engine';
import { compositeScoringEngine } from '../scoring/compositeScoringEngine';
import { ProductionJobMatch, Resume, Job, ScraperBoardHealth } from '../../types';
import { SupportedAtsProvider } from './atsHttp';

export type LiveScrapeStatus = 'SUCCESS' | 'EMPTY' | 'PARTIAL' | 'FAILED' | 'UNSUPPORTED';

export interface LiveScrapeResult {
  company: string;
  category: CompanyCategory;
  provider: AtsProviderType;
  totalFetched: number;
  rejectedJobCount: number;
  newUniqueJobs: number;
  duplicateCount: number;
  jobs: NormalizedAtsJob[];
  durationMs: number;
  status: LiveScrapeStatus;
  error?: string;
  completeSnapshot: boolean;
}

export class LiveScraperEngine {
  private greenhouse: GreenhouseScraper;
  private lever: LeverScraper;
  private ashby: AshbyScraper;
  private workday: WorkdayScraper;

  constructor() {
    this.greenhouse = new GreenhouseScraper();
    this.lever = new LeverScraper();
    this.ashby = new AshbyScraper();
    this.workday = new WorkdayScraper();
  }

  /**
   * Returns metadata for all target companies across the 5 categories
   */
  public getCatalog(): TargetCompanyMetadata[] {
    return TARGET_COMPANIES_CATALOG.map((company) => ({
      ...company,
      isRealtimeEnabled: this.isBoardVerified(company.id),
    }));
  }

  public isBoardVerified(companyId: string): boolean {
    const health = db.getScraperBoardHealth().find((board) => board.companyId === companyId);
    return health?.verificationStatus === 'healthy' || health?.verificationStatus === 'empty';
  }

  public getBoardHealth(): ScraperBoardHealth[] {
    const savedById = new Map(db.getScraperBoardHealth().map((board) => [board.companyId, board]));
    return TARGET_COMPANIES_CATALOG.map((company) => savedById.get(company.id) ?? {
      companyId: company.id,
      company: company.name,
      provider: company.atsProvider,
      connectorStatus: this.hasConfiguredConnector(company) ? 'supported' : 'unsupported',
      verificationStatus: this.hasConfiguredConnector(company) ? 'not_checked' : 'unsupported',
    });
  }

  private isSupported(provider: string): provider is SupportedAtsProvider {
    return provider === 'greenhouse' || provider === 'lever' || provider === 'ashby' || provider === 'workday';
  }

  public hasConfiguredConnector(company: TargetCompanyMetadata): boolean {
    if (!this.isSupported(company.atsProvider) || !company.boardToken.trim()) return false;
    if (company.atsProvider !== 'workday') return true;
    try {
      const careers = new URL(company.careersUrl);
      return careers.hostname.endsWith('.myworkdayjobs.com') &&
        careers.pathname.split('/').filter(Boolean).length > 0;
    } catch {
      return false;
    }
  }

  private isCompleteSnapshot(provider: SupportedAtsProvider): boolean {
    return provider === 'greenhouse' || provider === 'lever' || provider === 'ashby';
  }

  /**
   * Filters companies by category or search term
   */
  public getCompaniesByCategory(category?: CompanyCategory, search?: string): TargetCompanyMetadata[] {
    return TARGET_COMPANIES_CATALOG.filter((c) => {
      if (category && c.category !== category) return false;
      if (search && search.trim()) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.sampleRoles.some((r) => r.toLowerCase().includes(q)) ||
          c.dsaFocus.some((d) => d.toLowerCase().includes(q))
        );
      }
      return true;
    }).map((company) => ({
      ...company,
      isRealtimeEnabled: this.isBoardVerified(company.id),
    }));
  }

  /**
   * Live fetches open postings for a single target company
   */
  public async scrapeCompany(companyMeta: TargetCompanyMetadata): Promise<LiveScrapeResult> {
    const startTime = Date.now();
    const attemptedAt = new Date().toISOString();
    const supported = this.hasConfiguredConnector(companyMeta);
    let upstreamJobCount = 0;
    let rejectedJobCount = 0;
    let jobs: NormalizedAtsJob[] = [];
    let status: LiveScrapeStatus = supported ? 'SUCCESS' : 'UNSUPPORTED';
    let error: string | undefined = supported
      ? undefined
      : `No configured live connector is available for ${companyMeta.atsProvider}.`;

    if (supported) {
      try {
        switch (companyMeta.atsProvider) {
          case 'greenhouse':
            jobs = await this.greenhouse.fetchBoard(companyMeta.boardToken, companyMeta.name);
            break;
          case 'lever':
            jobs = await this.lever.fetchBoard(companyMeta.boardToken, companyMeta.name);
            break;
          case 'ashby':
            jobs = await this.ashby.fetchBoard(companyMeta.boardToken, companyMeta.name);
            break;
          case 'workday':
            jobs = await this.workday.fetchBoard(companyMeta.boardToken, companyMeta.name, companyMeta.careersUrl);
            break;
        }
        upstreamJobCount = jobs.length;
        jobs = jobs.filter((job) => Boolean(job.externalId && job.jobTitle.trim() && job.directApplyUrl));
        rejectedJobCount = upstreamJobCount - jobs.length;
        status = rejectedJobCount > 0
          ? (jobs.length > 0 ? 'PARTIAL' : 'FAILED')
          : jobs.length > 0 ? 'SUCCESS' : 'EMPTY';
        if (rejectedJobCount > 0) {
          error = `${rejectedJobCount} upstream job record(s) lacked a title, stable ID, or direct application URL and were excluded.`;
        }
      } catch (scrapeError) {
        status = 'FAILED';
        error = scrapeError instanceof Error ? scrapeError.message : 'Unknown board fetch error.';
        jobs = [];
      }
    }
    const previousHealth = db.getScraperBoardHealth().find((board) => board.companyId === companyMeta.id);
    const didFetchSucceed = status === 'SUCCESS' || status === 'EMPTY' || status === 'PARTIAL';
    const health: ScraperBoardHealth = {
      companyId: companyMeta.id,
      company: companyMeta.name,
      provider: companyMeta.atsProvider,
      connectorStatus: supported ? 'supported' : 'unsupported',
      verificationStatus: status === 'SUCCESS' ? 'healthy' : status === 'EMPTY' ? 'empty' : status === 'PARTIAL' || status === 'FAILED' ? 'failed' : 'unsupported',
      ...(supported ? { lastAttemptAt: attemptedAt } : {}),
      ...(didFetchSucceed
        ? { lastSuccessfulFetchAt: new Date().toISOString(), lastFetchedJobCount: jobs.length }
        : {
            lastSuccessfulFetchAt: previousHealth?.lastSuccessfulFetchAt,
            lastFetchedJobCount: previousHealth?.lastFetchedJobCount,
          }),
      ...(error ? { lastError: error } : { lastError: undefined }),
    };
    db.upsertScraperBoardHealth(health);

    // Run through deterministic deduplication processing
    let newUniqueJobs = 0;
    let duplicateCount = 0;
    const uniqueNormalizedJobs: NormalizedAtsJob[] = [];

    for (const job of jobs) {
      const result = dedupEngine.processJob({
        source: (job.source === 'greenhouse' || job.source === 'lever' ? job.source : 'custom') as any,
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
      });

      if (result.status === 'DUPLICATE_SKIPPED') {
        duplicateCount++;
      } else {
        newUniqueJobs++;
        uniqueNormalizedJobs.push(job);
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      company: companyMeta.name,
      category: companyMeta.category,
      provider: companyMeta.atsProvider,
      totalFetched: upstreamJobCount,
      rejectedJobCount,
      newUniqueJobs,
      duplicateCount,
      jobs: uniqueNormalizedJobs.length > 0 ? uniqueNormalizedJobs : jobs,
      durationMs,
      status,
      ...(error ? { error } : {}),
      completeSnapshot: this.isSupported(companyMeta.atsProvider) &&
        supported &&
        this.isCompleteSnapshot(companyMeta.atsProvider),
    };
  }

  /**
   * Ingests and scores live target jobs against candidate resume
   */
  public async ingestAndScoreTargetCatalog(
    candidateResume: Resume,
    limitCompanies: number = 25
  ): Promise<ProductionJobMatch[]> {
    const selectedCompanies = TARGET_COMPANIES_CATALOG.slice(0, limitCompanies);
    const scoredMatches: ProductionJobMatch[] = [];

    for (const companyMeta of selectedCompanies) {
      const scrapeResult = await this.scrapeCompany(companyMeta);

      for (const job of scrapeResult.jobs) {
        const dbJob: Job = {
          id: `job-${job.company.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${job.externalId}`,
          source: (job.source === 'greenhouse' || job.source === 'lever' ? job.source : 'direct') as any,
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
          firstSeenAt: new Date().toISOString(),
          lastVerifiedActive: new Date().toISOString(),
          dedupHash: generateJobDedupHash(job.company, job.jobTitle, job.location, job.directApplyUrl),
          isActive: true,
          relevanceStatus: 'RELEVANT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 1. Layer 1 RAG (Stated match)
        const layer1Result = layer1RagEngine.evaluateLayer1(candidateResume, dbJob);

        // 2. Layer 2 RAG (Company reality & informal bar)
        const layer2Result = layer2RagEngine.evaluateLayer2(candidateResume, dbJob, layer1Result);

        // 3. Composite Scoring
        const composite = compositeScoringEngine.evaluateCompositeMatch(candidateResume, dbJob);

        const finalScore = parseFloat(composite.finalScore.toFixed(2));

        scoredMatches.push({
          jobId: `match-${job.company.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${job.externalId}`,
          title: job.jobTitle,
          company: job.company,
          companyTier: companyMeta.tier,
          location: job.location,
          locationType: job.isRemote ? 'Remote' : 'Hybrid',
          salaryRange: companyMeta.compensationRange,
          sourceUrl: job.directApplyUrl,
          atsProvider: job.source.toUpperCase(),
          postedAt: job.postedAt,
          daysOpen: Math.max(1, Math.floor((Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24))),
          urgencyLevel: finalScore >= 0.88 ? 'CRITICAL_IMMEDIATE' : 'HIGH_ROLLING',
          estimatedTimeToCloseDays: 14,
          scores: {
            finalScore,
            layer1StatedMatch: parseFloat(layer1Result.layer1Score.toFixed(2)),
            layer2RealityMatch: parseFloat(layer2Result.layer2Score.toFixed(2)),
            compensationScore: 0.95,
            penaltyDeductions: 0.0,
          },
          keyMatchedSkills: (layer1Result.matchedRequiredSkills || []).length > 0
            ? layer1Result.matchedRequiredSkills
            : companyMeta.dsaFocus.slice(0, 3),
          missingCriticalSkills: (layer1Result.missingRequiredSkills || []).slice(0, 2),
          oaDetails: {
            platform: job.informalBar?.oaPattern ? 'Online Assessment' : 'HackerRank / Codesignal',
            dsaDifficulty: companyMeta.typicalHiringBar,
            focusAreas: companyMeta.dsaFocus,
          },
          matchExplanation: `${Math.round(finalScore * 100)}% Match for ${job.company}. Evaluated against ${companyMeta.typicalHiringBar.toLowerCase()} engineering bar and stated skills.`,
          applicationStatus: finalScore >= 0.92 ? 'APPLIED' : 'NEW_MATCH',
          tailoringRecommendation: `Highlight ${companyMeta.dsaFocus[0] || 'core distributed systems'} and algorithmic complexity optimizations.`,
        });
      }
    }

    return scoredMatches.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
  }
}

export const liveScraperEngine = new LiveScraperEngine();
