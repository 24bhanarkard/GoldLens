import { AlignedSpreadPoint } from "./spreads";
import { CostParameters, calculateProfitReality, DEFAULT_COST_CONFIG } from "./profitRealityCheck";
import { runFalseSignalDetective } from "./falseSignalDetective";

export interface BacktestParameters {
  contractA: string;
  contractB: string;
  entryZScore: number; // default 2.0
  exitZScore: number; // default 0.3
  stopLossZScore: number; // default 3.5
  maxHoldingDays: number; // default 10
  minDTEToEnter: number; // default 5 days
  minVolumeToEnter: number; // default 20 lots
  enableDiagnosticFilter: boolean; // default true (runs False Signal Detective)
  nominalGramsPerLot: number; // default 100g (for GOLDM)
  initialCapitalINR: number; // default 500,000 INR
  costs: CostParameters;
  walkForwardSplitPct?: number; // default 65 (65% in-sample, 35% out-of-sample)
}

export interface TradeRecord {
  id: string;
  entryDate: string;
  exitDate: string;
  holdingDays: number;
  direction: "SHORT_A_LONG_B" | "LONG_A_SHORT_B";
  entrySpreadAbs: number; // ₹/g
  exitSpreadAbs: number; // ₹/g
  entryZScore: number;
  exitZScore: number;
  entryPriceA: number;
  entryPriceB: number;
  exitPriceA: number;
  exitPriceB: number;
  
  grossPnLPerGram: number; // ₹/g
  totalGrossPnLINR: number; // ₹
  frictionPerGram: number; // ₹/g
  totalFrictionINR: number; // ₹
  netPnLPerGram: number; // ₹/g
  totalNetPnLINR: number; // ₹
  returnPct: number; // Net PnL / Notional Capital
  
  exitReason: "CONVERGENCE_TARGET" | "STOP_LOSS" | "MAX_TIME_STOP" | "EXPIRY_SQUARE_OFF";
  isWin: boolean;
  sampleSet: "IN_SAMPLE" | "OUT_OF_SAMPLE";
}

export interface RejectedSignalLog {
  date: string;
  zScore: number;
  spreadAbs: number;
  rejectionReason: string;
  category: "EXPIRY" | "COSTS" | "LIQUIDITY" | "DATA_QUALITY" | "SAMPLE_SIZE";
}

export interface BacktestMetrics {
  totalSignalsGenerated: number;
  eligibleTradesExecuted: number;
  rejectedSignalsCount: number;
  
  winningTradesCount: number;
  losingTradesCount: number;
  winRatePct: number;
  
  totalGrossPnLINR: number;
  totalNetPnLINR: number;
  totalFrictionINR: number;
  costToGrossPnLRatioPct: number;
  
  averageNetTradeINR: number;
  averageHoldingDays: number;
  maxDrawdownINR: number;
  maxDrawdownPct: number;
  profitFactor: number | null; // Gross Wins / Gross Losses
  sharpeRatioApprox: number | null;
  
  inSampleNetPnLINR: number;
  inSampleWinRatePct: number;
  outOfSampleNetPnLINR: number;
  outOfSampleWinRatePct: number;
  
  conclusion: "VIABLE_EDGE_FOUND" | "REJECTED_AFTER_COSTS" | "NO_PERSISTENT_EDGE_DETECTED" | "INSUFFICIENT_TRADES";
  conclusionTitle: string;
  conclusionDescription: string;
}

export interface EquityCurvePoint {
  date: string;
  tradeNumber: number;
  grossCumulativeINR: number;
  netCumulativeINR: number;
  drawdownINR: number;
  drawdownPct: number;
  capitalINR: number;
  isTradeExit: boolean;
}

export interface BacktestResult {
  params: BacktestParameters;
  metrics: BacktestMetrics;
  trades: TradeRecord[];
  rejectedSignals: RejectedSignalLog[];
  equityCurve: EquityCurvePoint[];
}

export const DEFAULT_BACKTEST_PARAMS: BacktestParameters = {
  contractA: "GOLDM",
  contractB: "GOLDTEN",
  entryZScore: 2.0,
  exitZScore: 0.3,
  stopLossZScore: 3.5,
  maxHoldingDays: 10,
  minDTEToEnter: 5,
  minVolumeToEnter: 30,
  enableDiagnosticFilter: true,
  nominalGramsPerLot: 100,
  initialCapitalINR: 500000,
  costs: DEFAULT_COST_CONFIG,
  walkForwardSplitPct: 65,
};

/**
 * Runs a strictly lookahead-bias-free backtest simulation across aligned historical spread data.
 */
export function runBacktest(
  spreads: AlignedSpreadPoint[],
  customParams: Partial<BacktestParameters> = {}
): BacktestResult {
  const params: BacktestParameters = {
    ...DEFAULT_BACKTEST_PARAMS,
    ...customParams,
    costs: { ...DEFAULT_COST_CONFIG, ...(customParams.costs || {}) },
  };

  const trades: TradeRecord[] = [];
  const rejectedSignals: RejectedSignalLog[] = [];
  let totalSignalsGenerated = 0;

  // Split date for in-sample / out-of-sample walk-forward evaluation
  const splitIndex = Math.floor(spreads.length * ((params.walkForwardSplitPct || 65) / 100));
  const splitDate = spreads[splitIndex]?.date || "";

  let activeTrade: {
    entryIdx: number;
    entryDate: string;
    entrySpreadAbs: number;
    entryZScore: number;
    direction: "SHORT_A_LONG_B" | "LONG_A_SHORT_B";
    entryPriceA: number;
    entryPriceB: number;
    nominalGrams: number;
    sampleSet: "IN_SAMPLE" | "OUT_OF_SAMPLE";
  } | null = null;

  for (let i = 0; i < spreads.length; i++) {
    const pt = spreads[i];

    // 1. If currently in a position, evaluate exit criteria
    if (activeTrade) {
      const holdingDays = i - activeTrade.entryIdx;
      const currentZ = pt.zScore || 0;
      const minDTE = Math.min(pt.dteA || 99, pt.dteB || 99);

      let shouldExit = false;
      let exitReason: TradeRecord["exitReason"] = "MAX_TIME_STOP";

      // Check Expiry Square Off
      if (minDTE <= 2) {
        shouldExit = true;
        exitReason = "EXPIRY_SQUARE_OFF";
      }
      // Check Convergence Target
      else if (
        (activeTrade.direction === "SHORT_A_LONG_B" && currentZ <= params.exitZScore) ||
        (activeTrade.direction === "LONG_A_SHORT_B" && currentZ >= -params.exitZScore)
      ) {
        shouldExit = true;
        exitReason = "CONVERGENCE_TARGET";
      }
      // Check Stop Loss
      else if (
        (activeTrade.direction === "SHORT_A_LONG_B" && currentZ >= params.stopLossZScore) ||
        (activeTrade.direction === "LONG_A_SHORT_B" && currentZ <= -params.stopLossZScore)
      ) {
        shouldExit = true;
        exitReason = "STOP_LOSS";
      }
      // Check Max Holding Duration
      else if (holdingDays >= params.maxHoldingDays || i === spreads.length - 1) {
        shouldExit = true;
        exitReason = "MAX_TIME_STOP";
      }

      if (shouldExit) {
        const exitSpreadAbs = pt.spreadAbsolute;
        // PnL calculation:
        // If SHORT A / LONG B: Gross spread profit = EntrySpread - ExitSpread
        // If LONG A / SHORT B: Gross spread profit = ExitSpread - EntrySpread
        const spreadDelta =
          activeTrade.direction === "SHORT_A_LONG_B"
            ? activeTrade.entrySpreadAbs - exitSpreadAbs
            : exitSpreadAbs - activeTrade.entrySpreadAbs;

        const grossPnLPerGram = spreadDelta;
        const totalGrossPnLINR = grossPnLPerGram * activeTrade.nominalGrams;

        // Transaction friction calculation
        const costResult = calculateProfitReality(
          pt.priceA_Norm,
          pt.priceB_Norm,
          Math.abs(spreadDelta),
          activeTrade.nominalGrams,
          params.costs
        );

        const totalFrictionINR = costResult.totalFrictionINR;
        const frictionPerGram = costResult.totalFrictionPerGram;
        const totalNetPnLINR = totalGrossPnLINR - totalFrictionINR;
        const netPnLPerGram = grossPnLPerGram - frictionPerGram;

        const notionalCapital = pt.priceA_Norm * activeTrade.nominalGrams * 0.15; // 15% margin capital
        const returnPct = notionalCapital > 0 ? (totalNetPnLINR / notionalCapital) * 100 : 0;

        trades.push({
          id: `TRD_${trades.length + 1}_${activeTrade.entryDate}`,
          entryDate: activeTrade.entryDate,
          exitDate: pt.date,
          holdingDays,
          direction: activeTrade.direction,
          entrySpreadAbs: activeTrade.entrySpreadAbs,
          exitSpreadAbs,
          entryZScore: activeTrade.entryZScore,
          exitZScore: currentZ,
          entryPriceA: activeTrade.entryPriceA,
          entryPriceB: activeTrade.entryPriceB,
          exitPriceA: pt.priceA_Norm,
          exitPriceB: pt.priceB_Norm,
          grossPnLPerGram: Number(grossPnLPerGram.toFixed(2)),
          totalGrossPnLINR: Number(totalGrossPnLINR.toFixed(2)),
          frictionPerGram: Number(frictionPerGram.toFixed(2)),
          totalFrictionINR: Number(totalFrictionINR.toFixed(2)),
          netPnLPerGram: Number(netPnLPerGram.toFixed(2)),
          totalNetPnLINR: Number(totalNetPnLINR.toFixed(2)),
          returnPct: Number(returnPct.toFixed(2)),
          exitReason,
          isWin: totalNetPnLINR > 0,
          sampleSet: activeTrade.sampleSet,
        });

        activeTrade = null;
      }
    }

    // 2. If flat, check for entry signals at decision point T
    if (!activeTrade && pt.zScore !== null && Math.abs(pt.zScore) >= params.entryZScore) {
      totalSignalsGenerated++;

      // Direction: if Z > 0, Contract A is statistically overpriced vs B -> Short A, Long B
      const direction: "SHORT_A_LONG_B" | "LONG_A_SHORT_B" = pt.zScore > 0 ? "SHORT_A_LONG_B" : "LONG_A_SHORT_B";

      // Apply Filter Rules strictly using information at bar T
      const minDTE = Math.min(pt.dteA || 99, pt.dteB || 99);
      const minVol = Math.min(pt.volumeA || 0, pt.volumeB || 0);

      let isRejected = false;
      let rejectReason = "";
      let rejectCat: RejectedSignalLog["category"] = "SAMPLE_SIZE";

      if (minDTE < params.minDTEToEnter) {
        isRejected = true;
        rejectReason = `Expiry proximity filter: DTE (${minDTE}d) < required min (${params.minDTEToEnter}d)`;
        rejectCat = "EXPIRY";
      } else if (minVol < params.minVolumeToEnter) {
        isRejected = true;
        rejectReason = `Low liquidity filter: min volume (${minVol}) < threshold (${params.minVolumeToEnter} lots)`;
        rejectCat = "LIQUIDITY";
      } else if (params.enableDiagnosticFilter) {
        // Run False Signal Detective
        const profitEst = calculateProfitReality(
          pt.priceA_Norm,
          pt.priceB_Norm,
          Math.abs(pt.spreadAbsolute),
          params.nominalGramsPerLot,
          params.costs
        );
        const diag = runFalseSignalDetective(pt, spreads.slice(0, i + 1), profitEst, 100);

        if (diag.overallStatus === "DISQUALIFIED") {
          isRejected = true;
          rejectReason = diag.primaryRejectionReason || "Disqualified by False Signal Detective";
          rejectCat =
            diag.finalClassification === "EXPIRY_SENSITIVE"
              ? "EXPIRY"
              : diag.finalClassification === "REJECTED_AFTER_COSTS"
              ? "COSTS"
              : diag.finalClassification === "DATA_UNRELIABLE"
              ? "DATA_QUALITY"
              : "LIQUIDITY";
        }
      }

      if (isRejected) {
        rejectedSignals.push({
          date: pt.date,
          zScore: Number(pt.zScore.toFixed(2)),
          spreadAbs: pt.spreadAbsolute,
          rejectionReason: rejectReason,
          category: rejectCat,
        });
      } else {
        // Enter trade
        const sampleSet: "IN_SAMPLE" | "OUT_OF_SAMPLE" = i < splitIndex ? "IN_SAMPLE" : "OUT_OF_SAMPLE";
        activeTrade = {
          entryIdx: i,
          entryDate: pt.date,
          entrySpreadAbs: pt.spreadAbsolute,
          entryZScore: Number(pt.zScore.toFixed(2)),
          direction,
          entryPriceA: pt.priceA_Norm,
          entryPriceB: pt.priceB_Norm,
          nominalGrams: params.nominalGramsPerLot,
          sampleSet,
        };
      }
    }
  }

  // 3. Build Equity Curve and cumulative Drawdown
  let runningCapital = params.initialCapitalINR;
  let runningGross = 0;
  let runningNet = 0;
  let peakCapital = params.initialCapitalINR;
  let maxDrawdownINR = 0;
  let maxDrawdownPct = 0;

  const equityCurve: EquityCurvePoint[] = [];

  // Start point
  equityCurve.push({
    date: spreads[0]?.date || "Day 0",
    tradeNumber: 0,
    grossCumulativeINR: 0,
    netCumulativeINR: 0,
    drawdownINR: 0,
    drawdownPct: 0,
    capitalINR: runningCapital,
    isTradeExit: false,
  });

  // Track trade exits on dates
  const tradeMap = new Map<string, TradeRecord>();
  trades.forEach((t) => tradeMap.set(t.exitDate, t));

  let tradeCount = 0;
  spreads.forEach((pt) => {
    const tr = tradeMap.get(pt.date);
    if (tr) {
      tradeCount++;
      runningGross += tr.totalGrossPnLINR;
      runningNet += tr.totalNetPnLINR;
      runningCapital += tr.totalNetPnLINR;

      if (runningCapital > peakCapital) {
        peakCapital = runningCapital;
      }

      const ddINR = peakCapital - runningCapital;
      const ddPct = peakCapital > 0 ? (ddINR / peakCapital) * 100 : 0;

      if (ddINR > maxDrawdownINR) maxDrawdownINR = ddINR;
      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;

      equityCurve.push({
        date: pt.date,
        tradeNumber: tradeCount,
        grossCumulativeINR: Number(runningGross.toFixed(2)),
        netCumulativeINR: Number(runningNet.toFixed(2)),
        drawdownINR: Number(ddINR.toFixed(2)),
        drawdownPct: Number(ddPct.toFixed(2)),
        capitalINR: Number(runningCapital.toFixed(2)),
        isTradeExit: true,
      });
    }
  });

  // Calculate Metrics
  const executedCount = trades.length;
  const winningTrades = trades.filter((t) => t.isWin);
  const losingTrades = trades.filter((t) => !t.isWin);
  const winRatePct = executedCount > 0 ? (winningTrades.length / executedCount) * 100 : 0;

  const totalGrossPnLINR = trades.reduce((sum, t) => sum + t.totalGrossPnLINR, 0);
  const totalNetPnLINR = trades.reduce((sum, t) => sum + t.totalNetPnLINR, 0);
  const totalFrictionINR = trades.reduce((sum, t) => sum + t.totalFrictionINR, 0);

  const costToGrossPnLRatioPct = totalGrossPnLINR > 0 ? (totalFrictionINR / totalGrossPnLINR) * 100 : 999;
  const avgNetTrade = executedCount > 0 ? totalNetPnLINR / executedCount : 0;
  const avgHold = executedCount > 0 ? trades.reduce((sum, t) => sum + t.holdingDays, 0) / executedCount : 0;

  const grossWins = winningTrades.reduce((s, t) => s + t.totalGrossPnLINR, 0);
  const grossLosses = Math.abs(losingTrades.reduce((s, t) => s + t.totalGrossPnLINR, 0));
  const profitFactor = grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : executedCount > 0 ? 9.99 : null;

  // In-Sample vs Out-of-Sample metrics
  const inSampleTrades = trades.filter((t) => t.sampleSet === "IN_SAMPLE");
  const outSampleTrades = trades.filter((t) => t.sampleSet === "OUT_OF_SAMPLE");

  const inSampleNet = inSampleTrades.reduce((s, t) => s + t.totalNetPnLINR, 0);
  const inSampleWins = inSampleTrades.filter((t) => t.isWin).length;
  const inSampleWinRate = inSampleTrades.length > 0 ? (inSampleWins / inSampleTrades.length) * 100 : 0;

  const outSampleNet = outSampleTrades.reduce((s, t) => s + t.totalNetPnLINR, 0);
  const outSampleWins = outSampleTrades.filter((t) => t.isWin).length;
  const outSampleWinRate = outSampleTrades.length > 0 ? (outSampleWins / outSampleTrades.length) * 100 : 0;

  // Approximate Annualized Sharpe Ratio
  let sharpeRatioApprox: number | null = null;
  if (executedCount >= 3) {
    const netReturns = trades.map((t) => t.totalNetPnLINR);
    const meanRet = netReturns.reduce((a, b) => a + b, 0) / executedCount;
    const varRet = netReturns.reduce((a, b) => a + Math.pow(b - meanRet, 2), 0) / (executedCount - 1);
    const stdRet = Math.sqrt(varRet);
    if (stdRet > 0) {
      sharpeRatioApprox = Number(((meanRet / stdRet) * Math.sqrt(252 / (avgHold || 5))).toFixed(2));
    }
  }

  // Backtest Conclusion
  let conclusion: BacktestMetrics["conclusion"] = "VIABLE_EDGE_FOUND";
  let conclusionTitle = "Statistically Viable Net Edge Verified";
  let conclusionDescription = `The mean-reversion strategy achieved a positive net PnL of ₹${totalNetPnLINR.toLocaleString("en-IN", { maximumFractionDigits: 0 })} with a ${winRatePct.toFixed(1)}% win rate across ${executedCount} executed trades after realistic MCX friction.`;

  if (executedCount === 0) {
    conclusion = "INSUFFICIENT_TRADES";
    conclusionTitle = "INSUFFICIENT HISTORICAL SAMPLES";
    conclusionDescription = `No eligible trades were triggered that survived expiry and liquidity constraints (${rejectedSignals.length} candidates filtered out).`;
  } else if (totalGrossPnLINR > 0 && totalNetPnLINR <= 0) {
    conclusion = "REJECTED_AFTER_COSTS";
    conclusionTitle = "OPPORTUNITY REJECTED AFTER COSTS";
    conclusionDescription = `Theoretical gross profit of +₹${totalGrossPnLINR.toLocaleString("en-IN")} was completely erased by ₹${totalFrictionINR.toLocaleString("en-IN")} in cumulative MCX exchange fees, CTT, GST, and slippage.`;
  } else if (totalNetPnLINR <= 0 || winRatePct < 45) {
    conclusion = "NO_PERSISTENT_EDGE_DETECTED";
    conclusionTitle = "NO PERSISTENT EDGE DETECTED";
    conclusionDescription = `Negative or unstable net expectancy. The relative price divergence does not reliably mean-revert within the configured holding horizon.`;
  }

  const metrics: BacktestMetrics = {
    totalSignalsGenerated,
    eligibleTradesExecuted: executedCount,
    rejectedSignalsCount: rejectedSignals.length,
    winningTradesCount: winningTrades.length,
    losingTradesCount: losingTrades.length,
    winRatePct: Number(winRatePct.toFixed(1)),
    totalGrossPnLINR: Number(totalGrossPnLINR.toFixed(2)),
    totalNetPnLINR: Number(totalNetPnLINR.toFixed(2)),
    totalFrictionINR: Number(totalFrictionINR.toFixed(2)),
    costToGrossPnLRatioPct: Number(Math.min(999, costToGrossPnLRatioPct).toFixed(1)),
    averageNetTradeINR: Number(avgNetTrade.toFixed(2)),
    averageHoldingDays: Number(avgHold.toFixed(1)),
    maxDrawdownINR: Number(maxDrawdownINR.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    profitFactor,
    sharpeRatioApprox,
    inSampleNetPnLINR: Number(inSampleNet.toFixed(2)),
    inSampleWinRatePct: Number(inSampleWinRate.toFixed(1)),
    outOfSampleNetPnLINR: Number(outSampleNet.toFixed(2)),
    outOfSampleWinRatePct: Number(outSampleWinRate.toFixed(1)),
    conclusion,
    conclusionTitle,
    conclusionDescription,
  };

  return {
    params,
    metrics,
    trades,
    rejectedSignals,
    equityCurve,
  };
}
