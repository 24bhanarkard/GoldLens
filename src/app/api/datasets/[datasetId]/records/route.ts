import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { marketData, rejectedRecords } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { initializeDatabaseIfEmpty, getMarketRecordsForDataset } from "@/lib/server/dataService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ datasetId: string }> }
) {
  try {
    await initializeDatabaseIfEmpty();
    const { datasetId } = await context.params;
    const url = new URL(request.url);

    const symbol = url.searchParams.get("symbol");
    const dateMin = url.searchParams.get("dateMin");
    const dateMax = url.searchParams.get("dateMax");
    const qualityFlag = url.searchParams.get("qualityFlag");
    const mode = url.searchParams.get("mode") || "valid"; // 'valid' | 'rejected'
    const limit = Math.min(1000, Number(url.searchParams.get("limit") || 200));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

    if (mode === "rejected") {
      let rejectedList: unknown[] = [];
      try {
        rejectedList = await db
          .select()
          .from(rejectedRecords)
          .where(eq(rejectedRecords.datasetId, datasetId))
          .limit(limit)
          .offset(offset);
      } catch {
        rejectedList = [];
      }

      return NextResponse.json({
        success: true,
        mode: "rejected",
        datasetId,
        count: rejectedList.length,
        records: rejectedList,
      });
    }

    const allRecords = await getMarketRecordsForDataset(datasetId);

    let filtered = allRecords;
    if (symbol) {
      filtered = filtered.filter((r) => r.symbol.toUpperCase() === symbol.toUpperCase());
    }
    if (dateMin) {
      filtered = filtered.filter((r) => r.date >= dateMin);
    }
    if (dateMax) {
      filtered = filtered.filter((r) => r.date <= dateMax);
    }
    if (qualityFlag) {
      filtered = filtered.filter((r) => r.qualityFlag === qualityFlag);
    }

    const totalFiltered = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      mode: "valid",
      datasetId,
      totalCount: totalFiltered,
      limit,
      offset,
      records: paged,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
