import { NextResponse } from "next/server";
import { db } from "@/db";
import { researchReports } from "@/db/schema";
import { desc } from "drizzle-orm";
import { initializeDatabaseIfEmpty } from "@/lib/server/dataService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initializeDatabaseIfEmpty();
    let reports: unknown[] = [];
    try {
      reports = await db.select().from(researchReports).orderBy(desc(researchReports.createdAt)).limit(30);
    } catch {
      reports = [];
    }
    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: true,
      reports: [],
    });
  }
}
