import { CompanyInsight, CompanyKnowledgeChunk } from '../types';
import { MASTER_COMPANY_INSIGHTS } from './companyInsightsMaster';

function toChunk(
  insight: CompanyInsight,
  category: CompanyKnowledgeChunk['category'],
  title: string,
  content: string,
  tags: string[],
  metadata: CompanyKnowledgeChunk['metadata'] = {}
): CompanyKnowledgeChunk {
  return {
    id: `${insight.id}-${category}`,
    company: insight.companyName,
    companyAliases: insight.aliases,
    category,
    source: 'candidate_report',
    role: 'software_engineering',
    date: 'seeded',
    confidence: 'medium',
    title,
    content,
    tags: [...new Set([insight.companyName, insight.tier, ...tags])],
    metadata,
    createdAt: insight.createdAt,
  };
}

export const SEED_COMPANY_KNOWLEDGE_CHUNKS: CompanyKnowledgeChunk[] = [];

export function chunkCompanyInsight(insight: CompanyInsight): CompanyKnowledgeChunk[] {
  return [
    toChunk(
      insight,
      'dsa',
      `${insight.companyName} technical interview topics`,
      `${insight.dsaBar.difficulty} difficulty. Topics: ${insight.dsaBar.primaryTopics.join(', ')}. ${insight.dsaBar.focusAreas}`,
      insight.dsaBar.primaryTopics,
      { dsaDifficulty: insight.dsaBar.difficulty }
    ),
    toChunk(
      insight,
      'oa',
      `${insight.companyName} online assessment`,
      `${insight.oaType.platform}, typically ${insight.oaType.typicalDurationMinutes} minutes. ${insight.oaType.cutoffScoreDescription}`,
      [insight.oaType.platform],
      { oaPlatform: insight.oaType.platform, durationMinutes: insight.oaType.typicalDurationMinutes }
    ),
    toChunk(
      insight,
      'hiring_filter',
      `${insight.companyName} hiring preferences`,
      `${insight.unspokenFilters.priorExperiencePreference} ${insight.unspokenFilters.undergradClassStanding}`,
      [insight.unspokenFilters.priorExperiencePreference]
    ),
    toChunk(
      insight,
      'gpa_university',
      `${insight.companyName} education preferences`,
      `School preference: ${insight.unspokenFilters.targetSchoolTier} GPA guidance: ${insight.unspokenFilters.minimumGpa}`,
      [insight.unspokenFilters.targetSchoolTier],
      {
        minGpa: insight.unspokenFilters.minimumGpa,
        targetSchools: [insight.unspokenFilters.targetSchoolTier],
      }
    ),
    toChunk(
      insight,
      'visa',
      `${insight.companyName} visa information`,
      insight.unspokenFilters.internationalVisaOpenness,
      [insight.unspokenFilters.internationalVisaOpenness],
      { visaPolicy: insight.unspokenFilters.internationalVisaOpenness }
    ),
    toChunk(
      insight,
      'compensation',
      `${insight.companyName} compensation information`,
      `${insight.compensationRange.hourlyRateUsd}. ${insight.compensationRange.perks.join(', ')}`,
      insight.compensationRange.perks,
      { compensation: insight.compensationRange.hourlyRateUsd }
    ),
    toChunk(
      insight,
      'culture',
      `${insight.companyName} culture`,
      insight.cultureTraits.map((trait) => `${trait.trait}: ${trait.description}`).join(' '),
      insight.cultureTraits.map((trait) => trait.trait)
    ),
    toChunk(
      insight,
      'interview',
      `${insight.companyName} interview stages`,
      insight.interviewStages
        .map((stage) => `${stage.roundNumber}. ${stage.name} (${stage.durationMinutes} minutes): ${stage.description}`)
        .join(' '),
      insight.interviewStages.map((stage) => stage.name)
    ),
  ];
}

export function buildAllCompanyKnowledgeChunks(): CompanyKnowledgeChunk[] {
  return MASTER_COMPANY_INSIGHTS.flatMap(chunkCompanyInsight);
}
