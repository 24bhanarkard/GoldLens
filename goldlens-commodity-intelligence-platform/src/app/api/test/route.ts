import { NextResponse } from "next/server";
import { runAnalyticsValidationTests } from "@/lib/analytics/analytics.test";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const testResults = runAnalyticsValidationTests();
    return NextResponse.json({
      success: testResults.allPassed,
      ...testResults,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Test runner failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
