import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "connected";
  try {
    if (process.env.DATABASE_URL) {
      await db.execute(sql`select 1`);
    } else {
      dbStatus = "in-memory-fallback";
    }
  } catch (err) {
    dbStatus = "fallback-mode";
  }

  return Response.json({
    ok: true,
    status: "healthy",
    app: "GoldLens",
    version: "2.4.0",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
}
