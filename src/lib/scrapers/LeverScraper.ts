/**
 * AI Internship Scout - Lever ATS Scraper Adapter
 * Ingests and normalizes job postings from Lever API endpoints and JSON payloads.
 */

import {
  RawLeverJob,
  NormalizedAtsJob,
  sanitizeHtml,
  detectRemote,
  extractReqId,
  extractStatedRequirements,
  extractInformalBarHints,
} from '../normalizer';

export class LeverScraper {
  private readonly baseUrl: string = 'https://api.lever.co/v0/postings';

  /**
   * Fetches and normalizes all open jobs from a Lever company postings endpoint
   */
  public async fetchBoard(companySite: string, companyDisplayName?: string): Promise<NormalizedAtsJob[]> {
    const company = companyDisplayName || formatCompanyName(companySite);
    const url = `${this.baseUrl}/${encodeURIComponent(companySite)}?mode=json`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AI-Internship-Scout/1.0',
        },
      });

      if (!response.ok) {
        console.warn(`Lever API request returned.`);
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((job: RawLeverJob) => this.normalizeJob(job, company));
    } catch (err: any) {
      console.warn(`Network error fetching Lever board.`);
      return [];
    }
  }

  /**
   * Normalizes a raw Lever job object into a standard structured ATS job
   */
  public normalizeJob(raw: RawLeverJob, companyName: string): NormalizedAtsJob {
    // Lever splits job descriptions across description, lists (e.g. "What you'll do", "Requirements"), and additional text
    let rawDescription = raw.description || raw.descriptionPlain || '';

    if (raw.lists && Array.isArray(raw.lists)) {
      const listsText = raw.lists
        .map((list) => `\n<h3>${list.text}</h3>\n${list.content}`)
        .join('\n');
      rawDescription += listsText;
    }

    if (raw.additional || raw.additionalPlain) {
      rawDescription += `\n<p>${raw.additional || raw.additionalPlain}</p>`;
    }

    const cleanDescription = sanitizeHtml(rawDescription);
    const location = raw.categories?.location || raw.categories?.allLocations?.join(', ') || 'New York, NY';
    const jobTitle = raw.text || 'Engineering Intern';
    const isRemote =
      raw.workplaceType === 'remote' ||
      raw.categories?.commitment?.toLowerCase().includes('remote') ||
      detectRemote(jobTitle, location, cleanDescription);

    const externalId = String(raw.id);
    const directApplyUrl = raw.applyUrl || raw.hostedUrl || `https://jobs.lever.co/${companyName.toLowerCase().replace(/\s+/g, '')}/${externalId}`;
    const reqId = extractReqId(raw.reqCode || raw.id, directApplyUrl, rawDescription);
    const postedAt = raw.createdAt
      ? typeof raw.createdAt === 'number'
        ? new Date(raw.createdAt).toISOString()
        : new Date(raw.createdAt).toISOString()
      : new Date().toISOString();

    const statedRequirements = extractStatedRequirements(cleanDescription || jobTitle);
    const informalBar = extractInformalBarHints(companyName, jobTitle, cleanDescription);

    return {
      source: 'lever',
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
    const rawJobs: RawLeverJob[] = Array.isArray(payload)
      ? payload
      : payload?.id
      ? [payload]
      : payload?.postings && Array.isArray(payload.postings)
      ? payload.postings
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
