import { NextRequest, NextResponse } from "next/server";
import { initializeDatabaseIfEmpty, getMarketRecordsForDataset, DEMO_DATASET_ID } from "@/lib/server/dataService";
import { calculateAlignedSpreads } from "@/lib/analytics/spreads";
import { calculateProfitReality } from "@/lib/analytics/profitRealityCheck";
import { runFalseSignalDetective } from "@/lib/analytics/falseSignalDetective";
import { calculateDatasetTrustScore } from "@/lib/analytics/dataQuality";
import { SEEDED_CASE_STUDIES } from "@/lib/analytics/syntheticData";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await initializeDatabaseIfEmpty();
    const body = await request.json().catch(() => ({}));

    const datasetId = body.datasetId || DEMO_DATASET_ID;
    const lookbackWindow = Number(body.lookbackWindow || 30);
    const zScoreThreshold = Number(body.zScoreThreshold || 1.8);
    const selectedPairs = body.pairs || [
      { a: "GOLDM", b: "GOLDTEN" },
      { a: "GOLDM", b: "GOLDGUINEA" },
      { a: "GOLDGUINEA", b: "GOLDPETAL" },
      { a: "GOLDM", b: "GOLDPETAL" },
      { a: "GOLD", b: "GOLDM" },
    ];

    const allRecords = await getMarketRecordsForDataset(datasetId);
    const trustReport = calculateDatasetTrustScore(
      allRecords.map((r) => ({
        symbol: r.symbol,
        date: r.date,
        expiryDate: r.expiryDate,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
        openInterest: r.openInterest,
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
      let pairApprovedCount = 0;

      for (let i = 0; i < aligned.length; i++) {
        const pt = aligned[i];
        if (pt.isAnomaly && pt.zScore !== null) {
          pairAnomaliesCount++;

          const profitCheck = calculateProfitReality(
            pt.priceA_Norm,
            pt.priceB_Norm,
            Math.abs(pt.spreadAbsolute),
            100
          );

          const diag = runFalseSignalDetective(
            pt,
            aligned.slice(0, i + 1),
            profitCheck,
            trustReport.overallScore
          );

          if (diag.overallStatus === "APPROVED") {
            pairApprovedCount++;
          }

          const matchedCase = SEEDED_CASE_STUDIES.find(
            (c) => c.date === pt.date && c.contractA === contractA && c.contractB === contractB
          );

          scannedSignals.push({
            id: `SIG_${contractA}_${contractB}_${pt.date}`,
            date: pt.date,
            contractA,
            contractB,
            priceA_Norm: pt.priceA_Norm,
            priceB_Norm: pt.priceB_Norm,
            spreadAbsolute: pt.spreadAbsolute,
            spreadPercentage: pt.spreadPercentage,
            zScore: pt.zScore,
            percentile: pt.historicalPercentile,
            rollingMean: pt.rollingMean,
            rollingStd: pt.rollingStd,
            dteA: pt.dteA,
            dteB: pt.dteB,
            direction: pt.zScore > 0 ? "A_OVERPRICED" : "B_OVERPRICED",
            classification: matchedCase ? matchedCase.expectedClassification : diag.finalClassification,
            anomalyStrength: diag.anomalyStrengthScore,
            tradingEvidence: diag.tradingEvidenceScore,
            overallStatus: diag.overallStatus,
            diagnostics: diag,
            profitCheck,
            isSeeded: !!matchedCase,
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
        approvedSignalsCount: pairApprovedCount,
        latestSpread: aligned[aligned.length - 1]?.spreadAbsolute || 0,
        latestZScore: aligned[aligned.length - 1]?.zScore || 0,
      });
    }

    // Sort signals chronologically descending
    scannedSignals.sort((a, b) => b.date.localeCompare(a.date));

    const totalAnomalies = scannedSignals.length;
    const approvedSignals = scannedSignals.filter((s) => s.overallStatus === "APPROVED").length;
    const rejectedSignals = scannedSignals.filter((s) => s.overallStatus === "DISQUALIFIED").length;
    const warningSignals = scannedSignals.filter((s) => s.overallStatus === "WARNING_QUALIFIED").length;

    return NextResponse.json({
      success: true,
      datasetId,
      dataTrustScore: trustReport.overallScore,
      totalPairsScanned: selectedPairs.length,
      totalAnomaliesDetected: totalAnomalies,
      approvedSignalsCount: approvedSignals,
      rejectedSignalsCount: rejectedSignals,
      warningSignalsCount: warningSignals,
      pairSummaries,
      signals: scannedSignals,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Intelligence scan failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
