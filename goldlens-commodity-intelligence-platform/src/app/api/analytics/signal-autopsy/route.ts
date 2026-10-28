import { NextRequest, NextResponse } from "next/server";
import {
  initializeDatabaseIfEmpty,
  getMarketRecordsForDataset,
  DEMO_DATASET_ID,
} from "@/lib/server/dataService";
import { calculateAlignedSpreads } from "@/lib/analytics/spreads";
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
    const body = await request.json();

    const datasetId = body.datasetId || DEMO_DATASET_ID;
    const signalDate = body.signalDate;
    const contractA = (body.contractA || "GOLDM").toUpperCase();
    const contractB = (body.contractB || "GOLDTEN").toUpperCase();
    const lookbackWindow = Number(body.lookbackWindow || 30);

    if (!signalDate) {
      return NextResponse.json(
        { success: false, error: "Missing 'signalDate' parameter." },
        { status: 400 }
      );
    }

    const allRecords = await getMarketRecordsForDataset(datasetId);
    const dataA = allRecords.filter((r) => r.symbol.toUpperCase() === contractA);
    const dataB = allRecords.filter((r) => r.symbol.toUpperCase() === contractB);

    if (dataA.length === 0 || dataB.length === 0) {
      return NextResponse.json(
        { success: false, error: `No market records found for pair ${contractA}/${contractB}` },
        { status: 404 }
      );
    }

    const aligned = calculateAlignedSpreads(dataA, dataB, { lookbackWindow });
    const targetIdx = aligned.findIndex((p) => p.date === signalDate);

    if (targetIdx < 0) {
      return NextResponse.json(
        { success: false, error: `Trading date '${signalDate}' not found in aligned series.` },
        { status: 404 }
      );
    }

    const targetPoint = aligned[targetIdx];
    const historicalSlice = aligned.slice(0, targetIdx + 1);

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

    const profitCheck = calculateProfitReality(
      targetPoint.priceA_Norm,
      targetPoint.priceB_Norm,
      Math.abs(targetPoint.spreadAbsolute),
      undefined,
      { contractA, contractB }
    );

    const falseSignalReport = runFalseSignalDetective(
      targetPoint,
      historicalSlice,
      profitCheck,
      trustReport.overallScore
    );

    const spreadDNAReport = findSpreadDNAPatterns(targetPoint, aligned, 5, true);

    const normA = normalizePrice(targetPoint.priceA_Raw, contractA);
    const normB = normalizePrice(targetPoint.priceB_Raw, contractB);

    const forensicIssue = trustReport.forensicIssues.find(
      (fi) => fi.rowId === targetPoint.rowIdA || fi.rowId === targetPoint.rowIdB
    );

    const matchedCase = SEEDED_CASE_STUDIES.find(
      (c) => c.date === signalDate && c.contractA === contractA && c.contractB === contractB
    );

    return NextResponse.json({
      success: true,
      signalId: `SIG_${contractA}_${contractB}_${signalDate}`,
      signalDate,
      contractA,
      contractB,
      verdict: falseSignalReport.standardizedVerdict,
      point: targetPoint,
      normA,
      normB,
      falseSignalReport,
      profitCheck,
      spreadDNAReport,
      trustReport,
      forensicIssue: forensicIssue || null,
      isSeeded: Boolean(matchedCase),
      seedCase: matchedCase || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Autopsy calculation failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
