import { normalizePrice } from "./contracts";

export interface DailyContractPoint {
  rowId?: string;
  symbol: string;
  date: string;
  expiryDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest: number;
  normalizedPriceG999: number;
  daysToExpiry: number;
  qualityFlag: string;
  qualityNotes?: string;
}

export interface AlignedSpreadPoint {
  date: string;
  contractA: string;
  contractB: string;
  rowIdA: string;
  rowIdB: string;

  // Raw exchange quotes
  openA_Raw: number;
  highA_Raw: number;
  lowA_Raw: number;
  priceA_Raw: number;
  openB_Raw: number;
  highB_Raw: number;
  lowB_Raw: number;
  priceB_Raw: number;

  // Standardized ₹/g 999-fineness prices (Close & Open for next-bar backtesting)
  openA_Norm: number;
  openB_Norm: number;
  priceA_Norm: number;
  priceB_Norm: number;

  expiryA: string;
  expiryB: string;
  dteA: number;
  dteB: number;
  rolloverOccurred: boolean;

  volumeA: number;
  volumeB: number;
  openInterestA: number;
  openInterestB: number;

  // Relative price metrics
  openSpreadAbsolute: number; // OpenA_Norm - OpenB_Norm (for realistic T+1 open execution)
  spreadAbsolute: number; // PriceA_Norm - PriceB_Norm (₹/g)
  spreadPercentage: number; // ((PriceA_Norm - PriceB_Norm) / PriceB_Norm) * 100
  priceRatio: number; // PriceA_Norm / PriceB_Norm

  // Strictly prior lookback statistics (computed ONLY from past clean sessions < T)
  rollingMean: number | null;
  rollingStd: number | null;
  rollingUpperBand1: number | null;
  rollingLowerBand1: number | null;
  rollingUpperBand2: number | null;
  rollingLowerBand2: number | null;
  rollingUpperBand3: number | null;
  rollingLowerBand3: number | null;

  zScore: number | null;
  historicalPercentile: number | null;
  sampleSizeUsed: number;
  isSufficientSample: boolean;

  // Anomaly & Forensic Quality status
  isAnomaly: boolean;
  anomalyDirection?: "A_OVERPRICED" | "B_OVERPRICED";
  signalClassification?: string;
  qualityStatus: "clean" | "warning" | "corrupted";
  qualityFlagA: string;
  qualityFlagB: string;
  qualityNotesA?: string;
  qualityNotesB?: string;
}

export interface SpreadCalculationOptions {
  lookbackWindow?: number; // default 30
  zScoreThreshold?: number; // default 2.0
  minSampleRequired?: number; // default 15
  measureType?: "absolute" | "percentage" | "ratio"; // default 'absolute'
  excludeCorruptedRows?: boolean; // when true (e.g., Data Forensics clean preview), omits corrupted rows
}

/**
 * Aligns two contract time series by trading date and computes strictly prior-window statistics.
 * Guarantees zero look-ahead bias AND prevents corrupted prints from self-contaminating rolling σ.
 */
export function calculateAlignedSpreads(
  dataA: DailyContractPoint[],
  dataB: DailyContractPoint[],
  options: SpreadCalculationOptions = {}
): AlignedSpreadPoint[] {
  const lookbackWindow = options.lookbackWindow || 30;
  const zScoreThreshold = options.zScoreThreshold || 2.0;
  const minSampleRequired = options.minSampleRequired || 15;

  const mapA = new Map<string, DailyContractPoint>();
  dataA.forEach((d) => mapA.set(d.date, d));

  const mapB = new Map<string, DailyContractPoint>();
  dataB.forEach((d) => mapB.set(d.date, d));

  const allDates = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();
  const commonDates = allDates.filter((d) => mapA.has(d) && mapB.has(d));

  const result: AlignedSpreadPoint[] = [];
  // Store strictly past non-corrupted observations so rolling stats are neither forward-looking nor corrupted
  const cleanPriorSpreads: number[] = [];

  let prevExpiryA: string | null = null;
  let prevExpiryB: string | null = null;

  for (let i = 0; i < commonDates.length; i++) {
    const date = commonDates[i];
    const ptA = mapA.get(date)!;
    const ptB = mapB.get(date)!;

    const qualityStatus: "clean" | "warning" | "corrupted" =
      ptA.qualityFlag === "corrupted" || ptB.qualityFlag === "corrupted"
        ? "corrupted"
        : ptA.qualityFlag === "warning" || ptB.qualityFlag === "warning"
        ? "warning"
        : "clean";

    if (options.excludeCorruptedRows && qualityStatus === "corrupted") {
      continue;
    }

    const rolloverOccurred =
      (prevExpiryA !== null && ptA.expiryDate !== prevExpiryA) ||
      (prevExpiryB !== null && ptB.expiryDate !== prevExpiryB);
    prevExpiryA = ptA.expiryDate;
    prevExpiryB = ptB.expiryDate;

    const openA_Norm = normalizePrice(ptA.open, ptA.symbol).normalizedPriceG999;
    const openB_Norm = normalizePrice(ptB.open, ptB.symbol).normalizedPriceG999;

    const openSpreadAbs = openA_Norm - openB_Norm;
    const spreadAbs = ptA.normalizedPriceG999 - ptB.normalizedPriceG999;
    const spreadPct = ptB.normalizedPriceG999 > 0 ? (spreadAbs / ptB.normalizedPriceG999) * 100 : 0;
    const ratio = ptB.normalizedPriceG999 > 0 ? ptA.normalizedPriceG999 / ptB.normalizedPriceG999 : 1.0;

    const currentVal =
      options.measureType === "percentage"
        ? spreadPct
        : options.measureType === "ratio"
        ? ratio
        : spreadAbs;

    // Strictly prior lookback slice (only observations strictly BEFORE current date i)
    const windowStart = Math.max(0, cleanPriorSpreads.length - lookbackWindow);
    const windowSlice = cleanPriorSpreads.slice(windowStart);
    const sampleSize = windowSlice.length;
    const isSufficient = sampleSize >= minSampleRequired;

    let rollingMean: number | null = null;
    let rollingStd: number | null = null;
    let zScore: number | null = null;
    let percentile: number | null = null;

    if (isSufficient) {
      const sum = windowSlice.reduce((a, b) => a + b, 0);
      rollingMean = sum / sampleSize;

      const varianceSum = windowSlice.reduce((a, b) => a + Math.pow(b - rollingMean!, 2), 0);
      const variance = sampleSize > 1 ? varianceSum / (sampleSize - 1) : 0;
      rollingStd = Math.sqrt(variance);

      if (rollingStd > 1e-6) {
        zScore = (currentVal - rollingMean) / rollingStd;
      } else {
        // Explicit unavailable status when variance is zero / near-zero rather than fake 0 z-score
        zScore = null;
      }

      const countBelow = windowSlice.filter((v) => v < currentVal).length;
      const countEqual = windowSlice.filter((v) => v === currentVal).length;
      percentile = Math.round(((countBelow + 0.5 * countEqual) / sampleSize) * 1000) / 10;
    }

    // Only append clean/valid observations into baseline history AFTER evaluating current bar T
    if (qualityStatus !== "corrupted") {
      cleanPriorSpreads.push(currentVal);
    }

    const isAnomaly = zScore !== null && Math.abs(zScore) >= zScoreThreshold;
    const anomalyDirection = isAnomaly ? (zScore! > 0 ? "A_OVERPRICED" : "B_OVERPRICED") : undefined;

    const rowIdA = ptA.rowId || `ROW_${ptA.symbol}_${ptA.date}`;
    const rowIdB = ptB.rowId || `ROW_${ptB.symbol}_${ptB.date}`;

    result.push({
      date,
      contractA: ptA.symbol,
      contractB: ptB.symbol,
      rowIdA,
      rowIdB,
      openA_Raw: ptA.open,
      highA_Raw: ptA.high,
      lowA_Raw: ptA.low,
      priceA_Raw: ptA.close,
      openB_Raw: ptB.open,
      highB_Raw: ptB.high,
      lowB_Raw: ptB.low,
      priceB_Raw: ptB.close,
      openA_Norm: Number(openA_Norm.toFixed(2)),
      openB_Norm: Number(openB_Norm.toFixed(2)),
      priceA_Norm: Number(ptA.normalizedPriceG999.toFixed(2)),
      priceB_Norm: Number(ptB.normalizedPriceG999.toFixed(2)),
      expiryA: ptA.expiryDate,
      expiryB: ptB.expiryDate,
      dteA: ptA.daysToExpiry,
      dteB: ptB.daysToExpiry,
      rolloverOccurred,
      volumeA: ptA.volume,
      volumeB: ptB.volume,
      openInterestA: ptA.openInterest,
      openInterestB: ptB.openInterest,
      openSpreadAbsolute: Number(openSpreadAbs.toFixed(2)),
      spreadAbsolute: Number(spreadAbs.toFixed(2)),
      spreadPercentage: Number(spreadPct.toFixed(4)),
      priceRatio: Number(ratio.toFixed(6)),
      rollingMean: rollingMean !== null ? Number(rollingMean.toFixed(2)) : null,
      rollingStd: rollingStd !== null ? Number(rollingStd.toFixed(2)) : null,
      rollingUpperBand1:
        rollingMean !== null && rollingStd !== null ? Number((rollingMean + rollingStd).toFixed(2)) : null,
      rollingLowerBand1:
        rollingMean !== null && rollingStd !== null ? Number((rollingMean - rollingStd).toFixed(2)) : null,
      rollingUpperBand2:
        rollingMean !== null && rollingStd !== null
          ? Number((rollingMean + 2 * rollingStd).toFixed(2))
          : null,
      rollingLowerBand2:
        rollingMean !== null && rollingStd !== null
          ? Number((rollingMean - 2 * rollingStd).toFixed(2))
          : null,
      rollingUpperBand3:
        rollingMean !== null && rollingStd !== null
          ? Number((rollingMean + 3 * rollingStd).toFixed(2))
          : null,
      rollingLowerBand3:
        rollingMean !== null && rollingStd !== null
          ? Number((rollingMean - 3 * rollingStd).toFixed(2))
          : null,
      zScore: zScore !== null ? Number(zScore.toFixed(2)) : null,
      historicalPercentile: percentile,
      sampleSizeUsed: sampleSize,
      isSufficientSample: isSufficient,
      isAnomaly,
      anomalyDirection,
      qualityStatus,
      qualityFlagA: ptA.qualityFlag,
      qualityFlagB: ptB.qualityFlag,
      qualityNotesA: ptA.qualityNotes,
      qualityNotesB: ptB.qualityNotes,
    });
  }

  return result;
}

export interface SpreadDistributionStats {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  skewness: number;
  kurtosis: number;
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    p99: number;
  };
  histogramBuckets: {
    rangeMin: number;
    rangeMax: number;
    midpoint: number;
    count: number;
    density: number;
  }[];
}

/**
 * Calculates empirical distribution moments, quantiles, and histogram buckets.
 */
export function calculateSpreadDistribution(spreads: number[], bucketCount = 20): SpreadDistributionStats {
  if (spreads.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      skewness: 0,
      kurtosis: 0,
      percentiles: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0, p99: 0 },
      histogramBuckets: [],
    };
  }

  const sorted = [...spreads].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  const varSum = sorted.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
  const stdDev = n > 1 ? Math.sqrt(varSum / (n - 1)) : 0;

  let m3 = 0;
  let m4 = 0;
  sorted.forEach((x) => {
    const diff = x - mean;
    m3 += Math.pow(diff, 3);
    m4 += Math.pow(diff, 4);
  });
  const skewness = stdDev > 0 ? m3 / n / Math.pow(stdDev, 3) : 0;
  const kurtosis = stdDev > 0 ? m4 / n / Math.pow(stdDev, 4) - 3 : 0;

  const getPercentile = (p: number) => {
    const idx = (p / 100) * (n - 1);
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    const weight = idx - low;
    return sorted[low] * (1 - weight) + sorted[high] * weight;
  };

  const min = sorted[0];
  const max = sorted[n - 1];
  const span = max - min || 1;
  const bucketWidth = span / bucketCount;

  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const bMin = min + i * bucketWidth;
    const bMax = min + (i + 1) * bucketWidth;
    const midpoint = (bMin + bMax) / 2;
    const count = sorted.filter((v) =>
      i === bucketCount - 1 ? v >= bMin && v <= bMax : v >= bMin && v < bMax
    ).length;
    return {
      rangeMin: Number(bMin.toFixed(2)),
      rangeMax: Number(bMax.toFixed(2)),
      midpoint: Number(midpoint.toFixed(2)),
      count,
      density: Number((count / n).toFixed(4)),
    };
  });

  return {
    count: n,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    skewness: Number(skewness.toFixed(3)),
    kurtosis: Number(kurtosis.toFixed(3)),
    percentiles: {
      p5: Number(getPercentile(5).toFixed(2)),
      p25: Number(getPercentile(25).toFixed(2)),
      p50: Number(getPercentile(50).toFixed(2)),
      p75: Number(getPercentile(75).toFixed(2)),
      p95: Number(getPercentile(95).toFixed(2)),
      p99: Number(getPercentile(99).toFixed(2)),
    },
    histogramBuckets: buckets,
  };
}
