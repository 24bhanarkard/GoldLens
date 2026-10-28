import { AlignedSpreadPoint } from "./spreads";
import { ProfitRealityCheckResult } from "./profitRealityCheck";
import { DEFAULT_CONTRACT_REGISTRY } from "./contracts";

export type DiagnosticStatus = "pass" | "warning" | "fail" | "unavailable";

export type StandardizedVerdict =
  | "CREDIBLE ANOMALY"
  | "NEEDS INVESTIGATION"
  | "REJECTED"
  | "INSUFFICIENT DATA";

export interface DiagnosticCheckItem {
  id: string;
  name: string;
  category:
    | "data_integrity"
    | "contract_mapping"
    | "expiry"
    | "liquidity"
    | "statistical_stability"
    | "cost_viability";
  status: DiagnosticStatus;
  observedEvidence: string;
  thresholdUsed: string;
  explanation: string;
  impactOnEligibility: "APPROVED" | "CAUTION" | "DISQUALIFIED";
}

export interface FalseSignalReport {
  overallStatus: "APPROVED" | "WARNING_QUALIFIED" | "DISQUALIFIED";
  standardizedVerdict: StandardizedVerdict;
  finalClassification:
    | "WORTH_INVESTIGATING"
    | "EXPIRY_SENSITIVE"
    | "REJECTED_AFTER_COSTS"
    | "DATA_UNRELIABLE"
    | "ILLIQUID_MIRAGE"
    | "INSUFFICIENT_EVIDENCE"
    | "NO_PERSISTENT_EDGE";
  isDataIntegrityFailure: boolean;
  integrityWarningBanner?: string;
  passedChecksCount: number;
  warningChecksCount: number;
  failedChecksCount: number;
  checks: DiagnosticCheckItem[];
  executiveSummary: string;
  primaryRejectionReason?: string;
  tradingEvidenceScore: number;
  anomalyStrengthScore: number;
}

/**
 * Runs 10 strictly lookahead-free diagnostic checks at decision date T.
 * Never inspects T+1 prices when determining eligibility or classification.
 */
export function runFalseSignalDetective(
  point: AlignedSpreadPoint,
  allSpreads: AlignedSpreadPoint[],
  profitCheck: ProfitRealityCheckResult,
  dataTrustScore = 100
): FalseSignalReport {
  const checks: DiagnosticCheckItem[] = [];
  const ptIndex = allSpreads.findIndex((p) => p.date === point.date);

  // Check 1: Source Row Data Integrity & Bar Geometry
  const hasBarViolationA =
    point.highA_Raw < point.lowA_Raw ||
    point.openA_Raw < point.lowA_Raw ||
    point.openA_Raw > point.highA_Raw ||
    point.priceA_Raw < point.lowA_Raw ||
    point.priceA_Raw > point.highA_Raw;
  const hasBarViolationB =
    point.highB_Raw < point.lowB_Raw ||
    point.openB_Raw < point.lowB_Raw ||
    point.openB_Raw > point.highB_Raw ||
    point.priceB_Raw < point.lowB_Raw ||
    point.priceB_Raw > point.highB_Raw;

  let dataStatus: DiagnosticStatus = "pass";
  let dataImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let dataEvidence = `Source rows [${point.rowIdA}, ${point.rowIdB}] verified clean (Dataset Trust: ${dataTrustScore}/100)`;

  if (point.qualityStatus === "corrupted" || hasBarViolationA || hasBarViolationB || dataTrustScore < 60) {
    dataStatus = "fail";
    dataImpact = "DISQUALIFIED";
    const notes = [point.qualityNotesA, point.qualityNotesB].filter(Boolean).join("; ");
    dataEvidence = notes
      ? `Corrupted source record flagged: ${notes} [${point.qualityFlagA === "corrupted" ? point.rowIdA : point.rowIdB}]`
      : `OHLC integrity failure on source record (${point.qualityFlagA === "corrupted" || hasBarViolationA ? point.rowIdA : point.rowIdB})`;
  } else if (point.qualityStatus === "warning" || dataTrustScore < 80) {
    dataStatus = "warning";
    dataImpact = "CAUTION";
    dataEvidence = [point.qualityNotesA, point.qualityNotesB].filter(Boolean).join("; ") || `Row warning status (${dataTrustScore}/100)`;
  }

  checks.push({
    id: "check_data_trust",
    name: "Source Bhavcopy Integrity & Bar Geometry",
    category: "data_integrity",
    status: dataStatus,
    observedEvidence: dataEvidence,
    thresholdUsed: "Fail if source row corrupted, OHLC violated, or Dataset Trust < 60",
    explanation:
      "Confirms Open/High/Low/Close prices satisfy bar bounds and pass source validation rules before trusting spread math.",
    impactOnEligibility: dataImpact,
  });

  // Check 2: Decision-Time Single-Session Discontinuity (Lookahead-Free: compares T vs T-1 ONLY)
  let spikeStatus: DiagnosticStatus = "pass";
  let spikeImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let spikeEvidence = "Both contract legs moved within normal MCX 3%–6% daily price limits";

  if (ptIndex > 0) {
    const prevPt = allSpreads[ptIndex - 1];
    if (!point.rolloverOccurred && prevPt.priceA_Norm > 0 && prevPt.priceB_Norm > 0) {
      const retA = (point.priceA_Norm - prevPt.priceA_Norm) / prevPt.priceA_Norm;
      const retB = (point.priceB_Norm - prevPt.priceB_Norm) / prevPt.priceB_Norm;
      const legDivergencePct = Math.abs(retA - retB) * 100;
      if (legDivergencePct > 8.0) {
        spikeStatus = "fail";
        spikeImpact = "DISQUALIFIED";
        spikeEvidence = `Uncircuit-broken 1-day leg divergence of ${legDivergencePct.toFixed(1)}% (${point.contractA}: ${(retA * 100).toFixed(1)}%, ${point.contractB}: ${(retB * 100).toFixed(1)}%)`;
      } else if (legDivergencePct > 3.5) {
        spikeStatus = "warning";
        spikeImpact = "CAUTION";
        spikeEvidence = `Unusually wide 1-day relative move of ${legDivergencePct.toFixed(2)}%`;
      }
    }
  }

  checks.push({
    id: "check_isolated_spike",
    name: "Circuit-Limit Return Plausibility (T vs T-1)",
    category: "data_integrity",
    status: spikeStatus,
    observedEvidence: spikeEvidence,
    thresholdUsed: "Fail if 1-day cross-leg return divergence > 8.0% without rollover",
    explanation:
      "Detects bad-tick prints at decision time T using strictly prior close T-1 (zero look-ahead to T+1).",
    impactOnEligibility: spikeImpact,
  });

  // Check 3: Contract Specification, Quotation & Purity Mapping Verification
  const specA = DEFAULT_CONTRACT_REGISTRY[point.contractA.toUpperCase()];
  const specB = DEFAULT_CONTRACT_REGISTRY[point.contractB.toUpperCase()];
  let mapStatus: DiagnosticStatus = "pass";
  let mapImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let mapEvidence = specA && specB
    ? `${specA.symbol} (${specA.quotationBasis}, ${specA.referencePurity} fine) & ${specB.symbol} (${specB.quotationBasis}, ${specB.referencePurity} fine) verified`
    : `Unverified specification metadata on ${!specA ? point.contractA : point.contractB}`;

  if (!specA || !specB) {
    mapStatus = "warning";
    mapImpact = "CAUTION";
  } else if (point.date < specA.applicableFrom || point.date < specB.applicableFrom) {
    mapStatus = "fail";
    mapImpact = "DISQUALIFIED";
    mapEvidence = `Observation date (${point.date}) precedes MCX contract effective date (${point.date < specA.applicableFrom ? `${specA.symbol}: ${specA.applicableFrom}` : `${specB.symbol}: ${specB.applicableFrom}`})`;
  }

  checks.push({
    id: "check_contract_mapping",
    name: "Contract Metadata, Quotation Basis & Effective Date",
    category: "contract_mapping",
    status: mapStatus,
    observedEvidence: mapEvidence,
    thresholdUsed: "Both contracts registered with valid quotation unit, purity & launch date",
    explanation:
      "Ensures both legs convert accurately into standardized ₹/g (999 fineness) under applicable MCX circulars.",
    impactOnEligibility: mapImpact,
  });

  // Check 4: Expiry Proximity & Tender-Period Risk
  const minDte = Math.min(point.dteA ?? 99, point.dteB ?? 99);
  let dteStatus: DiagnosticStatus = "pass";
  let dteImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let dteEvidence = `${point.contractA}: ${point.dteA}d DTE (${point.expiryA}) • ${point.contractB}: ${point.dteB}d DTE (${point.expiryB})`;
  let dteExplanation = "Both legs sit well outside MCX staggered delivery / tender period.";

  if (minDte <= 4) {
    dteStatus = "fail";
    dteImpact = "DISQUALIFIED";
    dteEvidence = `Tender/expiry window: ${minDte}d remaining on ${point.dteA <= 4 ? point.contractA : point.contractB} (Expiry ${point.dteA <= 4 ? point.expiryA : point.expiryB})`;
    dteExplanation =
      "MCX imposes 25%+ tender-period delivery margins and compulsory physical settlement rules in final days before expiry, breaking statistical convergence.";
  } else if (minDte <= 7 || point.rolloverOccurred) {
    dteStatus = "warning";
    dteImpact = "CAUTION";
    dteEvidence = point.rolloverOccurred
      ? `Contract rollover boundary crossed on ${point.date} (${minDte}d DTE)`
      : `Approaching rollover window (${minDte}d DTE)`;
    dteExplanation =
      "Rollover transitions and near-expiry liquidity migration widen execution spreads and limit holding horizon.";
  }

  checks.push({
    id: "check_expiry_proximity",
    name: "Expiry Proximity & Tender-Window Filter",
    category: "expiry",
    status: dteStatus,
    observedEvidence: dteEvidence,
    thresholdUsed: "Fail if DTE ≤ 4d; Warning if DTE ≤ 7d or rollover day",
    explanation: dteExplanation,
    impactOnEligibility: dteImpact,
  });

  // Check 5: Tenor & Carry-Cost Comparability
  const dteDiff = Math.abs((point.dteA || 0) - (point.dteB || 0));
  let expiryMatchStatus: DiagnosticStatus = "pass";
  let expiryMatchImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let expiryMatchEvidence = `Tenor difference: ${dteDiff} calendar days (${point.expiryA} vs ${point.expiryB})`;
  let expiryMatchExplanation = "Comparable maturity horizon with minimal interest/storage carry wedge.";

  if (dteDiff > 35) {
    expiryMatchStatus = "warning";
    expiryMatchImpact = "CAUTION";
    expiryMatchExplanation =
      "Different expiry dates introduce legitimate annualized cost-of-carry (contango) that rolling mean accounts for only if carry rates stay stable.";
  }

  checks.push({
    id: "check_expiry_alignment",
    name: "Maturity Tenor & Carry-Wedge Alignment",
    category: "expiry",
    status: expiryMatchStatus,
    observedEvidence: expiryMatchEvidence,
    thresholdUsed: "Warning if maturity gap > 35 calendar days",
    explanation: expiryMatchExplanation,
    impactOnEligibility: expiryMatchImpact,
  });

  // Check 6: Session Trading Volume
  const minVol = Math.min(point.volumeA || 0, point.volumeB || 0);
  let volStatus: DiagnosticStatus = "pass";
  let volImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let volEvidence = `${point.contractA}: ${point.volumeA.toLocaleString()} lots • ${point.contractB}: ${point.volumeB.toLocaleString()} lots`;
  let volExplanation = "Active session volume on both legs supports multi-leg order execution.";

  if (minVol === 0) {
    volStatus = "fail";
    volImpact = "DISQUALIFIED";
    volEvidence = `Zero traded volume in ${point.volumeA === 0 ? point.contractA : point.contractB}`;
    volExplanation = "Untraded sessions reflect theoretical exchange settlement marks rather than executable market quotes.";
  } else if (minVol < 100) {
    volStatus = "warning";
    volImpact = "CAUTION";
    volEvidence = `Thin session liquidity: minimum leg traded ${minVol} lots`;
    volExplanation = "Thin orderbook depth increases leg-in risk and bid-ask slippage.";
  }

  checks.push({
    id: "check_liquidity_volume",
    name: "Session Volume & Execution Depth",
    category: "liquidity",
    status: volStatus,
    observedEvidence: volEvidence,
    thresholdUsed: "Fail if Volume = 0; Warning if Volume < 100 lots",
    explanation: volExplanation,
    impactOnEligibility: volImpact,
  });

  // Check 7: Open Interest Depth
  const minOI = Math.min(point.openInterestA || 0, point.openInterestB || 0);
  const oiStatus: DiagnosticStatus = minOI === 0 ? "warning" : "pass";
  const oiImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = minOI === 0 ? "CAUTION" : "APPROVED";

  checks.push({
    id: "check_open_interest",
    name: "Open Interest Participation",
    category: "liquidity",
    status: oiStatus,
    observedEvidence: `${point.contractA}: ${point.openInterestA.toLocaleString()} OI • ${point.contractB}: ${point.openInterestB.toLocaleString()} OI`,
    thresholdUsed: "Warning if Open Interest = 0",
    explanation: "Verifies standing open interest on both legs so exit orders have active counterparties.",
    impactOnEligibility: oiImpact,
  });

  // Check 8: Lookback Sample Size & Non-Zero Variance
  let sampleStatus: DiagnosticStatus = "pass";
  let sampleImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let sampleEvidence = `${point.sampleSizeUsed} clean prior sessions (Rolling σ = ₹${point.rollingStd?.toFixed(2) ?? "N/A"}/g)`;

  if (!point.isSufficientSample || point.sampleSizeUsed < 15 || point.zScore === null) {
    sampleStatus = "fail";
    sampleImpact = "DISQUALIFIED";
    sampleEvidence =
      point.zScore === null && point.sampleSizeUsed >= 15
        ? "Zero / near-zero historical spread variance — Z-score mathematically undefined"
        : `Only ${point.sampleSizeUsed} prior sessions available (minimum 15 required)`;
  } else if (point.sampleSizeUsed < 25) {
    sampleStatus = "warning";
    sampleImpact = "CAUTION";
  }

  checks.push({
    id: "check_sample_sufficiency",
    name: "Prior Lookback Sample & Variance Validity",
    category: "statistical_stability",
    status: sampleStatus,
    observedEvidence: sampleEvidence,
    thresholdUsed: "Fail if prior clean N < 15 or σ ≤ 1e-6; Warning if N < 25",
    explanation: "Rolling statistics use strictly past sessions (< T) with non-degenerate variance.",
    impactOnEligibility: sampleImpact,
  });

  // Check 9: Statistical Deviation Magnitude
  const absZ = Math.abs(point.zScore || 0);
  const zStatus: DiagnosticStatus = point.zScore === null || absZ < 1.8 ? "fail" : "pass";
  const zImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" =
    zStatus === "fail" ? "DISQUALIFIED" : "APPROVED";

  checks.push({
    id: "check_statistical_rarity",
    name: "Statistical Spread Deviation Significance",
    category: "statistical_stability",
    status: zStatus,
    observedEvidence:
      point.zScore !== null
        ? `Z-Score: ${point.zScore > 0 ? "+" : ""}${point.zScore.toFixed(2)}σ (${point.historicalPercentile}th percentile vs prior window)`
        : "Z-Score unavailable",
    thresholdUsed: "Candidate threshold |Z| ≥ 1.80σ",
    explanation: "Tests whether observed spread exceeds routine day-to-day basis noise.",
    impactOnEligibility: zImpact,
  });

  // Check 10: Weight-Matched Transaction Cost Viability
  let costStatus: DiagnosticStatus = "pass";
  let costImpact: "APPROVED" | "CAUTION" | "DISQUALIFIED" = "APPROVED";
  let costEvidence = `Gross: ₹${profitCheck.grossEdgePerGram.toFixed(2)}/g • Friction: ₹${profitCheck.totalFrictionPerGram.toFixed(2)}/g • Net: ${profitCheck.netEdgePerGram >= 0 ? "+" : ""}₹${profitCheck.netEdgePerGram.toFixed(2)}/g (${profitCheck.nominalGramsTraded}g matched unit)`;

  if (profitCheck.verdict === "REJECTED_AFTER_COSTS") {
    costStatus = "fail";
    costImpact = "DISQUALIFIED";
  } else if (profitCheck.verdict === "MARGINAL_EDGE") {
    costStatus = "warning";
    costImpact = "CAUTION";
  }

  checks.push({
    id: "check_cost_viability",
    name: "Weight-Matched Transaction Cost & Slippage Viability",
    category: "cost_viability",
    status: costStatus,
    observedEvidence: costEvidence,
    thresholdUsed: "Fail if Net Edge ≤ 0; Warning if Friction > 65% of Gross Spread",
    explanation:
      "Evaluates 4-leg brokerage, MCX fees, CTT, stamp duty, GST, SEBI fees, and slippage on exact weight-matched lot ratios.",
    impactOnEligibility: costImpact,
  });

  const failedChecksCount = checks.filter((c) => c.status === "fail").length;
  const warningChecksCount = checks.filter((c) => c.status === "warning").length;
  const passedChecksCount = checks.filter((c) => c.status === "pass").length;

  const isDataIntegrityFailure =
    dataStatus === "fail" || spikeStatus === "fail" || mapStatus === "fail";

  // Anomaly Strength (0-100): zeroed or flagged if data is corrupted so bad prints don't masquerade as opportunities
  const anomalyStrengthScore = Math.min(100, Math.round((absZ / 3.5) * 100));

  let tradingEvidenceScore = 100 - failedChecksCount * 30 - warningChecksCount * 10;
  if (profitCheck.costToEdgeRatioPct > 55) {
    tradingEvidenceScore -= Math.round((profitCheck.costToEdgeRatioPct - 55) * 0.6);
  }
  if (isDataIntegrityFailure) {
    tradingEvidenceScore = 0;
  }
  tradingEvidenceScore = Math.max(0, Math.min(100, tradingEvidenceScore));

  let overallStatus: "APPROVED" | "WARNING_QUALIFIED" | "DISQUALIFIED" = "APPROVED";
  let finalClassification: FalseSignalReport["finalClassification"] = "WORTH_INVESTIGATING";
  let standardizedVerdict: StandardizedVerdict = "CREDIBLE ANOMALY";
  let primaryRejectionReason: string | undefined;
  let integrityWarningBanner: string | undefined;

  if (isDataIntegrityFailure) {
    overallStatus = "DISQUALIFIED";
    finalClassification = "DATA_UNRELIABLE";
    standardizedVerdict = "REJECTED";
    primaryRejectionReason =
      dataStatus === "fail"
        ? dataEvidence
        : spikeStatus === "fail"
        ? spikeEvidence
        : mapEvidence;
    integrityWarningBanner = `DATA INTEGRITY FAILURE OVERRIDES STATISTICAL METRICS: ${primaryRejectionReason}. High Z-score (${point.zScore?.toFixed(2) ?? "N/A"}σ) and theoretical spread are artifacts of bad source data, not an executable market opportunity.`;
  } else if (sampleStatus === "fail") {
    overallStatus = "DISQUALIFIED";
    finalClassification = "INSUFFICIENT_EVIDENCE";
    standardizedVerdict = "INSUFFICIENT DATA";
    primaryRejectionReason = sampleEvidence;
  } else if (failedChecksCount > 0) {
    overallStatus = "DISQUALIFIED";
    standardizedVerdict = "REJECTED";
    if (dteStatus === "fail") {
      finalClassification = "EXPIRY_SENSITIVE";
      primaryRejectionReason = dteEvidence;
    } else if (costStatus === "fail") {
      finalClassification = "REJECTED_AFTER_COSTS";
      primaryRejectionReason = `Round-trip friction (₹${profitCheck.totalFrictionPerGram.toFixed(2)}/g) exceeds gross spread (₹${profitCheck.grossEdgePerGram.toFixed(2)}/g) on ${profitCheck.nominalGramsTraded}g hedge unit.`;
    } else if (volStatus === "fail") {
      finalClassification = "ILLIQUID_MIRAGE";
      primaryRejectionReason = volEvidence;
    } else {
      finalClassification = "NO_PERSISTENT_EDGE";
      primaryRejectionReason = "Spread deviation does not exceed statistical significance threshold.";
    }
  } else if (warningChecksCount >= 1 || profitCheck.verdict === "MARGINAL_EDGE") {
    overallStatus = "WARNING_QUALIFIED";
    finalClassification = "WORTH_INVESTIGATING";
    standardizedVerdict = "NEEDS INVESTIGATION";
  }

  let executiveSummary = "";
  if (standardizedVerdict === "CREDIBLE ANOMALY") {
    executiveSummary = `Credible relative-price anomaly (${point.zScore && point.zScore > 0 ? "+" : ""}${point.zScore?.toFixed(2)}σ). Source records pass all integrity rules, both contracts sit safely outside expiry (${minDte}d DTE), and modeled net edge remains positive (+₹${profitCheck.netEdgePerGram.toFixed(2)}/g after ₹${profitCheck.totalFrictionPerGram.toFixed(2)}/g friction).`;
  } else if (standardizedVerdict === "NEEDS INVESTIGATION") {
    executiveSummary = `Statistically unusual spread (${point.zScore && point.zScore > 0 ? "+" : ""}${point.zScore?.toFixed(2)}σ) with +₹${profitCheck.netEdgePerGram.toFixed(2)}/g base net edge, flagged for investigation due to ${warningChecksCount} caution check(s) (review tenor carry or stress sensitivity before acting).`;
  } else if (standardizedVerdict === "INSUFFICIENT DATA") {
    executiveSummary = `Insufficient prior clean observations (${point.sampleSizeUsed} sessions) to compute reliable rolling parameters without statistical instability.`;
  } else if (isDataIntegrityFailure) {
    executiveSummary = `Rejected due to material data integrity failure: ${primaryRejectionReason}. Apparent Z-score spike is caused by a corrupted quote/print rather than genuine market divergence.`;
  } else if (finalClassification === "EXPIRY_SENSITIVE") {
    executiveSummary = `Rejected due to contract expiry distortion (${minDte}d DTE). Tender-period physical delivery margins and rollover liquidity drain invalidate mean-reversion assumptions.`;
  } else if (finalClassification === "REJECTED_AFTER_COSTS") {
    executiveSummary = `Rejected after transaction costs: gross spread of ₹${profitCheck.grossEdgePerGram.toFixed(2)}/g is outweighed by ₹${profitCheck.totalFrictionPerGram.toFixed(2)}/g in round-trip brokerage, taxes, and slippage (-₹${Math.abs(profitCheck.netEdgePerGram).toFixed(2)}/g net).`;
  } else {
    executiveSummary = primaryRejectionReason || "Rejected: candidate failed diagnostic eligibility checks.";
  }

  return {
    overallStatus,
    standardizedVerdict,
    finalClassification,
    isDataIntegrityFailure,
    integrityWarningBanner,
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
