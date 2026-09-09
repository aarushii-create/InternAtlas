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

export class WorkdayScraper {
  /**
   * Fetches and normalizes jobs from Workday public CXS endpoints
   */
  public async fetchBoard(boardToken: string, companyDisplayName?: string): Promise<NormalizedAtsJob[]> {
    const company = companyDisplayName || boardToken.charAt(0).toUpperCase() + boardToken.slice(1);
    const host = boardToken.includes('.') ? boardToken : `${boardToken}.wd5.myworkdayjobs.com`;
    const url = `https://${host}/wday/cxs/${boardToken}/External/jobs`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'AI-Internship-Scout/1.0',
        },
        body: JSON.stringify({
          appliedFacets: {},
          limit: 20,
          offset: 0,
          searchText: 'internship',
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data: any = await response.json();
      const rawJobs: RawWorkdayJob[] = data.jobPostings || [];

      if (!Array.isArray(rawJobs) || rawJobs.length === 0) {
        return [];
      }

      return rawJobs.map((job) => this.normalizeJob(job, company));
    } catch (err: any) {
      // Graceful error isolation on network/timeout failure
      return [];
    }
  }

  /**
   * Normalizes a raw Workday job object into a standard structured ATS job
   */
  public normalizeJob(raw: RawWorkdayJob, companyName: string): NormalizedAtsJob {
    const info = raw.jobPostingInfo || {};
    const rawDescription = info.jobDescription || '';
    const cleanDescription = sanitizeHtml(rawDescription);
    const location = info.location || raw.locationsText || 'Bangalore, Hyderabad';
    const jobTitle = info.title || raw.title || 'Software Engineering Intern 2027';
    const isRemote = detectRemote(jobTitle, location, cleanDescription);
    const externalId = String(info.id || raw.id || raw.externalPath || Math.random().toString(36).substring(7));
    const directApplyUrl = info.externalUrl || `https://${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.wd5.myworkdayjobs.com/External/${externalId}`;
    const reqId = extractReqId(info.jobReqId || externalId, directApplyUrl, rawDescription);
    const postedAt = info.postedOn || raw.postedOn || new Date().toISOString();

    const statedRequirements = extractStatedRequirements(cleanDescription || jobTitle);
    const informalBar = extractInformalBarHints(companyName, jobTitle, cleanDescription);

    return {
      source: 'workday' as any,
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
