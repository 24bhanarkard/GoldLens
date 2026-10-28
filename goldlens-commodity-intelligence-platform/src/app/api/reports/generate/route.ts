import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { researchReports, datasets } from "@/db/schema";
import {
  initializeDatabaseIfEmpty,
  getMarketRecordsForDataset,
  getDatasetBundleFromMemory,
  DEMO_DATASET_ID,
} from "@/lib/server/dataService";
import { calculateAlignedSpreads } from "@/lib/analytics/spreads";
import { calculateDatasetTrustScore } from "@/lib/analytics/dataQuality";
import { calculateProfitReality } from "@/lib/analytics/profitRealityCheck";
import { runFalseSignalDetective } from "@/lib/analytics/falseSignalDetective";
import { runBacktest } from "@/lib/analytics/backtester";
import { getHedgeMatchedSizing, DEFAULT_CONTRACT_REGISTRY } from "@/lib/analytics/contracts";
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

    const memBundle = getDatasetBundleFromMemory(datasetId);
    let datasetMeta: { name: string; sourceType: string } = {
      name: memBundle?.name || "MCX Gold Dataset",
      sourceType: memBundle?.sourceType || "demo",
    };

    try {
      if (process.env.DATABASE_URL) {
        const dsList = await db
          .select()
          .from(datasets)
          .where(eq(datasets.id, datasetId))
          .limit(1);
        if (dsList.length > 0) {
          datasetMeta = { name: dsList[0].name, sourceType: dsList[0].sourceType };
        }
      }
    } catch {
      // use memory metadata
    }

    const allRecords = await getMarketRecordsForDataset(datasetId);
    const dataA = allRecords.filter((r) => r.symbol.toUpperCase() === contractA);
    const dataB = allRecords.filter((r) => r.symbol.toUpperCase() === contractB);

    if (dataA.length < 15 || dataB.length < 15) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient aligned sessions (${Math.min(dataA.length, dataB.length)}) for report generation.`,
        },
        { status: 400 }
      );
    }

    const aligned = calculateAlignedSpreads(dataA, dataB, {
      lookbackWindow,
      zScoreThreshold: entryZScore,
    });
    const trustReport = calculateDatasetTrustScore(
      allRecords.map((r) => ({
        rowId: r.rowId,
        symbol: r.symbol,
        date: r.date,
        expiryDate: r.expiryDate,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
        openInterest: r.openInterest,
        qualityFlag: r.qualityFlag,
        qualityNotes: r.qualityNotes,
      }))
    );

    const backtestRes = runBacktest(aligned, {
      contractA,
      contractB,
      entryZScore,
      exitZScore: 0.3,
      maxHoldingDays: 10,
    });

    const hedge = getHedgeMatchedSizing(contractA, contractB);
    const specA = DEFAULT_CONTRACT_REGISTRY[contractA];
    const specB = DEFAULT_CONTRACT_REGISTRY[contractB];

    const anomalies = aligned.filter((p) => p.isAnomaly);
    const latestPt = aligned[aligned.length - 1];
    const latestProfit = calculateProfitReality(
      latestPt.priceA_Norm,
      latestPt.priceB_Norm,
      Math.abs(latestPt.spreadAbsolute),
      undefined,
      { contractA, contractB }
    );
    const latestDiag = runFalseSignalDetective(
      latestPt,
      aligned,
      latestProfit,
      trustReport.overallScore
    );

    const analysisPeriod = `${aligned[0]?.date} to ${latestPt?.date}`;
    const reportId = `REP_${contractA}_${contractB}_${Date.now()}`;
    const title = `Evidence-Backed Research Dossier: ${contractA} vs ${contractB}`;
    const hc = backtestRes.honestyScorecard;

    const sections = [
      {
        title: "1. Executive Summary & Evidence Verdict",
        content: `Evaluated relative pricing between ${contractA} and ${contractB} across ${aligned.length} trading sessions (${analysisPeriod}) using strictly prior ${lookbackWindow}-session rolling statistics and next-open execution fills.`,
        keyFindings: [
          `Evidence Verdict: ${hc.evidenceVerdict} — ${hc.evidenceHeadline}`,
          `Dataset Source & Trust Score: ${datasetMeta.sourceType === "demo" ? "SYNTHETIC DEMO DATA" : "UPLOADED CSV DATA"} (${trustReport.overallScore}/100, ${trustReport.forensicIssues.length} forensic flag[s] isolated)`,
          `Detected Spread Anomalies (|Z| ≥ ${entryZScore}σ): ${anomalies.length} candidate events`,
          `Executed Backtest Trades: ${backtestRes.metrics.eligibleTradesExecuted} (${backtestRes.metrics.rejectedSignalsCount} candidate signals blocked by diagnostics)`,
          `Win Rate & 95% Wilson CI: ${backtestRes.metrics.winRatePct !== null ? `${backtestRes.metrics.winRatePct}%` : "N/A"} [${hc.winRateWilson95CI.lowerPct ?? "N/A"}%, ${hc.winRateWilson95CI.upperPct ?? "N/A"}%] (df = ${hc.degreesOfFreedom}, one-sided p = ${hc.meanNetTradeCI95.oneSidedPValue ?? "undefined"})`,
          `Gross vs Net Result: Gross ₹${backtestRes.metrics.totalGrossPnLINR.toLocaleString("en-IN")} | Friction ₹${backtestRes.metrics.totalFrictionINR.toLocaleString("en-IN")} | Net ₹${backtestRes.metrics.totalNetPnLINR.toLocaleString("en-IN")}`,
        ],
      },
      {
        title: "2. Contract Specifications, Normalization & Hedge Ratio",
        content: `${contractA} (${specA?.quotationBasis || "10g"} quote, ${specA?.referencePurity || 995} fineness, expiry: ${specA?.expiryRule || "MCX spec"}) and ${contractB} (${specB?.quotationBasis || "10g"} quote, ${specB?.referencePurity || 999} fineness, expiry: ${specB?.expiryRule || "MCX spec"}) were converted to ₹/g of 999 fine gold before computing spreads. ${hedge.explanation}`,
      },
      {
        title: "3. Data Integrity & Forensics Summary",
        content: trustReport.summaryMessage,
        keyFindings:
          trustReport.forensicIssues.length > 0
            ? trustReport.forensicIssues.slice(0, 5).map(
                (fi) => `${fi.rowId} (${fi.symbol} ${fi.date}): ${fi.reason}`
              )
            : ["No structural bar or circuit-limit anomalies detected in source rows."],
      },
      {
        title: "4. Weight-Matched Transaction Cost & Stress Assumptions",
        content: `${latestProfit.hedgeSizingNote} Estimated round-trip friction: ₹${latestProfit.totalFrictionPerGram}/g (₹${latestProfit.totalFrictionINR.toLocaleString("en-IN")} per hedge unit), including 4-order brokerage, MCX turnover charges, CTT (0.01% sell), stamp duty (0.002% buy), SEBI fees, 18% GST, and leg slippage.`,
      },
      {
        title: "5. Backtest Honesty Scorecard & Robustness Audit",
        content: `${hc.evidenceExplanation} ${hc.parameterSensitivity.summary}`,
        keyFindings: hc.safeguardChecks.map((s) => `[${s.status}] ${s.label}: ${s.detail}`),
      },
      {
        title: "6. Methodological Limitations & Research Disclaimer",
        content:
          "GoldLens is an analytical and educational tool. Historical simulations on daily OHLC bars cannot observe simultaneous two-leg intraday L2 orderbook liquidity, margin calls, or delivery tender squeezes. Synthetic demo data is not live market data. Outputs are not financial advice.",
        keyFindings: [
          `Latest Session Status (${latestPt.date}): ${latestDiag.standardizedVerdict} — ${latestDiag.executiveSummary}`,
          ...hc.methodologyLimitations,
        ],
      },
    ];

    const reportRecord = {
      id: reportId,
      title,
      datasetId,
      dataMode: datasetMeta.sourceType === "demo" ? "synthetic_demo" : "uploaded_csv",
      contractPair: `${contractA}/${contractB}`,
      analysisPeriod,
      summary: hc.evidenceExplanation,
      conclusion: hc.evidenceVerdict,
      sections,
      metrics: {
        trustScore: trustReport.overallScore,
        forensicFlagsCount: trustReport.forensicIssues.length,
        anomaliesCount: anomalies.length,
        tradesCount: backtestRes.metrics.eligibleTradesExecuted,
        rejectedCount: backtestRes.metrics.rejectedSignalsCount,
        winRate: backtestRes.metrics.winRatePct,
        wilsonLower: hc.winRateWilson95CI.lowerPct,
        wilsonUpper: hc.winRateWilson95CI.upperPct,
        pValue: hc.meanNetTradeCI95.oneSidedPValue,
        grossPnL: backtestRes.metrics.totalGrossPnLINR,
        totalCosts: backtestRes.metrics.totalFrictionINR,
        netPnL: backtestRes.metrics.totalNetPnLINR,
        maxDrawdown: backtestRes.metrics.maxDrawdownPct,
        profitFactor: backtestRes.metrics.profitFactor,
        stabilityLabel: hc.parameterSensitivity.stabilityLabel,
      },
    };

    try {
      if (process.env.DATABASE_URL) {
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
      }
    } catch {
      // Returned cleanly to client even without persistent DB
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
