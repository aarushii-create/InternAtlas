/**
 * AI Internship Scout - Phase 14: Historical Hiring Pattern Analytics Test Suite
 * Validates aggregation accuracy, lifespan percentiles, velocity distributions, and dynamic filtering.
 */

import { hiringInsightsEngine } from './hiringInsightsEngine';

export interface HiringAnalyticsTestResult {
  id: string;
  name: string;
  category: 'Velocity' | 'Skills' | 'Lifespan' | 'Company' | 'Filtering' | 'Heatmap';
  passed: boolean;
  durationMs: number;
  details: string;
  metrics?: Record<string, any>;
}

export interface HiringAnalyticsSuiteSummary {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  allPassed: boolean;
  results: HiringAnalyticsTestResult[];
}

export async function runHiringAnalyticsTestSuite(): Promise<HiringAnalyticsSuiteSummary> {
  const results: HiringAnalyticsTestResult[] = [];
  const startOverall = performance.now();

  // -------------------------------------------------------------
  // Test 1: Posting Velocity Hour & Day Distribution
  // -------------------------------------------------------------
  const t1Start = performance.now();
  try {
    const report = hiringInsightsEngine.generateInsightsReport();
    const velocity = report.postingVelocity;

    const hourSum = velocity.hourlyDistribution.reduce((acc, h) => acc + h.count, 0);
    const daySum = velocity.dayOfWeekDistribution.reduce((acc, d) => acc + d.count, 0);

    const has24Hours = velocity.hourlyDistribution.length === 24;
    const has7Days = velocity.dayOfWeekDistribution.length === 7;
    const sumsMatch = hourSum === report.totalJobsAnalyzed && daySum === report.totalJobsAnalyzed;
    const hasPeakSummary = !!velocity.peakDropDay && !!velocity.peakDropHour;

    const passed = has24Hours && has7Days && sumsMatch && hasPeakSummary;
    results.push({
      id: 'test-1-velocity-distribution',
      name: 'Posting Velocity Hour & Day Distribution Aggregation',
      category: 'Velocity',
      passed,
      durationMs: parseFloat((performance.now() - t1Start).toFixed(2)),
      details: passed
        ? `Successfully verified 24 hourly buckets and 7 weekday buckets. Total jobs analyzed: ${report.totalJobsAnalyzed}. Peak drop: ${velocity.peakDropDay} at ${velocity.peakDropHour}.`
        : `Hour or day bucket sum mismatch: hourSum=${hourSum}, daySum=${daySum}, expected=${report.totalJobsAnalyzed}.`,
      metrics: {
        totalJobs: report.totalJobsAnalyzed,
        peakDropDay: velocity.peakDropDay,
        peakDropHour: velocity.peakDropHour,
        weekdayVsWeekend: velocity.weekdayVsWeekendRatio,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'test-1-velocity-distribution',
      name: 'Posting Velocity Hour & Day Distribution Aggregation',
      category: 'Velocity',
      passed: false,
      durationMs: parseFloat((performance.now() - t1Start).toFixed(2)),
      details: `Execution error: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 2: Skills Demand Ranking & Mandatory Rate
  // -------------------------------------------------------------
  const t2Start = performance.now();
  try {
    const report = hiringInsightsEngine.generateInsightsReport();
    const topSkills = report.skillsDemand.topOverallSkills;

    const hasTopSkills = topSkills.length >= 10;
    const pythonSkill = topSkills.find((s) => s.skill.toLowerCase() === 'python');
    const cppSkill = topSkills.find((s) => s.skill.toLowerCase() === 'c++');

    const ratesValid = topSkills.every(
      (s) => s.mandatoryRatePercentage >= 0 && s.mandatoryRatePercentage <= 100 && s.frequencyPercentage > 0
    );
    const hasCategories = Object.keys(report.skillsDemand.skillsByCategory).length >= 4;

    const passed = hasTopSkills && !!pythonSkill && !!cppSkill && ratesValid && hasCategories;
    results.push({
      id: 'test-2-skills-demand',
      name: 'Skills Demand Ranking & Mandatory vs Preferred Classification',
      category: 'Skills',
      passed,
      durationMs: parseFloat((performance.now() - t2Start).toFixed(2)),
      details: passed
        ? `Top skills verified: Python (${pythonSkill?.frequencyPercentage}%), C++ (${cppSkill?.frequencyPercentage}%). Categorized into ${Object.keys(report.skillsDemand.skillsByCategory).length} domains.`
        : `Skills demand failed validation. Top count: ${topSkills.length}, Python found: ${!!pythonSkill}`,
      metrics: {
        top5Skills: topSkills.slice(0, 5).map((s) => `${s.skill} (${s.frequencyPercentage}%)`),
        totalSkillsAnalyzed: topSkills.length,
        categoriesCount: Object.keys(report.skillsDemand.skillsByCategory).length,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'test-2-skills-demand',
      name: 'Skills Demand Ranking & Mandatory vs Preferred Classification',
      category: 'Skills',
      passed: false,
      durationMs: parseFloat((performance.now() - t2Start).toFixed(2)),
      details: `Execution error: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 3: Application Lifespan & Percentile Monotonicity
  // -------------------------------------------------------------
  const t3Start = performance.now();
  try {
    const report = hiringInsightsEngine.generateInsightsReport();
    const lifespans = report.applicationLifespans.tierLifespans;

    const quantTier = lifespans.find((t) => t.tier === 'Tier 1 Quant/HFT');
    const bigTechTier = lifespans.find((t) => t.tier === 'FAANG / Big Tech');

    // Invariant 1: Quant/HFT closes significantly faster than Big Tech
    const quantClosesFaster = (quantTier?.averageDaysOpen || 0) < (bigTechTier?.averageDaysOpen || 100);

    // Invariant 2: Percentiles monotonic: P25 <= Median(P50) <= P75 <= P90
    const percentilesMonotonic = lifespans.every(
      (t) => t.p25DaysOpen <= t.medianDaysOpen && t.medianDaysOpen <= t.p75DaysOpen && t.p75DaysOpen <= t.p90DaysOpen
    );

    const passed = !!quantTier && !!bigTechTier && quantClosesFaster && percentilesMonotonic;
    results.push({
      id: 'test-3-lifespan-percentiles',
      name: 'Application Window Lifespan & Percentile Monotonicity',
      category: 'Lifespan',
      passed,
      durationMs: parseFloat((performance.now() - t3Start).toFixed(2)),
      details: passed
        ? `Tier lifespans verified: Quant/HFT avg=${quantTier?.averageDaysOpen}d (P50=${quantTier?.medianDaysOpen}d, P90=${quantTier?.p90DaysOpen}d) vs Big Tech avg=${bigTechTier?.averageDaysOpen}d. All percentiles monotonic.`
        : `Lifespan validation failed. Quant faster: ${quantClosesFaster}, Monotonic: ${percentilesMonotonic}`,
      metrics: {
        quantAvgDays: quantTier?.averageDaysOpen,
        bigTechAvgDays: bigTechTier?.averageDaysOpen,
        overallAvgDays: report.applicationLifespans.overallAverageDays,
        fastestClosingCompany: report.applicationLifespans.fastestClosingCompanies[0]?.company,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'test-3-lifespan-percentiles',
      name: 'Application Window Lifespan & Percentile Monotonicity',
      category: 'Lifespan',
      passed: false,
      durationMs: parseFloat((performance.now() - t3Start).toFixed(2)),
      details: `Execution error: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 4: Company Deep-Dive Analytics & Profiles
  // -------------------------------------------------------------
  const t4Start = performance.now();
  try {
    const citadelProfile = hiringInsightsEngine.getCompanyDetail('Citadel Securities');
    const openAiProfile = hiringInsightsEngine.getCompanyDetail('OpenAI');
    const stripeProfile = hiringInsightsEngine.getCompanyDetail('Stripe');

    const validCitadel = !!citadelProfile && citadelProfile.averagePostingLifespanDays < 20 && citadelProfile.urgencyRating.includes('ROLLING');
    const validOpenAi = !!openAiProfile && openAiProfile.topSkills.length > 0;
    const validStripe = !!stripeProfile && stripeProfile.tier === 'High-Growth Unicorn';

    const passed = validCitadel && validOpenAi && validStripe;
    results.push({
      id: 'test-4-company-profiles',
      name: 'Company Deep-Dive Analytics Profile Ingestion',
      category: 'Company',
      passed,
      durationMs: parseFloat((performance.now() - t4Start).toFixed(2)),
      details: passed
        ? `Verified company analytical profiles for Citadel Securities (avg lifespan ${citadelProfile?.averagePostingLifespanDays}d), OpenAI (OA: ${openAiProfile?.oaPlatform}), and Stripe.`
        : `Company profiles missing or corrupted. Citadel: ${!!citadelProfile}, OpenAI: ${!!openAiProfile}, Stripe: ${!!stripeProfile}`,
      metrics: {
        citadelAvgDays: citadelProfile?.averagePostingLifespanDays,
        openAiTopSkills: openAiProfile?.topSkills.map((s) => s.skill),
        stripeOaPlatform: stripeProfile?.oaPlatform,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'test-4-company-profiles',
      name: 'Company Deep-Dive Analytics Profile Ingestion',
      category: 'Company',
      passed: false,
      durationMs: parseFloat((performance.now() - t4Start).toFixed(2)),
      details: `Execution error: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 5: Parametric Dynamic Filtering Accuracy
  // -------------------------------------------------------------
  const t5Start = performance.now();
  try {
    const fullReport = hiringInsightsEngine.generateInsightsReport();
    const quantReport = hiringInsightsEngine.generateInsightsReport({ tier: 'Tier 1 Quant/HFT' });
    const aiReport = hiringInsightsEngine.generateInsightsReport({ roleCategory: 'AI / Machine Learning' });
    const openaiReport = hiringInsightsEngine.generateInsightsReport({ company: 'OpenAI' });

    const quantFilteredCorrectly = quantReport.totalJobsAnalyzed < fullReport.totalJobsAnalyzed && quantReport.totalJobsAnalyzed > 0;
    const aiFilteredCorrectly = aiReport.totalJobsAnalyzed < fullReport.totalJobsAnalyzed && aiReport.totalJobsAnalyzed > 0;
    const openaiFilteredCorrectly = openaiReport.companyHiringMetrics.every((c) => c.companyName.toLowerCase() === 'openai');

    const passed = quantFilteredCorrectly && aiFilteredCorrectly && openaiFilteredCorrectly;
    results.push({
      id: 'test-5-parametric-filtering',
      name: 'Parametric Dynamic Filtering Query Pipeline',
      category: 'Filtering',
      passed,
      durationMs: parseFloat((performance.now() - t5Start).toFixed(2)),
      details: passed
        ? `Successfully executed parametric filters across tier (Quant: ${quantReport.totalJobsAnalyzed} jobs), roleCategory (AI/ML: ${aiReport.totalJobsAnalyzed} jobs), and company (OpenAI: ${openaiReport.totalJobsAnalyzed} jobs).`
        : `Filtering mismatch. Full=${fullReport.totalJobsAnalyzed}, Quant=${quantReport.totalJobsAnalyzed}, AI=${aiReport.totalJobsAnalyzed}`,
      metrics: {
        totalJobs: fullReport.totalJobsAnalyzed,
        quantFilteredJobs: quantReport.totalJobsAnalyzed,
        aiFilteredJobs: aiReport.totalJobsAnalyzed,
        openaiFilteredJobs: openaiReport.totalJobsAnalyzed,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'test-5-parametric-filtering',
      name: 'Parametric Dynamic Filtering Query Pipeline',
      category: 'Filtering',
      passed: false,
      durationMs: parseFloat((performance.now() - t5Start).toFixed(2)),
      details: `Execution error: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 6: Velocity Heatmap 7x24 Matrix Completeness
  // -------------------------------------------------------------
  const t6Start = performance.now();
  try {
    const report = hiringInsightsEngine.generateInsightsReport();
    const heatmap = report.postingVelocity.heatmapMatrix;

    const cellCountCorrect = heatmap.length === 7 * 24; // 168 cells
    const cellSum = heatmap.reduce((acc, c) => acc + c.count, 0);
    const sumMatches = cellSum === report.totalJobsAnalyzed;
    const intensitiesBounded = heatmap.every((c) => c.intensity >= 0 && c.intensity <= 1);

    const passed = cellCountCorrect && sumMatches && intensitiesBounded;
    results.push({
      id: 'test-6-heatmap-completeness',
      name: 'Velocity Heatmap 7x24 Matrix Completeness & Invariant',
      category: 'Heatmap',
      passed,
      durationMs: parseFloat((performance.now() - t6Start).toFixed(2)),
      details: passed
        ? `Heatmap matrix verified: exactly 168 cells (7 days x 24 hours), total matrix count=${cellSum}, intensities bounded in [0.0, 1.0].`
        : `Heatmap failed. Cell count: ${heatmap.length}, Sum: ${cellSum}, Expected: ${report.totalJobsAnalyzed}`,
      metrics: {
        matrixCellsCount: heatmap.length,
        matrixSum: cellSum,
        expectedSum: report.totalJobsAnalyzed,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'test-6-heatmap-completeness',
      name: 'Velocity Heatmap 7x24 Matrix Completeness & Invariant',
      category: 'Heatmap',
      passed: false,
      durationMs: parseFloat((performance.now() - t6Start).toFixed(2)),
      details: `Execution error: ${err.message}`,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalDurationMs = parseFloat((performance.now() - startOverall).toFixed(2));

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount: results.length - passedCount,
    totalDurationMs,
    allPassed: passedCount === results.length,
    results,
  };
}
