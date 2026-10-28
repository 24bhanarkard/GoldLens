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

  maxConvergenceGrams: number; // MFE in ₹/g
  maxAdverseMovementGrams: number; // MAE in ₹/g
  outcome5dGrams: number;
  outcome10dGrams: number;
  outcome15dGrams: number;
  didConvergeWithin10d: boolean;
  convergenceDay: number | null;

  trajectory: {
    relativeDay: number;
    date: string;
    spreadAbs: number;
    spreadChangeFromT0: number;
    zScore: number | null;
  }[];
}

export interface SpreadDNAReport {
  targetEventDate: string;
  strictPriorOnly: boolean;
  priorEligibleUniverseCount: number;
  matchesCount: number;
  isSufficientHistoricalEvidence: boolean;
  evidenceNote: string;
  matches: HistoricalPatternMatch[];
  medianTrajectory: {
    relativeDay: number;
    medianSpreadDelta: number;
    upperPercentile75: number;
    lowerPercentile25: number;
  }[];
  summaryStats: {
    averageSimilarity: number;
    historicalConvergenceRatePct: number;
    averageMFE_INR_per_g: number;
    averageMAE_INR_per_g: number;
    averageDaysToConvergence: number;
  };
}

/**
 * Finds historical spread analogues strictly prior to targetEventDate (zero future leakage).
 * Candidate event at index i is eligible ONLY if i + 10 < targetIdx so its 10-day outcome
 * was already observable at decision date T.
 */
export function findSpreadDNAPatterns(
  targetPoint: AlignedSpreadPoint,
  allSpreads: AlignedSpreadPoint[],
  maxMatches = 5,
  strictPriorOnly = true
): SpreadDNAReport {
  const targetIdx = allSpreads.findIndex((p) => p.date === targetPoint.date);
  if (targetIdx < 0 || allSpreads.length < 15) {
    return {
      targetEventDate: targetPoint.date,
      strictPriorOnly,
      priorEligibleUniverseCount: 0,
      matchesCount: 0,
      isSufficientHistoricalEvidence: false,
      evidenceNote: "Insufficient aligned trading history to search for prior analogues.",
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

  const targetZ = targetPoint.zScore || 0;
  const targetPct = targetPoint.spreadPercentage || 0;
  const targetStd = targetPoint.rollingStd || 1.0;
  const targetDTE = Math.min(targetPoint.dteA || 30, targetPoint.dteB || 30);

  let targetMom5d = 0;
  if (targetIdx >= 5) {
    targetMom5d = targetPoint.spreadAbsolute - allSpreads[targetIdx - 5].spreadAbsolute;
  }

  // Strictly enforce i <= maxSearchIdx so future post-target events NEVER leak into analogues
  const maxSearchIdx = strictPriorOnly ? targetIdx - 10 : allSpreads.length - 1;
  let priorEligibleUniverseCount = 0;
  const candidateMatches: { idx: number; score: number }[] = [];

  for (let i = 15; i <= maxSearchIdx; i++) {
    if (Math.abs(i - targetIdx) < 8) continue;

    const cand = allSpreads[i];
    if (cand.qualityStatus === "corrupted") continue;
    priorEligibleUniverseCount++;

    if (cand.zScore === null || Math.abs(cand.zScore) < 1.3) continue;
    if (Math.sign(cand.zScore) !== Math.sign(targetZ) && targetZ !== 0) continue;

    const candZ = cand.zScore;
    const candPct = cand.spreadPercentage;
    const candStd = cand.rollingStd || 1.0;
    const candDTE = Math.min(cand.dteA || 30, cand.dteB || 30);
    const candMom5d = i >= 5 ? cand.spreadAbsolute - allSpreads[i - 5].spreadAbsolute : 0;

    const dz = Math.abs(candZ - targetZ) / 1.5;
    const dpct = Math.abs(candPct - targetPct) / (Math.abs(targetPct) || 0.25);
    const dvol = Math.abs(candStd - targetStd) / (targetStd || 1.0);
    const ddte = Math.abs(candDTE - targetDTE) / 30;
    const dmom = Math.abs(candMom5d - targetMom5d) / (Math.abs(targetMom5d) || 5.0);

    const weightedDist = Math.sqrt(
      0.35 * Math.pow(dz, 2) +
        0.25 * Math.pow(dpct, 2) +
        0.15 * Math.pow(dvol, 2) +
        0.15 * Math.pow(ddte, 2) +
        0.1 * Math.pow(dmom, 2)
    );

    const similarity = Math.max(0, Math.min(100, Math.round((1 / (1 + weightedDist)) * 100)));

    if (similarity >= 45) {
      candidateMatches.push({ idx: i, score: similarity });
    }

    // Space apart overlapping cluster days from the same single multi-day episode
    if (candidateMatches.length > 0 && candidateMatches[candidateMatches.length - 1].idx === i) {
      i += 4;
    }
  }

  candidateMatches.sort((a, b) => b.score - a.score);
  const topMatches = candidateMatches.slice(0, maxMatches);

  const patternMatches: HistoricalPatternMatch[] = [];

  // Prevent forward outcomes from peeking past targetIdx if strictPriorOnly is true
  const maxOutcomeBound = strictPriorOnly ? targetIdx - 1 : allSpreads.length - 1;

  topMatches.forEach(({ idx, score }) => {
    const ev = allSpreads[idx];
    const initialSpread = ev.spreadAbsolute;
    const isOverpricedA = (ev.zScore || 0) > 0;

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
      if (curIdx >= 0 && curIdx <= maxOutcomeBound && curIdx < allSpreads.length) {
        const pt = allSpreads[curIdx];
        const delta = pt.spreadAbsolute - initialSpread;
        const favorableDelta = isOverpricedA ? -delta : delta;

        if (rel > 0) {
          if (favorableDelta > maxFavorable) maxFavorable = favorableDelta;
          if (-favorableDelta > maxAdverse) maxAdverse = -favorableDelta;
          if (rel === 5) outcome5d = favorableDelta;
          if (rel === 10) outcome10d = favorableDelta;
          if (rel === 15) outcome15d = favorableDelta;

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

  const medianTrajectory: SpreadDNAReport["medianTrajectory"] = [];
  for (let rel = -3; rel <= 15; rel++) {
    const deltas: number[] = [];
    patternMatches.forEach((m) => {
      const pt = m.trajectory.find((t) => t.relativeDay === rel);
      if (pt !== undefined) {
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

  const count = patternMatches.length;
  const isSufficient = count >= 3;
  const avgSim = count > 0 ? patternMatches.reduce((s, m) => s + m.similarityScore, 0) / count : 0;
  const convCount = patternMatches.filter((m) => m.didConvergeWithin10d).length;
  const convRate = count > 0 ? (convCount / count) * 100 : 0;
  const avgMFE = count > 0 ? patternMatches.reduce((s, m) => s + m.maxConvergenceGrams, 0) / count : 0;
  const avgMAE =
    count > 0 ? patternMatches.reduce((s, m) => s + m.maxAdverseMovementGrams, 0) / count : 0;
  const convDays = patternMatches.filter((m) => m.convergenceDay !== null);
  const avgDays =
    convDays.length > 0
      ? convDays.reduce((s, m) => s + (m.convergenceDay || 0), 0) / convDays.length
      : 0;

  const evidenceNote =
    count === 0
      ? `No prior historical analogues found before ${targetPoint.date} (searched ${priorEligibleUniverseCount} clean past sessions).`
      : !isSufficient
      ? `Limited sample: only ${count} non-overlapping prior analogue(s) occurred before ${targetPoint.date}. Treat historical convergence rate (${convRate.toFixed(0)}%) as descriptive rather than statistically conclusive.`
      : `${count} independent prior analogues occurred strictly before ${targetPoint.date} (${convCount}/${count} converged within 10 sessions).`;

  return {
    targetEventDate: targetPoint.date,
    strictPriorOnly,
    priorEligibleUniverseCount,
    matchesCount: count,
    isSufficientHistoricalEvidence: isSufficient,
    evidenceNote,
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
