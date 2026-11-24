import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { ParsedResumeData } from '../types';
import { generateDeterministicEmbedding } from '../db/database';

/*PDF → pdf-parse
  DOCX → mammoth
  TXT/MD → decode the buffer as UTF-8 text
*/

export const MAX_RESUME_BYTES = 10 * 1024 * 1024;
export const MAX_RESUME_TEXT_LENGTH = 100_000;

export class ResumeProcessingError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 413 = 400
  ) {
    super(message);
    this.name = 'ResumeProcessingError';
  }
}

type ResumeFormat = 'pdf' | 'docx' | 'txt' | 'md';

const supportedFormats: Record<string, ResumeFormat> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.txt': 'txt',
  '.md': 'md',
};

export async function extractResumeText(
  buffer: Buffer,
  fileName: string,
  mimeType = ''
): Promise<string> {
  if (buffer.length === 0) {
    throw new ResumeProcessingError('The uploaded file is empty.');
  }
  if (buffer.length > MAX_RESUME_BYTES) {
    throw new ResumeProcessingError('Resume files must be 10 MB or smaller.', 413);
  }

  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  const format = supportedFormats[extension];
  if (!format) {
    throw new ResumeProcessingError('Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.');
  }

  if (format === 'pdf') {
    if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
      throw new ResumeProcessingError('The uploaded file is not a valid PDF.');
    }
    const parser = new PDFParse({ data: buffer });
    try {
      return validateExtractedText((await parser.getText()).text);
    } catch {
      throw new ResumeProcessingError('The PDF could not be read. Check that it is not damaged or password-protected.');
    } finally {
      await parser.destroy();
    }
  }

  if (format === 'docx') {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new ResumeProcessingError('The uploaded file is not a valid DOCX document.');
    }
    try {
      const result = await mammoth.extractRawText({ buffer });
      return validateExtractedText(result.value);
    } catch {
      throw new ResumeProcessingError('The DOCX document could not be read. Check that it is not damaged.');
    }
  }

  if (mimeType && !['text/plain', 'text/markdown', 'application/octet-stream'].includes(mimeType)) {
    throw new ResumeProcessingError('The file content does not match the selected text document type.');
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new ResumeProcessingError('The text document is not valid UTF-8.');
  }
  if (text.includes('\0')) {
    throw new ResumeProcessingError('The text document contains binary data and cannot be parsed.');
  }
  return validateExtractedText(text);
}

function validateExtractedText(text: string): string {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    throw new ResumeProcessingError('No readable text was found in the uploaded resume.');
  }
  if (normalized.length > MAX_RESUME_TEXT_LENGTH) {
    throw new ResumeProcessingError('Extracted resume text exceeds the 100,000 character limit.', 413);
  }
  return normalized;
}

//converts unstructured resume text into structured fields

type ResumeSection = 'skills' | 'experience' | 'projects' | 'education' | null;

const sectionHeading = /^(technical\s+skills|skills|technologies|work\s+experience|professional\s+experience|experience|employment|projects|personal\s+projects|education|academic\s+background)\s*:?$/i;

function cleanListEntry(value: string): string[] {
  return value
    .split(/[,;|•]/)
    .map((entry) => entry.trim().replace(/^[-*]\s*/, ''))
    .filter((entry) => entry.length > 0 && entry.length <= 100);
}

export function parseResume(rawResumeText: string): ParsedResumeData {
  const text = rawResumeText.trim();
  if (!text) throw new ResumeProcessingError('Resume text is empty.');
  if (text.length > MAX_RESUME_TEXT_LENGTH) {
    throw new ResumeProcessingError('Resume text exceeds the 100,000 character limit.', 413);
  }

  const result: ParsedResumeData = {
    skills: [],
    projects: [],
    experience: [],
    education: [],
    metrics: { impactKeywords: [] },
    inferences: [],
  };
  let section: ResumeSection = null;
  let currentExperience: ParsedResumeData['experience'][number] | undefined;
  let currentProject: ParsedResumeData['projects'][number] | undefined;

  for (const originalLine of text.split('\n')) {
    const line = originalLine.trim();
    if (!line) continue;

    const heading = line.match(/^(technical\s+skills|skills|technologies|work\s+experience|professional\s+experience|experience|employment|projects|personal\s+projects|education|academic\s+background)\s*:\s*(.*)$/i);
    const sectionName = (heading?.[1] ?? line).toLowerCase();
    if (sectionHeading.test(line) || heading) {
      section = /skills|technologies/.test(sectionName)
        ? 'skills'
        : /experience|employment/.test(sectionName)
          ? 'experience'
          : /projects/.test(sectionName)
            ? 'projects'
            : 'education';
      currentExperience = undefined;
      currentProject = undefined;
      if (heading?.[2]) {
        if (section === 'skills') result.skills.push(...cleanListEntry(heading[2]));
        else if (section === 'education') result.education.push(...parseEducationLine(heading[2]));
      }
      continue;
    }

    if (section === 'skills') {
      const content = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line;
      result.skills.push(...cleanListEntry(content));
      continue;
    }

    if (section === 'experience') {
      const entry = line.replace(/^[-*•]\s*/, '');
      const position = entry.match(/^(.+?)\s+(?:@|at)\s+(.+?)(?:\s+\(([^()]*)\))?$/i);
      if (position && !/^(?:https?:\/\/|www\.)/i.test(position[1])) {
        currentExperience = {
          role: position[1].trim(),
          company: position[2].trim(),
          duration: position[3]?.trim() ?? '',
          highlights: [],
          technologies: [],
        };
        result.experience.push(currentExperience);
      } else if (currentExperience && /^[-*•]\s+/.test(line)) {
        currentExperience.highlights.push(entry);
      }
      continue;
    }

    if (section === 'projects') {
      const entry = line.replace(/^[-*•]\s*/, '');
      if (/^[-*•]\s+/.test(line) && currentProject) {
        currentProject.outcomes.push(entry);
      } else {
        const separator = entry.indexOf(':');
        currentProject = {
          title: (separator >= 0 ? entry.slice(0, separator) : entry).trim(),
          description: separator >= 0 ? entry.slice(separator + 1).trim() : '',
          technologies: [],
          outcomes: [],
        };
        result.projects.push(currentProject);
      }
      continue;
    }

    if (section === 'education') {
      result.education.push(...parseEducationLine(line));
    }
  }

  result.skills = [...new Set(result.skills)];
  result.education = deduplicateEducation(result.education);
  const latency = text.match(/(?:latency reduction|latency improvement)\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const scale = text.match(/(?:system scale|requests per second|records processed)\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const experienceYears = text.match(/(?:total years of experience|years of experience)\s*:\s*(\d+(?:\.\d+)?)/i)?.[1];
  if (latency) result.metrics.latencyReduction = latency;
  if (scale) result.metrics.systemScale = scale;
  if (experienceYears) result.metrics.totalYearsExperience = Number(experienceYears);
  const explicitGpa = result.education.find((item) => item.gpa)?.gpa;
  if (explicitGpa) result.metrics.gpa = explicitGpa;
  return result;
}

function parseEducationLine(line: string): ParsedResumeData['education'] {
  const degreeMatch = line.match(/\b(?:B\.?\s?S\.?|M\.?\s?S\.?|Ph\.?\s?D\.?|B\.?\s?A\.?|M\.?\s?A\.?|Bachelor(?:'s)?|Master(?:'s)?|Doctorate|Associate(?:'s)?)\b[^,;]*/i);
  const gpaMatch = line.match(/\bGPA\s*:?\s*(\d(?:\.\d{1,4})?)(?:\s*\/\s*([0-9.]+))?/i);
  const yearMatch = line.match(/\b(?:class of|graduat(?:ed|ion)|expected(?: graduation)?)\s*:?\s*(20\d{2})\b/i);
  if (!degreeMatch && !gpaMatch && !yearMatch) return [];

  const degree = degreeMatch?.[0].trim() ?? '';
  const institution = degreeMatch
    ? line.slice(degreeMatch.index! + degreeMatch[0].length).replace(/^[\s,–—-]+/, '').split(/[,(]/)[0].trim()
    : '';
  const gpa = gpaMatch ? `${gpaMatch[1]}${gpaMatch[2] ? `/${gpaMatch[2]}` : ''}` : undefined;
  const graduationYear = yearMatch?.[1] ?? '';
  return [{ institution, degree, graduationYear, ...(gpa ? { gpa } : {}) }];
}

function deduplicateEducation(items: ParsedResumeData['education']): ParsedResumeData['education'] {
  return items.filter((item, index) =>
    items.findIndex((candidate) =>
      candidate.degree === item.degree &&
      candidate.institution === item.institution &&
      candidate.graduationYear === item.graduationYear &&
      candidate.gpa === item.gpa
    ) === index
  );
}

//Generate deterministic embeddings
export function generateResumeVectors(
  rawText: string,
  parsed: ParsedResumeData
): {
  fullTextVector: number[];
  skillsVector: number[];
  experienceVector: number[];
} {
  const skillsText = parsed.skills.join(', ');
  const experienceText = parsed.experience
    .map((experience) => `${experience.role} ${experience.company} ${experience.duration} ${experience.highlights.join(' ')}`)
    .join('\n');

  return {
    fullTextVector: generateDeterministicEmbedding(rawText),
    skillsVector: generateDeterministicEmbedding(skillsText),
    experienceVector: generateDeterministicEmbedding(experienceText),
  };
}
