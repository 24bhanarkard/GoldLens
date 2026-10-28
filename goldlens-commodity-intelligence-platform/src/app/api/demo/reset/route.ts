import { NextResponse } from "next/server";
import { loadDemoDatasetToDatabase } from "@/lib/server/dataService";
import { SEEDED_CASE_STUDIES } from "@/lib/analytics/syntheticData";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const res = await loadDemoDatasetToDatabase();
    return NextResponse.json({
      ...res,
      isDemo: true,
      seededCases: SEEDED_CASE_STUDIES,
      message: "Demo dataset reset to initial state.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reset demo dataset";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
