export interface CostParameters {
  brokeragePerOrderINR?: number; // default ₹20 per executed order
  brokerageBasisPoints?: number; // alternative bps (default 0)
  exchangeTurnoverPct?: number; // MCX charges ~0.0021%
  cttSellSidePct?: number; // CTT 0.01% on sell side
  gstPct?: number; // 18% on brokerage & exchange fees
  sebiTurnoverPct?: number; // 0.0001%
  stampDutyBuyPct?: number; // 0.002% on buy side
  slippagePerGramINR?: number; // estimated market impact/bid-ask (e.g., ₹1.20/g)
  lotsTraded?: number; // default 1
}

export interface ProfitRealityCheckResult {
  nominalGramsTraded: number;
  grossEdgePerGram: number; // ₹/g
  totalGrossEdgeINR: number; // ₹
  
  // Breakdown of costs (Round-trip for 2 legs = 4 orders)
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
  
  costToEdgeRatioPct: number; // (Friction / Gross) * 100
  breakEvenRequiredSpreadINR: number; // Minimum convergence needed just to break even
  
  verdict: "VIABLE_NET_EDGE" | "MARGINAL_EDGE" | "REJECTED_AFTER_COSTS";
  verdictTitle: string;
  verdictExplanation: string;
  
  sensitivityAnalysis: {
    scenario: string;
    slippageMultiplier: number;
    frictionPerGram: number;
    netEdgePerGram: number;
    viable: boolean;
  }[];
}

export const DEFAULT_COST_CONFIG: CostParameters = {
  brokeragePerOrderINR: 20,
  brokerageBasisPoints: 0,
  exchangeTurnoverPct: 0.000021, // 0.0021%
  cttSellSidePct: 0.0001, // 0.01%
  gstPct: 0.18, // 18%
  sebiTurnoverPct: 0.000001, // ₹10/Cr
  stampDutyBuyPct: 0.00002, // 0.002%
  slippagePerGramINR: 1.25, // ₹1.25 / gram conservative spread
  lotsTraded: 1,
};

/**
 * Calculates real-world transaction friction and statutory costs on an MCX gold pairs/spread trade.
 */
export function calculateProfitReality(
  priceA_Norm: number,
  priceB_Norm: number,
  observedSpreadAbs: number, // ₹/g deviation from equilibrium
  nominalGrams = 100, // e.g. 100g for GOLDM
  customConfig: CostParameters = {}
): ProfitRealityCheckResult {
  const config = { ...DEFAULT_COST_CONFIG, ...customConfig };

  const grossEdgePerGram = Math.abs(observedSpreadAbs);
  const totalGrossEdgeINR = grossEdgePerGram * nominalGrams * (config.lotsTraded || 1);

  // A spread trade involves 2 legs on entry (1 Buy, 1 Sell) and 2 legs on exit (1 Sell, 1 Buy)
  // Total of 4 executed trade legs.
  const notionalTurnoverLegA = priceA_Norm * nominalGrams * (config.lotsTraded || 1);
  const notionalTurnoverLegB = priceB_Norm * nominalGrams * (config.lotsTraded || 1);
  const totalRoundtripTurnover = (notionalTurnoverLegA + notionalTurnoverLegB) * 2;

  // 1. Brokerage (4 orders: Entry A, Entry B, Exit A, Exit B)
  const fixedBrokerage = (config.brokeragePerOrderINR || 20) * 4;
  const variableBrokerage = totalRoundtripTurnover * ((config.brokerageBasisPoints || 0) / 10000);
  const brokerageTotalINR = fixedBrokerage + variableBrokerage;

  // 2. MCX Exchange Turnover charges on total turnover
  const exchangeTurnoverChargesINR = totalRoundtripTurnover * (config.exchangeTurnoverPct || 0.000021);

  // 3. CTT (Commodity Transaction Tax) is levied on the SELL side only (~0.01%)
  // Half of roundtrip turnover is sell side
  const sellTurnover = totalRoundtripTurnover / 2;
  const cttTaxINR = sellTurnover * (config.cttSellSidePct || 0.0001);

  // 4. SEBI turnover fees
  const sebiFeesINR = totalRoundtripTurnover * (config.sebiTurnoverPct || 0.000001);

  // 5. Stamp Duty (levied on BUY side only, ~0.002%)
  const buyTurnover = totalRoundtripTurnover / 2;
  const stampDutyINR = buyTurnover * (config.stampDutyBuyPct || 0.00002);

  // 6. GST (18% on Brokerage + Exchange Turnover charges)
  const gstTotalINR = (brokerageTotalINR + exchangeTurnoverChargesINR) * (config.gstPct || 0.18);

  // 7. Slippage & Bid-Ask market impact across 2 legs entry and 2 legs exit
  const slippagePerGram = config.slippagePerGramINR || 1.25;
  const slippageTotalINR = slippagePerGram * nominalGrams * 2 * (config.lotsTraded || 1); // 2 legs impact

  // Total friction
  const statutoryFeesINR = exchangeTurnoverChargesINR + cttTaxINR + sebiFeesINR + stampDutyINR + gstTotalINR;
  const totalFrictionINR = brokerageTotalINR + statutoryFeesINR + slippageTotalINR;
  const totalFrictionPerGram = nominalGrams > 0 ? totalFrictionINR / (nominalGrams * (config.lotsTraded || 1)) : 0;

  const netEdgeINR = totalGrossEdgeINR - totalFrictionINR;
  const netEdgePerGram = grossEdgePerGram - totalFrictionPerGram;

  const costToEdgeRatioPct = grossEdgePerGram > 0 ? (totalFrictionPerGram / grossEdgePerGram) * 100 : 999;
  const breakEvenRequiredSpreadINR = totalFrictionPerGram;

  let verdict: "VIABLE_NET_EDGE" | "MARGINAL_EDGE" | "REJECTED_AFTER_COSTS" = "VIABLE_NET_EDGE";
  let verdictTitle = "Viable Net Edge Detected";
  let verdictExplanation = `The gross deviation (₹${grossEdgePerGram.toFixed(2)}/g) comfortably exceeds total estimated friction (₹${totalFrictionPerGram.toFixed(2)}/g). The strategy retains a positive net edge of ₹${netEdgePerGram.toFixed(2)}/g (${(100 - costToEdgeRatioPct).toFixed(1)}% edge retention).`;

  if (netEdgeINR <= 0 || costToEdgeRatioPct >= 100) {
    verdict = "REJECTED_AFTER_COSTS";
    verdictTitle = "OPPORTUNITY REJECTED AFTER COSTS";
    verdictExplanation = `Theoretical gross edge of ₹${grossEdgePerGram.toFixed(2)}/g is completely eliminated by total execution friction (₹${totalFrictionPerGram.toFixed(2)}/g, including exchange fees, CTT, GST, and bid-ask slippage). Expected net edge is negative (-₹${Math.abs(netEdgePerGram).toFixed(2)}/g).`;
  } else if (costToEdgeRatioPct > 65) {
    verdict = "MARGINAL_EDGE";
    verdictTitle = "Marginal Edge (High Friction Risk)";
    verdictExplanation = `Execution costs consume ${costToEdgeRatioPct.toFixed(1)}% of the gross anomaly. While mathematically positive (+₹${netEdgePerGram.toFixed(2)}/g), any minor liquidity shock or adverse slippage will turn this trade unprofitable.`;
  }

  // Sensitivity scenarios
  const sensitivityAnalysis = [
    {
      scenario: "Baseline (Current Model)",
      slippageMultiplier: 1.0,
      frictionPerGram: Number(totalFrictionPerGram.toFixed(2)),
      netEdgePerGram: Number(netEdgePerGram.toFixed(2)),
      viable: netEdgePerGram > 0,
    },
    {
      scenario: "+25% Slippage Impact",
      slippageMultiplier: 1.25,
      frictionPerGram: Number((totalFrictionPerGram + slippagePerGram * 0.25 * 2).toFixed(2)),
      netEdgePerGram: Number((netEdgePerGram - slippagePerGram * 0.25 * 2).toFixed(2)),
      viable: netEdgePerGram - slippagePerGram * 0.25 * 2 > 0,
    },
    {
      scenario: "+50% Slippage Impact (Volatile Session)",
      slippageMultiplier: 1.5,
      frictionPerGram: Number((totalFrictionPerGram + slippagePerGram * 0.5 * 2).toFixed(2)),
      netEdgePerGram: Number((netEdgePerGram - slippagePerGram * 0.5 * 2).toFixed(2)),
      viable: netEdgePerGram - slippagePerGram * 0.5 * 2 > 0,
    },
    {
      scenario: "+100% Slippage (Illiquid Rollover)",
      slippageMultiplier: 2.0,
      frictionPerGram: Number((totalFrictionPerGram + slippagePerGram * 1.0 * 2).toFixed(2)),
      netEdgePerGram: Number((netEdgePerGram - slippagePerGram * 1.0 * 2).toFixed(2)),
      viable: netEdgePerGram - slippagePerGram * 1.0 * 2 > 0,
    },
  ];

  return {
    nominalGramsTraded: nominalGrams * (config.lotsTraded || 1),
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
