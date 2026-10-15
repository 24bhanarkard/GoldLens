import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { researchReports, datasets } from "@/db/schema";
import { initializeDatabaseIfEmpty, getMarketRecordsForDataset, DEMO_DATASET_ID } from "@/lib/server/dataService";
import { calculateAlignedSpreads } from "@/lib/analytics/spreads";
import { calculateDatasetTrustScore } from "@/lib/analytics/dataQuality";
import { calculateProfitReality } from "@/lib/analytics/profitRealityCheck";
import { runFalseSignalDetective } from "@/lib/analytics/falseSignalDetective";
import { runBacktest, BacktestParameters } from "@/lib/analytics/backtester";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await initializeDatabaseIfEmpty();
    const body = await request.json();

    const datasetId = body.datasetId || DEMO_DATASET_ID;
    const contractA = (body.contractA || "GOLDM").toUpperCase();
    const contractB = (body.contractB || "GOLDTEN").toUpperCase();
    const lookbackWindow = Number(body.lookbackWindow || 30);
    const entryZScore = Number(body.entryZScore || 2.0);

    let datasetMeta = { name: "MCX Gold Dataset", sourceType: "demo" };
    try {
      const dsList = await db.select().from(datasets).where(eq(datasets.id, datasetId)).limit(1);
      if (dsList.length > 0) {
        datasetMeta = dsList[0];
      }
    } catch {
      // fallback to default demo meta
    }

    const allRecords = await getMarketRecordsForDataset(datasetId);
    const dataA = allRecords.filter((r) => r.symbol.toUpperCase() === contractA);
    const dataB = allRecords.filter((r) => r.symbol.toUpperCase() === contractB);

    if (dataA.length < 15 || dataB.length < 15) {
      return NextResponse.json({ success: false, error: "Insufficient data for report generation." }, { status: 400 });
    }

    const aligned = calculateAlignedSpreads(dataA, dataB, { lookbackWindow, zScoreThreshold: entryZScore });
    const trustReport = calculateDatasetTrustScore(
      allRecords.map((r) => ({
        symbol: r.symbol,
        date: r.date,
        expiryDate: r.expiryDate,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
        openInterest: r.openInterest,
      }))
    );

    const backtestRes = runBacktest(aligned, {
      contractA,
      contractB,
      entryZScore,
      exitZScore: 0.3,
      maxHoldingDays: 10,
    });

    const anomalies = aligned.filter((p) => p.isAnomaly);
    const latestPt = aligned[aligned.length - 1];
    const latestProfit = calculateProfitReality(
      latestPt.priceA_Norm,
      latestPt.priceB_Norm,
      Math.abs(latestPt.spreadAbsolute),
      100
    );
    const latestDiag = runFalseSignalDetective(latestPt, aligned, latestProfit, trustReport.overallScore);

    const analysisPeriod = `${aligned[0]?.date} to ${latestPt?.date}`;
    const reportId = `REP_${contractA}_${contractB}_${Date.now()}`;
    const title = `Quantitative Research Dossier: ${contractA} vs ${contractB} Relative Pricing`;

    const sections = [
      {
        title: "1. Executive Summary & Core Verdict",
        content: `This report investigates the relative pricing dynamics between MCX ${contractA} and ${contractB} across ${aligned.length} aligned trading sessions (${analysisPeriod}). The analysis evaluated quotation normalization, Bhavcopy data integrity, statistical deviation rarity (Z-scores), contract expiry distortions, realistic transaction friction across 4 trade legs, and lookahead-bias-free walk-forward backtesting.`,
        keyFindings: [
          `Data Trust Score: ${trustReport.overallScore}/100 (${trustReport.recommendation})`,
          `Total Statistical Anomalies Detected (|Z| ≥ ${entryZScore}σ): ${anomalies.length} events`,
          `Eligible Backtest Trades: ${backtestRes.metrics.eligibleTradesExecuted} (Rejected by filter: ${backtestRes.metrics.rejectedSignalsCount})`,
          `Net Backtest PnL: ₹${backtestRes.metrics.totalNetPnLINR.toLocaleString("en-IN")} (Win Rate: ${backtestRes.metrics.winRatePct}%)`,
          `Primary Backtest Verdict: ${backtestRes.metrics.conclusionTitle}`,
        ],
      },
      {
        title: "2. Data Ingestion & Data Trust Verification",
        content: `Dataset '${datasetMeta.name}' was ingested under ${datasetMeta.sourceType === "demo" ? "SYNTHETIC DEMO MODE" : "REAL UPLOADED CSV MODE"}. A 12-check financial plausibility suite was executed covering positive non-zero prices, High ≥ Low OHLC geometry, duplicate record detection, and single-day price spike continuity.`,
        trustScore: trustReport.overallScore,
        checksPassed: trustReport.checks.filter((c) => c.status === "pass").length,
        checksWarning: trustReport.checks.filter((c) => c.status === "warning").length,
        checksFailed: trustReport.checks.filter((c) => c.status === "fail").length,
      },
      {
        title: "3. Contract Specifications & Normalization Methodology",
        content: `Contracts were normalized to standardized ₹/gram of 999 fine gold equivalent. ${contractA} and ${contractB} quotation bases and purity factors were standardized to remove unit illusions before computing spreads.`,
      },
      {
        title: "4. Profit Reality & MCX Transaction Friction",
        content: `Theoretical spread opportunities were subjected to complete MCX transaction cost modeling (Brokerage ₹20/order, MCX turnover fees ~0.0021%, CTT 0.01% on sell side, GST 18%, Stamp duty 0.002%, SEBI fees, and ₹1.25/g bid-ask slippage). Total roundtrip friction is estimated at ₹${latestProfit.totalFrictionPerGram}/gram.`,
      },
      {
        title: "5. Walk-Forward Backtesting & Performance Safeguards",
        content: `Backtesting was conducted with strict lookahead prevention. Signals generated at bar T evaluate only past information. Walk-forward split allocated 65% in-sample and 35% out-of-sample. Total net PnL: ₹${backtestRes.metrics.totalNetPnLINR.toLocaleString("en-IN")}, Max Drawdown: ₹${backtestRes.metrics.maxDrawdownINR.toLocaleString("en-IN")} (${backtestRes.metrics.maxDrawdownPct}%).`,
      },
      {
        title: "6. Limitations, Caveats & Scientific Disclaimer",
        content: `GoldLens is an educational and quantitative research intelligence platform. Results are statistical estimates based on historical Bhavcopy data and modeled parameters. Intraday orderbook depth, live queue priority, and unexpected liquidity shocks may alter executable outcomes. A negative result ('NO PERSISTENT EDGE' or 'REJECTED AFTER COSTS') is a scientifically valid research conclusion.`,
      },
    ];

    const reportRecord = {
      id: reportId,
      title,
      datasetId,
      dataMode: datasetMeta.sourceType === "demo" ? "synthetic_demo" : "uploaded_csv",
      contractPair: `${contractA}/${contractB}`,
      analysisPeriod,
      summary: backtestRes.metrics.conclusionDescription,
      conclusion: backtestRes.metrics.conclusion,
      sections,
      metrics: {
        trustScore: trustReport.overallScore,
        anomaliesCount: anomalies.length,
        tradesCount: backtestRes.metrics.eligibleTradesExecuted,
        winRate: backtestRes.metrics.winRatePct,
        netPnL: backtestRes.metrics.totalNetPnLINR,
        maxDrawdown: backtestRes.metrics.maxDrawdownPct,
        profitFactor: backtestRes.metrics.profitFactor,
      },
    };

    try {
      await db.insert(researchReports).values({
        id: reportRecord.id,
        title: reportRecord.title,
        datasetId: reportRecord.datasetId,
        dataMode: reportRecord.dataMode,
        contractPair: reportRecord.contractPair,
        analysisPeriod: reportRecord.analysisPeriod,
        summary: reportRecord.summary,
        conclusion: reportRecord.conclusion,
        sections: reportRecord.sections,
        metrics: reportRecord.metrics,
      });
    } catch (dbErr) {
      console.error("Error storing report to DB:", dbErr);
    }

    return NextResponse.json({
      success: true,
      report: reportRecord,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Report generation failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
