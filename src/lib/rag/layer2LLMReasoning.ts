/**
 * AI Internship Scout - Layer 2 LLM Reasoning & Reality Synthesizer
 * Synthesizes candidate qualifications, Layer 1 results, and retrieved empirical evidence
 * using a deterministic, auditable reasoning engine.
 */

import {
  Resume,
  Job,
  Layer1EvaluationResult,
  Layer2RetrievedEvidence,
  Layer2LLMReasoningSummary,
} from '../../types';

export class Layer2LLMReasoningEngine {
  /**
   * Synthesizes Company Reality Evaluation grounded in retrieved knowledge chunks
   */
  public async synthesizeReality(
    resume: Resume,
    job: Job,
    retrievedEvidence: Layer2RetrievedEvidence[],
    layer1Result?: Layer1EvaluationResult
  ): Promise<Layer2LLMReasoningSummary> {
    return this.deterministicReasoningFallback(resume, job, retrievedEvidence, layer1Result);
  }

  /**
   * Deterministic, auditable reasoning synthesizer that evaluates facts from retrieved evidence
   */
  public deterministicReasoningFallback(
    resume: Resume,
    job: Job,
    retrievedEvidence: Layer2RetrievedEvidence[],
    layer1Result?: Layer1EvaluationResult
  ): Layer2LLMReasoningSummary {
    const resumeText = `${resume.content || ''} ${(resume.extractedSkills || []).join(' ')} ${(resume.parsedData?.skills || []).join(' ')}`.toLowerCase();
    const candidateGpaStr = resume.parsedData?.education?.[0]?.gpa;
    const candidateGpa = candidateGpaStr ? parseFloat(candidateGpaStr) : undefined;
    const candidateSchool = (resume.parsedData?.education?.[0]?.institution || '').toLowerCase();

    // 1. Analyze DSA alignment against evidence
    const dsaChunks = retrievedEvidence.filter((e) => e.category === 'dsa' || e.category === 'oa' || e.category === 'interview');
    const dsaCorpus = dsaChunks.map((c) => c.snippet).join(' ').toLowerCase();

    const topicsToCheck = ['dynamic programming', 'graph', 'tree', 'concurrency', 'c++', 'distributed', 'matrix', 'trie', 'heaps'];
    let topicsNeeded = 0;
    let topicsMatched = 0;

    for (const topic of topicsToCheck) {
      if (dsaCorpus.includes(topic)) {
        topicsNeeded++;
        if (resumeText.includes(topic)) {
          topicsMatched++;
        }
      }
    }

    const dsaRatio = topicsNeeded > 0 ? topicsMatched / topicsNeeded : 0.8;
    const hasCompetitiveProgramming = resumeText.includes('icpc') || resumeText.includes('codeforces') || resumeText.includes('putnam') || resumeText.includes('leetcode');
    const dsaScore = Math.min(98, Math.max(35, Math.round(dsaRatio * 75 + (hasCompetitiveProgramming ? 20 : 5))));

    // 2. Analyze OA Risk
    const oaChunks = retrievedEvidence.filter((e) => e.category === 'oa');
    const oaCorpus = oaChunks.map((c) => c.snippet).join(' ').toLowerCase();
    let oaRisk: Layer2LLMReasoningSummary['oa_risk'] = 'medium';

    if (oaCorpus.includes('codesignal') || oaCorpus.includes('840+') || oaCorpus.includes('strict proctoring')) {
      oaRisk = dsaScore >= 80 ? 'low' : dsaScore >= 60 ? 'medium' : dsaScore < 45 ? 'critical' : 'high';
    } else if (oaCorpus.includes('no initial oa')) {
      oaRisk = 'low';
    } else if (oaCorpus.includes('hackerrank') && (dsaCorpus.includes('hard') || dsaCorpus.includes('extreme'))) {
      oaRisk = dsaScore >= 85 ? 'low' : 'high';
    }

    // 3. Analyze GPA Risk
    const filterChunks = retrievedEvidence.filter((e) => e.category === 'hiring_filter' || e.category === 'gpa_university');
    const filterCorpus = filterChunks.map((c) => c.snippet).join(' ').toLowerCase();

    let gpaRisk: Layer2LLMReasoningSummary['gpa_risk'] = 'low';
    if (filterCorpus.includes('3.8') || filterCorpus.includes('3.6') || filterCorpus.includes('3.5')) {
      if (!candidateGpa) {
        gpaRisk = 'medium';
      } else if (candidateGpa < 3.5) {
        gpaRisk = 'high';
      } else {
        gpaRisk = 'low';
      }
    } else if (filterCorpus.includes('3.3')) {
      if (candidateGpa && candidateGpa < 3.3) {
        gpaRisk = 'high';
      }
    }

    // 4. University / Target School Risk
    let universityRisk: Layer2LLMReasoningSummary['university_risk'] = 'low';
    const topSchools = ['stanford', 'mit', 'cmu', 'berkeley', 'harvard', 'cornell', 'uiuc', 'princeton', 'caltech', 'waterloo'];
    const isTopSchool = topSchools.some((s) => candidateSchool.includes(s));

    if (filterCorpus.includes('target school') || filterCorpus.includes('ivy') || filterCorpus.includes('top 15')) {
      universityRisk = isTopSchool ? 'low' : hasCompetitiveProgramming ? 'low' : 'medium';
    }

    // 5. Visa Feasibility
    const visaChunks = retrievedEvidence.filter((e) => e.category === 'visa');
    const visaCorpus = visaChunks.map((c) => c.snippet).join(' ').toLowerCase();
    let visaFeasibility: Layer2LLMReasoningSummary['visa_feasibility'] = 'high';
    if (visaCorpus.includes('limited') || visaCorpus.includes('no sponsorship')) {
      visaFeasibility = 'low';
    } else if (visaCorpus.includes('moderate')) {
      visaFeasibility = 'moderate';
    }

    // 6. Calculate Company Reality Score (0-100)
    let realityScore = Math.round(
      dsaScore * 0.45 +
      (oaRisk === 'low' ? 90 : oaRisk === 'medium' ? 70 : 40) * 0.20 +
      (gpaRisk === 'low' ? 95 : gpaRisk === 'medium' ? 75 : 45) * 0.15 +
      (universityRisk === 'low' ? 95 : universityRisk === 'medium' ? 70 : 45) * 0.15 +
      (visaFeasibility === 'high' ? 5 : 0)
    );

    if (layer1Result) {
      // Blend with Layer 1 stated score (35% Layer 1 + 65% Reality)
      realityScore = Math.round(layer1Result.layer1Score * 100 * 0.35 + realityScore * 0.65);
    }

    realityScore = Math.min(99, Math.max(20, realityScore));

    // 7. Evidence Citations
    const evidenceCitations = retrievedEvidence.slice(0, 3).map((e) => `[${e.company} / ${e.category.toUpperCase()}] ${e.snippet.slice(0, 140)}...`);

    // 8. Warnings & Recommendations
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (dsaScore < 75) {
      warnings.push(`Candidate shows limited demonstrated experience with high-frequency ${job.company} topics in retrieved debriefs.`);
      recommendations.push(`Grind high-frequency ${job.company} LeetCode problems (Focus: Graphs, DP, and System Concurrency).`);
    }

    if (oaRisk === 'high' || oaRisk === 'critical') {
      warnings.push(`High assessment friction: ${job.company} enforces strict proctoring and high cutoff score on coding OA.`);
      recommendations.push(`Complete timed practice simulations under strict constraints before starting official assessment.`);
    }

    if (gpaRisk === 'high') {
      warnings.push(`Candidate GPA (${candidateGpa || 'unlisted'}) falls below informal screening benchmarks mentioned in candidate reports.`);
      recommendations.push(`Offset transcript review by prominent GitHub open-source contributions or contest rankings.`);
    }

    if (warnings.length === 0) {
      warnings.push(`Strong overall alignment with ${job.company}'s informal hiring bar.`);
      recommendations.push(`Prepare behavioral responses highlighting technical leadership and clear problem decomposition.`);
    }

    const reasoningSynthesis = `Candidate achieves a ${realityScore}% reality fit score for ${job.company}. Grounded in ${retrievedEvidence.length} retrieved empirical debriefs, technical alignment is estimated at ${dsaScore}% with ${oaRisk.toUpperCase()} OA risk and ${gpaRisk.toUpperCase()} GPA risk.`;

    return {
      company_reality_score: realityScore,
      dsa_alignment: dsaScore,
      oa_risk: oaRisk,
      gpa_risk: gpaRisk,
      university_risk: universityRisk,
      visa_feasibility: visaFeasibility,
      evidence_citations: evidenceCitations,
      warnings,
      recommendations,
      reasoning_synthesis: reasoningSynthesis,
    };
  }
}

export const layer2LLMReasoningEngine = new Layer2LLMReasoningEngine();
