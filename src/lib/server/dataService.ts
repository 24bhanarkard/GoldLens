import { db } from "@/db";
import { contracts, datasets, marketData, rejectedRecords, signals, backtestRuns, researchReports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { DEFAULT_CONTRACT_REGISTRY } from "../analytics/contracts";
import { generateSyntheticMCXDataset, SEEDED_CASE_STUDIES } from "../analytics/syntheticData";
import { calculateDatasetTrustScore, validateMarketRow } from "../analytics/dataQuality";
import { calculateAlignedSpreads, DailyContractPoint } from "../analytics/spreads";
import { calculateProfitReality } from "../analytics/profitRealityCheck";
import { runFalseSignalDetective } from "../analytics/falseSignalDetective";
import { findSpreadDNAPatterns } from "../analytics/spreadDNA";
import { runBacktest, BacktestParameters } from "../analytics/backtester";

export const DEMO_DATASET_ID = "mcx_gold_demo_v1";

// Cache in memory for ultra-fast analytics queries in serverless environment
let inMemoryRecords: DailyContractPoint[] = [];
let inMemoryDatasetId = "";

/**
 * Initializes database tables with default MCX contracts and demo dataset if not present.
 */
export async function initializeDatabaseIfEmpty() {
  try {
    // Check if demo dataset already exists
    const existingDataset = await db.select().from(datasets).where(eq(datasets.id, DEMO_DATASET_ID)).limit(1);
    
    if (existingDataset.length === 0) {
      await loadDemoDatasetToDatabase();
    } else if (inMemoryRecords.length === 0) {
      const rows = await db.select().from(marketData).where(eq(marketData.datasetId, DEMO_DATASET_ID));
      if (rows.length > 0) {
        inMemoryRecords = rows.map((r) => ({
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
        inMemoryDatasetId = DEMO_DATASET_ID;
      } else {
        await loadDemoDatasetToDatabase();
      }
    }
  } catch (err) {
    console.error("Database initialization check error (falling back to memory):", err);
    if (inMemoryRecords.length === 0) {
      inMemoryRecords = generateSyntheticMCXDataset();
      inMemoryDatasetId = DEMO_DATASET_ID;
    }
  }
}

/**
 * Loads or resets the synthetic demo dataset in DB and memory.
 */
export async function loadDemoDatasetToDatabase() {
  const syntheticPoints = generateSyntheticMCXDataset();
  inMemoryRecords = syntheticPoints;
  inMemoryDatasetId = DEMO_DATASET_ID;

  const trustReport = calculateDatasetTrustScore(
    syntheticPoints.map((p) => ({
      symbol: p.symbol,
      date: p.date,
      expiryDate: p.expiryDate,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      volume: p.volume,
      openInterest: p.openInterest,
    }))
  );

  const dates = syntheticPoints.map((p) => p.date).sort();
  const dateMin = dates[0] || "2024-05-02";
  const dateMax = dates[dates.length - 1] || "2024-12-27";

  try {
    // Upsert contracts
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

    // Upsert dataset
    await db.delete(datasets).where(eq(datasets.id, DEMO_DATASET_ID));
    await db.insert(datasets).values({
      id: DEMO_DATASET_ID,
      name: "MCX Gold Futures Synthetic Bhavcopy (H2 2024)",
      sourceType: "demo",
      rowCount: syntheticPoints.length,
      validRows: trustReport.validRows,
      rejectedRows: trustReport.rejectedRows,
      dateMin,
      dateMax,
      dataTrustScore: trustReport.overallScore,
      qualitySummary: trustReport,
    });

    // Clear old market data for demo
    await db.delete(marketData).where(eq(marketData.datasetId, DEMO_DATASET_ID));

    // Batch insert market data
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

    // Seed Signals for Case Studies
    await db.delete(signals).where(eq(signals.datasetId, DEMO_DATASET_ID));
    
    // Generate signals for demo pairs
    const pairsToScan = [
      { a: "GOLDM", b: "GOLDTEN" },
      { a: "GOLDM", b: "GOLDGUINEA" },
      { a: "GOLDGUINEA", b: "GOLDPETAL" },
      { a: "GOLDM", b: "GOLDPETAL" },
    ];

    for (const pair of pairsToScan) {
      const dataA = syntheticPoints.filter((p) => p.symbol === pair.a);
      const dataB = syntheticPoints.filter((p) => p.symbol === pair.b);
      const spreads = calculateAlignedSpreads(dataA, dataB, { lookbackWindow: 30, zScoreThreshold: 1.8 });

      for (const pt of spreads) {
        if (pt.isAnomaly && pt.zScore !== null) {
          const profitCheck = calculateProfitReality(pt.priceA_Norm, pt.priceB_Norm, Math.abs(pt.spreadAbsolute), 100);
          const diag = runFalseSignalDetective(pt, spreads, profitCheck, trustReport.overallScore);
          const patternMatches = findSpreadDNAPatterns(pt, spreads);

          const matchedCase = SEEDED_CASE_STUDIES.find(
            (c) => c.date === pt.date && c.contractA === pair.a && c.contractB === pair.b
          );

          await db.insert(signals).values({
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
            classification: matchedCase ? matchedCase.expectedClassification : diag.finalClassification,
            anomalyStrength: diag.anomalyStrengthScore,
            tradingEvidence: diag.tradingEvidenceScore,
            dataTrustScore: trustReport.overallScore,
            diagnostics: diag,
            costAnalysis: profitCheck,
            patternMatches: patternMatches,
            isSeeded: !!matchedCase,
            seedCaseTitle: matchedCase?.title,
            seedCaseDescription: matchedCase?.description,
          }).onConflictDoNothing();
        }
      }
    }
  } catch (err) {
    console.error("Error inserting demo dataset into DB:", err);
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
 * Returns memory records or reads from DB.
 */
export async function getMarketRecordsForDataset(datasetId = DEMO_DATASET_ID): Promise<DailyContractPoint[]> {
  if (inMemoryDatasetId === datasetId && inMemoryRecords.length > 0) {
    return inMemoryRecords;
  }

  try {
    const rows = await db.select().from(marketData).where(eq(marketData.datasetId, datasetId));
    if (rows.length > 0) {
      inMemoryRecords = rows.map((r) => ({
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
      inMemoryDatasetId = datasetId;
      return inMemoryRecords;
    }
  } catch (err) {
    console.error("Error fetching market records from DB:", err);
  }

  // Fallback to synthetic
  inMemoryRecords = generateSyntheticMCXDataset();
  inMemoryDatasetId = DEMO_DATASET_ID;
  return inMemoryRecords;
}
