import {
  normalizePrice,
  getHedgeMatchedSizing,
  DEFAULT_CONTRACT_REGISTRY,
} from "./contracts";
import { validateMarketRow, calculateDatasetTrustScore } from "./dataQuality";
import { calculateAlignedSpreads } from "./spreads";
import {
  calculateProfitReality,
  runOpportunityStressTest,
} from "./profitRealityCheck";
import { runFalseSignalDetective } from "./falseSignalDetective";
import { findSpreadDNAPatterns } from "./spreadDNA";
import { runBacktest, calculateWilsonCI95 } from "./backtester";
import { generateSyntheticMCXDataset } from "./syntheticData";

export function runAnalyticsValidationTests(): {
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  results: { name: string; passed: boolean; message: string }[];
} {
  const results: { name: string; passed: boolean; message: string }[] = [];

  const assert = (name: string, condition: boolean, message: string) => {
    results.push({
      name,
      passed: condition,
      message: condition ? "Passed" : message,
    });
  };

  // 1. GOLDM Normalization (10g, 995 fineness -> ₹/g 999 fineness)
  const normM = normalizePrice(72500, "GOLDM");
  assert(
    "GOLDM Normalization (₹72,500/10g @ 995 -> ₹7,279.15/g @ 999)",
    Math.abs(normM.normalizedPriceG999 - 7279.1457) < 0.05,
    `Expected ~7279.15, got ${normM.normalizedPriceG999}`
  );

  // 2. GOLDTEN Verified MCX Spec (Quoted per 10g, 999 fineness, effective 2025-04-01)
  const specTen = DEFAULT_CONTRACT_REGISTRY["GOLDTEN"];
  const normTen = normalizePrice(72800, "GOLDTEN");
  assert(
    "GOLDTEN Verified MCX Spec (₹72,800/10g @ 999 -> ₹7,280.00/g)",
    specTen.quotationBasis === "10g" &&
      specTen.quotationMultiplier === 0.1 &&
      specTen.applicableFrom === "2025-04-01" &&
      Math.abs(normTen.normalizedPriceG999 - 7280.0) < 0.01,
    `Unexpected GOLDTEN spec/normalization: ${normTen.normalizedPriceG999}`
  );

  // 3. LCM Weight-Matched Hedge Sizing
  const hedgeMG = getHedgeMatchedSizing("GOLDM", "GOLDTEN");
  const hedgeGP = getHedgeMatchedSizing("GOLDGUINEA", "GOLDPETAL");
  assert(
    "Weight-Matched Hedge Sizing (LCM)",
    hedgeMG.matchedGrams === 100 &&
      hedgeMG.lotsA === 1 &&
      hedgeMG.lotsB === 10 &&
      hedgeGP.matchedGrams === 8 &&
      hedgeGP.lotsA === 1 &&
      hedgeGP.lotsB === 8,
    `Unexpected LCM hedge sizing: ${hedgeMG.matchedGrams}g / ${hedgeGP.matchedGrams}g`
  );

  // 4. Structural Validation Rejects Negative & Bar-Geometry Violations
  const negRow = validateMarketRow(
    {
      symbol: "GOLDM",
      date: "2025-10-01",
      expiryDate: "2025-12-05",
      open: 92000,
      high: 92500,
      low: -50,
      close: 92200,
    },
    0
  );
  assert(
    "Structural OHLC & Positive Price Validation",
    !negRow.isValid,
    "Failed to reject negative Low quote"
  );

  // 5. Prior-Window Lookback Non-Contamination Check
  const synthetic = generateSyntheticMCXDataset();
  const dataM = synthetic.filter((r) => r.symbol === "GOLDM");
  const dataT = synthetic.filter((r) => r.symbol === "GOLDTEN");
  const dataG = synthetic.filter((r) => r.symbol === "GOLDGUINEA");
  const dataP = synthetic.filter((r) => r.symbol === "GOLDPETAL");

  const spreadsMP = calculateAlignedSpreads(dataM, dataP, { lookbackWindow: 30 });
  const dec03Idx = spreadsMP.findIndex((s) => s.date === "2025-12-03");
  const dec03 = spreadsMP[dec03Idx];
  const dec04 = spreadsMP[dec03Idx + 1];
  assert(
    "Prior Rolling Window & Corrupted Print Isolation",
    !spreadsMP[14].isSufficientSample &&
      spreadsMP[15].isSufficientSample &&
      dec03.qualityStatus === "corrupted" &&
      (dec04.rollingStd ?? 999) < 15,
    `Expected clean rollingStd on 2025-12-04 (<15), got ${dec04?.rollingStd}`
  );

  // 6. Zero-Variance Guard Returns Null Z-Score
  const flatA = Array.from({ length: 20 }, (_, idx) => ({
    ...dataM[idx],
    normalizedPriceG999: 9300,
  }));
  const flatB = Array.from({ length: 20 }, (_, idx) => ({
    ...dataT[idx],
    normalizedPriceG999: 9300,
  }));
  const flatSpreads = calculateAlignedSpreads(flatA, flatB, { lookbackWindow: 15 });
  assert(
    "Zero-Variance Guard (Returns Explicit Null Z-Score)",
    flatSpreads[18].zScore === null,
    `Expected null zScore on zero variance, got ${flatSpreads[18].zScore}`
  );

  // 7. Seeded Case 1: Credible Anomaly Organically Qualified
  const spreadsMT = calculateAlignedSpreads(dataM, dataT, {
    lookbackWindow: 30,
    zScoreThreshold: 1.8,
  });
  const trustReport = calculateDatasetTrustScore(
    synthetic.map((r) => ({ ...r }))
  );
  const sep18Idx = spreadsMT.findIndex((s) => s.date === "2025-09-18");
  const sep18 = spreadsMT[sep18Idx];
  const sep18Profit = calculateProfitReality(
    sep18.priceA_Norm,
    sep18.priceB_Norm,
    Math.abs(sep18.spreadAbsolute),
    undefined,
    { contractA: "GOLDM", contractB: "GOLDTEN" }
  );
  const sep18Diag = runFalseSignalDetective(
    sep18,
    spreadsMT.slice(0, sep18Idx + 1),
    sep18Profit,
    trustReport.overallScore
  );
  assert(
    "Case 1 (2025-09-18 GOLDM/GOLDTEN) Organically Verifies as CREDIBLE ANOMALY",
    sep18Diag.standardizedVerdict === "CREDIBLE ANOMALY" && sep18Profit.netEdgePerGram > 15,
    `Expected CREDIBLE ANOMALY, got ${sep18Diag.standardizedVerdict}`
  );

  // 8. Seeded Case 2: Expiry Trap Disqualified by Tender Window
  const spreadsMG = calculateAlignedSpreads(dataM, dataG, {
    lookbackWindow: 30,
    zScoreThreshold: 1.8,
  });
  const oct01Idx = spreadsMG.findIndex((s) => s.date === "2025-10-01");
  const oct01 = spreadsMG[oct01Idx];
  const oct01Profit = calculateProfitReality(
    oct01.priceA_Norm,
    oct01.priceB_Norm,
    Math.abs(oct01.spreadAbsolute),
    undefined,
    { contractA: "GOLDM", contractB: "GOLDGUINEA" }
  );
  const oct01Diag = runFalseSignalDetective(
    oct01,
    spreadsMG.slice(0, oct01Idx + 1),
    oct01Profit,
    trustReport.overallScore
  );
  assert(
    "Case 2 (2025-10-01 GOLDM/GOLDGUINEA) Disqualified as EXPIRY_SENSITIVE",
    oct01Diag.standardizedVerdict === "REJECTED" &&
      oct01Diag.finalClassification === "EXPIRY_SENSITIVE",
    `Expected REJECTED / EXPIRY_SENSITIVE, got ${oct01Diag.standardizedVerdict} / ${oct01Diag.finalClassification}`
  );

  // 9. Seeded Case 3: Small-Lot Cost Mirage Organically Rejected After Costs
  const spreadsGP = calculateAlignedSpreads(dataG, dataP, {
    lookbackWindow: 30,
    zScoreThreshold: 1.8,
  });
  const nov12Idx = spreadsGP.findIndex((s) => s.date === "2025-11-12");
  const nov12 = spreadsGP[nov12Idx];
  const nov12Profit = calculateProfitReality(
    nov12.priceA_Norm,
    nov12.priceB_Norm,
    Math.abs(nov12.spreadAbsolute),
    undefined,
    { contractA: "GOLDGUINEA", contractB: "GOLDPETAL" }
  );
  const nov12Diag = runFalseSignalDetective(
    nov12,
    spreadsGP.slice(0, nov12Idx + 1),
    nov12Profit,
    trustReport.overallScore
  );
  assert(
    "Case 3 (2025-11-12 GOLDGUINEA/GOLDPETAL) Organically REJECTED_AFTER_COSTS on 8g Hedge",
    nov12Profit.verdict === "REJECTED_AFTER_COSTS" &&
      nov12Diag.standardizedVerdict === "REJECTED",
    `Expected REJECTED_AFTER_COSTS, got ${nov12Profit.verdict}`
  );

  // 10. Seeded Case 4: Corrupted Print Overrides High Z-Score
  const dec03Profit = calculateProfitReality(
    dec03.priceA_Norm,
    dec03.priceB_Norm,
    Math.abs(dec03.spreadAbsolute),
    undefined,
    { contractA: "GOLDM", contractB: "GOLDPETAL" }
  );
  const dec03Diag = runFalseSignalDetective(
    dec03,
    spreadsMP.slice(0, dec03Idx + 1),
    dec03Profit,
    trustReport.overallScore
  );
  assert(
    "Case 4 (2025-12-03 Corrupted Print) Forces REJECTED & Integrity Override",
    dec03Diag.isDataIntegrityFailure &&
      dec03Diag.standardizedVerdict === "REJECTED" &&
      dec03Diag.tradingEvidenceScore === 0,
    `Expected integrity override, got ${dec03Diag.standardizedVerdict}`
  );

  // 11. Backtest Honesty Scorecard: Single-Trade 100%-Win Run Never Claims Viable Edge Proof
  const wilson1 = calculateWilsonCI95(1, 1);
  const singleTradeSlice = spreadsMT.slice(90, 115); // isolates the single 2025-09-18 1/1 winning trade
  const singleTradeBacktest = runBacktest(singleTradeSlice, {
    contractA: "GOLDM",
    contractB: "GOLDTEN",
    entryZScore: 3.5,
    maxHoldingDays: 10,
  });
  assert(
    "Backtest Honesty Scorecard: 1-Trade (100% Win) Run Classifies as INSUFFICIENT EVIDENCE",
    wilson1.lowerPct === 20.7 &&
      wilson1.upperPct === 100 &&
      singleTradeBacktest.metrics.eligibleTradesExecuted === 1 &&
      singleTradeBacktest.metrics.winRatePct === 100 &&
      singleTradeBacktest.honestyScorecard.evidenceVerdict === "INSUFFICIENT EVIDENCE",
    `Expected n=1 (100% win) -> INSUFFICIENT EVIDENCE, got n=${singleTradeBacktest.metrics.eligibleTradesExecuted} / ${singleTradeBacktest.honestyScorecard.evidenceVerdict}`
  );

  // 12. Strict Prior-Only Spread DNA Matching + Opportunity Stress Test Recalculation
  const dna = findSpreadDNAPatterns(sep18, spreadsMT, 5, true);
  const stressBase = runOpportunityStressTest("GOLDM", "GOLDTEN", 9350, 9326, 24, 20, {
    costIncreasePct: 0,
    slippagePerGramINR: 1.25,
    convergenceCapturePct: 100,
    liquidityImpactPerGramINR: 0,
    approachingExpiryDragINR: 0,
  });
  const stressShock = runOpportunityStressTest("GOLDM", "GOLDTEN", 9350, 9326, 24, 20, {
    costIncreasePct: 100,
    slippagePerGramINR: 3.5,
    convergenceCapturePct: 35,
    liquidityImpactPerGramINR: 2.0,
    approachingExpiryDragINR: 2.0,
  });
  assert(
    "Spread DNA Zero Future Leakage & Opportunity Stress Test Sensitivity",
    dna.matches.every((m) => m.eventDate < "2025-09-18") &&
      stressBase.stressedCase.netTotalINR > 0 &&
      stressShock.stressedCase.netTotalINR < 0 &&
      stressShock.stressedCase.verdict === "FAILS_UNDER_STRESS",
    "Failed Spread DNA prior check or Opportunity Stress Test recalculation"
  );

  const passedCount = results.filter((r) => r.passed).length;
  return {
    allPassed: passedCount === results.length,
    passedCount,
    totalCount: results.length,
    results,
  };
}
