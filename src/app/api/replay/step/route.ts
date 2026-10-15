import { NextRequest, NextResponse } from "next/server";
import { initializeDatabaseIfEmpty, getMarketRecordsForDataset, DEMO_DATASET_ID } from "@/lib/server/dataService";
import { calculateAlignedSpreads } from "@/lib/analytics/spreads";
import { calculateProfitReality } from "@/lib/analytics/profitRealityCheck";
import { runFalseSignalDetective } from "@/lib/analytics/falseSignalDetective";
import { calculateDatasetTrustScore } from "@/lib/analytics/dataQuality";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await initializeDatabaseIfEmpty();
    const body = await request.json();

    const datasetId = body.datasetId || DEMO_DATASET_ID;
    const contractA = (body.contractA || "GOLDM").toUpperCase();
    const contractB = (body.contractB || "GOLDTEN").toUpperCase();
    const targetDateIndex = Number(body.dateIndex ?? 0);
    const lookbackWindow = Number(body.lookbackWindow || 30);

    const allRecords = await getMarketRecordsForDataset(datasetId);

    const dataA = allRecords.filter((r) => r.symbol.toUpperCase() === contractA);
    const dataB = allRecords.filter((r) => r.symbol.toUpperCase() === contractB);

    if (dataA.length === 0 || dataB.length === 0) {
      return NextResponse.json(
        { success: false, error: `No data for pair ${contractA}/${contractB}` },
        { status: 404 }
      );
    }

    const fullAligned = calculateAlignedSpreads(dataA, dataB, { lookbackWindow });

    const totalDays = fullAligned.length;
    const clampedIndex = Math.max(0, Math.min(totalDays - 1, targetDateIndex));
    const currentPoint = fullAligned[clampedIndex];

    // Information available up to clampedIndex strictly
    const replaySlice = fullAligned.slice(0, clampedIndex + 1);

    const profitCheck = calculateProfitReality(
      currentPoint.priceA_Norm,
      currentPoint.priceB_Norm,
      Math.abs(currentPoint.spreadAbsolute),
      100
    );

    const diag = runFalseSignalDetective(currentPoint, replaySlice, profitCheck, 100);

    // Find anomalies in the replay history up to current date
    const historicalAnomalies = replaySlice.filter((p) => p.isAnomaly);

    return NextResponse.json({
      success: true,
      datasetId,
      contractA,
      contractB,
      currentIndex: clampedIndex,
      totalDays,
      currentDate: currentPoint.date,
      currentPoint,
      diagnostics: diag,
      profitCheck,
      historicalAnomaliesCount: historicalAnomalies.length,
      availableDates: fullAligned.map((p, idx) => ({ index: idx, date: p.date, isAnomaly: p.isAnomaly })),
      replaySlice: replaySlice.slice(Math.max(0, replaySlice.length - 45)), // last 45 days for chart
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Replay step failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
