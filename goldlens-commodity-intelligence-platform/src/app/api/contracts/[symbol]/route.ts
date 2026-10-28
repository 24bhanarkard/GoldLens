import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CONTRACT_REGISTRY, normalizePrice } from "@/lib/analytics/contracts";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await context.params;
    const upper = symbol.toUpperCase();
    const contract = DEFAULT_CONTRACT_REGISTRY[upper];

    if (!contract) {
      return NextResponse.json(
        { success: false, error: `Contract '${symbol}' not found in registry.` },
        { status: 404 }
      );
    }

    const sampleNorm = normalizePrice(73000, upper);

    return NextResponse.json({
      success: true,
      contract,
      normalizationDetails: sampleNorm,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
