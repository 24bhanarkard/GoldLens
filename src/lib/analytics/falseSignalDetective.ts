import { AlignedSpreadPoint } from "./spreads";
import { ProfitRealityCheckResult } from "./profitRealityCheck";

export type DiagnosticStatus = "pass" | "warning" | "fail" | "unavailable";

export interface DiagnosticCheckItem {
  id: string;
  name: string;
  category: "expiry" | "liquidity" | "data_integrity" | "statistical_stability" | "cost_viability";
  status: DiagnosticStatus;
  observedEvidence: string;
  thresholdUsed: string;
  explanation: string;
  impactOnEligibility: "APPROVED" | "CAUTION" | "DISQUALIFIED";
}

export interface FalseSignalReport {
  overallStatus: "APPROVED" | "WARNING_QUALIFIED" | "DISQUALIFIED";
  finalClassification:
    | "WORTH_INVESTIGATING"
    | "EXPIRY_SENSITIVE"
    | "REJECTED_AFTER_COSTS"
    | "DATA_UNRELIABLE"
    | "ILLIQUID_MIRAGE"
    | "INSUFFICIENT_EVIDENCE"
    | "NO_PERSISTENT_EDGE";
  passedChecksCount: number;
  warningChecksCount: number;
  failedChecksCount: number;
  checks: DiagnosticCheckItem[];
  executiveSummary: string;
  primaryRejectionReason?: string;
  tradingEvidenceScore: number; // 0 to 100
  anomalyStrengthScore: number; // 0 to 100
}

/**
 * Runs 10 comprehensive diagnostic checks to determine if an observed anomaly is a genuine,
 * historically backed opportunity or a false signal caused by friction, expiry distortion, or bad data.
 */
export function runFalseSignalDetective(
  point: AlignedSpreadPoint,
  allSpreads: AlignedSpreadPoint[],
  profitCheck: ProfitRealityCheckResult,
  dataTrustScore = 100
): FalseSignalReport {
  const checks: DiagnosticCheckItem[] = [];

  // Check 1: Expiry Proximity Risk (< 5 DTE)
  const minDte = Math.min(point.dteA || 99, point.dteB || 99);
  let dteStatus: DiagnosticStatus = "pass";
  let dteImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let dteEvidence = `Contract A DTE: ${point.dteA}d, Contract B DTE: ${point.dteB}d`;
  let dteExplanation = "Both contracts have ample time remaining before delivery/rollover period.";

  if (minDte <= 3) {
    dteStatus = "fail";
    dteImpact = "DISQUALIFIED";
    dteEvidence = `Critical expiry window: ${minDte} days remaining until expiry (Leg ${point.dteA <= 3 ? point.contractA : point.contractB})`;
    dteExplanation = "Near-expiry contracts undergo severe liquidity evaporation, basis decay, and mandatory physical delivery/penalty square-offs that corrupt relative pricing.";
  } else if (minDte <= 6) {
    dteStatus = "warning";
    dteImpact = "CAUTION";
    dteEvidence = `Rollover warning zone: ${minDte} days to expiry`;
    dteExplanation = "Positions held near expiry risk delivery margins and widening bid-ask spreads during rollover.";
  }

  checks.push({
    id: "check_expiry_proximity",
    name: "Expiry Proximity & Rollover Distortion",
    category: "expiry",
    status: dteStatus,
    observedEvidence: dteEvidence,
    thresholdUsed: "Fail if DTE ≤ 3d; Warning if DTE ≤ 6d",
    explanation: dteExplanation,
    impactOnEligibility: dteImpact,
  });

  // Check 2: Expiry Profile Alignment (Near vs Far Mismatch)
  const dteDiff = Math.abs((point.dteA || 0) - (point.dteB || 0));
  let expiryMatchStatus: DiagnosticStatus = "pass";
  let expiryMatchImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let expiryMatchEvidence = `Expiry gap: ${dteDiff} days between ${point.contractA} (${point.expiryA}) and ${point.contractB} (${point.expiryB})`;

  if (dteDiff > 90) {
    expiryMatchStatus = "warning";
    expiryMatchImpact = "CAUTION";
    expiryMatchEvidence += " (Cross-quarter term structure difference)";
    dteExplanation = "Comparing contracts with > 90 days expiry divergence embeds carry cost (contango/backwardation) rather than pure product basis.";
  }

  checks.push({
    id: "check_expiry_alignment",
    name: "Contract Lifecycle & Tenor Alignment",
    category: "expiry",
    status: expiryMatchStatus,
    observedEvidence: expiryMatchEvidence,
    thresholdUsed: "Warning if expiry tenor difference > 90 days",
    explanation: dteExplanation,
    impactOnEligibility: expiryMatchImpact,
  });

  // Check 3: Trading Volume & Liquidity Sufficiency
  const minVol = Math.min(point.volumeA || 0, point.volumeB || 0);
  let volStatus: DiagnosticStatus = "pass";
  let volImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let volEvidence = `Leg A Volume: ${point.volumeA.toLocaleString()} lots, Leg B Volume: ${point.volumeB.toLocaleString()} lots`;
  let volExplanation = "Both legs show healthy exchange trading activity to support timely entry and exit.";

  if (minVol === 0) {
    volStatus = "fail";
    volImpact = "DISQUALIFIED";
    volEvidence = `Zero volume recorded in ${point.volumeA === 0 ? point.contractA : point.contractB} for this trading session`;
    volExplanation = "The apparent spread anomaly is created by a stale or indicative quote on an untraded contract.";
  } else if (minVol < 50) {
    volStatus = "warning";
    volImpact = "CAUTION";
    volEvidence = `Low trading volume: minimum leg volume is only ${minVol} lots`;
    volExplanation = "Thin liquidity will cause substantial slippage upon order entry.";
  }

  checks.push({
    id: "check_liquidity_volume",
    name: "Trading Volume & Market Activity",
    category: "liquidity",
    status: volStatus,
    observedEvidence: volEvidence,
    thresholdUsed: "Fail if Volume = 0; Warning if Volume < 50 lots",
    explanation: volExplanation,
    impactOnEligibility: volImpact,
  });

  // Check 4: Open Interest Depth
  const minOI = Math.min(point.openInterestA || 0, point.openInterestB || 0);
  let oiStatus: DiagnosticStatus = "pass";
  let oiImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let oiEvidence = `Leg A OI: ${point.openInterestA.toLocaleString()} lots, Leg B OI: ${point.openInterestB.toLocaleString()} lots`;

  if (minOI === 0) {
    oiStatus = "warning";
    oiImpact = "CAUTION";
    oiEvidence = `Zero Open Interest recorded in one leg`;
  }

  checks.push({
    id: "check_open_interest",
    name: "Open Interest & Structural Depth",
    category: "liquidity",
    status: oiStatus,
    observedEvidence: oiEvidence,
    thresholdUsed: "Warning if Open Interest = 0",
    explanation: "Open interest reflects sustained market participation and counterparty availability.",
    impactOnEligibility: oiImpact,
  });

  // Check 5: Data Trust & Integrity Quality
  let dataStatus: DiagnosticStatus = "pass";
  let dataImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let dataEvidence = `Data Trust Score: ${dataTrustScore}/100 (Row status: ${point.qualityStatus})`;

  if (point.qualityStatus === "corrupted" || dataTrustScore < 60) {
    dataStatus = "fail";
    dataImpact = "DISQUALIFIED";
    dataEvidence = `Critical data quality issues: flagged as corrupted or low trust score (${dataTrustScore}/100)`;
  } else if (point.qualityStatus === "warning" || dataTrustScore < 85) {
    dataStatus = "warning";
    dataImpact = "CAUTION";
  }

  checks.push({
    id: "check_data_trust",
    name: "Bhavcopy Data Trust & Integrity",
    category: "data_integrity",
    status: dataStatus,
    observedEvidence: dataEvidence,
    thresholdUsed: "Fail if Corrupted or Trust < 60; Warning if Trust < 85",
    explanation: "Ensures price prints are authentic, non-negative, and respect OHLC bar bounds.",
    impactOnEligibility: dataImpact,
  });

  // Check 6: Single-Session Bad Tick Spike Reversion
  const ptIndex = allSpreads.findIndex((p) => p.date === point.date);
  let spikeStatus: DiagnosticStatus = "pass";
  let spikeImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let spikeEvidence = "Price series exhibits continuous trajectory";

  if (ptIndex > 0 && ptIndex < allSpreads.length - 1) {
    const prevPt = allSpreads[ptIndex - 1];
    const nextPt = allSpreads[ptIndex + 1];
    const prevSpread = prevPt.spreadAbsolute;
    const curSpread = point.spreadAbsolute;
    const nextSpread = nextPt.spreadAbsolute;

    // Check if current spread spiked > 100% and immediately reverted 100% on day T+1
    const jumpIn = Math.abs(curSpread - prevSpread);
    const jumpOut = Math.abs(curSpread - nextSpread);
    if (jumpIn > 30 && jumpOut > 30 && Math.abs(prevSpread - nextSpread) < 5) {
      spikeStatus = "fail";
      spikeImpact = "DISQUALIFIED";
      spikeEvidence = `Isolated 1-day spike: spread went ${prevSpread.toFixed(1)} ➔ ${curSpread.toFixed(1)} ➔ ${nextSpread.toFixed(1)} ₹/g`;
    }
  }

  checks.push({
    id: "check_isolated_spike",
    name: "Isolated Bad-Tick Spike Detection",
    category: "data_integrity",
    status: spikeStatus,
    observedEvidence: spikeEvidence,
    thresholdUsed: "Fail if solitary 1-day price jump reverts completely next session",
    explanation: "Guards against single-day exchange feed reporting errors that create artificial statistical arbitrage illusions.",
    impactOnEligibility: spikeImpact,
  });

  // Check 7: Statistical Sample Size Sufficiency
  let sampleStatus: DiagnosticStatus = "pass";
  let sampleImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let sampleEvidence = `Sample size: ${point.sampleSizeUsed} historical trading sessions in lookback window`;

  if (!point.isSufficientSample || point.sampleSizeUsed < 15) {
    sampleStatus = "fail";
    sampleImpact = "DISQUALIFIED";
    sampleEvidence = `Insufficient historical observations: only ${point.sampleSizeUsed} sessions available (minimum 15 required)`;
  } else if (point.sampleSizeUsed < 25) {
    sampleStatus = "warning";
    sampleImpact = "CAUTION";
  }

  checks.push({
    id: "check_sample_sufficiency",
    name: "Lookback Sample Size Sufficiency",
    category: "statistical_stability",
    status: sampleStatus,
    observedEvidence: sampleEvidence,
    thresholdUsed: "Fail if N < 15 sessions; Warning if N < 25",
    explanation: "Small sample sizes create erratic rolling standard deviations and spurious Z-scores.",
    impactOnEligibility: sampleImpact,
  });

  // Check 8: Rolling Volatility Stability
  let volStabilityStatus: DiagnosticStatus = "pass";
  let volStabilityImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let volStabilityEvidence = `Rolling Std Dev: ₹${point.rollingStd?.toFixed(2) || "N/A"}/g`;

  if (point.rollingStd !== null && point.rollingStd < 0.2) {
    volStabilityStatus = "warning";
    volStabilityImpact = "CAUTION";
    volStabilityEvidence = `Very low historical variance (Std Dev: ₹${point.rollingStd.toFixed(3)}/g)`;
  }

  checks.push({
    id: "check_volatility_stability",
    name: "Rolling Standard Deviation Stability",
    category: "statistical_stability",
    status: volStabilityStatus,
    observedEvidence: volStabilityEvidence,
    thresholdUsed: "Warning if rolling std dev < ₹0.20/g",
    explanation: "Near-zero standard deviations inflate Z-scores even when price differences are economically negligible.",
    impactOnEligibility: volStabilityImpact,
  });

  // Check 9: Transaction Cost & Friction Viability (Profit Reality Check)
  let costStatus: DiagnosticStatus = "pass";
  let costImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let costEvidence = `Cost-to-Edge: ${profitCheck.costToEdgeRatioPct}% (Friction: ₹${profitCheck.totalFrictionPerGram}/g vs Gross: ₹${profitCheck.grossEdgePerGram}/g)`;

  if (profitCheck.verdict === "REJECTED_AFTER_COSTS") {
    costStatus = "fail";
    costImpact = "DISQUALIFIED";
    costEvidence = `Costs exceed gross edge: Friction ₹${profitCheck.totalFrictionPerGram}/g > Gross ₹${profitCheck.grossEdgePerGram}/g (Net: ₹${profitCheck.netEdgePerGram}/g)`;
  } else if (profitCheck.verdict === "MARGINAL_EDGE") {
    costStatus = "warning";
    costImpact = "CAUTION";
  }

  checks.push({
    id: "check_cost_viability",
    name: "Profit Reality & Friction Viability",
    category: "cost_viability",
    status: costStatus,
    observedEvidence: costEvidence,
    thresholdUsed: "Fail if Net Edge ≤ 0 or Friction > 100% of Gross; Warning if Friction > 65%",
    explanation: "Models realistic brokerage, exchange fees, CTT, GST, SEBI charges, and bid-ask slippage across 4 trade legs.",
    impactOnEligibility: costImpact,
  });

  // Check 10: Statistical Anomaly Magnitude (|Z| ≥ Threshold)
  const z = Math.abs(point.zScore || 0);
  let zStatus: DiagnosticStatus = "pass";
  let zImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let zEvidence = `Observed Z-Score: ${point.zScore?.toFixed(2) || 0}σ (Percentile: ${point.historicalPercentile || 50}%)`;

  if (z < 1.8) {
    zStatus = "fail";
    zImpact = "DISQUALIFIED";
    zEvidence = `Below anomaly threshold: |Z| = ${z.toFixed(2)}σ < 1.80σ standard deviation`;
  }

  checks.push({
    id: "check_statistical_rarity",
    name: "Statistical Deviation Significance",
    category: "statistical_stability",
    status: zStatus,
    observedEvidence: zEvidence,
    thresholdUsed: "Fail if |Z-Score| < 1.80σ",
    explanation: "Verifies the relative price deviation exceeds normal 95% confidence intervals.",
    impactOnEligibility: zImpact,
  });

  // Aggregate results
  const failedChecksCount = checks.filter((c) => c.status === "fail").length;
  const warningChecksCount = checks.filter((c) => c.status === "warning").length;
  const passedChecksCount = checks.filter((c) => c.status === "pass").length;

  // Compute Anomaly Strength Score (0 to 100)
  // Based strictly on mathematical extremity of Z-score and percentile
  const rawZ = Math.abs(point.zScore || 0);
  const anomalyStrengthScore = Math.min(100, Math.round((rawZ / 3.5) * 100));

  // Compute Trading Evidence Score (0 to 100)
  // Deducts heavily for diagnostic failures
  let tradingEvidenceScore = 100;
  tradingEvidenceScore -= failedChecksCount * 28;
  tradingEvidenceScore -= warningChecksCount * 10;
  if (profitCheck.costToEdgeRatioPct > 60) {
    tradingEvidenceScore -= Math.round((profitCheck.costToEdgeRatioPct - 60) * 0.8);
  }
  tradingEvidenceScore = Math.max(0, Math.min(100, tradingEvidenceScore));

  let overallStatus: "APPROVED" | "WARNING_QUALIFIED" | "DISQUALIFIED" = "APPROVED";
  let finalClassification: FalseSignalReport["finalClassification"] = "WORTH_INVESTIGATING";
  let primaryRejectionReason: string | undefined;

  if (failedChecksCount > 0) {
    overallStatus = "DISQUALIFIED";

    if (dteStatus === "fail") {
      finalClassification = "EXPIRY_SENSITIVE";
      primaryRejectionReason = "Contract within critical expiry/rollover window (DTE ≤ 3 days).";
    } else if (costStatus === "fail") {
      finalClassification = "REJECTED_AFTER_COSTS";
      primaryRejectionReason = "Execution friction (exchange fees, CTT, taxes, slippage) consumes 100% of theoretical gross edge.";
    } else if (dataStatus === "fail" || spikeStatus === "fail") {
      finalClassification = "DATA_UNRELIABLE";
      primaryRejectionReason = "Bhavcopy data integrity failure or isolated bad-tick price discontinuity.";
    } else if (volStatus === "fail") {
      finalClassification = "ILLIQUID_MIRAGE";
      primaryRejectionReason = "Zero trading volume in contract leg (untradable phantom quote).";
    } else if (sampleStatus === "fail") {
      finalClassification = "INSUFFICIENT_EVIDENCE";
      primaryRejectionReason = "Insufficient historical observations in lookback window.";
    } else {
      finalClassification = "NO_PERSISTENT_EDGE";
      primaryRejectionReason = "Failed core statistical or diagnostic requirements.";
    }
  } else if (warningChecksCount >= 2 || profitCheck.verdict === "MARGINAL_EDGE") {
    overallStatus = "WARNING_QUALIFIED";
    finalClassification = "WORTH_INVESTIGATING";
  }

  let executiveSummary = "";
  if (finalClassification === "WORTH_INVESTIGATING") {
    executiveSummary = `Statistically valid deviation (|Z| = ${z.toFixed(2)}σ) with healthy liquidity, safe expiry horizon (${minDte}d DTE), and positive net edge (+₹${profitCheck.netEdgePerGram.toFixed(2)}/g) after full MCX transaction costs.`;
  } else if (finalClassification === "REJECTED_AFTER_COSTS") {
    executiveSummary = `Statistical anomaly detected (|Z| = ${z.toFixed(2)}σ), but REJECTED AFTER COSTS. Estimated execution friction (₹${profitCheck.totalFrictionPerGram.toFixed(2)}/g) eliminates the entire gross edge.`;
  } else if (finalClassification === "EXPIRY_SENSITIVE") {
    executiveSummary = `Anomaly flagged as EXPIRY DISTORTION. Contract is only ${minDte} days from delivery expiry. Physical delivery risk and rollover decay invalidate statistical convergence.`;
  } else if (finalClassification === "DATA_UNRELIABLE") {
    executiveSummary = `Signal rejected due to DATA QUALITY / CORRUPTED TICK. Spread anomaly was created by a bad Bhavcopy price record rather than an actionable market imbalance.`;
  } else if (finalClassification === "ILLIQUID_MIRAGE") {
    executiveSummary = `Signal rejected as ILLIQUID MIRAGE. Lack of trading volume indicates indicative quotes with zero actionable depth.`;
  } else {
    executiveSummary = `NO PERSISTENT EDGE DETECTED. Analysis indicates observed relative price variance does not survive market constraints.`;
  }

  return {
    overallStatus,
    finalClassification,
    passedChecksCount,
    warningChecksCount,
    failedChecksCount,
    checks,
    executiveSummary,
    primaryRejectionReason,
    tradingEvidenceScore,
    anomalyStrengthScore,
  };
}
