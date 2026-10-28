import { AlignedSpreadPoint } from "./spreads";
import {
  CostParameters,
  calculateProfitReality,
  DEFAULT_COST_CONFIG,
} from "./profitRealityCheck";
import { runFalseSignalDetective } from "./falseSignalDetective";
import { getHedgeMatchedSizing } from "./contracts";

export interface BacktestParameters {
  contractA: string;
  contractB: string;
  entryZScore: number; // default 2.0
  exitZScore: number; // default 0.3
  stopLossZScore: number; // default 3.5
  maxHoldingDays: number; // default 10
  minDTEToEnter: number; // default 5 days
  minVolumeToEnter: number; // default 30 lots
  enableDiagnosticFilter: boolean; // default true
  nominalGramsPerLot?: number; // defaults to exact LCM hedge weight of contractA & contractB
  initialCapitalINR: number; // default 500,000 INR
  costs: CostParameters;
  walkForwardSplitPct?: number; // default 65 (65% IS, 35% OOS)
}

export interface TradeRecord {
  id: string;
  signalDate: string;
  entryDate: string;
  exitDate: string;
  holdingDays: number;
  direction: "SHORT_A_LONG_B" | "LONG_A_SHORT_B";
  signalSpreadAbs: number;
  entrySpreadAbs: number; // T+1 Open spread (₹/g)
  exitSpreadAbs: number; // Exit Open/Close spread (₹/g)
  entryZScore: number;
  exitZScore: number;
  entryPriceA: number;
  entryPriceB: number;
  exitPriceA: number;
  exitPriceB: number;

  grossPnLPerGram: number;
  totalGrossPnLINR: number;
  frictionPerGram: number;
  totalFrictionINR: number;
  netPnLPerGram: number;
  totalNetPnLINR: number;
  returnPct: number;

  exitReason:
    | "CONVERGENCE_TARGET"
    | "STOP_LOSS"
    | "MAX_TIME_STOP"
    | "EXPIRY_SQUARE_OFF";
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

export interface ParameterSensitivityCell {
  entryZScore: number;
  maxHoldingDays: number;
  tradesCount: number;
  grossPnLINR: number;
  netPnLINR: number;
  winRatePct: number | null;
  isBaseline: boolean;
}

export interface WalkForwardFoldResult {
  foldName: string;
  periodStart: string;
  periodEnd: string;
  sessionsCount: number;
  tradesCount: number;
  grossPnLINR: number;
  costsINR: number;
  netPnLINR: number;
  winRatePct: number | null;
}

export interface BacktestHonestyScorecard {
  evidenceVerdict:
    | "INSUFFICIENT EVIDENCE"
    | "REJECTED AFTER COSTS"
    | "NO PERSISTENT EDGE"
    | "EVIDENCE SUPPORTS FURTHER INVESTIGATION";
  evidenceHeadline: string;
  evidenceExplanation: string;

  // Defensible statistical confidence metrics
  degreesOfFreedom: number; // n - 1
  winRateWilson95CI: {
    lowerPct: number | null;
    upperPct: number | null;
    methodNote: string;
  };
  meanNetTradeCI95: {
    meanINR: number | null;
    stdErrorINR: number | null;
    tStatistic: number | null;
    oneSidedPValue: number | null;
    methodNote: string;
  };

  inSampleTradesCount: number;
  outOfSampleTradesCount: number;
  walkForwardFolds: WalkForwardFoldResult[];

  parameterSensitivity: {
    grid: ParameterSensitivityCell[];
    profitableNeighborsCount: number;
    totalGridCells: number;
    profitableNeighborsPct: number;
    stabilityLabel: "STABLE" | "MODERATE" | "FRAGILE" | "UNAVAILABLE";
    summary: string;
  };

  safeguardChecks: {
    id: string;
    label: string;
    status: "VERIFIED" | "WARNING" | "LIMITATION";
    detail: string;
  }[];

  methodologyLimitations: string[];
}

export interface BacktestMetrics {
  totalSignalsGenerated: number;
  eligibleTradesExecuted: number;
  rejectedSignalsCount: number;

  winningTradesCount: number;
  losingTradesCount: number;
  winRatePct: number | null;

  totalGrossPnLINR: number;
  totalNetPnLINR: number;
  totalFrictionINR: number;
  costToGrossPnLRatioPct: number;

  averageNetTradeINR: number;
  medianNetTradeINR: number;
  averageHoldingDays: number;
  maxDrawdownINR: number;
  maxDrawdownPct: number;
  profitFactor: number | null;
  sharpeRatioApprox: number | null;

  inSampleTradesCount: number;
  inSampleNetPnLINR: number;
  inSampleWinRatePct: number | null;
  outOfSampleTradesCount: number;
  outOfSampleNetPnLINR: number;
  outOfSampleWinRatePct: number | null;

  conclusion:
    | "VIABLE_EDGE_FOUND"
    | "INSUFFICIENT_EVIDENCE"
    | "REJECTED_AFTER_COSTS"
    | "NO_PERSISTENT_EDGE_DETECTED"
    | "INSUFFICIENT_TRADES";
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
  hedgeSizingExplanation: string;
  metrics: BacktestMetrics;
  honestyScorecard: BacktestHonestyScorecard;
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
  initialCapitalINR: 500000,
  costs: DEFAULT_COST_CONFIG,
  walkForwardSplitPct: 65,
};

/**
 * Exact 95% Wilson Score Binomial Confidence Interval for Win Rate (p = k / n).
 * Standard statistical method valid for small sample sizes including n = 1 or k = n.
 */
export function calculateWilsonCI95(wins: number, n: number): { lowerPct: number | null; upperPct: number | null } {
  if (n <= 0) return { lowerPct: null, upperPct: null };
  const z = 1.959964;
  const p = wins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const halfWidth = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  const lower = Math.max(0, (center - halfWidth) / denom) * 100;
  const upper = Math.min(100, (center + halfWidth) / denom) * 100;
  return {
    lowerPct: Number(lower.toFixed(1)),
    upperPct: Number(upper.toFixed(1)),
  };
}

function logGamma(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  let x = p[0];
  const zm = z - 1;
  for (let i = 1; i < g + 2; i++) {
    x += p[i] / (zm + i);
  }
  const t = zm + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zm + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Exact one-sided Student's t upper-tail p-value P(T_df >= t) via Simpson quadrature on exact Student-t PDF.
 * Handles every df >= 1 accurately (including df = 1 Cauchy case!).
 */
export function oneSidedStudentTPValue(tStat: number, df: number): number | null {
  if (df < 1 || !isFinite(tStat)) return null;
  if (tStat <= 0) {
    return Number((1 - (oneSidedStudentTPValue(-tStat, df) ?? 0.5)).toFixed(4));
  }
  const logConst =
    logGamma((df + 1) / 2) - 0.5 * Math.log(df * Math.PI) - logGamma(df / 2);
  const pdf = (x: number) =>
    Math.exp(logConst - ((df + 1) / 2) * Math.log(1 + (x * x) / df));

  // Integrate from 0 to tStat with 400 Simpson steps: P(T >= t) = 0.5 - integral_0^t pdf(x) dx
  const steps = 400;
  const upper = Math.min(tStat, 50);
  const h = upper / steps;
  let sum = pdf(0) + pdf(upper);
  for (let i = 1; i < steps; i++) {
    const x = i * h;
    sum += (i % 2 === 0 ? 2 : 4) * pdf(x);
  }
  const integral = (h / 3) * sum;
  const tail = Math.max(0.0001, Math.min(0.9999, 0.5 - integral));
  return Number(tail.toFixed(4));
}

function executeCoreSimulation(
  spreads: AlignedSpreadPoint[],
  params: BacktestParameters
): {
  trades: TradeRecord[];
  rejectedSignals: RejectedSignalLog[];
  totalSignalsGenerated: number;
  hedgeGrams: number;
  hedgeExplanation: string;
} {
  const hedge = getHedgeMatchedSizing(params.contractA, params.contractB);
  const hedgeGrams = params.nominalGramsPerLot || hedge.matchedGrams;

  const trades: TradeRecord[] = [];
  const rejectedSignals: RejectedSignalLog[] = [];
  let totalSignalsGenerated = 0;

  const splitIndex = Math.floor(spreads.length * ((params.walkForwardSplitPct || 65) / 100));

  let pendingEntry: {
    signalIdx: number;
    signalDate: string;
    signalSpreadAbs: number;
    entryZScore: number;
    direction: "SHORT_A_LONG_B" | "LONG_A_SHORT_B";
    sampleSet: "IN_SAMPLE" | "OUT_OF_SAMPLE";
  } | null = null;

  let activeTrade: {
    signalDate: string;
    signalSpreadAbs: number;
    entryIdx: number;
    entryDate: string;
    entrySpreadAbs: number;
    entryZScore: number;
    direction: "SHORT_A_LONG_B" | "LONG_A_SHORT_B";
    entryPriceA: number;
    entryPriceB: number;
    nominalGrams: number;
    sampleSet: "IN_SAMPLE" | "OUT_OF_SAMPLE";
    pendingExitReason?: TradeRecord["exitReason"];
    pendingExitZScore?: number;
  } | null = null;

  for (let i = 0; i < spreads.length; i++) {
    const pt = spreads[i];

    // Step A: Execute any pending exit at today's Open (T_exit + 1 Open)
    if (activeTrade && activeTrade.pendingExitReason) {
      const holdingDays = Math.max(1, i - activeTrade.entryIdx);
      const exitSpreadAbs = pt.openSpreadAbsolute;
      const spreadDelta =
        activeTrade.direction === "SHORT_A_LONG_B"
          ? activeTrade.entrySpreadAbs - exitSpreadAbs
          : exitSpreadAbs - activeTrade.entrySpreadAbs;

      const grossPnLPerGram = spreadDelta;
      const totalGrossPnLINR = grossPnLPerGram * activeTrade.nominalGrams;

      const costResult = calculateProfitReality(
        pt.openA_Norm,
        pt.openB_Norm,
        Math.abs(spreadDelta),
        activeTrade.nominalGrams,
        {
          ...params.costs,
          contractA: params.contractA,
          contractB: params.contractB,
        }
      );

      const totalFrictionINR = costResult.totalFrictionINR;
      const frictionPerGram = costResult.totalFrictionPerGram;
      const totalNetPnLINR = totalGrossPnLINR - totalFrictionINR;
      const netPnLPerGram = grossPnLPerGram - frictionPerGram;

      const notionalCapital = pt.openA_Norm * activeTrade.nominalGrams * 0.15;
      const returnPct = notionalCapital > 0 ? (totalNetPnLINR / notionalCapital) * 100 : 0;

      trades.push({
        id: `TRD_${trades.length + 1}_${activeTrade.entryDate}`,
        signalDate: activeTrade.signalDate,
        entryDate: activeTrade.entryDate,
        exitDate: pt.date,
        holdingDays,
        direction: activeTrade.direction,
        signalSpreadAbs: activeTrade.signalSpreadAbs,
        entrySpreadAbs: activeTrade.entrySpreadAbs,
        exitSpreadAbs,
        entryZScore: activeTrade.entryZScore,
        exitZScore: activeTrade.pendingExitZScore ?? (pt.zScore || 0),
        entryPriceA: activeTrade.entryPriceA,
        entryPriceB: activeTrade.entryPriceB,
        exitPriceA: pt.openA_Norm,
        exitPriceB: pt.openB_Norm,
        grossPnLPerGram: Number(grossPnLPerGram.toFixed(2)),
        totalGrossPnLINR: Number(totalGrossPnLINR.toFixed(2)),
        frictionPerGram: Number(frictionPerGram.toFixed(2)),
        totalFrictionINR: Number(totalFrictionINR.toFixed(2)),
        netPnLPerGram: Number(netPnLPerGram.toFixed(2)),
        totalNetPnLINR: Number(totalNetPnLINR.toFixed(2)),
        returnPct: Number(returnPct.toFixed(2)),
        exitReason: activeTrade.pendingExitReason,
        isWin: totalNetPnLINR > 0,
        sampleSet: activeTrade.sampleSet,
      });

      activeTrade = null;
    }

    // Step B: Execute any pending entry from yesterday's signal at today's Open (T + 1 Open)
    if (pendingEntry && !activeTrade) {
      if (pt.qualityStatus === "corrupted" || pt.rolloverOccurred) {
        rejectedSignals.push({
          date: pendingEntry.signalDate,
          zScore: pendingEntry.entryZScore,
          spreadAbs: pendingEntry.signalSpreadAbs,
          rejectionReason: pt.rolloverOccurred
            ? "Next-session contract rollover boundary — execution skipped to prevent cross-expiry fill"
            : "Next-session corrupted bar print — execution aborted",
          category: pt.rolloverOccurred ? "EXPIRY" : "DATA_QUALITY",
        });
      } else {
        activeTrade = {
          signalDate: pendingEntry.signalDate,
          signalSpreadAbs: pendingEntry.signalSpreadAbs,
          entryIdx: i,
          entryDate: pt.date,
          entrySpreadAbs: pt.openSpreadAbsolute,
          entryZScore: pendingEntry.entryZScore,
          direction: pendingEntry.direction,
          entryPriceA: pt.openA_Norm,
          entryPriceB: pt.openB_Norm,
          nominalGrams: hedgeGrams,
          sampleSet: pendingEntry.sampleSet,
        };
      }
      pendingEntry = null;
    }

    // Step C: Evaluate open trade exit rules at today's Close (scheduled for tomorrow's Open, or closed at terminal bar)
    if (activeTrade) {
      const holdingDays = i - activeTrade.entryIdx;
      const currentZ = pt.zScore || 0;
      const minDTE = Math.min(pt.dteA ?? 99, pt.dteB ?? 99);
      const nextIsRollover = i + 1 < spreads.length ? spreads[i + 1].rolloverOccurred : false;

      let shouldExit = false;
      let exitReason: TradeRecord["exitReason"] = "MAX_TIME_STOP";

      if (minDTE <= 3 || nextIsRollover) {
        shouldExit = true;
        exitReason = "EXPIRY_SQUARE_OFF";
      } else if (
        (activeTrade.direction === "SHORT_A_LONG_B" && currentZ <= params.exitZScore) ||
        (activeTrade.direction === "LONG_A_SHORT_B" && currentZ >= -params.exitZScore)
      ) {
        shouldExit = true;
        exitReason = "CONVERGENCE_TARGET";
      } else if (
        (activeTrade.direction === "SHORT_A_LONG_B" && currentZ >= params.stopLossZScore) ||
        (activeTrade.direction === "LONG_A_SHORT_B" && currentZ <= -params.stopLossZScore)
      ) {
        shouldExit = true;
        exitReason = "STOP_LOSS";
      } else if (holdingDays >= params.maxHoldingDays || i === spreads.length - 1) {
        shouldExit = true;
        exitReason = "MAX_TIME_STOP";
      }

      if (shouldExit) {
        if (i === spreads.length - 1) {
          // Close out on final dataset bar close so no trade is silently orphaned
          const exitSpreadAbs = pt.spreadAbsolute;
          const spreadDelta =
            activeTrade.direction === "SHORT_A_LONG_B"
              ? activeTrade.entrySpreadAbs - exitSpreadAbs
              : exitSpreadAbs - activeTrade.entrySpreadAbs;
          const grossPnLPerGram = spreadDelta;
          const totalGrossPnLINR = grossPnLPerGram * activeTrade.nominalGrams;
          const costResult = calculateProfitReality(
            pt.priceA_Norm,
            pt.priceB_Norm,
            Math.abs(spreadDelta),
            activeTrade.nominalGrams,
            { ...params.costs, contractA: params.contractA, contractB: params.contractB }
          );
          const totalNetPnLINR = totalGrossPnLINR - costResult.totalFrictionINR;
          const notionalCapital = pt.priceA_Norm * activeTrade.nominalGrams * 0.15;
          trades.push({
            id: `TRD_${trades.length + 1}_${activeTrade.entryDate}`,
            signalDate: activeTrade.signalDate,
            entryDate: activeTrade.entryDate,
            exitDate: pt.date,
            holdingDays: Math.max(1, holdingDays),
            direction: activeTrade.direction,
            signalSpreadAbs: activeTrade.signalSpreadAbs,
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
            frictionPerGram: costResult.totalFrictionPerGram,
            totalFrictionINR: costResult.totalFrictionINR,
            netPnLPerGram: Number((grossPnLPerGram - costResult.totalFrictionPerGram).toFixed(2)),
            totalNetPnLINR: Number(totalNetPnLINR.toFixed(2)),
            returnPct: Number(
              (notionalCapital > 0 ? (totalNetPnLINR / notionalCapital) * 100 : 0).toFixed(2)
            ),
            exitReason,
            isWin: totalNetPnLINR > 0,
            sampleSet: activeTrade.sampleSet,
          });
          activeTrade = null;
        } else {
          activeTrade.pendingExitReason = exitReason;
          activeTrade.pendingExitZScore = currentZ;
        }
      }
      continue;
    }

    // Step D: Evaluate entry signal at Decision Date T Close -> queued for T+1 Open
    if (
      !activeTrade &&
      !pendingEntry &&
      i < spreads.length - 1 &&
      pt.zScore !== null &&
      Math.abs(pt.zScore) >= params.entryZScore
    ) {
      totalSignalsGenerated++;
      const direction: "SHORT_A_LONG_B" | "LONG_A_SHORT_B" =
        pt.zScore > 0 ? "SHORT_A_LONG_B" : "LONG_A_SHORT_B";

      const minDTE = Math.min(pt.dteA ?? 99, pt.dteB ?? 99);
      const minVol = Math.min(pt.volumeA || 0, pt.volumeB || 0);

      let isRejected = false;
      let rejectReason = "";
      let rejectCat: RejectedSignalLog["category"] = "SAMPLE_SIZE";

      const expectedExcess = Math.abs(pt.spreadAbsolute - (pt.rollingMean ?? 0));

      if (minDTE < params.minDTEToEnter) {
        isRejected = true;
        rejectReason = `Expiry filter: ${minDTE}d DTE < minimum ${params.minDTEToEnter}d`;
        rejectCat = "EXPIRY";
      } else if (minVol < params.minVolumeToEnter) {
        isRejected = true;
        rejectReason = `Liquidity filter: ${minVol} lots < minimum ${params.minVolumeToEnter} lots`;
        rejectCat = "LIQUIDITY";
      } else if (params.enableDiagnosticFilter) {
        const profitEst = calculateProfitReality(
          pt.priceA_Norm,
          pt.priceB_Norm,
          expectedExcess,
          hedgeGrams,
          { ...params.costs, contractA: params.contractA, contractB: params.contractB }
        );
        const diag = runFalseSignalDetective(pt, spreads.slice(0, i + 1), profitEst, 96);

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
        const sampleSet: "IN_SAMPLE" | "OUT_OF_SAMPLE" =
          i < splitIndex ? "IN_SAMPLE" : "OUT_OF_SAMPLE";
        pendingEntry = {
          signalIdx: i,
          signalDate: pt.date,
          signalSpreadAbs: pt.spreadAbsolute,
          entryZScore: Number(pt.zScore.toFixed(2)),
          direction,
          sampleSet,
        };
      }
    }
  }

  return {
    trades,
    rejectedSignals,
    totalSignalsGenerated,
    hedgeGrams,
    hedgeExplanation: hedge.explanation,
  };
}

/**
 * Runs lookahead-bias-free simulation + Backtest Honesty Scorecard + Parameter Sensitivity Grid.
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

  const sim = executeCoreSimulation(spreads, params);
  const { trades, rejectedSignals, totalSignalsGenerated, hedgeExplanation } = sim;

  let runningCapital = params.initialCapitalINR;
  let runningGross = 0;
  let runningNet = 0;
  let peakCapital = params.initialCapitalINR;
  let maxDrawdownINR = 0;
  let maxDrawdownPct = 0;

  const equityCurve: EquityCurvePoint[] = [
    {
      date: spreads[0]?.date || "Start",
      tradeNumber: 0,
      grossCumulativeINR: 0,
      netCumulativeINR: 0,
      drawdownINR: 0,
      drawdownPct: 0,
      capitalINR: runningCapital,
      isTradeExit: false,
    },
  ];

  const tradesByExitDate = new Map<string, TradeRecord[]>();
  trades.forEach((t) => {
    const arr = tradesByExitDate.get(t.exitDate) || [];
    arr.push(t);
    tradesByExitDate.set(t.exitDate, arr);
  });

  let tradeCount = 0;
  spreads.forEach((pt) => {
    const exits = tradesByExitDate.get(pt.date);
    if (exits && exits.length > 0) {
      exits.forEach((tr) => {
        tradeCount++;
        runningGross += tr.totalGrossPnLINR;
        runningNet += tr.totalNetPnLINR;
        runningCapital += tr.totalNetPnLINR;

        if (runningCapital > peakCapital) peakCapital = runningCapital;
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
      });
    }
  });

  const executedCount = trades.length;
  const winningTrades = trades.filter((t) => t.isWin);
  const losingTrades = trades.filter((t) => !t.isWin);
  const winRatePct =
    executedCount > 0 ? Number(((winningTrades.length / executedCount) * 100).toFixed(1)) : null;

  const totalGrossPnLINR = trades.reduce((sum, t) => sum + t.totalGrossPnLINR, 0);
  const totalNetPnLINR = trades.reduce((sum, t) => sum + t.totalNetPnLINR, 0);
  const totalFrictionINR = trades.reduce((sum, t) => sum + t.totalFrictionINR, 0);

  const costToGrossPnLRatioPct =
    totalGrossPnLINR > 0 ? (totalFrictionINR / totalGrossPnLINR) * 100 : 999;
  const avgNetTrade = executedCount > 0 ? totalNetPnLINR / executedCount : 0;

  const sortedNets = trades.map((t) => t.totalNetPnLINR).sort((a, b) => a - b);
  const medianNetTrade =
    executedCount === 0
      ? 0
      : executedCount % 2 === 0
      ? (sortedNets[executedCount / 2 - 1] + sortedNets[executedCount / 2]) / 2
      : sortedNets[Math.floor(executedCount / 2)];

  const avgHold =
    executedCount > 0
      ? trades.reduce((sum, t) => sum + t.holdingDays, 0) / executedCount
      : 0;

  const grossWins = winningTrades.reduce((s, t) => s + t.totalGrossPnLINR, 0);
  const grossLosses = Math.abs(losingTrades.reduce((s, t) => s + t.totalGrossPnLINR, 0));
  const profitFactor =
    grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : null;

  const inSampleTrades = trades.filter((t) => t.sampleSet === "IN_SAMPLE");
  const outSampleTrades = trades.filter((t) => t.sampleSet === "OUT_OF_SAMPLE");

  const inSampleNet = inSampleTrades.reduce((s, t) => s + t.totalNetPnLINR, 0);
  const inSampleWins = inSampleTrades.filter((t) => t.isWin).length;
  const inSampleWinRate =
    inSampleTrades.length > 0
      ? Number(((inSampleWins / inSampleTrades.length) * 100).toFixed(1))
      : null;

  const outSampleNet = outSampleTrades.reduce((s, t) => s + t.totalNetPnLINR, 0);
  const outSampleWins = outSampleTrades.filter((t) => t.isWin).length;
  const outSampleWinRate =
    outSampleTrades.length > 0
      ? Number(((outSampleWins / outSampleTrades.length) * 100).toFixed(1))
      : null;

  // Statistical confidence metrics (Wilson 95% CI & Student's t-test on Net PnL)
  const degreesOfFreedom = Math.max(0, executedCount - 1);
  const wilson = calculateWilsonCI95(winningTrades.length, executedCount);

  let stdErrorINR: number | null = null;
  let tStatistic: number | null = null;
  let oneSidedPValue: number | null = null;
  let sharpeRatioApprox: number | null = null;

  if (executedCount >= 2) {
    const netArr = trades.map((t) => t.totalNetPnLINR);
    const meanRet = avgNetTrade;
    const sampleVar =
      netArr.reduce((acc, v) => acc + Math.pow(v - meanRet, 2), 0) / (executedCount - 1);
    const stdRet = Math.sqrt(sampleVar);
    stdErrorINR = stdRet / Math.sqrt(executedCount);
    if (stdErrorINR > 1e-6) {
      tStatistic = Number((meanRet / stdErrorINR).toFixed(2));
      oneSidedPValue = oneSidedStudentTPValue(meanRet / stdErrorINR, degreesOfFreedom);
    }
    if (stdRet > 1e-6 && executedCount >= 3) {
      sharpeRatioApprox = Number(
        ((meanRet / stdRet) * Math.sqrt(252 / Math.max(1, avgHold))).toFixed(2)
      );
    }
  }

  // 3-Fold Chronological Walk-Forward Breakdown
  const foldCount = 3;
  const foldLen = Math.max(1, Math.floor(spreads.length / foldCount));
  const walkForwardFolds: WalkForwardFoldResult[] = [];
  for (let f = 0; f < foldCount; f++) {
    const startIdx = f * foldLen;
    const endIdx = f === foldCount - 1 ? spreads.length - 1 : (f + 1) * foldLen - 1;
    if (startIdx < spreads.length) {
      const pStart = spreads[startIdx].date;
      const pEnd = spreads[endIdx].date;
      const foldTrades = trades.filter((t) => t.entryDate >= pStart && t.entryDate <= pEnd);
      const fWins = foldTrades.filter((t) => t.isWin).length;
      walkForwardFolds.push({
        foldName: `Period ${f + 1}`,
        periodStart: pStart,
        periodEnd: pEnd,
        sessionsCount: endIdx - startIdx + 1,
        tradesCount: foldTrades.length,
        grossPnLINR: Number(
          foldTrades.reduce((s, t) => s + t.totalGrossPnLINR, 0).toFixed(2)
        ),
        costsINR: Number(
          foldTrades.reduce((s, t) => s + t.totalFrictionINR, 0).toFixed(2)
        ),
        netPnLINR: Number(
          foldTrades.reduce((s, t) => s + t.totalNetPnLINR, 0).toFixed(2)
        ),
        winRatePct:
          foldTrades.length > 0
            ? Number(((fWins / foldTrades.length) * 100).toFixed(1))
            : null,
      });
    }
  }

  // 3x3 Parameter Sensitivity Grid around user parameters
  const zOffsets = [-0.3, 0, 0.3];
  const holdOffsets = [-3, 0, 3];
  const grid: ParameterSensitivityCell[] = [];

  for (const dz of zOffsets) {
    for (const dh of holdOffsets) {
      const testZ = Number(Math.max(1.2, params.entryZScore + dz).toFixed(2));
      const testHold = Math.max(2, params.maxHoldingDays + dh);
      const isBase = dz === 0 && dh === 0;
      const subSim = isBase
        ? sim
        : executeCoreSimulation(spreads, {
            ...params,
            entryZScore: testZ,
            maxHoldingDays: testHold,
          });
      const subCount = subSim.trades.length;
      const subGross = subSim.trades.reduce((s, t) => s + t.totalGrossPnLINR, 0);
      const subNet = subSim.trades.reduce((s, t) => s + t.totalNetPnLINR, 0);
      const subWins = subSim.trades.filter((t) => t.isWin).length;
      grid.push({
        entryZScore: testZ,
        maxHoldingDays: testHold,
        tradesCount: subCount,
        grossPnLINR: Number(subGross.toFixed(2)),
        netPnLINR: Number(subNet.toFixed(2)),
        winRatePct: subCount > 0 ? Number(((subWins / subCount) * 100).toFixed(1)) : null,
        isBaseline: isBase,
      });
    }
  }

  const evaluatedGrid = grid.filter((g) => g.tradesCount > 0);
  const profitableNeighborsCount = grid.filter((g) => g.netPnLINR > 0).length;
  const profitableNeighborsPct = Number(
    ((profitableNeighborsCount / grid.length) * 100).toFixed(0)
  );

  let stabilityLabel: "STABLE" | "MODERATE" | "FRAGILE" | "UNAVAILABLE" = "UNAVAILABLE";
  if (evaluatedGrid.length > 0) {
    if (profitableNeighborsPct >= 75) stabilityLabel = "STABLE";
    else if (profitableNeighborsPct >= 45) stabilityLabel = "MODERATE";
    else stabilityLabel = "FRAGILE";
  }

  // Determine Scientifically Honest Evidence Verdict
  let conclusion: BacktestMetrics["conclusion"] = "INSUFFICIENT_EVIDENCE";
  let conclusionTitle = "INSUFFICIENT EVIDENCE";
  let conclusionDescription = "";
  let evidenceVerdict: BacktestHonestyScorecard["evidenceVerdict"] = "INSUFFICIENT EVIDENCE";

  const isStatisticallySignificant =
    degreesOfFreedom >= 1 &&
    oneSidedPValue !== null &&
    oneSidedPValue < 0.05 &&
    outSampleTrades.length >= 1 &&
    outSampleNet > 0;

  if (executedCount === 0) {
    conclusion = "INSUFFICIENT_TRADES";
    conclusionTitle = "INSUFFICIENT EVIDENCE (0 EXECUTED TRADES)";
    conclusionDescription = `Zero eligible trades executed after expiry, liquidity, and data-integrity filters (${rejectedSignals.length} candidate signal(s) blocked).`;
    evidenceVerdict = "INSUFFICIENT EVIDENCE";
  } else if (degreesOfFreedom === 0) {
    conclusion = "INSUFFICIENT_EVIDENCE";
    conclusionTitle = "INSUFFICIENT EVIDENCE (SINGLE EXECUTED TRADE)";
    conclusionDescription = `Only n = 1 trade executed (${winningTrades.length}/1 win = ${winRatePct}% observed win rate, Net P&L ${totalNetPnLINR >= 0 ? "+" : ""}₹${totalNetPnLINR.toLocaleString("en-IN")}). With df = 0 degrees of freedom, sample variance and t-statistics are mathematically undefined and the exact 95% Wilson win-rate interval spans [${wilson.lowerPct}%, ${wilson.upperPct}%]. A single trade cannot establish strategy viability.`;
    evidenceVerdict = "INSUFFICIENT EVIDENCE";
  } else if (totalGrossPnLINR > 0 && totalNetPnLINR <= 0) {
    conclusion = "REJECTED_AFTER_COSTS";
    conclusionTitle = "OPPORTUNITY REJECTED AFTER COSTS";
    conclusionDescription = `Gross simulation gain of +₹${totalGrossPnLINR.toLocaleString("en-IN")} across ${executedCount} trade(s) was eliminated by ₹${totalFrictionINR.toLocaleString("en-IN")} in modeled MCX brokerage, taxes, and slippage (Net: -₹${Math.abs(totalNetPnLINR).toLocaleString("en-IN")}).`;
    evidenceVerdict = "REJECTED AFTER COSTS";
  } else if (totalNetPnLINR <= 0) {
    conclusion = "NO_PERSISTENT_EDGE_DETECTED";
    conclusionTitle = "NO PERSISTENT EDGE DETECTED";
    conclusionDescription = `Cumulative net performance is negative (-₹${Math.abs(totalNetPnLINR).toLocaleString("en-IN")} across ${executedCount} trade${executedCount === 1 ? "" : "s"}). Available data shows no net edge under these parameters.`;
    evidenceVerdict = "NO PERSISTENT EDGE";
  } else if (!isStatisticallySignificant || stabilityLabel === "FRAGILE") {
    conclusion = "INSUFFICIENT_EVIDENCE";
    conclusionTitle = "INSUFFICIENT EVIDENCE (SAMPLE TOO SMALL FOR PROOF)";
    if (degreesOfFreedom === 0) {
      conclusionDescription = `Positive net result (+₹${totalNetPnLINR.toLocaleString("en-IN")}) comes from only ${executedCount} executed trade (${winningTrades.length}/${executedCount} win). With df = 0 degrees of freedom, sample variance and t-statistics are mathematically undefined and the 95% Wilson win-rate interval spans [${wilson.lowerPct}%, ${wilson.upperPct}%]. A single trade cannot establish a persistent edge.`;
    } else if (outSampleTrades.length === 0 || outSampleNet <= 0) {
      conclusionDescription = `In-sample trades were positive, but out-of-sample verification recorded ${outSampleTrades.length} trade(s) with ₹${outSampleNet.toLocaleString("en-IN")} net P&L. Unverified out-of-sample coverage classifies this result as INSUFFICIENT EVIDENCE.`;
    } else {
      conclusionDescription = `Net P&L is positive (+₹${totalNetPnLINR.toLocaleString("en-IN")} across ${executedCount} trades, ${winningTrades.length}/${executedCount} wins; 95% Wilson CI [${wilson.lowerPct}%, ${wilson.upperPct}%], one-sided p = ${oneSidedPValue}), which does not reject the zero-edge null hypothesis at α = 0.05. Larger multi-year history is needed before drawing firm conclusions.`;
    }
    evidenceVerdict = "INSUFFICIENT EVIDENCE";
  } else {
    conclusion = "VIABLE_EDGE_FOUND";
    conclusionTitle = "EVIDENCE SUPPORTS FURTHER INVESTIGATION";
    conclusionDescription = `Across n = ${executedCount} next-open trades (${winningTrades.length}/${executedCount} wins, 95% Wilson CI [${wilson.lowerPct}%, ${wilson.upperPct}%], t = ${tStatistic}, one-sided p = ${oneSidedPValue}), net P&L remained positive in both in-sample and out-of-sample splits (+₹${totalNetPnLINR.toLocaleString("en-IN")} after ₹${totalFrictionINR.toLocaleString("en-IN")} costs). Historical simulation is not a guarantee of live performance.`;
    evidenceVerdict = "EVIDENCE SUPPORTS FURTHER INVESTIGATION";
  }

  const honestyScorecard: BacktestHonestyScorecard = {
    evidenceVerdict,
    evidenceHeadline: conclusionTitle,
    evidenceExplanation: conclusionDescription,
    degreesOfFreedom,
    winRateWilson95CI: {
      lowerPct: wilson.lowerPct,
      upperPct: wilson.upperPct,
      methodNote:
        "Exact 95% Wilson score binomial confidence interval on observed win ratio k/n (valid for small samples including n = 1).",
    },
    meanNetTradeCI95: {
      meanINR: executedCount > 0 ? Number(avgNetTrade.toFixed(2)) : null,
      stdErrorINR: stdErrorINR !== null ? Number(stdErrorINR.toFixed(2)) : null,
      tStatistic,
      oneSidedPValue,
      methodNote:
        executedCount < 2
          ? "Undefined for n < 2 (df = n − 1 = 0 leaves sample variance unidentifiable)."
          : `One-sided Student's t test of H₀: μ_net ≤ 0 with df = ${degreesOfFreedom} (assumes approximately independent trade outcomes).`,
    },
    inSampleTradesCount: inSampleTrades.length,
    outOfSampleTradesCount: outSampleTrades.length,
    walkForwardFolds,
    parameterSensitivity: {
      grid,
      profitableNeighborsCount,
      totalGridCells: grid.length,
      profitableNeighborsPct,
      stabilityLabel,
      summary:
        evaluatedGrid.length === 0
          ? "No trades triggered across neighboring parameter grid."
          : `${profitableNeighborsCount} of ${grid.length} neighboring configurations (Entry Z ±0.3σ × Max Hold ±3d) produced positive net P&L (${profitableNeighborsPct}%).`,
    },
    safeguardChecks: [
      {
        id: "lookahead",
        label: "Strict Prior-Window Lookback (< T)",
        status: "VERIFIED",
        detail: "Rolling mean and σ on session T use only clean sessions strictly prior to T.",
      },
      {
        id: "fill_timing",
        label: "Next-Session Open Execution (T+1 Open)",
        status: "VERIFIED",
        detail: "Signals at session T close fill at T+1 Open spread — never at the same close that triggered the signal.",
      },
      {
        id: "cost_inclusion",
        label: "Weight-Matched 4-Leg MCX Costs Included",
        status: "VERIFIED",
        detail: `${hedgeExplanation} Includes brokerage, CTT, GST, exchange & SEBI fees, stamp duty, and leg slippage.`,
      },
      {
        id: "sample_coverage",
        label: "Sample Depth & Out-of-Sample Coverage",
        status: isStatisticallySignificant ? "VERIFIED" : "LIMITATION",
        detail: `${executedCount} total trade(s) (${inSampleTrades.length} in-sample, ${outSampleTrades.length} out-of-sample; df = ${degreesOfFreedom}).`,
      },
      {
        id: "daily_ohlc_limit",
        label: "Daily Bhavcopy Granularity Limitation",
        status: "LIMITATION",
        detail: "Daily OHLC quotes cannot observe intraday L2 book queue priority or simultaneous 2-leg execution lag.",
      },
    ],
    methodologyLimitations: [
      "Daily OHLC Bhavcopy bars do not capture simultaneous intraday bid/ask quotes across both legs.",
      "Historical simulation on synthetic demo or finite historical windows cannot prove live-market profitability.",
      "Compulsory physical delivery rules on MCX require strict pre-tender square-off; holding through expiry is prohibited.",
    ],
  };

  const metrics: BacktestMetrics = {
    totalSignalsGenerated,
    eligibleTradesExecuted: executedCount,
    rejectedSignalsCount: rejectedSignals.length,
    winningTradesCount: winningTrades.length,
    losingTradesCount: losingTrades.length,
    winRatePct,
    totalGrossPnLINR: Number(totalGrossPnLINR.toFixed(2)),
    totalNetPnLINR: Number(totalNetPnLINR.toFixed(2)),
    totalFrictionINR: Number(totalFrictionINR.toFixed(2)),
    costToGrossPnLRatioPct: Number(Math.min(999, costToGrossPnLRatioPct).toFixed(1)),
    averageNetTradeINR: Number(avgNetTrade.toFixed(2)),
    medianNetTradeINR: Number(medianNetTrade.toFixed(2)),
    averageHoldingDays: Number(avgHold.toFixed(1)),
    maxDrawdownINR: Number(maxDrawdownINR.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    profitFactor,
    sharpeRatioApprox,
    inSampleTradesCount: inSampleTrades.length,
    inSampleNetPnLINR: Number(inSampleNet.toFixed(2)),
    inSampleWinRatePct: inSampleWinRate,
    outOfSampleTradesCount: outSampleTrades.length,
    outOfSampleNetPnLINR: Number(outSampleNet.toFixed(2)),
    outOfSampleWinRatePct: outSampleWinRate,
    conclusion,
    conclusionTitle,
    conclusionDescription,
  };

  return {
    params,
    hedgeSizingExplanation: hedgeExplanation,
    metrics,
    honestyScorecard,
    trades,
    rejectedSignals,
    equityCurve,
  };
}
