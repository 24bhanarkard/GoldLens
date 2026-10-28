import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { researchReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { initializeDatabaseIfEmpty } from "@/lib/server/dataService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  try {
    await initializeDatabaseIfEmpty();
    const { reportId } = await context.params;

    let report = null;
    try {
      const list = await db.select().from(researchReports).where(eq(researchReports.id, reportId)).limit(1);
      if (list.length > 0) {
        report = list[0];
      }
    } catch {
      report = null;
    }

    if (!report) {
      return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
