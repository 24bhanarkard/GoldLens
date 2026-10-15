import { NextRequest, NextResponse } from "next/server";
import { initializeDatabaseIfEmpty, getMarketRecordsForDataset, DEMO_DATASET_ID } from "@/lib/server/dataService";
import { calculateAlignedSpreads } from "@/lib/analytics/spreads";
import { findSpreadDNAPatterns } from "@/lib/analytics/spreadDNA";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await initializeDatabaseIfEmpty();
    const body = await request.json();

    const datasetId = body.datasetId || DEMO_DATASET_ID;
    const targetDate = body.targetDate;
    const contractA = (body.contractA || "GOLDM").toUpperCase();
    const contractB = (body.contractB || "GOLDTEN").toUpperCase();
    const lookbackWindow = Number(body.lookbackWindow || 30);
    const maxMatches = Number(body.maxMatches || 5);

    const allRecords = await getMarketRecordsForDataset(datasetId);

    const dataA = allRecords.filter((r) => r.symbol.toUpperCase() === contractA);
    const dataB = allRecords.filter((r) => r.symbol.toUpperCase() === contractB);

    if (dataA.length === 0 || dataB.length === 0) {
      return NextResponse.json(
        { success: false, error: `No data for pair ${contractA}/${contractB}` },
        { status: 404 }
      );
    }

    const aligned = calculateAlignedSpreads(dataA, dataB, { lookbackWindow });
    const targetPoint = targetDate
      ? aligned.find((p) => p.date === targetDate)
      : aligned[aligned.length - 1];

    if (!targetPoint) {
      return NextResponse.json({ success: false, error: `Target date not found.` }, { status: 404 });
    }

    const dnaReport = findSpreadDNAPatterns(targetPoint, aligned, maxMatches);

    return NextResponse.json({
      success: true,
      datasetId,
      contractA,
      contractB,
      targetPoint,
      dnaReport,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Pattern match failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
