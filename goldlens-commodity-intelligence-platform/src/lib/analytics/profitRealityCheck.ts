import { getHedgeMatchedSizing } from "./contracts";

export interface CostParameters {
  brokeragePerOrderINR?: number; // default ₹20 per executed order (4 orders round-trip)
  brokerageBasisPoints?: number; // optional variable brokerage bps
  exchangeTurnoverPct?: number; // MCX charges ~0.0021%
  cttSellSidePct?: number; // CTT 0.01% on sell side
  gstPct?: number; // 18% on brokerage & exchange fees
  sebiTurnoverPct?: number; // 0.0001%
  stampDutyBuyPct?: number; // 0.002% on buy side
  slippagePerGramINR?: number; // estimated market impact/bid-ask per leg (default ₹1.25/g)
  lotsTraded?: number; // hedge units traded (default 1 weight-matched unit)
  contractA?: string;
  contractB?: string;
}

export interface ProfitRealityCheckResult {
  nominalGramsTraded: number;
  hedgeSizingNote: string;
  grossEdgePerGram: number; // ₹/g
  totalGrossEdgeINR: number; // ₹

  brokerageTotalINR: number;
  exchangeTurnoverChargesINR: number;
  cttTaxINR: number;
  sebiFeesINR: number;
  stampDutyINR: number;
  gstTotalINR: number;
  slippageTotalINR: number;

  totalFrictionINR: number;
  totalFrictionPerGram: number; // ₹/g

  netEdgeINR: number;
  netEdgePerGram: number; // ₹/g

  costToEdgeRatioPct: number;
  breakEvenRequiredSpreadINR: number;

  verdict: "VIABLE_NET_EDGE" | "MARGINAL_EDGE" | "REJECTED_AFTER_COSTS";
  verdictTitle: string;
  verdictExplanation: string;

  sensitivityAnalysis: {
    scenario: string;
    costMultiplier: number;
    slippageMultiplier: number;
    convergencePct: number;
    grossPerGram: number;
    frictionPerGram: number;
    netEdgePerGram: number;
    netEdgeTotalINR: number;
    deltaVsBaseINR: number;
    viable: boolean;
  }[];
}

export interface StressScenarioInputs {
  costIncreasePct: number; // e.g., 0, 25, 50, 100
  slippagePerGramINR: number; // e.g., 1.25 to 5.00
  convergenceCapturePct: number; // e.g., 100%, 75%, 50%, 30%
  liquidityImpactPerGramINR: number; // e.g., 0 to 4.00
  approachingExpiryDragINR: number; // e.g., 0 to 6.00 basis non-convergence near expiry
}

export interface StressTestEvaluation {
  matchedGrams: number;
  hedgeExplanation: string;
  baseCase: {
    grossPerGram: number;
    grossTotalINR: number;
    costsPerGram: number;
    costsTotalINR: number;
    netPerGram: number;
    netTotalINR: number;
    viable: boolean;
  };
  stressedCase: {
    grossPerGram: number;
    grossTotalINR: number;
    costsPerGram: number;
    costsTotalINR: number;
    netPerGram: number;
    netTotalINR: number;
    deltaPerGram: number;
    deltaTotalINR: number;
    viable: boolean;
    verdict: "SURVIVES_STRESS" | "FRAGILE_EDGE" | "FAILS_UNDER_STRESS";
  };
  presetMatrix: {
    id: string;
    label: string;
    assumptionSummary: string;
    grossINR: number;
    costsINR: number;
    netINR: number;
    deltaVsBaseINR: number;
    survives: boolean;
  }[];
  assumptions: string[];
  limitations: string[];
}

export const DEFAULT_COST_CONFIG: CostParameters = {
  brokeragePerOrderINR: 20,
  brokerageBasisPoints: 0,
  exchangeTurnoverPct: 0.000021, // 0.0021%
  cttSellSidePct: 0.0001, // 0.01%
  gstPct: 0.18, // 18%
  sebiTurnoverPct: 0.000001, // ₹10/Cr
  stampDutyBuyPct: 0.00002, // 0.002%
  slippagePerGramINR: 1.25, // ₹1.25 / gram conservative spread per leg
  lotsTraded: 1,
};

/**
 * Calculates real-world transaction friction and statutory charges on an MCX gold spread trade.
 * When contractA & contractB are supplied, uses the exact LCM physical weight-matched hedge unit.
 */
export function calculateProfitReality(
  priceA_Norm: number,
  priceB_Norm: number,
  observedSpreadAbs: number,
  nominalGrams?: number,
  customConfig: CostParameters = {}
): ProfitRealityCheckResult {
  const config = { ...DEFAULT_COST_CONFIG, ...customConfig };

  let baseUnitGrams = nominalGrams || 100;
  let hedgeSizingNote = `Modeled on ${baseUnitGrams}g notional hedge unit (4 executed leg orders round-trip).`;

  if (config.contractA && config.contractB) {
    const hedge = getHedgeMatchedSizing(config.contractA, config.contractB);
    baseUnitGrams = hedge.matchedGrams;
    hedgeSizingNote = hedge.explanation;
  }

  const units = Math.max(1, config.lotsTraded || 1);
  const totalGrams = baseUnitGrams * units;

  const grossEdgePerGram = Math.abs(observedSpreadAbs);
  const totalGrossEdgeINR = grossEdgePerGram * totalGrams;

  const notionalTurnoverLegA = priceA_Norm * totalGrams;
  const notionalTurnoverLegB = priceB_Norm * totalGrams;
  const totalRoundtripTurnover = (notionalTurnoverLegA + notionalTurnoverLegB) * 2;

  const fixedBrokerage = (config.brokeragePerOrderINR ?? 20) * 4 * units;
  const variableBrokerage = totalRoundtripTurnover * ((config.brokerageBasisPoints || 0) / 10000);
  const brokerageTotalINR = fixedBrokerage + variableBrokerage;

  const exchangeTurnoverChargesINR = totalRoundtripTurnover * (config.exchangeTurnoverPct ?? 0.000021);
  const sellTurnover = totalRoundtripTurnover / 2;
  const cttTaxINR = sellTurnover * (config.cttSellSidePct ?? 0.0001);
  const sebiFeesINR = totalRoundtripTurnover * (config.sebiTurnoverPct ?? 0.000001);
  const buyTurnover = totalRoundtripTurnover / 2;
  const stampDutyINR = buyTurnover * (config.stampDutyBuyPct ?? 0.00002);
  const gstTotalINR = (brokerageTotalINR + exchangeTurnoverChargesINR) * (config.gstPct ?? 0.18);

  const slippagePerGram = config.slippagePerGramINR ?? 1.25;
  const slippageTotalINR = slippagePerGram * totalGrams * 2; // 2 legs market impact

  const statutoryFeesINR =
    exchangeTurnoverChargesINR + cttTaxINR + sebiFeesINR + stampDutyINR + gstTotalINR;
  const totalFrictionINR = brokerageTotalINR + statutoryFeesINR + slippageTotalINR;
  const totalFrictionPerGram = totalGrams > 0 ? totalFrictionINR / totalGrams : 0;

  const netEdgeINR = totalGrossEdgeINR - totalFrictionINR;
  const netEdgePerGram = grossEdgePerGram - totalFrictionPerGram;

  const costToEdgeRatioPct =
    grossEdgePerGram > 0 ? (totalFrictionPerGram / grossEdgePerGram) * 100 : 999;
  const breakEvenRequiredSpreadINR = totalFrictionPerGram;

  let verdict: "VIABLE_NET_EDGE" | "MARGINAL_EDGE" | "REJECTED_AFTER_COSTS" = "VIABLE_NET_EDGE";
  let verdictTitle = "Positive Net Edge After Modeled Costs";
  let verdictExplanation = `Gross spread deviation (₹${grossEdgePerGram.toFixed(2)}/g) exceeds estimated round-trip friction (₹${totalFrictionPerGram.toFixed(2)}/g on ${totalGrams}g hedge unit), leaving +₹${netEdgePerGram.toFixed(2)}/g (+₹${netEdgeINR.toFixed(0)} per hedge unit).`;

  if (netEdgeINR <= 0 || costToEdgeRatioPct >= 100) {
    verdict = "REJECTED_AFTER_COSTS";
    verdictTitle = "OPPORTUNITY REJECTED AFTER COSTS";
    verdictExplanation = `Gross spread of ₹${grossEdgePerGram.toFixed(2)}/g is outweighed by ₹${totalFrictionPerGram.toFixed(2)}/g in round-trip friction (${totalGrams}g matched unit). Net estimate is -₹${Math.abs(netEdgePerGram).toFixed(2)}/g (-₹${Math.abs(netEdgeINR).toFixed(0)}).`;
  } else if (costToEdgeRatioPct > 65) {
    verdict = "MARGINAL_EDGE";
    verdictTitle = "Marginal Buffer (High Cost Sensitivity)";
    verdictExplanation = `Modeled costs consume ${costToEdgeRatioPct.toFixed(1)}% of gross spread. Net estimate is thin (+₹${netEdgePerGram.toFixed(2)}/g) and vulnerable to slippage or incomplete convergence.`;
  }

  const buildScenario = (
    scenario: string,
    costMult: number,
    slipMult: number,
    convPct: number
  ) => {
    const realizedGrossPerG = grossEdgePerGram * (convPct / 100);
    const feePartPerG = (brokerageTotalINR + statutoryFeesINR) / (totalGrams || 1);
    const slipPartPerG = slippagePerGram * 2;
    const scenFrictionPerG = feePartPerG * costMult + slipPartPerG * slipMult;
    const scenNetPerG = realizedGrossPerG - scenFrictionPerG;
    const scenNetTotal = scenNetPerG * totalGrams;
    return {
      scenario,
      costMultiplier: costMult,
      slippageMultiplier: slipMult,
      convergencePct: convPct,
      grossPerGram: Number(realizedGrossPerG.toFixed(2)),
      frictionPerGram: Number(scenFrictionPerG.toFixed(2)),
      netEdgePerGram: Number(scenNetPerG.toFixed(2)),
      netEdgeTotalINR: Number(scenNetTotal.toFixed(2)),
      deltaVsBaseINR: Number((scenNetTotal - netEdgeINR).toFixed(2)),
      viable: scenNetPerG > 0,
    };
  };

  const sensitivityAnalysis = [
    buildScenario("Base Case (100% Convergence, 1.0x Costs)", 1.0, 1.0, 100),
    buildScenario("Transaction Costs +25%", 1.25, 1.25, 100),
    buildScenario("Transaction Costs +50%", 1.5, 1.5, 100),
    buildScenario("Transaction Costs +100% (2x Friction)", 2.0, 2.0, 100),
    buildScenario("Slow / Partial Convergence (60% Capture)", 1.0, 1.25, 60),
    buildScenario("Thin Liquidity + Expiry Squeeze", 1.25, 2.0, 50),
  ];

  return {
    nominalGramsTraded: totalGrams,
    hedgeSizingNote,
    grossEdgePerGram: Number(grossEdgePerGram.toFixed(2)),
    totalGrossEdgeINR: Number(totalGrossEdgeINR.toFixed(2)),
    brokerageTotalINR: Number(brokerageTotalINR.toFixed(2)),
    exchangeTurnoverChargesINR: Number(exchangeTurnoverChargesINR.toFixed(2)),
    cttTaxINR: Number(cttTaxINR.toFixed(2)),
    sebiFeesINR: Number(sebiFeesINR.toFixed(2)),
    stampDutyINR: Number(stampDutyINR.toFixed(2)),
    gstTotalINR: Number(gstTotalINR.toFixed(2)),
    slippageTotalINR: Number(slippageTotalINR.toFixed(2)),
    totalFrictionINR: Number(totalFrictionINR.toFixed(2)),
    totalFrictionPerGram: Number(totalFrictionPerGram.toFixed(2)),
    netEdgeINR: Number(netEdgeINR.toFixed(2)),
    netEdgePerGram: Number(netEdgePerGram.toFixed(2)),
    costToEdgeRatioPct: Number(Math.min(999, costToEdgeRatioPct).toFixed(1)),
    breakEvenRequiredSpreadINR: Number(breakEvenRequiredSpreadINR.toFixed(2)),
    verdict,
    verdictTitle,
    verdictExplanation,
    sensitivityAnalysis,
  };
}

/**
 * Evaluates a candidate spread signal under interactive user-selected stress assumptions.
 */
export function runOpportunityStressTest(
  contractA: string,
  contractB: string,
  priceA_Norm: number,
  priceB_Norm: number,
  observedExcessSpreadPerGram: number,
  dteMin: number,
  inputs: StressScenarioInputs
): StressTestEvaluation {
  const hedge = getHedgeMatchedSizing(contractA, contractB);
  const base = calculateProfitReality(
    priceA_Norm,
    priceB_Norm,
    Math.abs(observedExcessSpreadPerGram),
    hedge.matchedGrams,
    { contractA, contractB }
  );

  const grams = hedge.matchedGrams;
  const costMult = 1 + inputs.costIncreasePct / 100;
  const baseFeeOnlyTotal = base.totalFrictionINR - base.slippageTotalINR;

  const evalScenario = (
    cMult: number,
    slipPerLeg: number,
    convPct: number,
    liqPenaltyPerG: number,
    expDragPerG: number
  ) => {
    const realizedGrossPerG = Math.max(
      0,
      Math.abs(observedExcessSpreadPerGram) * (convPct / 100) - expDragPerG
    );
    const grossTotal = realizedGrossPerG * grams;
    const feeTotal = baseFeeOnlyTotal * cMult;
    const slipTotal = (slipPerLeg * 2 + liqPenaltyPerG) * grams;
    const costsTotal = feeTotal + slipTotal;
    const costsPerG = costsTotal / (grams || 1);
    const netTotal = grossTotal - costsTotal;
    const netPerG = netTotal / (grams || 1);
    return {
      grossPerGram: Number(realizedGrossPerG.toFixed(2)),
      grossTotalINR: Number(grossTotal.toFixed(2)),
      costsPerGram: Number(costsPerG.toFixed(2)),
      costsTotalINR: Number(costsTotal.toFixed(2)),
      netPerGram: Number(netPerG.toFixed(2)),
      netTotalINR: Number(netTotal.toFixed(2)),
    };
  };

  const stressed = evalScenario(
    costMult,
    inputs.slippagePerGramINR,
    inputs.convergenceCapturePct,
    inputs.liquidityImpactPerGramINR,
    inputs.approachingExpiryDragINR
  );

  const deltaPerGram = Number((stressed.netPerGram - base.netEdgePerGram).toFixed(2));
  const deltaTotalINR = Number((stressed.netTotalINR - base.netEdgeINR).toFixed(2));

  let verdict: "SURVIVES_STRESS" | "FRAGILE_EDGE" | "FAILS_UNDER_STRESS" = "SURVIVES_STRESS";
  if (stressed.netTotalINR <= 0) {
    verdict = "FAILS_UNDER_STRESS";
  } else if (stressed.netPerGram < 2.0 || stressed.costsTotalINR / (stressed.grossTotalINR || 1) > 0.7) {
    verdict = "FRAGILE_EDGE";
  }

  const p25 = evalScenario(1.25, 1.25 * 1.25, 100, 0, 0);
  const p50 = evalScenario(1.5, 1.25 * 1.5, 100, 0, 0);
  const p100 = evalScenario(2.0, 1.25 * 2.0, 100, 0, 0);
  const slowConv = evalScenario(1.0, 1.5, 55, 0.5, 0);
  const illiquid = evalScenario(1.25, 2.5, 80, 2.0, 0);
  const expiryStress = evalScenario(1.25, 2.25, 50, 1.5, dteMin <= 6 ? 6.0 : 3.0);

  return {
    matchedGrams: grams,
    hedgeExplanation: hedge.explanation,
    baseCase: {
      grossPerGram: base.grossEdgePerGram,
      grossTotalINR: base.totalGrossEdgeINR,
      costsPerGram: base.totalFrictionPerGram,
      costsTotalINR: base.totalFrictionINR,
      netPerGram: base.netEdgePerGram,
      netTotalINR: base.netEdgeINR,
      viable: base.netEdgeINR > 0,
    },
    stressedCase: {
      ...stressed,
      deltaPerGram,
      deltaTotalINR,
      viable: stressed.netTotalINR > 0,
      verdict,
    },
    presetMatrix: [
      {
        id: "cost_25",
        label: "Costs +25%",
        assumptionSummary: "+25% brokerage, exchange taxes & bid-ask slippage; 100% convergence",
        grossINR: p25.grossTotalINR,
        costsINR: p25.costsTotalINR,
        netINR: p25.netTotalINR,
        deltaVsBaseINR: Number((p25.netTotalINR - base.netEdgeINR).toFixed(2)),
        survives: p25.netTotalINR > 0,
      },
      {
        id: "cost_50",
        label: "Costs +50%",
        assumptionSummary: "+50% brokerage, statutory charges & slippage; 100% convergence",
        grossINR: p50.grossTotalINR,
        costsINR: p50.costsTotalINR,
        netINR: p50.netTotalINR,
        deltaVsBaseINR: Number((p50.netTotalINR - base.netEdgeINR).toFixed(2)),
        survives: p50.netTotalINR > 0,
      },
      {
        id: "cost_100",
        label: "Costs +100% (2×)",
        assumptionSummary: "Double all execution costs & slippage (₹2.50/g per leg)",
        grossINR: p100.grossTotalINR,
        costsINR: p100.costsTotalINR,
        netINR: p100.netTotalINR,
        deltaVsBaseINR: Number((p100.netTotalINR - base.netEdgeINR).toFixed(2)),
        survives: p100.netTotalINR > 0,
      },
      {
        id: "slow_conv",
        label: "Slower Convergence (55%)",
        assumptionSummary: "Only 55% of excess spread reverts prior to time-stop exit",
        grossINR: slowConv.grossTotalINR,
        costsINR: slowConv.costsTotalINR,
        netINR: slowConv.netTotalINR,
        deltaVsBaseINR: Number((slowConv.netTotalINR - base.netEdgeINR).toFixed(2)),
        survives: slowConv.netTotalINR > 0,
      },
      {
        id: "thin_liquidity",
        label: "Reduced Liquidity / Wide Book",
        assumptionSummary: "₹2.50/g leg slippage + ₹2.00/g queue fill penalty, 80% convergence",
        grossINR: illiquid.grossTotalINR,
        costsINR: illiquid.costsTotalINR,
        netINR: illiquid.netTotalINR,
        deltaVsBaseINR: Number((illiquid.netTotalINR - base.netEdgeINR).toFixed(2)),
        survives: illiquid.netTotalINR > 0,
      },
      {
        id: "expiry_squeeze",
        label: "Approaching Contract Expiry",
        assumptionSummary: `Tender-period basis drag (${dteMin}d current DTE) + forced rollover exit`,
        grossINR: expiryStress.grossTotalINR,
        costsINR: expiryStress.costsTotalINR,
        netINR: expiryStress.netTotalINR,
        deltaVsBaseINR: Number((expiryStress.netTotalINR - base.netEdgeINR).toFixed(2)),
        survives: expiryStress.netTotalINR > 0,
      },
    ],
    assumptions: [
      hedge.explanation,
      `Modeled statutory rates: CTT 0.01% (sell), Stamp Duty 0.002% (buy), MCX fee 0.0021%, SEBI fee 0.0001%, GST 18%.`,
      `Scenario multiplier: +${inputs.costIncreasePct}% fee stress, ₹${inputs.slippagePerGramINR.toFixed(2)}/g leg slippage, ${inputs.convergenceCapturePct}% convergence capture.`,
    ],
    limitations: [
      "Simulated stress outputs are parametric estimates on daily OHLC data, not live L2 orderbook execution forecasts.",
      "Margin funding costs, MTM cash calls, and compulsory delivery penalties near tender days can exceed linear cost models.",
    ],
  };
}
