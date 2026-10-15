import { normalizePrice } from "./contracts";
import { validateMarketRow, calculateDatasetTrustScore } from "./dataQuality";
import { calculateAlignedSpreads } from "./spreads";
import { calculateProfitReality } from "./profitRealityCheck";
import { runBacktest } from "./backtester";
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

  // Test 1: GOLDM Normalization
  const normM = normalizePrice(72500, "GOLDM");
  assert(
    "GOLDM Normalization (10g 995 to 1g 999)",
    Math.abs(normM.normalizedPriceG999 - 7279.1457) < 0.1,
    `Expected ~7279.15, got ${normM.normalizedPriceG999}`
  );

  // Test 2: GOLDTEN Normalization
  const normTen = normalizePrice(7280, "GOLDTEN");
  assert(
    "GOLDTEN Normalization (1g 999 to 1g 999)",
    normTen.normalizedPriceG999 === 7280,
    `Expected 7280, got ${normTen.normalizedPriceG999}`
  );

  // Test 3: Data Integrity Validation
  const badRow = {
    symbol: "GOLDM",
    date: "2024-10-01",
    expiryDate: "2024-11-05",
    open: 72000,
    high: 73000,
    low: -50,
    close: 72500,
  };
  const valRes = validateMarketRow(badRow, 0);
  assert("Negative Price Rejection", !valRes.isValid, "Failed to reject negative price");

  // Test 4: Spreads & Lookback Z-Scores
  const synthetic = generateSyntheticMCXDataset();
  const dataA = synthetic.filter((r) => r.symbol === "GOLDM");
  const dataB = synthetic.filter((r) => r.symbol === "GOLDTEN");
  const spreads = calculateAlignedSpreads(dataA, dataB, { lookbackWindow: 30 });
  assert(
    "Aligned Spreads Lookahead Prevention",
    spreads.length > 100 && !spreads[5].isSufficientSample && spreads[35].isSufficientSample,
    "Lookahead prevention or sample sufficiency check failed"
  );

  // Test 5: Profit Reality Check
  const costReject = calculateProfitReality(7250, 7250.5, 0.5, 100);
  assert(
    "Profit Reality Friction Rejection",
    costReject.verdict === "REJECTED_AFTER_COSTS",
    "Failed to reject opportunity when costs exceed edge"
  );

  // Test 6: Backtesting Engine
  const bkt = runBacktest(spreads, {
    entryZScore: 2.0,
    exitZScore: 0.3,
    maxHoldingDays: 10,
  });
  assert(
    "Backtest Simulation Execution",
    bkt.metrics.totalSignalsGenerated > 0 && bkt.equityCurve.length > 0,
    "Backtest failed to generate signals or equity curve"
  );

  const passedCount = results.filter((r) => r.passed).length;
  return {
    allPassed: passedCount === results.length,
    passedCount,
    totalCount: results.length,
    results,
  };
}
