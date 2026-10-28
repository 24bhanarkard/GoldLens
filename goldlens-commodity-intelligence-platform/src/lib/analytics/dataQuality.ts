import { DEFAULT_CONTRACT_REGISTRY, normalizePrice } from "./contracts";

export interface MarketRowInput {
  rowId?: string;
  symbol: string;
  date: string;
  expiryDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  openInterest?: number;
  qualityFlag?: string;
  qualityNotes?: string;
  [key: string]: unknown;
}

export interface ForensicRecordIssue {
  rowId: string;
  rowNumber: number;
  symbol: string;
  date: string;
  expiryDate: string;
  severity: "critical" | "warning";
  ruleId: string;
  ruleName: string;
  rawValues: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    openInterest: number;
  };
  reason: string;
  impactOnAnalytics: string;
  counterfactualCleanClose?: number;
  counterfactualCleanNormG999?: number;
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
  corruptedRows: number;
  checks: QualityCheckDetail[];
  forensicIssues: ForensicRecordIssue[];
  summaryMessage: string;
  recommendation: "RELIABLE_FOR_ANALYSIS" | "USE_WITH_CAUTION" | "UNRELIABLE_DATASET";
}

export interface RowValidationResult {
  isValid: boolean;
  isWarning: boolean;
  errors: string[];
  warnings: string[];
  cleanedRow?: {
    rowId: string;
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

  const symUpper = typeof row.symbol === "string" ? row.symbol.toUpperCase().trim() : "";

  // Symbol check
  if (!symUpper) {
    errors.push("Missing or invalid contract symbol");
  } else if (!DEFAULT_CONTRACT_REGISTRY[symUpper]) {
    warnings.push(`Unregistered symbol '${symUpper}' — verify quotation basis and fineness metadata`);
  }

  // Date check
  if (!row.date || isNaN(Date.parse(row.date))) {
    errors.push(`Invalid trading date format: '${row.date}'`);
  } else if (symUpper && DEFAULT_CONTRACT_REGISTRY[symUpper]) {
    const spec = DEFAULT_CONTRACT_REGISTRY[symUpper];
    if (row.date < spec.applicableFrom) {
      warnings.push(
        `Date (${row.date}) precedes MCX launch/effective date (${spec.applicableFrom}) for ${symUpper}`
      );
    }
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
      warnings.push(`Contract is within staggered tender/delivery window (${diffDays}d to expiry)`);
    }
  }

  // Numeric price checks
  const { open, high, low, close } = row;
  const numPrices = [open, high, low, close];
  if (numPrices.some((p) => p === undefined || p === null || isNaN(Number(p)) || Number(p) <= 0)) {
    errors.push("Zero, negative, or missing OHLC price values");
  } else {
    if (high < low) {
      errors.push(`High price (₹${high}) is strictly less than Low price (₹${low})`);
    }
    if (open > high || open < low) {
      errors.push(`Open price (₹${open}) falls outside [Low: ₹${low}, High: ₹${high}]`);
    }
    if (close > high || close < low) {
      errors.push(`Close price (₹${close}) falls outside [Low: ₹${low}, High: ₹${high}]`);
    }
    if (close < 100) {
      warnings.push(`Close price (₹${close}) is implausibly low for MCX gold quotes`);
    }
  }

  // Volume & Open Interest checks
  const volume = Number(row.volume ?? 0);
  const openInterest = Number(row.openInterest ?? 0);
  if (volume < 0) {
    errors.push(`Negative trading volume (${volume})`);
  } else if (volume === 0) {
    warnings.push("Zero trading volume recorded for session (stale/indicative quote)");
  }

  if (openInterest < 0) {
    errors.push(`Negative open interest (${openInterest})`);
  }

  const isValid = errors.length === 0;
  const isWarning = warnings.length > 0;

  if (!isValid) {
    return { isValid: false, isWarning: false, errors, warnings };
  }

  const rowId = row.rowId || `ROW_${symUpper}_${row.date.trim()}_${rowIndex + 1}`;

  return {
    isValid: true,
    isWarning,
    errors,
    warnings,
    cleanedRow: {
      rowId,
      symbol: symUpper,
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
 * Evaluates entire dataset to produce a transparent 0–100 Data Trust Score and Data Forensics log.
 */
export function calculateDatasetTrustScore(rows: MarketRowInput[]): DataTrustReport {
  if (!rows || rows.length === 0) {
    return {
      overallScore: 0,
      totalRows: 0,
      validRows: 0,
      rejectedRows: 0,
      warningRows: 0,
      corruptedRows: 0,
      checks: [],
      forensicIssues: [],
      summaryMessage: "No records loaded to evaluate Data Trust Score.",
      recommendation: "UNRELIABLE_DATASET",
    };
  }

  const totalRows = rows.length;
  let rejectedCount = 0;
  let warningCount = 0;
  let corruptedCount = 0;

  let zeroNegativePrices = 0;
  let highLowViolations = 0;
  let invalidDates = 0;
  let expiredTrading = 0;
  let zeroVolumeCount = 0;
  let priceSpikeCount = 0;
  const seenKeys = new Set<string>();
  let duplicateCount = 0;

  // Group chronologically per contract expiry series for spike & counterfactual inspection
  const seriesByContractExpiry = new Map<string, { idx: number; row: MarketRowInput }[]>();
  rows.forEach((row, idx) => {
    const k = `${String(row.symbol || "").toUpperCase()}_${row.expiryDate}`;
    const arr = seriesByContractExpiry.get(k) || [];
    arr.push({ idx, row });
    seriesByContractExpiry.set(k, arr);
  });

  const forensicIssues: ForensicRecordIssue[] = [];
  const sampleViolations: Record<string, string[]> = {
    priceIntegrity: [],
    highLow: [],
    duplicates: [],
    dates: [],
    spikes: [],
    liquidity: [],
  };

  rows.forEach((row, idx) => {
    const rowId = row.rowId || `ROW_${String(row.symbol || "UNK").toUpperCase()}_${row.date}_${idx + 1}`;
    const val = validateMarketRow(row, idx);

    const rawValues = {
      open: Number(row.open || 0),
      high: Number(row.high || 0),
      low: Number(row.low || 0),
      close: Number(row.close || 0),
      volume: Number(row.volume || 0),
      openInterest: Number(row.openInterest || 0),
    };

    if (row.qualityFlag === "corrupted") {
      corruptedCount++;
    }

    if (!val.isValid) {
      rejectedCount++;
      if (val.errors.some((e) => e.includes("Zero, negative"))) {
        zeroNegativePrices++;
        if (sampleViolations.priceIntegrity.length < 3) {
          sampleViolations.priceIntegrity.push(`Row ${idx + 1} (${row.symbol} ${row.date}): ${val.errors.join(", ")}`);
        }
      }
      if (val.errors.some((e) => e.includes("High price") || e.includes("falls outside"))) {
        highLowViolations++;
        if (sampleViolations.highLow.length < 3) {
          sampleViolations.highLow.push(`Row ${idx + 1} (${row.symbol} ${row.date}): ${val.errors.join(", ")}`);
        }
      }
      if (val.errors.some((e) => e.includes("Invalid trading date") || e.includes("Invalid contract expiry"))) {
        invalidDates++;
        if (sampleViolations.dates.length < 3) {
          sampleViolations.dates.push(`Row ${idx + 1}: ${val.errors.join(", ")}`);
        }
      }
      if (val.errors.some((e) => e.includes("after contract expiry"))) {
        expiredTrading++;
      }

      forensicIssues.push({
        rowId,
        rowNumber: idx + 1,
        symbol: String(row.symbol || "UNKNOWN").toUpperCase(),
        date: String(row.date || "N/A"),
        expiryDate: String(row.expiryDate || "N/A"),
        severity: "critical",
        ruleId: "OHLC_STRUCTURAL_VALIDATION",
        ruleName: "OHLC Bar Geometry & Positive Price Integrity",
        rawValues,
        reason: val.errors.join("; "),
        impactOnAnalytics:
          "Record fails structural bar integrity. Any spread anomaly on this session is disqualified as DATA_UNRELIABLE so corrupted prints never trigger trades.",
      });
    } else {
      if (val.isWarning) warningCount++;
      if (Number(row.volume || 0) === 0) {
        zeroVolumeCount++;
        if (sampleViolations.liquidity.length < 3) {
          sampleViolations.liquidity.push(`Row ${idx + 1} (${row.symbol} ${row.date}): 0 volume`);
        }
        forensicIssues.push({
          rowId,
          rowNumber: idx + 1,
          symbol: String(row.symbol || "").toUpperCase(),
          date: String(row.date || ""),
          expiryDate: String(row.expiryDate || ""),
          severity: "warning",
          ruleId: "ZERO_SESSION_VOLUME",
          ruleName: "Zero Session Liquidity Warning",
          rawValues,
          reason: "Zero lots traded during session; closing price is an indicative/settlement mark.",
          impactOnAnalytics:
            "Spread cannot be executed at quoted close without severe orderbook slippage; blocked by liquidity check.",
        });
      }
    }

    // Duplicate check: (symbol, date, expiryDate)
    const key = `${row.symbol}_${row.date}_${row.expiryDate}`;
    if (seenKeys.has(key)) {
      duplicateCount++;
      if (sampleViolations.duplicates.length < 3) {
        sampleViolations.duplicates.push(`Row ${idx + 1}: Duplicate record for ${key}`);
      }
      forensicIssues.push({
        rowId,
        rowNumber: idx + 1,
        symbol: String(row.symbol || "").toUpperCase(),
        date: String(row.date || ""),
        expiryDate: String(row.expiryDate || ""),
        severity: "critical",
        ruleId: "DUPLICATE_SESSION_KEY",
        ruleName: "Unique Contract-Date Key",
        rawValues,
        reason: `Duplicate Bhavcopy entry for (${row.symbol}, ${row.date}, ${row.expiryDate}).`,
        impactOnAnalytics: "Creates ambiguous session close alignment; deduplication required prior to modeling.",
      });
    } else {
      seenKeys.add(key);
    }
  });

  // Check discontinuities (>8% 1-day jump beyond MCX initial/extended circuit limits) within same expiry contract
  seriesByContractExpiry.forEach((items) => {
    items.sort((a, b) => String(a.row.date).localeCompare(String(b.row.date)));
    for (let i = 1; i < items.length; i++) {
      const prev = Number(items[i - 1].row.close || 0);
      const cur = Number(items[i].row.close || 0);
      const next = i + 1 < items.length ? Number(items[i + 1].row.close || 0) : null;
      if (prev > 0 && cur > 0) {
        const changePct = Math.abs((cur - prev) / prev);
        if (changePct > 0.08) {
          priceSpikeCount++;
          const r = items[i].row;
          const rIdx = items[i].idx;
          const rowId = r.rowId || `ROW_${String(r.symbol).toUpperCase()}_${r.date}_${rIdx + 1}`;
          if (sampleViolations.spikes.length < 4) {
            sampleViolations.spikes.push(
              `Row ${rIdx + 1} (${r.symbol} on ${r.date}): ${(changePct * 100).toFixed(1)}% 1-session jump (₹${prev.toLocaleString("en-IN")} ➔ ₹${cur.toLocaleString("en-IN")})`
            );
          }

          // Compute non-destructive counterfactual reference (midpoint if neighbor exists, else prior close)
          const refClose = next && next > 0 ? Math.round((prev + next) / 2) : prev;
          const refNorm = normalizePrice(refClose, String(r.symbol)).normalizedPriceG999;

          const alreadyLogged = forensicIssues.find((f) => f.rowId === rowId);
          if (alreadyLogged) {
            alreadyLogged.counterfactualCleanClose = refClose;
            alreadyLogged.counterfactualCleanNormG999 = Number(refNorm.toFixed(2));
            alreadyLogged.reason += `; Single-session ${(changePct * 100).toFixed(1)}% discontinuity breaching MCX 6–9% circuit bounds`;
          } else {
            forensicIssues.push({
              rowId,
              rowNumber: rIdx + 1,
              symbol: String(r.symbol || "").toUpperCase(),
              date: String(r.date || ""),
              expiryDate: String(r.expiryDate || ""),
              severity: "critical",
              ruleId: "CIRCUIT_BREAKER_DISCONTINUITY",
              ruleName: "MCX Daily Price Limit Plausibility (>8% Jump)",
              rawValues: {
                open: Number(r.open || 0),
                high: Number(r.high || 0),
                low: Number(r.low || 0),
                close: cur,
                volume: Number(r.volume || 0),
                openInterest: Number(r.openInterest || 0),
              },
              reason: `Single-session jump of ${(changePct * 100).toFixed(1)}% (₹${prev.toLocaleString("en-IN")} ➔ ₹${cur.toLocaleString("en-IN")}) breaches standard MCX daily price limits (3%–9%).`,
              impactOnAnalytics:
                "Creates an artificial spread spike and inflates rolling volatility if unflagged. Disqualified from trading signals and isolated from rolling baseline statistics.",
              counterfactualCleanClose: refClose,
              counterfactualCleanNormG999: Number(refNorm.toFixed(2)),
            });
          }
        }
      }
    }
  });

  const validRows = totalRows - rejectedCount;

  const checks: QualityCheckDetail[] = [
    {
      id: "price_validity",
      name: "Positive Non-Zero Price Integrity",
      category: "integrity",
      status: zeroNegativePrices === 0 ? "pass" : "fail",
      scoreImpact: Math.min(25, zeroNegativePrices * 5),
      explanation: "Verifies all Open, High, Low, and Close quotes are strictly positive numbers.",
      violationsCount: zeroNegativePrices,
      sampleViolations: sampleViolations.priceIntegrity,
    },
    {
      id: "bar_logic",
      name: "OHLC Bar Geometry (Low ≤ Open, Close ≤ High)",
      category: "integrity",
      status: highLowViolations === 0 ? "pass" : highLowViolations <= 2 ? "warning" : "fail",
      scoreImpact: Math.min(25, highLowViolations * 4),
      explanation: "Confirms every session bar satisfies Low ≤ Open ≤ High and Low ≤ Close ≤ High.",
      violationsCount: highLowViolations,
      sampleViolations: sampleViolations.highLow,
    },
    {
      id: "duplicate_detection",
      name: "Unique Session Key (Symbol × Date × Expiry)",
      category: "consistency",
      status: duplicateCount === 0 ? "pass" : "fail",
      scoreImpact: Math.min(15, duplicateCount * 3),
      explanation: "Ensures no duplicate Bhavcopy rows exist for the same contract and trading date.",
      violationsCount: duplicateCount,
      sampleViolations: sampleViolations.duplicates,
    },
    {
      id: "date_expiry_alignment",
      name: "Date Validity & Pre-Expiry Lifecycle Check",
      category: "plausibility",
      status: invalidDates === 0 && expiredTrading === 0 ? "pass" : "fail",
      scoreImpact: Math.min(15, (invalidDates + expiredTrading) * 3),
      explanation: "Checks ISO date validity, contract launch dates, and Trading Date ≤ Expiry Date.",
      violationsCount: invalidDates + expiredTrading,
      sampleViolations: sampleViolations.dates,
    },
    {
      id: "price_continuity",
      name: "Daily Circuit-Limit Continuity (≤8% Session Move)",
      category: "plausibility",
      status: priceSpikeCount === 0 ? "pass" : priceSpikeCount <= 2 ? "warning" : "fail",
      scoreImpact: Math.min(12, priceSpikeCount * 3),
      explanation: "Flags uncircuit-broken single-day jumps (>8%) within the same expiry contract.",
      violationsCount: priceSpikeCount,
      sampleViolations: sampleViolations.spikes,
    },
    {
      id: "liquidity_presence",
      name: "Session Volume Availability",
      category: "completeness",
      status: zeroVolumeCount === 0 ? "pass" : "warning",
      scoreImpact: Math.min(10, Math.ceil((zeroVolumeCount / totalRows) * 20)),
      explanation: "Flags zero-volume sessions whose closing prices represent unexecuted settlement marks.",
      violationsCount: zeroVolumeCount,
      sampleViolations: sampleViolations.liquidity,
    },
  ];

  const totalDeductions = checks.reduce((sum, c) => sum + c.scoreImpact, 0);
  const overallScore = Math.max(0, Math.min(100, Math.round(100 - totalDeductions)));

  let recommendation: "RELIABLE_FOR_ANALYSIS" | "USE_WITH_CAUTION" | "UNRELIABLE_DATASET" =
    "RELIABLE_FOR_ANALYSIS";
  let summaryMessage =
    "All critical structural checks passed. Dataset integrity supports quantitative spread modeling.";

  if (overallScore < 60 || rejectedCount / totalRows > 0.1) {
    recommendation = "UNRELIABLE_DATASET";
    summaryMessage = `Material integrity failures detected (${forensicIssues.length} forensic flags, Trust Score ${overallScore}/100). Corrupt records must be excluded before trusting statistical signals.`;
  } else if (forensicIssues.length > 0 || overallScore < 95) {
    recommendation = "USE_WITH_CAUTION";
    summaryMessage = `Dataset overall score ${overallScore}/100 with ${forensicIssues.length} localized forensic flag(s) isolated automatically by Data Forensics so corrupted prints cannot trigger trades.`;
  }

  return {
    overallScore,
    totalRows,
    validRows,
    rejectedRows: rejectedCount,
    warningRows: warningCount,
    corruptedRows: Math.max(corruptedCount, rejectedCount),
    checks,
    forensicIssues,
    summaryMessage,
    recommendation,
  };
}
