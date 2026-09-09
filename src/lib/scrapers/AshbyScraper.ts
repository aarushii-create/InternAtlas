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

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AI-Internship-Scout/1.0',
        },
      });

      if (!response.ok) {
        return[];
      }

      const data: AshbyBoardResponse = await response.json();
      if (!data.jobs || !Array.isArray(data.jobs)) {
        return [];
      }

      return data.jobs.map((job) => this.normalizeJob(job, company));
    } catch (err: any) {
      console.warn(`Unable to refresh live job postings right now. Showing saved offline results.`);
      return [];
    }
  }

  /**
   * Normalizes a raw Ashby job object into a standard structured ATS job
   */
  public normalizeJob(raw: RawAshbyJob, companyName: string): NormalizedAtsJob {
    const rawDescription = raw.descriptionHtml || raw.descriptionPlain || '';
    const cleanDescription = sanitizeHtml(rawDescription);
    const location = raw.location || 'Bangalore / Hyderabad IND';
    const jobTitle = raw.title || 'Software Engineering Intern 2027';
    const isRemote = raw.isRemote ?? detectRemote(jobTitle, location, cleanDescription);
    const externalId = String(raw.id);
    const directApplyUrl = raw.jobUrl || `https://jobs.ashbyhq.com/${companyName.toLowerCase().replace(/\s+/g, '')}/${externalId}`;
    const reqId = extractReqId(raw.id, directApplyUrl, rawDescription);
    const postedAt = raw.publishedAt || new Date().toISOString();

    const statedRequirements = extractStatedRequirements(cleanDescription || jobTitle);
    const informalBar = extractInformalBarHints(companyName, jobTitle, cleanDescription);

    return {
      source: 'ashby' as any,
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
