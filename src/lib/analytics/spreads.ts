export interface DailyContractPoint {
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
  priceA_Raw: number;
  priceB_Raw: number;
  priceA_Norm: number; // ₹/g 999
  priceB_Norm: number; // ₹/g 999
  expiryA: string;
  expiryB: string;
  dteA: number;
  dteB: number;
  volumeA: number;
  volumeB: number;
  openInterestA: number;
  openInterestB: number;
  
  // Relative price metrics
  spreadAbsolute: number; // PriceA_Norm - PriceB_Norm (₹/g)
  spreadPercentage: number; // ((PriceA_Norm - PriceB_Norm) / PriceB_Norm) * 100
  priceRatio: number; // PriceA_Norm / PriceB_Norm
  
  // Rolling Lookback Statistics (strictly using only past observations up to this date)
  rollingMean: number | null;
  rollingStd: number | null;
  rollingUpperBand1: number | null; // Mean + 1*Std
  rollingLowerBand1: number | null; // Mean - 1*Std
  rollingUpperBand2: number | null; // Mean + 2*Std
  rollingLowerBand2: number | null; // Mean - 2*Std
  rollingUpperBand3: number | null; // Mean + 3*Std
  rollingLowerBand3: number | null; // Mean - 3*Std
  
  zScore: number | null;
  historicalPercentile: number | null; // 0 to 100
  sampleSizeUsed: number;
  isSufficientSample: boolean;
  
  // Anomaly status
  isAnomaly: boolean;
  anomalyDirection?: "A_OVERPRICED" | "B_OVERPRICED";
  signalClassification?: string;
  qualityStatus: "clean" | "warning" | "corrupted";
}

export interface SpreadCalculationOptions {
  lookbackWindow?: number; // default 30
  zScoreThreshold?: number; // default 2.0
  minSampleRequired?: number; // default 15
  measureType?: "absolute" | "percentage" | "ratio"; // default 'absolute'
}

/**
 * Aligns two contract time series by date and computes strictly lookback-only relative pricing statistics.
 * Prevents lookahead bias by ensuring rolling statistics on day T compute over [T - lookback + 1 ... T].
 */
export function calculateAlignedSpreads(
  dataA: DailyContractPoint[],
  dataB: DailyContractPoint[],
  options: SpreadCalculationOptions = {}
): AlignedSpreadPoint[] {
  const lookbackWindow = options.lookbackWindow || 30;
  const zScoreThreshold = options.zScoreThreshold || 2.0;
  const minSampleRequired = options.minSampleRequired || 15;

  // Build index by date
  const mapA = new Map<string, DailyContractPoint>();
  dataA.forEach((d) => mapA.set(d.date, d));

  const mapB = new Map<string, DailyContractPoint>();
  dataB.forEach((d) => mapB.set(d.date, d));

  // Find common trading dates sorted chronologically
  const allDates = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();
  const commonDates = allDates.filter((d) => mapA.has(d) && mapB.has(d));

  const result: AlignedSpreadPoint[] = [];
  const historicalSpreads: number[] = [];

  for (let i = 0; i < commonDates.length; i++) {
    const date = commonDates[i];
    const ptA = mapA.get(date)!;
    const ptB = mapB.get(date)!;

    const spreadAbs = ptA.normalizedPriceG999 - ptB.normalizedPriceG999;
    const spreadPct = ptB.normalizedPriceG999 > 0 ? (spreadAbs / ptB.normalizedPriceG999) * 100 : 0;
    const ratio = ptB.normalizedPriceG999 > 0 ? ptA.normalizedPriceG999 / ptB.normalizedPriceG999 : 1.0;

    // Selected spread value for statistical modeling
    const currentVal = options.measureType === "percentage" ? spreadPct : options.measureType === "ratio" ? ratio : spreadAbs;
    historicalSpreads.push(currentVal);

    // Compute rolling window strictly over past observations up to index i
    const windowStart = Math.max(0, i - lookbackWindow + 1);
    const windowSlice = historicalSpreads.slice(windowStart, i + 1);
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

      // Guard against zero / near-zero variance
      if (rollingStd > 1e-6) {
        zScore = (currentVal - rollingMean) / rollingStd;
      } else {
        zScore = 0;
      }

      // Calculate percentile rank in historical lookback
      const countBelow = windowSlice.filter((v) => v < currentVal).length;
      const countEqual = windowSlice.filter((v) => v === currentVal).length;
      percentile = Math.round(((countBelow + 0.5 * countEqual) / sampleSize) * 1000) / 10;
    }

    const isAnomaly = zScore !== null && Math.abs(zScore) >= zScoreThreshold;
    const anomalyDirection = isAnomaly ? (zScore! > 0 ? "A_OVERPRICED" : "B_OVERPRICED") : undefined;

    const qualityStatus: "clean" | "warning" | "corrupted" =
      ptA.qualityFlag === "corrupted" || ptB.qualityFlag === "corrupted"
        ? "corrupted"
        : ptA.qualityFlag === "warning" || ptB.qualityFlag === "warning"
        ? "warning"
        : "clean";

    result.push({
      date,
      contractA: ptA.symbol,
      contractB: ptB.symbol,
      priceA_Raw: ptA.close,
      priceB_Raw: ptB.close,
      priceA_Norm: Number(ptA.normalizedPriceG999.toFixed(2)),
      priceB_Norm: Number(ptB.normalizedPriceG999.toFixed(2)),
      expiryA: ptA.expiryDate,
      expiryB: ptB.expiryDate,
      dteA: ptA.daysToExpiry,
      dteB: ptB.daysToExpiry,
      volumeA: ptA.volume,
      volumeB: ptB.volume,
      openInterestA: ptA.openInterest,
      openInterestB: ptB.openInterest,
      spreadAbsolute: Number(spreadAbs.toFixed(2)),
      spreadPercentage: Number(spreadPct.toFixed(4)),
      priceRatio: Number(ratio.toFixed(6)),
      rollingMean: rollingMean !== null ? Number(rollingMean.toFixed(2)) : null,
      rollingStd: rollingStd !== null ? Number(rollingStd.toFixed(2)) : null,
      rollingUpperBand1: rollingMean !== null && rollingStd !== null ? Number((rollingMean + rollingStd).toFixed(2)) : null,
      rollingLowerBand1: rollingMean !== null && rollingStd !== null ? Number((rollingMean - rollingStd).toFixed(2)) : null,
      rollingUpperBand2: rollingMean !== null && rollingStd !== null ? Number((rollingMean + 2 * rollingStd).toFixed(2)) : null,
      rollingLowerBand2: rollingMean !== null && rollingStd !== null ? Number((rollingMean - 2 * rollingStd).toFixed(2)) : null,
      rollingUpperBand3: rollingMean !== null && rollingStd !== null ? Number((rollingMean + 3 * rollingStd).toFixed(2)) : null,
      rollingLowerBand3: rollingMean !== null && rollingStd !== null ? Number((rollingMean - 3 * rollingStd).toFixed(2)) : null,
      zScore: zScore !== null ? Number(zScore.toFixed(2)) : null,
      historicalPercentile: percentile,
      sampleSizeUsed: sampleSize,
      isSufficientSample: isSufficient,
      isAnomaly,
      anomalyDirection,
      qualityStatus,
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
 * Calculates distribution statistics and histogram buckets for historical spread series.
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

  // Skewness and Kurtosis
  let m3 = 0;
  let m4 = 0;
  sorted.forEach((x) => {
    const diff = x - mean;
    m3 += Math.pow(diff, 3);
    m4 += Math.pow(diff, 4);
  });
  const skewness = stdDev > 0 ? (m3 / n) / Math.pow(stdDev, 3) : 0;
  const kurtosis = stdDev > 0 ? (m4 / n) / Math.pow(stdDev, 4) - 3 : 0;

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
    const count = sorted.filter((v) => (i === bucketCount - 1 ? v >= bMin && v <= bMax : v >= bMin && v < bMax)).length;
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
