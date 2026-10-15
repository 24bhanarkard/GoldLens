import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { datasets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { initializeDatabaseIfEmpty, getMarketRecordsForDataset } from "@/lib/server/dataService";
import { calculateDatasetTrustScore } from "@/lib/analytics/dataQuality";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ datasetId: string }> }
) {
  try {
    await initializeDatabaseIfEmpty();
    const { datasetId } = await context.params;

    let datasetName = "MCX Gold Futures Dataset";
    try {
      const dsList = await db.select().from(datasets).where(eq(datasets.id, datasetId)).limit(1);
      if (dsList.length > 0) {
        datasetName = dsList[0].name;
      }
    } catch {
      // fallback
    }

    const records = await getMarketRecordsForDataset(datasetId);

    const trustReport = calculateDatasetTrustScore(
      records.map((r) => ({
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

    return NextResponse.json({
      success: true,
      datasetId,
      datasetName,
      dataTrustScore: trustReport.overallScore,
      trustReport,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
