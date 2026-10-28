import { NextResponse } from "next/server";
import { loadDemoDatasetToDatabase, initializeDatabaseIfEmpty, DEMO_DATASET_ID } from "@/lib/server/dataService";
import { SEEDED_CASE_STUDIES } from "@/lib/analytics/syntheticData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initializeDatabaseIfEmpty();
    return NextResponse.json({
      success: true,
      datasetId: DEMO_DATASET_ID,
      isDemo: true,
      seededCases: SEEDED_CASE_STUDIES,
      message: "Demo dataset loaded successfully.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load demo dataset";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    const res = await loadDemoDatasetToDatabase();
    return NextResponse.json({
      ...res,
      isDemo: true,
      seededCases: SEEDED_CASE_STUDIES,
      message: "Synthetic MCX Gold demo dataset reloaded with seeded anomalies.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reload demo dataset";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
