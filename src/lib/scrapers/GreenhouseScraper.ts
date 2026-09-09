/**
 * AI Internship Scout - Greenhouse ATS Scraper Adapter
 * Ingests and normalizes job postings from Greenhouse API endpoints and JSON payloads.
 */

import {
  RawGreenhouseJob,
  NormalizedAtsJob,
  sanitizeHtml,
  detectRemote,
  extractReqId,
  extractStatedRequirements,
  extractInformalBarHints,
} from '../normalizer';

export interface GreenhouseBoardResponse {
  jobs: RawGreenhouseJob[];
  meta?: { total: number };
}

export class GreenhouseScraper {
  private readonly baseUrl: string = 'https://boards-api.greenhouse.io/v1/boards';

  /**
   * Fetches and normalizes all open jobs from a Greenhouse board
   */
  public async fetchBoard(boardToken: string, companyDisplayName?: string): Promise<NormalizedAtsJob[]> {
    const company = companyDisplayName || formatCompanyName(boardToken);
    const url = `${this.baseUrl}/${encodeURIComponent(boardToken)}/jobs?content=true`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AI-Internship-Scout/1.0',
        },
      });

      if (!response.ok) {
        console.warn(`Greenhouse API request returned.`);
        return [];
      }

      const data: GreenhouseBoardResponse = await response.json();
      if (!data.jobs || !Array.isArray(data.jobs)) {
        return [];
      }

      return data.jobs.map((job) => this.normalizeJob(job, company));
    } catch (err: any) {
      console.warn(`Network error fetching Greenhouse board.`);
      return [];
    }
  }

  /**
   * Normalizes a raw Greenhouse job object into a standard structured ATS job
   */
  public normalizeJob(raw: RawGreenhouseJob, companyName: string): NormalizedAtsJob {
    const rawDescription = raw.content || '';
    const cleanDescription = sanitizeHtml(rawDescription);
    const location = raw.location?.name || 'San Francisco, CA';
    const jobTitle = raw.title || 'Software Engineering Intern';
    const isRemote = detectRemote(jobTitle, location, cleanDescription);
    const externalId = String(raw.id);
    const directApplyUrl = raw.absolute_url || `https://boards.greenhouse.io/${companyName.toLowerCase().replace(/\s+/g, '')}/jobs/${externalId}`;
    const reqId = extractReqId(raw.requisition_id || raw.id, directApplyUrl, rawDescription);
    const postedAt = raw.updated_at || new Date().toISOString();

    const statedRequirements = extractStatedRequirements(cleanDescription || jobTitle);
    const informalBar = extractInformalBarHints(companyName, jobTitle, cleanDescription);

    return {
      source: 'greenhouse',
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
    const rawJobs: RawGreenhouseJob[] = Array.isArray(payload)
      ? payload
      : payload?.jobs && Array.isArray(payload.jobs)
      ? payload.jobs
      : payload?.id
      ? [payload]
      : [];

    return rawJobs.map((j) => this.normalizeJob(j, company));
  }

}

function formatCompanyName(token: string): string {
  return token
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
