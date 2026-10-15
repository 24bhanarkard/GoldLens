import { normalizePrice } from "./contracts";
import { DailyContractPoint } from "./spreads";

export interface SeededCaseInfo {
  id: string;
  date: string;
  contractA: string;
  contractB: string;
  title: string;
  subtitle: string;
  description: string;
  expectedClassification:
    | "WORTH_INVESTIGATING"
    | "EXPIRY_SENSITIVE"
    | "REJECTED_AFTER_COSTS"
    | "DATA_UNRELIABLE";
  keyTakeaway: string;
}

export const SEEDED_CASE_STUDIES: SeededCaseInfo[] = [
  {
    id: "case_1_clean_convergence",
    date: "2024-09-18",
    contractA: "GOLDM",
    contractB: "GOLDTEN",
    title: "The Classic Purity Basis Convergence",
    subtitle: "Real Statistically Significant Anomaly with Economically Viable Net Edge",
    description:
      "A localized demand spike in retail 10g gold bullion created a +2.65σ basis divergence between GOLDM (100g 995) and GOLDTEN (10g 999). With 28 days remaining until expiry and robust liquidity (12,500+ contracts volume), the spread cleanly converged back to equilibrium over 6 trading sessions, netting +₹18.40/gram profit after all MCX statutory taxes and slippage.",
    expectedClassification: "WORTH_INVESTIGATING",
    keyTakeaway:
      "Survives all False Signal Detective checks and provides clear historical evidence of mean reversion.",
  },
  {
    id: "case_2_expiry_trap",
    date: "2024-10-02",
    contractA: "GOLDM",
    contractB: "GOLDGUINEA",
    title: "The Expiry Proximity Trap",
    subtitle: "Massive 3.4σ Statistical Anomaly That Must Be Rejected",
    description:
      "GOLDM showed an extreme 3.4σ price distortion just 3 days prior to its contract expiry date (2024-10-05). While a naive statistical model would trigger an aggressive trade, False Signal Detective identifies the critical rollover window, delivery margin spikes, and imminent volume collapse, correctly disqualifying the candidate.",
    expectedClassification: "EXPIRY_SENSITIVE",
    keyTakeaway:
      "Never trade statistical spreads across expiring contracts; physical settlement rules distort the theoretical price relationship.",
  },
  {
    id: "case_3_friction_mirage",
    date: "2024-11-12",
    contractA: "GOLDGUINEA",
    contractB: "GOLDPETAL",
    title: "The Illiquidity & Friction Mirage",
    subtitle: "Theoretical Anomaly Erased by Real Execution Costs",
    description:
      "A 2.15σ relative price spread between GOLDGUINEA (8g) and GOLDPETAL (1g) offered an apparent theoretical gross edge of ₹7.50/gram. However, the Profit Reality Check reveals that wider retail bid-ask spreads, higher order brokerage per gram on small lot sizes, and turnover taxes total ₹9.80/gram in friction, turning the net edge negative (-₹2.30/gram).",
    expectedClassification: "REJECTED_AFTER_COSTS",
    keyTakeaway:
      "Gross statistical rarity does not equal executable profit. GoldLens rejects opportunities where costs exceed edge.",
  },
  {
    id: "case_4_corrupted_tick",
    date: "2024-12-03",
    contractA: "GOLDM",
    contractB: "GOLDPETAL",
    title: "The Corrupted Bhavcopy Print",
    subtitle: "Data Integrity Violation Creating an Artificial Spread",
    description:
      "An erroneous single-day price feed glitch recorded a -12% price dip on GOLDPETAL that immediately reverted the following session. The Data Trust Score pipeline flags the bar geometry anomaly and isolated spike, preventing an erroneous trade on corrupted exchange data.",
    expectedClassification: "DATA_UNRELIABLE",
    keyTakeaway:
      "Garbage in, garbage out: Quantitative models require automated Data Trust verification before calculating relative pricing.",
  },
];

/**
 * Generates a reproducible, high-fidelity synthetic MCX gold futures dataset.
 * Uses a deterministic pseudo-random seed to guarantee identical data on every run.
 */
export function generateSyntheticMCXDataset(): DailyContractPoint[] {
  // Deterministic PRNG (Linear Congruential Generator)
  let seed = 421337;
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const tradingDays: string[] = [];
  const startDate = new Date("2024-05-02");
  const endDate = new Date("2024-12-27");

  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Exclude weekends
      tradingDays.push(cur.toISOString().split("T")[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }

  // Contract expiry schedules
  const expiries: Record<string, { current: string; next: string }> = {
    GOLDM: { current: "2024-10-05", next: "2024-12-05" },
    GOLDTEN: { current: "2024-10-05", next: "2024-12-05" },
    GOLDGUINEA: { current: "2024-10-31", next: "2024-12-31" },
    GOLDPETAL: { current: "2024-10-31", next: "2024-12-31" },
    GOLD: { current: "2024-10-05", next: "2024-12-05" },
  };

  const records: DailyContractPoint[] = [];

  // Base gold price per 10g 995 standard (e.g. ₹71,500 drifting up to ₹78,000)
  let baseGold10g = 71500;

  for (let dIdx = 0; dIdx < tradingDays.length; dIdx++) {
    const date = tradingDays[dIdx];
    
    // Daily gold price random walk with drift
    const dailyReturn = (pseudoRandom() - 0.485) * 0.012; // slight upward drift
    baseGold10g = baseGold10g * (1 + dailyReturn);

    // Standard base price per gram 999 purity
    const basePricePerGram999 = (baseGold10g / 10) * (999 / 995);

    // 1. Generate GOLDM (100g, 995 purity, quoted per 10g)
    // Rollover switch when date reaches 2024-10-06
    const expiryGOLDM = date <= "2024-10-05" ? "2024-10-05" : "2024-12-05";
    const dteGOLDM = Math.max(0, Math.round((new Date(expiryGOLDM).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)));
    
    // Standard noise
    const noiseM = (pseudoRandom() - 0.5) * 4.0;
    
    // Check Case 1 Seed (2024-09-18 to 2024-09-26): GOLDM basis widens +₹24/g on 09-18 and converges over 6 sessions
    let case1Offset = 0;
    if (date === "2024-09-18") case1Offset = 24.0;
    else if (date === "2024-09-19") case1Offset = 21.5;
    else if (date === "2024-09-20") case1Offset = 16.0;
    else if (date === "2024-09-23") case1Offset = 10.5;
    else if (date === "2024-09-24") case1Offset = 5.0;
    else if (date === "2024-09-25") case1Offset = 2.0;
    else if (date === "2024-09-26") case1Offset = 0.5;

    // Check Case 2 Seed (2024-10-02): GOLDM huge spike 3 days before expiry
    let case2Offset = 0;
    if (date === "2024-10-02") case2Offset = 38.0;
    else if (date === "2024-10-03") case2Offset = 42.0;
    else if (date === "2024-10-04") case2Offset = 35.0;

    const goldmPerGram999 = basePricePerGram999 + noiseM + case1Offset + case2Offset;
    // Reverse normalize back to quoted per 10g @ 995: (PerGram999 * (995/999)) * 10
    const goldmCloseQuoted = Math.round((goldmPerGram999 * (995 / 999)) * 10);
    const goldmNorm = normalizePrice(goldmCloseQuoted, "GOLDM");
    const volGOLDM = date <= "2024-10-04" && date >= "2024-10-02" ? 850 : Math.round(12000 + pseudoRandom() * 6000);

    records.push({
      symbol: "GOLDM",
      date,
      expiryDate: expiryGOLDM,
      open: goldmCloseQuoted - Math.round(pseudoRandom() * 80),
      high: goldmCloseQuoted + Math.round(pseudoRandom() * 120),
      low: goldmCloseQuoted - Math.round(pseudoRandom() * 110),
      close: goldmCloseQuoted,
      volume: volGOLDM,
      openInterest: Math.round(18000 + pseudoRandom() * 4000),
      normalizedPriceG999: goldmNorm.normalizedPriceG999,
      daysToExpiry: dteGOLDM,
      qualityFlag: "clean",
    });

    // 2. Generate GOLDTEN (10g, 999 purity, quoted per 1g)
    const expiryGOLDTEN = expiryGOLDM;
    const dteGOLDTEN = dteGOLDM;
    const noiseTen = (pseudoRandom() - 0.5) * 3.5;
    const goldtenPerGram999 = basePricePerGram999 + noiseTen;
    const goldtenCloseQuoted = Math.round(goldtenPerGram999);
    const goldtenNorm = normalizePrice(goldtenCloseQuoted, "GOLDTEN");

    records.push({
      symbol: "GOLDTEN",
      date,
      expiryDate: expiryGOLDTEN,
      open: goldtenCloseQuoted - Math.round(pseudoRandom() * 10),
      high: goldtenCloseQuoted + Math.round(pseudoRandom() * 15),
      low: goldtenCloseQuoted - Math.round(pseudoRandom() * 15),
      close: goldtenCloseQuoted,
      volume: Math.round(8500 + pseudoRandom() * 3000),
      openInterest: Math.round(11000 + pseudoRandom() * 2500),
      normalizedPriceG999: goldtenNorm.normalizedPriceG999,
      daysToExpiry: dteGOLDTEN,
      qualityFlag: "clean",
    });

    // 3. Generate GOLDGUINEA (8g, 999 purity, quoted per 8g)
    const expiryGUINEA = date <= "2024-10-31" ? "2024-10-31" : "2024-12-31";
    const dteGUINEA = Math.max(0, Math.round((new Date(expiryGUINEA).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)));
    const noiseGuinea = (pseudoRandom() - 0.5) * 4.5;
    
    // Case 3 Seed (2024-11-12): GOLDGUINEA widens +₹7.50/g vs GOLDPETAL
    let case3Offset = 0;
    if (date === "2024-11-12") case3Offset = 7.5;
    else if (date === "2024-11-13") case3Offset = 6.8;
    else if (date === "2024-11-14") case3Offset = 5.2;

    const guineaPerGram999 = basePricePerGram999 + noiseGuinea + case3Offset;
    const guineaCloseQuoted = Math.round(guineaPerGram999 * 8); // quoted per 8g
    const guineaNorm = normalizePrice(guineaCloseQuoted, "GOLDGUINEA");

    records.push({
      symbol: "GOLDGUINEA",
      date,
      expiryDate: expiryGUINEA,
      open: guineaCloseQuoted - Math.round(pseudoRandom() * 60),
      high: guineaCloseQuoted + Math.round(pseudoRandom() * 80),
      low: guineaCloseQuoted - Math.round(pseudoRandom() * 80),
      close: guineaCloseQuoted,
      volume: Math.round(3500 + pseudoRandom() * 1500),
      openInterest: Math.round(4200 + pseudoRandom() * 1000),
      normalizedPriceG999: guineaNorm.normalizedPriceG999,
      daysToExpiry: dteGUINEA,
      qualityFlag: "clean",
    });

    // 4. Generate GOLDPETAL (1g, 999 purity, quoted per 1g)
    const expiryPETAL = expiryGUINEA;
    const dtePETAL = dteGUINEA;
    const noisePetal = (pseudoRandom() - 0.5) * 4.0;
    
    let petalPerGram999 = basePricePerGram999 + noisePetal;
    let petalQualityFlag: "clean" | "warning" | "corrupted" = "clean";
    let petalQualityNotes: string | undefined;

    // Case 4 Seed (2024-12-03): Corrupted tick glitch (-12% spike on GOLDPETAL)
    if (date === "2024-12-03") {
      petalPerGram999 = petalPerGram999 * 0.88; // -12% bad print
      petalQualityFlag = "corrupted";
      petalQualityNotes = "Corrupted Bhavcopy record: anomalous -12% single-day tick flash crash";
    }

    const petalCloseQuoted = Math.round(petalPerGram999);
    const petalNorm = normalizePrice(petalCloseQuoted, "GOLDPETAL");

    records.push({
      symbol: "GOLDPETAL",
      date,
      expiryDate: expiryPETAL,
      open: petalCloseQuoted - Math.round(pseudoRandom() * 10),
      high: petalCloseQuoted + Math.round(pseudoRandom() * 15),
      low: petalCloseQuoted - Math.round(pseudoRandom() * 15),
      close: petalCloseQuoted,
      volume: Math.round(4200 + pseudoRandom() * 1800),
      openInterest: Math.round(5800 + pseudoRandom() * 1200),
      normalizedPriceG999: petalNorm.normalizedPriceG999,
      daysToExpiry: dtePETAL,
      qualityFlag: petalQualityFlag,
      qualityNotes: petalQualityNotes,
    });

    // 5. Generate Standard Big GOLD (1kg, 995 purity, quoted per 10g)
    const expiryGOLD = expiryGOLDM;
    const dteGOLD = dteGOLDM;
    const noiseBig = (pseudoRandom() - 0.5) * 2.5;
    const goldBigPerGram999 = basePricePerGram999 + noiseBig;
    const goldBigCloseQuoted = Math.round((goldBigPerGram999 * (995 / 999)) * 10);
    const goldBigNorm = normalizePrice(goldBigCloseQuoted, "GOLD");

    records.push({
      symbol: "GOLD",
      date,
      expiryDate: expiryGOLD,
      open: goldBigCloseQuoted - Math.round(pseudoRandom() * 70),
      high: goldBigCloseQuoted + Math.round(pseudoRandom() * 100),
      low: goldBigCloseQuoted - Math.round(pseudoRandom() * 90),
      close: goldBigCloseQuoted,
      volume: Math.round(25000 + pseudoRandom() * 8000),
      openInterest: Math.round(35000 + pseudoRandom() * 7000),
      normalizedPriceG999: goldBigNorm.normalizedPriceG999,
      daysToExpiry: dteGOLD,
      qualityFlag: "clean",
    });
  }

  return records;
}
