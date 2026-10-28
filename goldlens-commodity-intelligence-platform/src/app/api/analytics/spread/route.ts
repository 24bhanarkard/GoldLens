import { NextRequest, NextResponse } from "next/server";
import { initializeDatabaseIfEmpty, getMarketRecordsForDataset, DEMO_DATASET_ID } from "@/lib/server/dataService";
import {
  calculateAlignedSpreads,
  calculateSpreadDistribution,
  DailyContractPoint,
} from "@/lib/analytics/spreads";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await initializeDatabaseIfEmpty();
    const body = await request.json();

    const datasetId = body.datasetId || DEMO_DATASET_ID;
    const contractA = (body.contractA || "GOLDM").toUpperCase();
    const contractB = (body.contractB || "GOLDTEN").toUpperCase();
    const lookbackWindow = Number(body.lookbackWindow || 30);
    const zScoreThreshold = Number(body.zScoreThreshold || 2.0);
    const measureType = body.measureType || "absolute"; // 'absolute' | 'percentage' | 'ratio'

    const allRecords: DailyContractPoint[] = Array.isArray(body.records)
      ? (body.records as DailyContractPoint[])
      : await getMarketRecordsForDataset(datasetId);

    const dataA = allRecords.filter((r) => r.symbol.toUpperCase() === contractA);
    const dataB = allRecords.filter((r) => r.symbol.toUpperCase() === contractB);

    if (dataA.length === 0 || dataB.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient data for pair ${contractA}/${contractB} in dataset. (${contractA}: ${dataA.length} rows, ${contractB}: ${dataB.length} rows)`,
        },
        { status: 400 }
      );
    }

    const alignedSpreads = calculateAlignedSpreads(dataA, dataB, {
      lookbackWindow,
      zScoreThreshold,
      measureType,
    });

    const spreadValues = alignedSpreads.map((s) => s.spreadAbsolute);
    const distribution = calculateSpreadDistribution(spreadValues, 24);

    const anomalies = alignedSpreads.filter((s) => s.isAnomaly);

    return NextResponse.json({
      success: true,
      datasetId,
      contractA,
      contractB,
      lookbackWindow,
      zScoreThreshold,
      measureType,
      totalAlignedSessions: alignedSpreads.length,
      anomaliesCount: anomalies.length,
      latestObservation: alignedSpreads[alignedSpreads.length - 1] || null,
      alignedSpreads,
      distribution,
      anomalies,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Spread calculation failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
