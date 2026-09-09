/**
 * AI Internship Scout - Normalization Utilities
 * Sanitizes HTML/Markdown JD text, extracts requirements, detects remote status, and structures ATS data.
 */

import { Job } from '../types';

export interface RawGreenhouseJob {
  id: number | string;
  title: string;
  location?: { name?: string };
  content?: string;
  updated_at?: string;
  absolute_url?: string;
  requisition_id?: string | number;
  metadata?: Array<{ name: string; value: any }>;
  departments?: Array<{ id: number; name: string }>;
  offices?: Array<{ id: number; name: string; location?: string }>;
}

export interface RawLeverJob {
  id: string;
  text: string;
  categories?: {
    commitment?: string;
    department?: string;
    level?: string;
    location?: string;
    team?: string;
    allLocations?: string[];
  };
  description?: string;
  descriptionPlain?: string;
  lists?: Array<{ text: string; content: string }>;
  additional?: string;
  additionalPlain?: string;
  createdAt?: number | string;
  hostedUrl?: string;
  applyUrl?: string;
  reqCode?: string;
  workplaceType?: string;
}

export interface NormalizedAtsJob {
  source: 'greenhouse' | 'lever';
  externalId: string;
  reqId: string;
  company: string;
  jobTitle: string;
  location: string;
  isRemote: boolean;
  rawDescription: string;
  cleanDescription: string;
  directApplyUrl: string;
  postedAt: string;
  statedRequirements: {
    requiredSkills: string[];
    preferredSkills: string[];
    education: string;
    experienceYears: number;
  };
  informalBar: {
    dsaDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
    oaPattern: string;
    unstatedPreferences: string[];
    barDescription: string;
  };
}

/**
 * Strips HTML tags, decodes HTML entities, converts list items/paragraphs, and cleans whitespace
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return '';

  let text = html;

  // 1. Replace line break and paragraph tags with newlines
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');

  // 2. Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 3. Decode HTML entities
  const entityMap: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&ndash;': '–',
    '&mdash;': '—',
    '&rsquo;': '’',
    '&lsquo;': '‘',
    '&rdquo;': '”',
    '&ldquo;': '“',
    '&bull;': '•',
    '&middot;': '·',
    '&cent;': '¢',
    '&pound;': '£',
    '&euro;': '€',
    '&copy;': '©',
    '&reg;': '®',
  };

  text = text.replace(
    /&(?:nbsp|amp|lt|gt|quot|#39|apos|ndash|mdash|rsquo|lsquo|rdquo|ldquo|bull|middot|cent|pound|euro|copy|reg);/gi,
    (match) => entityMap[match.toLowerCase()] || match
  );

  // Decode numeric unicode entities like &#8217; or &#x2019;
  text = text.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return '';
    }
  });

  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return '';
    }
  });

  // 4. Normalize whitespace
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s+\n/g, '\n\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Detects if a job posting supports remote work
 */
export function detectRemote(title: string, location: string, description: string): boolean {
  const combined = `${title} ${location} ${description}`.toLowerCase();
  const remotePatterns = [
    /\bremote\b/,
    /\bwork from anywhere\b/,
    /\bvirtual\b/,
    /\bhybrid\s*[-\/]\s*remote\b/,
    /\bus-remote\b/,
    /\bca-remote\b/,
    /\banywhere in the us\b/,
    /\btelecommute\b/,
  ];

  return remotePatterns.some((pattern) => pattern.test(combined));
}

/**
 * Extracts requisition ID from multiple ATS fallback fields
 */
export function extractReqId(rawId: any, directUrl?: string, content?: string): string {
  if (rawId !== undefined && rawId !== null && String(rawId).trim().length > 0) {
    return String(rawId).trim();
  }

  if (directUrl) {
    const urlMatch = directUrl.match(/[\/=]([0-9a-f]{8,36}|[0-9]{5,10})(?:[\/?#]|$)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
  }

  if (content) {
    const textMatch = content.match(/(?:Req(?:uisition)?(?:\s*ID|\s*Code|#)?\s*[:#\-]?\s*)\s*([A-Za-z0-9\-_]+)/i);
    if (textMatch && textMatch[1] && textMatch[1].length >= 3) {
      return textMatch[1];
    }
  }

  return `REQ-${Math.abs(Math.sin(Date.now()) * 1000000).toFixed(0)}`;
}

/**
 * Extract technical skills, requirements, and years of experience
 */
export function extractStatedRequirements(text: string): {
  requiredSkills: string[];
  preferredSkills: string[];
  education: string;
  experienceYears: number;
} {
  const commonTech = [
    'Python',
    'TypeScript',
    'JavaScript',
    'C++',
    'C',
    'Java',
    'Go',
    'Rust',
    'SQL',
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Redis',
    'React',
    'Node.js',
    'Express',
    'Next.js',
    'Django',
    'Flask',
    'FastAPI',
    'Spring Boot',
    'Docker',
    'Kubernetes',
    'AWS',
    'GCP',
    'Azure',
    'PyTorch',
    'TensorFlow',
    'Git',
    'Linux',
    'GraphQL',
    'REST',
    'Kafka',
    'Spark',
    'gRPC',
    'Distributed Systems',
    'Vector Search',
    'CI/CD',
  ];

  const lower = text.toLowerCase();
  const matchedSkills = commonTech.filter((skill) => {
    const pattern = new RegExp(`\\b${escapeRegExp(skill.toLowerCase())}\\b`, 'i');
    return pattern.test(lower);
  });

  const requiredSkills = matchedSkills.slice(0, Math.min(6, matchedSkills.length));
  const preferredSkills = matchedSkills.slice(Math.min(6, matchedSkills.length), 10);

  // Education extraction
  let education = "Bachelor's in Computer Science or related STEM field";
  if (lower.includes('master') || lower.includes('ms in') || lower.includes('m.s.')) {
    education = "Master's or Ph.D. in Computer Science, Data Science, or related field";
  } else if (lower.includes('phd') || lower.includes('ph.d.')) {
    education = 'Ph.D. candidate in Computer Science, AI/ML, or Quantitative Discipline';
  }

  // Years experience
  let experienceYears = 0; // Internships default to 0-1
  const expMatch = text.match(/(\d+)\+?\s*(?:years|yrs)\s*(?:of)?\s*(?:experience|exp)/i);
  if (expMatch && expMatch[1]) {
    experienceYears = parseInt(expMatch[1], 10);
  }

  return {
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : ['Problem Solving', 'Data Structures', 'Algorithms', 'Git'],
    preferredSkills: preferredSkills.length > 0 ? preferredSkills : ['Cloud Infrastructure', 'Open Source Contributions'],
    education,
    experienceYears,
  };
}

/**
 * Extracts informal company hiring bar heuristics based on company pedigree & role patterns
 */
export function extractInformalBarHints(company: string, title: string, text: string): {
  dsaDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  oaPattern: string;
  unstatedPreferences: string[];
  barDescription: string;
} {
  const comp = company.toLowerCase();
  const t = title.toLowerCase();

  // Tier 1: Quant / High-Frequency Trading
  if (comp.includes('citadel') || comp.includes('jane street') || comp.includes('two sigma') || comp.includes('hudson river') || comp.includes('jump')) {
    return {
      dsaDifficulty: 'Extreme',
      oaPattern: 'Hackerrank Advanced Math/DP, C++ Systems optimizations, Codeforces Div1 level',
      unstatedPreferences: ['USACO/ICPC finalist', 'Putnam competition background', '4.0 GPA from top 5 CS program'],
      barDescription: 'Ultra-competitive technical bar focusing on microsecond-level latency, cache locality, and complex DP algorithms.',
    };
  }

  // Tier 2: Top Tier Silicon Valley Unicorn / Tier-1 Tech
  if (comp.includes('stripe') || comp.includes('databricks') || comp.includes('openai') || comp.includes('anthropic') || comp.includes('palantir') || comp.includes('figma')) {
    return {
      dsaDifficulty: 'Hard',
      oaPattern: 'LeetCode Hard/Mediums, End-to-End Bug Squashing, Practical API Debugging',
      unstatedPreferences: ['Substantial open source projects', 'High code cleanliness and test coverage', 'Deep systems understanding'],
      barDescription: 'Rigorous engineering bar testing deep architectural instincts, concurrency, and clean testable code under time limits.',
    };
  }

  // Tier 3: Big Tech & Large Scale
  if (comp.includes('google') || comp.includes('meta') || comp.includes('amazon') || comp.includes('microsoft') || comp.includes('apple') || comp.includes('uber')) {
    return {
      dsaDifficulty: 'Medium',
      oaPattern: 'Standard LeetCode Mediums (Graphs, Trees, DP, Sliding Window)',
      unstatedPreferences: ['Previous internship experience at recognized tech firm', 'Fast clean implementations'],
      barDescription: 'Classic automated OA followed by 2 technical rounds focusing on algorithmic complexity and edge case handling.',
    };
  }

  // Default Standard Tech Internship Bar
  return {
    dsaDifficulty: 'Medium',
    oaPattern: 'CodeSignal General Coding Assessment (750+ score) or LeetCode Mediums',
    unstatedPreferences: ['Demonstrated project building passion', 'Strong foundation in Git and OOP principles'],
    barDescription: 'Standard internship evaluation testing fundamental data structures, communication, and enthusiasm for the product domain.',
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
