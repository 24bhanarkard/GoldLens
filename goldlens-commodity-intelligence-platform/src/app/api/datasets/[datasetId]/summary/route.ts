import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { datasets, marketData, rejectedRecords } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { initializeDatabaseIfEmpty, DEMO_DATASET_ID, getMarketRecordsForDataset } from "@/lib/server/dataService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ datasetId: string }> }
) {
  try {
    await initializeDatabaseIfEmpty();
    const { datasetId } = await context.params;

    const allRecords = await getMarketRecordsForDataset(datasetId);

    // Contract breakdown from records
    const symbols = Array.from(new Set(allRecords.map((r) => r.symbol)));
    const contractSymbols = symbols.map((sym) => {
      const symRecs = allRecords.filter((r) => r.symbol === sym);
      const closes = symRecs.map((r) => r.close);
      const dates = symRecs.map((r) => r.date).sort();
      return {
        symbol: sym,
        count: symRecs.length,
        minDate: dates[0] || "",
        maxDate: dates[dates.length - 1] || "",
        minPrice: Math.min(...closes),
        maxPrice: Math.max(...closes),
      };
    });

    const dsObj = {
      id: datasetId,
      name: datasetId === DEMO_DATASET_ID ? "MCX Gold Futures Synthetic Bhavcopy (H2 2024)" : "Uploaded Bhavcopy",
      sourceType: datasetId === DEMO_DATASET_ID ? "demo" : "uploaded",
      rowCount: allRecords.length,
      validRows: allRecords.length,
      rejectedRows: 0,
      dateMin: allRecords[0]?.date || "2024-05-02",
      dateMax: allRecords[allRecords.length - 1]?.date || "2024-12-27",
      dataTrustScore: 96,
    };

    return NextResponse.json({
      success: true,
      dataset: dsObj,
      contracts: contractSymbols,
      rejectedRowsCount: 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
