import { db } from "@/db";
import { contracts, datasets, marketData, signals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_CONTRACT_REGISTRY } from "../analytics/contracts";
import { generateSyntheticMCXDataset, SEEDED_CASE_STUDIES } from "../analytics/syntheticData";
import { calculateDatasetTrustScore, DataTrustReport } from "../analytics/dataQuality";
import { calculateAlignedSpreads, DailyContractPoint } from "../analytics/spreads";
import { calculateProfitReality } from "../analytics/profitRealityCheck";
import { runFalseSignalDetective } from "../analytics/falseSignalDetective";
import { findSpreadDNAPatterns } from "../analytics/spreadDNA";

export const DEMO_DATASET_ID = "mcx_gold_demo_v2";

export interface StoredDatasetBundle {
  id: string;
  name: string;
  sourceType: "demo" | "uploaded";
  records: DailyContractPoint[];
  rejectedRecords: {
    rowNumber: number;
    rawData: Record<string, unknown>;
    rejectionReason: string;
    severity: string;
  }[];
  trustReport: DataTrustReport;
  dateMin: string | null;
  dateMax: string | null;
}

const memoryDatasets = new Map<string, StoredDatasetBundle>();

export function saveDatasetBundleInMemory(bundle: StoredDatasetBundle) {
  memoryDatasets.set(bundle.id, bundle);
}

export function getDatasetBundleFromMemory(datasetId: string): StoredDatasetBundle | undefined {
  return memoryDatasets.get(datasetId);
}

export function listMemoryDatasets(): StoredDatasetBundle[] {
  return Array.from(memoryDatasets.values());
}

/**
 * Ensures default demo bundle is always initialized in memory and synced to PostgreSQL when available.
 */
export async function initializeDatabaseIfEmpty() {
  if (!memoryDatasets.has(DEMO_DATASET_ID)) {
    await loadDemoDatasetToDatabase();
  }
}

/**
 * Builds or resets the reproducible synthetic MCX demo dataset (May–Dec 2025).
 */
export async function loadDemoDatasetToDatabase() {
  const syntheticPoints = generateSyntheticMCXDataset();

  const trustReport = calculateDatasetTrustScore(
    syntheticPoints.map((p) => ({
      rowId: p.rowId,
      symbol: p.symbol,
      date: p.date,
      expiryDate: p.expiryDate,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      volume: p.volume,
      openInterest: p.openInterest,
      qualityFlag: p.qualityFlag,
      qualityNotes: p.qualityNotes,
    }))
  );

  const dates = syntheticPoints.map((p) => p.date).sort();
  const dateMin = dates[0] || "2025-05-01";
  const dateMax = dates[dates.length - 1] || "2025-12-26";

  saveDatasetBundleInMemory({
    id: DEMO_DATASET_ID,
    name: "MCX Gold Futures Synthetic Demo (May–Dec 2025)",
    sourceType: "demo",
    records: syntheticPoints,
    rejectedRecords: [],
    trustReport,
    dateMin,
    dateMax,
  });

  // Also register legacy alias so any bookmark or client calling mcx_gold_demo_v1 continues working seamlessly
  saveDatasetBundleInMemory({
    id: "mcx_gold_demo_v1",
    name: "MCX Gold Futures Synthetic Demo (May–Dec 2025)",
    sourceType: "demo",
    records: syntheticPoints,
    rejectedRecords: [],
    trustReport,
    dateMin,
    dateMax,
  });

  try {
    if (process.env.DATABASE_URL) {
      for (const key of Object.keys(DEFAULT_CONTRACT_REGISTRY)) {
        const c = DEFAULT_CONTRACT_REGISTRY[key];
        await db
          .insert(contracts)
          .values({
            symbol: c.symbol,
            exchange: c.exchange,
            category: c.category,
            nominalQtyGrams: c.nominalQtyGrams,
            qtyUnit: c.qtyUnit,
            quotationBasis: c.quotationBasis,
            quotationMultiplier: c.quotationMultiplier,
            referencePurity: c.referencePurity,
            lotSize: c.lotSize,
            priceUnit: c.priceUnit,
            currency: c.currency,
            description: c.description,
            specificationSource: c.specificationSource,
            lastVerifiedDate: c.lastVerifiedDate,
          })
          .onConflictDoNothing();
      }

      await db.delete(datasets).where(eq(datasets.id, DEMO_DATASET_ID));
      await db.insert(datasets).values({
        id: DEMO_DATASET_ID,
        name: "MCX Gold Futures Synthetic Demo (May–Dec 2025)",
        sourceType: "demo",
        rowCount: syntheticPoints.length,
        validRows: trustReport.validRows,
        rejectedRows: trustReport.rejectedRows,
        dateMin,
        dateMax,
        dataTrustScore: trustReport.overallScore,
        qualitySummary: trustReport,
      });

      await db.delete(marketData).where(eq(marketData.datasetId, DEMO_DATASET_ID));
      const batchSize = 100;
      for (let i = 0; i < syntheticPoints.length; i += batchSize) {
        const chunk = syntheticPoints.slice(i, i + batchSize).map((p) => ({
          datasetId: DEMO_DATASET_ID,
          symbol: p.symbol,
          date: p.date,
          expiryDate: p.expiryDate,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume,
          openInterest: p.openInterest,
          normalizedPriceG999: p.normalizedPriceG999,
          daysToExpiry: p.daysToExpiry,
          qualityFlag: p.qualityFlag,
          qualityNotes: p.qualityNotes,
          isSynthetic: true,
        }));
        await db.insert(marketData).values(chunk);
      }

      await db.delete(signals).where(eq(signals.datasetId, DEMO_DATASET_ID));
      const pairsToScan = [
        { a: "GOLDM", b: "GOLDTEN" },
        { a: "GOLDM", b: "GOLDGUINEA" },
        { a: "GOLDGUINEA", b: "GOLDPETAL" },
        { a: "GOLDM", b: "GOLDPETAL" },
      ];

      for (const pair of pairsToScan) {
        const dataA = syntheticPoints.filter((p) => p.symbol === pair.a);
        const dataB = syntheticPoints.filter((p) => p.symbol === pair.b);
        const spreads = calculateAlignedSpreads(dataA, dataB, {
          lookbackWindow: 30,
          zScoreThreshold: 1.8,
        });

        for (let i = 0; i < spreads.length; i++) {
          const pt = spreads[i];
          if (pt.isAnomaly && pt.zScore !== null) {
            const profitCheck = calculateProfitReality(
              pt.priceA_Norm,
              pt.priceB_Norm,
              Math.abs(pt.spreadAbsolute),
              undefined,
              { contractA: pair.a, contractB: pair.b }
            );
            const diag = runFalseSignalDetective(
              pt,
              spreads.slice(0, i + 1),
              profitCheck,
              trustReport.overallScore
            );
            const patternMatches = findSpreadDNAPatterns(pt, spreads, 5, true);
            const matchedCase = SEEDED_CASE_STUDIES.find(
              (c) => c.date === pt.date && c.contractA === pair.a && c.contractB === pair.b
            );

            await db
              .insert(signals)
              .values({
                id: `SIG_${pair.a}_${pair.b}_${pt.date}`,
                datasetId: DEMO_DATASET_ID,
                signalDate: pt.date,
                contractA: pair.a,
                contractB: pair.b,
                spreadValue: pt.spreadAbsolute,
                zScore: pt.zScore,
                percentile: pt.historicalPercentile || 50,
                rollingMean: pt.rollingMean || 0,
                rollingStd: pt.rollingStd || 1,
                lookbackWindow: 30,
                direction: pt.zScore > 0 ? "A_OVERPRICED" : "B_OVERPRICED",
                classification: diag.finalClassification,
                anomalyStrength: diag.anomalyStrengthScore,
                tradingEvidence: diag.tradingEvidenceScore,
                dataTrustScore: trustReport.overallScore,
                diagnostics: diag,
                costAnalysis: profitCheck,
                patternMatches,
                isSeeded: Boolean(matchedCase),
                seedCaseTitle: matchedCase?.title,
                seedCaseDescription: matchedCase?.description,
              })
              .onConflictDoNothing();
          }
        }
      }
    }
  } catch (err) {
    console.warn("Database sync skipped (operating cleanly on in-memory store):", err);
  }

  return {
    success: true,
    datasetId: DEMO_DATASET_ID,
    rowCount: syntheticPoints.length,
    trustScore: trustReport.overallScore,
    dateMin,
    dateMax,
  };
}

/**
 * Returns records for any requested datasetId (demo or uploaded CSV) cleanly in both DB and zero-DB environments.
 */
export async function getMarketRecordsForDataset(
  datasetId = DEMO_DATASET_ID
): Promise<DailyContractPoint[]> {
  await initializeDatabaseIfEmpty();

  const cached = memoryDatasets.get(datasetId);
  if (cached && cached.records.length > 0) {
    return cached.records;
  }

  try {
    if (process.env.DATABASE_URL) {
      const rows = await db
        .select()
        .from(marketData)
        .where(eq(marketData.datasetId, datasetId));
      if (rows.length > 0) {
        const mapped: DailyContractPoint[] = rows.map((r, idx) => ({
          rowId: `ROW_${r.symbol}_${r.date}_${r.id ?? idx + 1}`,
          symbol: r.symbol,
          date: r.date,
          expiryDate: r.expiryDate,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.volume,
          openInterest: r.openInterest,
          normalizedPriceG999: r.normalizedPriceG999,
          daysToExpiry: r.daysToExpiry || 0,
          qualityFlag: r.qualityFlag || "clean",
          qualityNotes: r.qualityNotes || undefined,
        }));
        return mapped;
      }
    }
  } catch {
    // Fallback to demo bundle
  }

  return memoryDatasets.get(DEMO_DATASET_ID)?.records || generateSyntheticMCXDataset();
}
