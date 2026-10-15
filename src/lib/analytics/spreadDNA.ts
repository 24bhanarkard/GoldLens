import { AlignedSpreadPoint } from "./spreads";

export interface HistoricalPatternMatch {
  eventDate: string;
  contractA: string;
  contractB: string;
  similarityScore: number; // 0 to 100%
  initialZScore: number;
  initialSpreadAbs: number;
  initialPercentile: number;
  daysToExpiry: number;
  
  // Forward outcomes (T+1 to T+15)
  maxConvergenceGrams: number; // Max favorable movement (MFE in ₹/g)
  maxAdverseMovementGrams: number; // Max adverse excursion (MAE in ₹/g)
  outcome5dGrams: number; // Spread delta at T+5
  outcome10dGrams: number; // Spread delta at T+10
  outcome15dGrams: number; // Spread delta at T+15
  didConvergeWithin10d: boolean; // Reverted within ±0.5σ
  convergenceDay: number | null; // Day T+k where it first touched mean ±0.5σ
  
  // Forward trajectory series for plotting: relative offset (-3d to +15d)
  trajectory: {
    relativeDay: number; // -3, -2, -1, 0, 1, 2, ...
    date: string;
    spreadAbs: number;
    spreadChangeFromT0: number; // spread(T+k) - spread(T0)
    zScore: number | null;
  }[];
}

export interface SpreadDNAReport {
  targetEventDate: string;
  matchesCount: number;
  isSufficientHistoricalEvidence: boolean;
  matches: HistoricalPatternMatch[];
  medianTrajectory: {
    relativeDay: number;
    medianSpreadDelta: number;
    upperPercentile75: number;
    lowerPercentile25: number;
  }[];
  summaryStats: {
    averageSimilarity: number;
    historicalConvergenceRatePct: number; // % that converged within 10 days
    averageMFE_INR_per_g: number;
    averageMAE_INR_per_g: number;
    averageDaysToConvergence: number;
  };
}

/**
 * Searches historical dataset for similar spread setups using normalized feature vectors.
 * Strictly separates historical setup features from subsequent outcomes.
 */
export function findSpreadDNAPatterns(
  targetPoint: AlignedSpreadPoint,
  allSpreads: AlignedSpreadPoint[],
  maxMatches = 5
): SpreadDNAReport {
  const targetIdx = allSpreads.findIndex((p) => p.date === targetPoint.date);
  if (targetIdx < 0 || allSpreads.length < 15) {
    return {
      targetEventDate: targetPoint.date,
      matchesCount: 0,
      isSufficientHistoricalEvidence: false,
      matches: [],
      medianTrajectory: [],
      summaryStats: {
        averageSimilarity: 0,
        historicalConvergenceRatePct: 0,
        averageMFE_INR_per_g: 0,
        averageMAE_INR_per_g: 0,
        averageDaysToConvergence: 0,
      },
    };
  }

  // Feature vector for target setup at Decision Time T
  const targetZ = targetPoint.zScore || 0;
  const targetPct = targetPoint.spreadPercentage || 0;
  const targetStd = targetPoint.rollingStd || 1.0;
  const targetDTE = Math.min(targetPoint.dteA || 30, targetPoint.dteB || 30);
  
  // 5-day momentum
  let targetMom5d = 0;
  if (targetIdx >= 5) {
    targetMom5d = targetPoint.spreadAbsolute - allSpreads[targetIdx - 5].spreadAbsolute;
  }

  // Search candidate historical events (excluding immediate ±7 days around target to avoid self-match)
  const candidateMatches: { idx: number; score: number }[] = [];

  for (let i = 15; i < allSpreads.length; i++) {
    if (Math.abs(i - targetIdx) < 8) continue; // skip vicinity

    const cand = allSpreads[i];
    if (cand.zScore === null || Math.abs(cand.zScore) < 1.3) continue; // must be a meaningful statistical deviation

    // Must be in same deviation direction
    if (Math.sign(cand.zScore) !== Math.sign(targetZ) && targetZ !== 0) continue;

    const candZ = cand.zScore;
    const candPct = cand.spreadPercentage;
    const candStd = cand.rollingStd || 1.0;
    const candDTE = Math.min(cand.dteA || 30, cand.dteB || 30);
    let candMom5d = 0;
    if (i >= 5) {
      candMom5d = cand.spreadAbsolute - allSpreads[i - 5].spreadAbsolute;
    }

    // Normalized Feature Distance
    const dz = Math.abs(candZ - targetZ) / 1.5;
    const dpct = Math.abs(candPct - targetPct) / (Math.abs(targetPct) || 1.0);
    const dvol = Math.abs(candStd - targetStd) / (targetStd || 1.0);
    const ddte = Math.abs(candDTE - targetDTE) / 30;
    const dmom = Math.abs(candMom5d - targetMom5d) / (Math.abs(targetMom5d) || 5.0);

    const weightedDist = Math.sqrt(
      0.35 * Math.pow(dz, 2) +
      0.25 * Math.pow(dpct, 2) +
      0.15 * Math.pow(dvol, 2) +
      0.15 * Math.pow(ddte, 2) +
      0.10 * Math.pow(dmom, 2)
    );

    const similarity = Math.max(0, Math.min(100, Math.round((1 / (1 + weightedDist)) * 100)));

    if (similarity >= 55) {
      candidateMatches.push({ idx: i, score: similarity });
    }
  }

  // Sort by similarity descending
  candidateMatches.sort((a, b) => b.score - a.score);
  const topMatches = candidateMatches.slice(0, maxMatches);

  const patternMatches: HistoricalPatternMatch[] = [];

  topMatches.forEach(({ idx, score }) => {
    const ev = allSpreads[idx];
    const initialSpread = ev.spreadAbsolute;
    const isOverpricedA = (ev.zScore || 0) > 0;

    // Build trajectory from T-3 to T+15
    const traj: HistoricalPatternMatch["trajectory"] = [];
    let maxFavorable = 0;
    let maxAdverse = 0;
    let outcome5d = 0;
    let outcome10d = 0;
    let outcome15d = 0;
    let didConverge = false;
    let convergenceDay: number | null = null;

    for (let rel = -3; rel <= 15; rel++) {
      const curIdx = idx + rel;
      if (curIdx >= 0 && curIdx < allSpreads.length) {
        const pt = allSpreads[curIdx];
        const delta = pt.spreadAbsolute - initialSpread;

        // Favorable movement is spread moving towards 0 (or lower if A overpriced)
        const favorableDelta = isOverpricedA ? -delta : delta;
        if (rel > 0) {
          if (favorableDelta > maxFavorable) maxFavorable = favorableDelta;
          if (-favorableDelta > maxAdverse) maxAdverse = -favorableDelta;

          if (rel === 5) outcome5d = favorableDelta;
          if (rel === 10) outcome10d = favorableDelta;
          if (rel === 15) outcome15d = favorableDelta;

          // Check if converged to mean within ±0.5σ
          if (!didConverge && pt.zScore !== null && Math.abs(pt.zScore) <= 0.5) {
            didConverge = true;
            convergenceDay = rel;
          }
        }

        traj.push({
          relativeDay: rel,
          date: pt.date,
          spreadAbs: pt.spreadAbsolute,
          spreadChangeFromT0: Number(delta.toFixed(2)),
          zScore: pt.zScore,
        });
      }
    }

    patternMatches.push({
      eventDate: ev.date,
      contractA: ev.contractA,
      contractB: ev.contractB,
      similarityScore: score,
      initialZScore: ev.zScore || 0,
      initialSpreadAbs: ev.spreadAbsolute,
      initialPercentile: ev.historicalPercentile || 50,
      daysToExpiry: Math.min(ev.dteA || 0, ev.dteB || 0),
      maxConvergenceGrams: Number(maxFavorable.toFixed(2)),
      maxAdverseMovementGrams: Number(maxAdverse.toFixed(2)),
      outcome5dGrams: Number(outcome5d.toFixed(2)),
      outcome10dGrams: Number(outcome10d.toFixed(2)),
      outcome15dGrams: Number(outcome15d.toFixed(2)),
      didConvergeWithin10d: didConverge && (convergenceDay || 99) <= 10,
      convergenceDay,
      trajectory: traj,
    });
  });

  // Calculate Median Trajectory across matches
  const medianTrajectory: SpreadDNAReport["medianTrajectory"] = [];
  for (let rel = -3; rel <= 15; rel++) {
    const deltas: number[] = [];
    patternMatches.forEach((m) => {
      const pt = m.trajectory.find((t) => t.relativeDay === rel);
      if (pt !== undefined) {
        // Express as favorable convergence delta
        const isPos = m.initialZScore > 0;
        const favorable = isPos ? -pt.spreadChangeFromT0 : pt.spreadChangeFromT0;
        deltas.push(favorable);
      }
    });

    if (deltas.length > 0) {
      deltas.sort((a, b) => a - b);
      const median = deltas[Math.floor(deltas.length / 2)];
      const p25 = deltas[Math.floor(deltas.length * 0.25)];
      const p75 = deltas[Math.floor(deltas.length * 0.75)];

      medianTrajectory.push({
        relativeDay: rel,
        medianSpreadDelta: Number(median.toFixed(2)),
        upperPercentile75: Number(p75.toFixed(2)),
        lowerPercentile25: Number(p25.toFixed(2)),
      });
    }
  }

  // Summary statistics
  const count = patternMatches.length;
  const isSufficient = count >= 2;
  const avgSim = count > 0 ? patternMatches.reduce((s, m) => s + m.similarityScore, 0) / count : 0;
  const convCount = patternMatches.filter((m) => m.didConvergeWithin10d).length;
  const convRate = count > 0 ? (convCount / count) * 100 : 0;
  const avgMFE = count > 0 ? patternMatches.reduce((s, m) => s + m.maxConvergenceGrams, 0) / count : 0;
  const avgMAE = count > 0 ? patternMatches.reduce((s, m) => s + m.maxAdverseMovementGrams, 0) / count : 0;
  const convDays = patternMatches.filter((m) => m.convergenceDay !== null);
  const avgDays = convDays.length > 0 ? convDays.reduce((s, m) => s + (m.convergenceDay || 0), 0) / convDays.length : 0;

  return {
    targetEventDate: targetPoint.date,
    matchesCount: count,
    isSufficientHistoricalEvidence: isSufficient,
    matches: patternMatches,
    medianTrajectory,
    summaryStats: {
      averageSimilarity: Number(avgSim.toFixed(1)),
      historicalConvergenceRatePct: Number(convRate.toFixed(1)),
      averageMFE_INR_per_g: Number(avgMFE.toFixed(2)),
      averageMAE_INR_per_g: Number(avgMAE.toFixed(2)),
      averageDaysToConvergence: Number(avgDays.toFixed(1)),
    },
  };
}
