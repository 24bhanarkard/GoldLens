export interface MarketRowInput {
  symbol: string;
  date: string;
  expiryDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  openInterest?: number;
  [key: string]: unknown;
}

export interface QualityCheckDetail {
  id: string;
  name: string;
  category: "integrity" | "plausibility" | "completeness" | "consistency";
  status: "pass" | "warning" | "fail";
  scoreImpact: number; // penalty points
  explanation: string;
  violationsCount: number;
  sampleViolations?: string[];
}

export interface DataTrustReport {
  overallScore: number; // 0 to 100
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  warningRows: number;
  checks: QualityCheckDetail[];
  summaryMessage: string;
  recommendation: "RELIABLE_FOR_ANALYSIS" | "USE_WITH_CAUTION" | "UNRELIABLE_DATASET";
}

export interface RowValidationResult {
  isValid: boolean;
  isWarning: boolean;
  errors: string[];
  warnings: string[];
  cleanedRow?: {
    symbol: string;
    date: string;
    expiryDate: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    openInterest: number;
    daysToExpiry: number;
    qualityFlag: "clean" | "warning" | "corrupted";
    qualityNotes?: string;
  };
}

/**
 * Validates an individual Bhavcopy / daily market row against strict financial integrity rules.
 */
export function validateMarketRow(row: MarketRowInput, rowIndex: number): RowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Symbol check
  if (!row.symbol || typeof row.symbol !== "string" || row.symbol.trim() === "") {
    errors.push("Missing or invalid contract symbol");
  }

  // Date check
  if (!row.date || isNaN(Date.parse(row.date))) {
    errors.push(`Invalid trading date format: '${row.date}'`);
  }

  // Expiry Date check
  if (!row.expiryDate || isNaN(Date.parse(row.expiryDate))) {
    errors.push(`Invalid contract expiry date format: '${row.expiryDate}'`);
  }

  // Check if trading date is after expiry date
  let daysToExpiry = 0;
  if (row.date && row.expiryDate && !isNaN(Date.parse(row.date)) && !isNaN(Date.parse(row.expiryDate))) {
    const tradeTs = new Date(row.date).getTime();
    const expiryTs = new Date(row.expiryDate).getTime();
    const diffDays = Math.round((expiryTs - tradeTs) / (1000 * 60 * 60 * 24));
    daysToExpiry = diffDays;

    if (diffDays < 0) {
      errors.push(`Trading date (${row.date}) is after contract expiry (${row.expiryDate})`);
    } else if (diffDays <= 3) {
      warnings.push(`Contract is entering final delivery/settlement rollover window (${diffDays} days to expiry)`);
    }
  }

  // Numeric price checks
  const { open, high, low, close } = row;
  const numPrices = [open, high, low, close];
  if (numPrices.some((p) => p === undefined || p === null || isNaN(Number(p)) || Number(p) <= 0)) {
    errors.push("Zero, negative, or missing OHLC price values");
  } else {
    // High-Low Plausibility
    if (high < low) {
      errors.push(`High price (₹${high}) is strictly less than Low price (₹${low})`);
    }
    if (open > high || open < low) {
      errors.push(`Open price (₹${open}) is outside the [Low: ₹${low}, High: ₹${high}] bar range`);
    }
    if (close > high || close < low) {
      errors.push(`Close price (₹${close}) is outside the [Low: ₹${low}, High: ₹${high}] bar range`);
    }

    // Unrealistic price magnitude for MCX Gold (must be within sane bounds, e.g. ₹5,000 to ₹150,000 depending on quotation)
    if (close < 100) {
      warnings.push(`Close price (₹${close}) appears suspiciously low for gold derivatives`);
    }
  }

  // Volume & Open Interest checks
  const volume = Number(row.volume || 0);
  const openInterest = Number(row.openInterest || 0);
  if (volume < 0) {
    errors.push(`Negative trading volume (${volume})`);
  } else if (volume === 0) {
    warnings.push("Zero trading volume recorded for session (illiquid/indicative quote)");
  }

  if (openInterest < 0) {
    errors.push(`Negative open interest (${openInterest})`);
  }

  const isValid = errors.length === 0;
  const isWarning = warnings.length > 0;

  if (!isValid) {
    return { isValid: false, isWarning: false, errors, warnings };
  }

  return {
    isValid: true,
    isWarning,
    errors,
    warnings,
    cleanedRow: {
      symbol: (row.symbol || "").toUpperCase().trim(),
      date: row.date.trim(),
      expiryDate: row.expiryDate.trim(),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: isNaN(volume) ? 0 : Math.max(0, volume),
      openInterest: isNaN(openInterest) ? 0 : Math.max(0, openInterest),
      daysToExpiry,
      qualityFlag: isWarning ? "warning" : "clean",
      qualityNotes: warnings.length > 0 ? warnings.join("; ") : undefined,
    },
  };
}

/**
 * Evaluates entire dataset to produce a comprehensive 0-100 Data Trust Score.
 */
export function calculateDatasetTrustScore(rows: MarketRowInput[]): DataTrustReport {
  if (!rows || rows.length === 0) {
    return {
      overallScore: 0,
      totalRows: 0,
      validRows: 0,
      rejectedRows: 0,
      warningRows: 0,
      checks: [],
      summaryMessage: "No data available to evaluate trust score.",
      recommendation: "UNRELIABLE_DATASET",
    };
  }

  const totalRows = rows.length;
  let rejectedCount = 0;
  let warningCount = 0;

  let zeroNegativePrices = 0;
  let highLowViolations = 0;
  let barBoundViolations = 0;
  let invalidDates = 0;
  let expiredTrading = 0;
  let zeroVolumeCount = 0;
  let priceSpikeCount = 0;
  const seenKeys = new Set<string>();
  let duplicateCount = 0;

  // Track price series for single-day abnormal spikes (>15%)
  const prevPriceBySymbol: Record<string, number> = {};

  const sampleViolations: Record<string, string[]> = {
    priceIntegrity: [],
    highLow: [],
    duplicates: [],
    dates: [],
    spikes: [],
    liquidity: [],
  };

  rows.forEach((row, idx) => {
    const val = validateMarketRow(row, idx);
    if (!val.isValid) {
      rejectedCount++;
      if (val.errors.some((e) => e.includes("Zero, negative"))) {
        zeroNegativePrices++;
        if (sampleViolations.priceIntegrity.length < 3) sampleViolations.priceIntegrity.push(`Row ${idx + 1}: ${val.errors.join(", ")}`);
      }
      if (val.errors.some((e) => e.includes("High price") || e.includes("outside the [Low"))) {
        highLowViolations++;
        if (sampleViolations.highLow.length < 3) sampleViolations.highLow.push(`Row ${idx + 1}: ${val.errors.join(", ")}`);
      }
      if (val.errors.some((e) => e.includes("Invalid trading date") || e.includes("Invalid contract expiry"))) {
        invalidDates++;
        if (sampleViolations.dates.length < 3) sampleViolations.dates.push(`Row ${idx + 1}: ${val.errors.join(", ")}`);
      }
      if (val.errors.some((e) => e.includes("after contract expiry"))) {
        expiredTrading++;
      }
    } else {
      if (val.isWarning) warningCount++;
      if (Number(row.volume || 0) === 0) {
        zeroVolumeCount++;
        if (sampleViolations.liquidity.length < 3) sampleViolations.liquidity.push(`Row ${idx + 1} (${row.symbol} ${row.date}): 0 volume`);
      }
    }

    // Duplicate check: (symbol, date, expiryDate)
    const key = `${row.symbol}_${row.date}_${row.expiryDate}`;
    if (seenKeys.has(key)) {
      duplicateCount++;
      if (sampleViolations.duplicates.length < 3) sampleViolations.duplicates.push(`Row ${idx + 1}: Duplicate record for ${key}`);
    } else {
      seenKeys.add(key);
    }

    // Spike check
    if (row.close && !isNaN(Number(row.close))) {
      const sym = row.symbol;
      const prev = prevPriceBySymbol[sym];
      const cur = Number(row.close);
      if (prev && prev > 0) {
        const changePct = Math.abs((cur - prev) / prev);
        if (changePct > 0.15) {
          priceSpikeCount++;
          if (sampleViolations.spikes.length < 3) {
            sampleViolations.spikes.push(`Row ${idx + 1} (${sym} on ${row.date}): ${(changePct * 100).toFixed(1)}% 1-day jump`);
          }
        }
      }
      prevPriceBySymbol[sym] = cur;
    }
  });

  const validRows = totalRows - rejectedCount;

  // Build checks & score deductions
  const checks: QualityCheckDetail[] = [
    {
      id: "price_validity",
      name: "Positive Non-Zero Price Integrity",
      category: "integrity",
      status: zeroNegativePrices === 0 ? "pass" : "fail",
      scoreImpact: Math.min(25, zeroNegativePrices * 5),
      explanation: "Verifies all Open, High, Low, Close prices are positive and non-zero.",
      violationsCount: zeroNegativePrices,
      sampleViolations: sampleViolations.priceIntegrity,
    },
    {
      id: "bar_logic",
      name: "OHLC Bar Geometry & High ≥ Low",
      category: "integrity",
      status: highLowViolations === 0 ? "pass" : "fail",
      scoreImpact: Math.min(25, highLowViolations * 5),
      explanation: "Ensures High is the maximum and Low is the minimum of the trading session.",
      violationsCount: highLowViolations,
      sampleViolations: sampleViolations.highLow,
    },
    {
      id: "duplicate_detection",
      name: "Unique Session Integrity (No Duplicates)",
      category: "consistency",
      status: duplicateCount === 0 ? "pass" : "fail",
      scoreImpact: Math.min(15, duplicateCount * 3),
      explanation: "Guarantees no duplicate Bhavcopy records exist for the same contract on the same date.",
      violationsCount: duplicateCount,
      sampleViolations: sampleViolations.duplicates,
    },
    {
      id: "date_expiry_alignment",
      name: "Date Parsing & Lifecycle Validity",
      category: "plausibility",
      status: invalidDates === 0 && expiredTrading === 0 ? "pass" : "fail",
      scoreImpact: Math.min(15, (invalidDates + expiredTrading) * 3),
      explanation: "Verifies valid date formats and ensures trading date ≤ contract expiry.",
      violationsCount: invalidDates + expiredTrading,
      sampleViolations: sampleViolations.dates,
    },
    {
      id: "price_continuity",
      name: "Unexplained Price Discontinuities (>15% jump)",
      category: "plausibility",
      status: priceSpikeCount === 0 ? "pass" : priceSpikeCount <= 2 ? "warning" : "fail",
      scoreImpact: Math.min(10, priceSpikeCount * 3),
      explanation: "Detects sudden uncircuit-broken jumps that typically indicate corrupted Bhavcopy tick data.",
      violationsCount: priceSpikeCount,
      sampleViolations: sampleViolations.spikes,
    },
    {
      id: "liquidity_presence",
      name: "Trading Volume & Liquidity Availability",
      category: "completeness",
      status: zeroVolumeCount === 0 ? "pass" : zeroVolumeCount / totalRows > 0.2 ? "warning" : "pass",
      scoreImpact: Math.min(10, Math.floor((zeroVolumeCount / totalRows) * 15)),
      explanation: "Tracks zero-volume / stale quote sessions that distort relative pricing models.",
      violationsCount: zeroVolumeCount,
      sampleViolations: sampleViolations.liquidity,
    },
  ];

  const totalDeductions = checks.reduce((sum, c) => sum + c.scoreImpact, 0);
  const overallScore = Math.max(0, Math.min(100, Math.round(100 - totalDeductions)));

  let recommendation: "RELIABLE_FOR_ANALYSIS" | "USE_WITH_CAUTION" | "UNRELIABLE_DATASET" = "RELIABLE_FOR_ANALYSIS";
  let summaryMessage = "Dataset passed all critical integrity, bar geometry, and date validation checks. Ready for quantitative modeling.";

  if (overallScore < 60 || rejectedCount / totalRows > 0.1) {
    recommendation = "UNRELIABLE_DATASET";
    summaryMessage = `Critical data quality issues detected (${rejectedCount} rejected rows, score: ${overallScore}/100). Quantitative results will be severely distorted.`;
  } else if (overallScore < 85 || warningCount > 0) {
    recommendation = "USE_WITH_CAUTION";
    summaryMessage = `Minor data quality warnings present (${warningCount} flagged rows, score: ${overallScore}/100). Review False Signal Detective diagnostics before trading.`;
  }

  return {
    overallScore,
    totalRows,
    validRows,
    rejectedRows: rejectedCount,
    warningRows: warningCount,
    checks,
    summaryMessage,
    recommendation,
  };
}
