import { NextResponse } from "next/server";
import { DEFAULT_CONTRACT_REGISTRY, normalizePrice } from "@/lib/analytics/contracts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = Object.values(DEFAULT_CONTRACT_REGISTRY).map((c) => ({
      ...c,
      sampleNormalization: normalizePrice(72500, c.symbol),
    }));

    return NextResponse.json({
      success: true,
      count: list.length,
      contracts: list,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
