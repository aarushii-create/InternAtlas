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
import { fetchAtsResponse, parseAtsJson, parsePostedAt } from './atsHttp';

export class LeverScraper {
  private readonly baseUrl: string = 'https://api.lever.co/v0/postings';

  /**
   * Fetches and normalizes all open jobs from a Lever company postings endpoint
   */
  public async fetchBoard(companySite: string, companyDisplayName?: string): Promise<NormalizedAtsJob[]> {
    const company = companyDisplayName || formatCompanyName(companySite);
    const url = `${this.baseUrl}/${encodeURIComponent(companySite)}?mode=json`;

    const response = await fetchAtsResponse('lever', url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'InternAtlas/1.0 (job-board integration)',
      },
    });
    const data = await parseAtsJson<RawLeverJob[]>(response, 'lever');
    if (!Array.isArray(data)) throw new Error('Lever returned an invalid job-board payload.');
    return data.map((job) => this.normalizeJob(job, company));
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
    const location = raw.categories?.location || raw.categories?.allLocations?.join(', ') || 'Location not specified';
    const jobTitle = raw.text || '';
    const isRemote =
      raw.workplaceType === 'remote' ||
      raw.categories?.commitment?.toLowerCase().includes('remote') ||
      detectRemote(jobTitle, location, cleanDescription);

    const externalId = String(raw.id);
    const directApplyUrl = raw.applyUrl || raw.hostedUrl || '';
    const reqId = extractReqId(raw.reqCode || raw.id, directApplyUrl, rawDescription);
    const postedAt = parsePostedAt(raw.createdAt);

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
