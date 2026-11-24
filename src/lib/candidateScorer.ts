import { ProductionJobMatch } from '../types';
import { CandidateProfile } from './candidatePresets';

type MatchWithRequirements = ProductionJobMatch & {
  statedRequirements?: {
    requiredSkills?: string[];
  };
};

export function computeCandidateMatches(
  candidate: CandidateProfile,
  matches: ProductionJobMatch[]
): ProductionJobMatch[] {
  const candidateSkills = candidate.skills.map((skill) => skill.toLowerCase().trim());
  const track = candidate.primaryTrack.toLowerCase();

  return matches.map((baseJob) => {
    const job = baseJob as MatchWithRequirements;
    const requiredSkills = job.statedRequirements?.requiredSkills ?? [
      ...job.keyMatchedSkills,
      ...job.missingCriticalSkills,
    ];
    const matchedSkills = requiredSkills.filter((required) => {
      const normalized = required.toLowerCase().trim();
      return candidateSkills.some(
        (skill) => skill === normalized || skill.includes(normalized) || normalized.includes(skill)
      );
    });
    const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));

    const skillRatio =
      requiredSkills.length > 0 ? matchedSkills.length / requiredSkills.length : 0.75;
    const layer1Score = Math.min(0.96, Math.max(0.6, skillRatio * 0.45 + 0.45));
    const company = baseJob.company.toLowerCase();
    const tier = baseJob.companyTier.toLowerCase();
    const trackBonus =
      (track.includes('quant') && (company.includes('citadel') || company.includes('jane street'))) ||
      (track.includes('ai') && (tier.includes('ai') || company.includes('openai')))
        ? 0.08
        : 0;
    const layer2Score = Math.min(
      0.98,
      Math.max(0.55, 0.78 + trackBonus + (matchedSkills.length > 3 ? 0.06 : 0.01))
    );
    const finalScore = Number(
      Math.min(0.97, Math.max(0.68, layer1Score * 0.45 + layer2Score * 0.45 + 0.07)).toFixed(2)
    );

    return {
      ...baseJob,
      scores: {
        ...baseJob.scores,
        finalScore,
        layer1StatedMatch: Number(layer1Score.toFixed(2)),
        layer2RealityMatch: Number(layer2Score.toFixed(2)),
      },
      keyMatchedSkills: matchedSkills.length > 0 ? matchedSkills : baseJob.keyMatchedSkills,
      missingCriticalSkills: missingSkills,
      matchExplanation: `${Math.round(finalScore * 100)}% fit for ${candidate.name}. ${matchedSkills.length} of ${requiredSkills.length} listed skills match this profile.`,
    };
  });
}
