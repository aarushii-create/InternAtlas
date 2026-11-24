/**
 * InternAtlas - Workday & Enterprise ATS Scraper Adapter
 * Ingests and normalizes live postings from Workday REST / CXS API endpoints.
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

export interface RawWorkdayJob {
  bulletFields?: string[];
  externalPath?: string;
  id?: string;
  jobPostingInfo?: {
    id?: string;
    title?: string;
    jobDescription?: string;
    location?: string;
    startDate?: string;
    postedOn?: string;
    timeType?: string;
    jobReqId?: string;
    externalUrl?: string;
  };
  title?: string;
  locationsText?: string;
  postedOn?: string;
}

interface WorkdayBoardResponse {
  jobPostings?: RawWorkdayJob[];
  total?: number;
}

export class WorkdayScraper {
  /**
   * Fetches and normalizes jobs from Workday public CXS endpoints
   */
  public async fetchBoard(
    boardToken: string,
    companyDisplayName?: string,
    careersUrl?: string
  ): Promise<NormalizedAtsJob[]> {
    const company = companyDisplayName || boardToken.charAt(0).toUpperCase() + boardToken.slice(1);
    if (!careersUrl) throw new Error(`No verified Workday careers URL is configured for ${company}.`);
    const careers = new URL(careersUrl);
    if (!careers.hostname.endsWith('.myworkdayjobs.com')) {
      throw new Error(`The configured careers URL for ${company} is not a Workday-hosted board.`);
    }
    const site = careers.pathname.split('/').filter(Boolean)[0];
    if (!site) throw new Error(`The Workday site name is missing from ${company}'s careers URL.`);
    const tenant = careers.hostname.split('.')[0];
    const apiUrl = `https://${careers.hostname}/wday/cxs/${encodeURIComponent(tenant)}/${encodeURIComponent(site)}/jobs`;
    const pageSize = 20;
    const maxJobs = 500;
    const jobs: RawWorkdayJob[] = [];

    for (let offset = 0; offset <= maxJobs; offset += pageSize) {
      const limit = Math.min(pageSize, maxJobs + 1 - offset);
      const response = await fetchAtsResponse('workday', apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'InternAtlas/1.0 (job-board integration)',
        },
        body: JSON.stringify({
          appliedFacets: {},
          limit,
          offset,
          searchText: 'internship',
        }),
      });
      const page = await parseAtsJson<WorkdayBoardResponse>(response, 'workday');
      if (!Array.isArray(page.jobPostings)) throw new Error('Workday returned an invalid job-board payload.');
      jobs.push(...page.jobPostings);
      if (jobs.length > maxJobs) {
        throw new Error(`Workday board exceeded the ${maxJobs}-job ingestion safety limit.`);
      }
      if (
        page.jobPostings.length < limit ||
        (typeof page.total === 'number' && offset + page.jobPostings.length >= page.total)
      ) {
        break;
      }
    }
    return jobs.map((job) => this.normalizeJob(job, company, careers));
  }

  /**
   * Normalizes a raw Workday job object into a standard structured ATS job
   */
  public normalizeJob(raw: RawWorkdayJob, companyName: string, careersUrl?: URL): NormalizedAtsJob {
    const info = raw.jobPostingInfo || {};
    const rawDescription = info.jobDescription || '';
    const cleanDescription = sanitizeHtml(rawDescription);
    const location = info.location || raw.locationsText || 'Location not specified';
    const jobTitle = info.title || raw.title || '';
    const isRemote = detectRemote(jobTitle, location, cleanDescription);
    const externalId = String(info.id || raw.id || '');
    const directApplyUrl = info.externalUrl || (
      careersUrl && raw.externalPath
        ? new URL(raw.externalPath.replace(/^\/+/, ''), `${careersUrl.origin}/${careersUrl.pathname.split('/').filter(Boolean)[0]}/`).toString()
        : ''
    );
    const reqId = extractReqId(info.jobReqId || externalId, directApplyUrl, rawDescription);
    const postedAt = parsePostedAt(info.postedOn || raw.postedOn || info.startDate);

    const statedRequirements = extractStatedRequirements(cleanDescription || jobTitle);
    const informalBar = extractInformalBarHints(companyName, jobTitle, cleanDescription);

    return {
      source: 'workday',
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
    const rawJobs: RawWorkdayJob[] = Array.isArray(payload)
      ? payload
      : payload?.jobPostings && Array.isArray(payload.jobPostings)
      ? payload.jobPostings
      : payload?.id
      ? [payload]
      : [];

    return rawJobs.map((j) => this.normalizeJob(j, company));
  }
}
