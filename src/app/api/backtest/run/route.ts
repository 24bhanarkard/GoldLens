import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { backtestRuns } from "@/db/schema";
import { initializeDatabaseIfEmpty, getMarketRecordsForDataset, DEMO_DATASET_ID } from "@/lib/server/dataService";
import { calculateAlignedSpreads } from "@/lib/analytics/spreads";
import { runBacktest, BacktestParameters, DEFAULT_BACKTEST_PARAMS } from "@/lib/analytics/backtester";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await initializeDatabaseIfEmpty();
    const body = await request.json();

    const datasetId = body.datasetId || DEMO_DATASET_ID;
    const contractA = (body.contractA || "GOLDM").toUpperCase();
    const contractB = (body.contractB || "GOLDTEN").toUpperCase();

    const allRecords = await getMarketRecordsForDataset(datasetId);

    const dataA = allRecords.filter((r) => r.symbol.toUpperCase() === contractA);
    const dataB = allRecords.filter((r) => r.symbol.toUpperCase() === contractB);

    if (dataA.length < 15 || dataB.length < 15) {
      return NextResponse.json(
        { success: false, error: `Insufficient data for ${contractA}/${contractB} to backtest (minimum 15 days needed).` },
        { status: 400 }
      );
    }

    const aligned = calculateAlignedSpreads(dataA, dataB, {
      lookbackWindow: Number(body.lookbackWindow || 30),
      zScoreThreshold: Number(body.entryZScore || 2.0),
    });

    const params: Partial<BacktestParameters> = {
      contractA,
      contractB,
      entryZScore: Number(body.entryZScore || 2.0),
      exitZScore: Number(body.exitZScore || 0.3),
      stopLossZScore: Number(body.stopLossZScore || 3.5),
      maxHoldingDays: Number(body.maxHoldingDays || 10),
      minDTEToEnter: Number(body.minDTEToEnter || 5),
      minVolumeToEnter: Number(body.minVolumeToEnter || 30),
      enableDiagnosticFilter: body.enableDiagnosticFilter !== false,
      nominalGramsPerLot: Number(body.nominalGramsPerLot || 100),
      initialCapitalINR: Number(body.initialCapitalINR || 500000),
      walkForwardSplitPct: Number(body.walkForwardSplitPct || 65),
      costs: {
        brokeragePerOrderINR: Number(body.brokeragePerOrderINR ?? 20),
        slippagePerGramINR: Number(body.slippagePerGramINR ?? 1.25),
      },
    };

    const result = runBacktest(aligned, params);

    const runId = `BKT_${contractA}_${contractB}_${Date.now()}`;
    const runName = body.name || `Mean-Reversion (${contractA}/${contractB} @ Z=${result.params.entryZScore}σ)`;

    // Save run to DB
    try {
      await db.insert(backtestRuns).values({
        id: runId,
        datasetId,
        name: runName,
        contractA,
        contractB,
        params: result.params,
        metrics: result.metrics,
        trades: result.trades,
        equityCurve: result.equityCurve,
        conclusion: result.metrics.conclusion,
      });
    } catch (dbErr) {
      console.error("Error saving backtest run to DB:", dbErr);
    }

    return NextResponse.json({
      success: true,
      runId,
      name: runName,
      datasetId,
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Backtest simulation failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    await initializeDatabaseIfEmpty();
    let runs: unknown[] = [];
    try {
      runs = await db.select().from(backtestRuns).orderBy(desc(backtestRuns.createdAt)).limit(20);
    } catch {
      runs = [];
    }
    return NextResponse.json({
      success: true,
      runs,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: true,
      runs: [],
    });
  }
}
