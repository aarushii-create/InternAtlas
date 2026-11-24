/**
 * InternAtlas - Ashby ATS Scraper Adapter
 * Ingests and normalizes live postings from Ashby API endpoints.
 */

import {
  NormalizedAtsJob,
  sanitizeHtml,
  detectRemote,
  extractReqId,
  extractStatedRequirements,
  extractInformalBarHints,
} from '../normalizer';
import { fetchAtsResponse, parseAtsJson, parsePostedAt } from './atsHttp';

export interface RawAshbyJob {
  id: string;
  title: string;
  department?: string;
  team?: string;
  location?: string;
  isRemote?: boolean;
  employmentType?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  publishedAt?: string;
  jobUrl?: string;
  secondaryLocations?: string[];
}

export interface AshbyBoardResponse {
  apiVersion: string;
  jobs: RawAshbyJob[];
}

export class AshbyScraper {
  private readonly baseUrl: string = 'https://api.ashbyhq.com/posting-api/job-board';

  /**
   * Fetches and normalizes all open jobs from an Ashby board
   */
  public async fetchBoard(boardToken: string, companyDisplayName?: string): Promise<NormalizedAtsJob[]> {
    const company = companyDisplayName || boardToken.charAt(0).toUpperCase() + boardToken.slice(1);
    const url = `${this.baseUrl}/${encodeURIComponent(boardToken)}?includeCompensation=true`;

    const response = await fetchAtsResponse('ashby', url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'InternAtlas/1.0 (job-board integration)',
      },
    });
    const data = await parseAtsJson<AshbyBoardResponse>(response, 'ashby');
    if (!Array.isArray(data.jobs)) throw new Error('Ashby returned an invalid job-board payload.');
    return data.jobs.map((job) => this.normalizeJob(job, company));
  }

  /**
   * Normalizes a raw Ashby job object into a standard structured ATS job
   */
  public normalizeJob(raw: RawAshbyJob, companyName: string): NormalizedAtsJob {
    const rawDescription = raw.descriptionHtml || raw.descriptionPlain || '';
    const cleanDescription = sanitizeHtml(rawDescription);
    const location = raw.location || 'Location not specified';
    const jobTitle = raw.title || '';
    const isRemote = raw.isRemote ?? detectRemote(jobTitle, location, cleanDescription);
    const externalId = String(raw.id);
    const directApplyUrl = raw.jobUrl || '';
    const reqId = extractReqId(raw.id, directApplyUrl, rawDescription);
    const postedAt = parsePostedAt(raw.publishedAt);

    const statedRequirements = extractStatedRequirements(cleanDescription || jobTitle);
    const informalBar = extractInformalBarHints(companyName, jobTitle, cleanDescription);

    return {
      source: 'ashby',
      externalId,
      reqId,
      company: companyName,
      jobTitle,
      location,
      isRemote,
      rawDescription,
      cleanDescription,
      directApplyUrl,
      postedAt,
      statedRequirements,
      informalBar,
    };
  }

  /**
   * Parses raw payload JSON provided by user or unit tests
   */
  public parseRawPayload(company: string, payload: any): NormalizedAtsJob[] {
    const rawJobs: RawAshbyJob[] = Array.isArray(payload)
      ? payload
      : payload?.jobs && Array.isArray(payload.jobs)
      ? payload.jobs
      : payload?.id
      ? [payload]
      : [];

    return rawJobs.map((j) => this.normalizeJob(j, company));
  }
}
