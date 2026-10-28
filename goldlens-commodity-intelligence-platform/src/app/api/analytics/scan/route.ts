import { NextRequest, NextResponse } from "next/server";
import {
  initializeDatabaseIfEmpty,
  getMarketRecordsForDataset,
  DEMO_DATASET_ID,
} from "@/lib/server/dataService";
import {
  calculateAlignedSpreads,
  DailyContractPoint,
} from "@/lib/analytics/spreads";
import { calculateProfitReality } from "@/lib/analytics/profitRealityCheck";
import { runFalseSignalDetective } from "@/lib/analytics/falseSignalDetective";
import { findSpreadDNAPatterns } from "@/lib/analytics/spreadDNA";
import { calculateDatasetTrustScore } from "@/lib/analytics/dataQuality";
import { normalizePrice } from "@/lib/analytics/contracts";
import { SEEDED_CASE_STUDIES } from "@/lib/analytics/syntheticData";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await initializeDatabaseIfEmpty();
    const body = await request.json().catch(() => ({}));

    const datasetId = body.datasetId || DEMO_DATASET_ID;
    const lookbackWindow = Number(body.lookbackWindow || 30);
    const zScoreThreshold = Number(body.zScoreThreshold || 1.8);
    const defaultPairs = body.pairs || [
      { a: "GOLDM", b: "GOLDTEN" },
      { a: "GOLDM", b: "GOLDGUINEA" },
      { a: "GOLDGUINEA", b: "GOLDPETAL" },
      { a: "GOLDM", b: "GOLDPETAL" },
      { a: "GOLD", b: "GOLDM" },
    ];
    const requestedPairs =
      body.contractA && body.contractB
        ? [{ a: body.contractA, b: body.contractB }, ...defaultPairs]
        : defaultPairs;
    const pairMap = new Map<string, { a: string; b: string }>();
    for (const pair of requestedPairs as { a: string; b: string }[]) {
      const normalizedPair = {
        a: String(pair.a).toUpperCase(),
        b: String(pair.b).toUpperCase(),
      };
      pairMap.set(`${normalizedPair.a}/${normalizedPair.b}`, normalizedPair);
    }
    const selectedPairs = Array.from(pairMap.values());

    const allRecords: DailyContractPoint[] = Array.isArray(body.records)
      ? (body.records as DailyContractPoint[])
      : await getMarketRecordsForDataset(datasetId);
    const trustReport = calculateDatasetTrustScore(
      allRecords.map((r) => ({
        rowId: r.rowId,
        symbol: r.symbol,
        date: r.date,
        expiryDate: r.expiryDate,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
        openInterest: r.openInterest,
        qualityFlag: r.qualityFlag,
        qualityNotes: r.qualityNotes,
      }))
    );

    const scannedSignals = [];
    const pairSummaries = [];

    for (const pair of selectedPairs) {
      const contractA = (pair.a || "GOLDM").toUpperCase();
      const contractB = (pair.b || "GOLDTEN").toUpperCase();

      const dataA = allRecords.filter((r) => r.symbol.toUpperCase() === contractA);
      const dataB = allRecords.filter((r) => r.symbol.toUpperCase() === contractB);

      if (dataA.length < 15 || dataB.length < 15) continue;

      const aligned = calculateAlignedSpreads(dataA, dataB, {
        lookbackWindow,
        zScoreThreshold,
      });

      let pairAnomaliesCount = 0;
      let pairCredibleCount = 0;

      for (let i = 0; i < aligned.length; i++) {
        const pt = aligned[i];
        if (pt.isAnomaly && pt.zScore !== null) {
          pairAnomaliesCount++;

          const profitCheck = calculateProfitReality(
            pt.priceA_Norm,
            pt.priceB_Norm,
            Math.abs(pt.spreadAbsolute),
            undefined,
            { contractA, contractB }
          );

          const diag = runFalseSignalDetective(
            pt,
            aligned.slice(0, i + 1),
            profitCheck,
            trustReport.overallScore
          );

          if (diag.standardizedVerdict === "CREDIBLE ANOMALY") {
            pairCredibleCount++;
          }

          const spreadDNAReport = findSpreadDNAPatterns(pt, aligned, 4, true);
          const normA = normalizePrice(pt.priceA_Raw, contractA);
          const normB = normalizePrice(pt.priceB_Raw, contractB);

          // Check if Data Forensics has an explicit record issue for either row
          const forensicIssue = trustReport.forensicIssues.find(
            (fi) => fi.rowId === pt.rowIdA || fi.rowId === pt.rowIdB
          );

          const matchedCase = SEEDED_CASE_STUDIES.find(
            (c) => c.date === pt.date && c.contractA === contractA && c.contractB === contractB
          );

          scannedSignals.push({
            id: `SIG_${contractA}_${contractB}_${pt.date}`,
            date: pt.date,
            contractA,
            contractB,
            rowIdA: pt.rowIdA,
            rowIdB: pt.rowIdB,
            priceA_Raw: pt.priceA_Raw,
            priceB_Raw: pt.priceB_Raw,
            openA_Raw: pt.openA_Raw,
            highA_Raw: pt.highA_Raw,
            lowA_Raw: pt.lowA_Raw,
            openB_Raw: pt.openB_Raw,
            highB_Raw: pt.highB_Raw,
            lowB_Raw: pt.lowB_Raw,
            priceA_Norm: pt.priceA_Norm,
            priceB_Norm: pt.priceB_Norm,
            expiryA: pt.expiryA,
            expiryB: pt.expiryB,
            volumeA: pt.volumeA,
            volumeB: pt.volumeB,
            openInterestA: pt.openInterestA,
            openInterestB: pt.openInterestB,
            spreadAbsolute: pt.spreadAbsolute,
            spreadPercentage: pt.spreadPercentage,
            priceRatio: pt.priceRatio,
            zScore: pt.zScore,
            percentile: pt.historicalPercentile,
            rollingMean: pt.rollingMean,
            rollingStd: pt.rollingStd,
            sampleSizeUsed: pt.sampleSizeUsed,
            dteA: pt.dteA,
            dteB: pt.dteB,
            qualityStatus: pt.qualityStatus,
            direction: pt.zScore > 0 ? "A_OVERPRICED" : "B_OVERPRICED",
            verdict: diag.standardizedVerdict,
            classification: diag.finalClassification,
            isDataIntegrityFailure: diag.isDataIntegrityFailure,
            integrityWarningBanner: diag.integrityWarningBanner,
            anomalyStrength: diag.anomalyStrengthScore,
            tradingEvidence: diag.tradingEvidenceScore,
            dataTrustScore: trustReport.overallScore,
            overallStatus: diag.overallStatus,
            normA,
            normB,
            diagnostics: diag,
            profitCheck,
            spreadDNAReport,
            forensicIssue: forensicIssue || null,
            isSeeded: Boolean(matchedCase),
            seedCaseTitle: matchedCase?.title,
            seedCaseDescription: matchedCase?.description,
          });
        }
      }

      pairSummaries.push({
        contractA,
        contractB,
        sessionsCount: aligned.length,
        anomaliesCount: pairAnomaliesCount,
        approvedSignalsCount: pairCredibleCount,
        latestSpread: aligned[aligned.length - 1]?.spreadAbsolute || 0,
        latestZScore: aligned[aligned.length - 1]?.zScore || 0,
      });
    }

    scannedSignals.sort((a, b) => b.date.localeCompare(a.date));

    const totalAnomalies = scannedSignals.length;
    const credibleCount = scannedSignals.filter((s) => s.verdict === "CREDIBLE ANOMALY").length;
    const investigationCount = scannedSignals.filter(
      (s) => s.verdict === "NEEDS INVESTIGATION"
    ).length;
    const rejectedSignals = scannedSignals.filter((s) => s.verdict === "REJECTED").length;
    const insufficientCount = scannedSignals.filter(
      (s) => s.verdict === "INSUFFICIENT DATA"
    ).length;

    return NextResponse.json({
      success: true,
      datasetId,
      dataTrustScore: trustReport.overallScore,
      trustReport,
      totalPairsScanned: selectedPairs.length,
      totalAnomaliesDetected: totalAnomalies,
      approvedSignalsCount: credibleCount,
      warningSignalsCount: investigationCount,
      rejectedSignalsCount: rejectedSignals,
      insufficientSignalsCount: insufficientCount,
      pairSummaries,
      signals: scannedSignals,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Intelligence scan failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
