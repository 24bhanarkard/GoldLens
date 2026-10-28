import { normalizePrice } from "./contracts";
import { DailyContractPoint } from "./spreads";
import { StandardizedVerdict } from "./falseSignalDetective";

export interface SeededCaseInfo {
  id: string;
  date: string;
  contractA: string;
  contractB: string;
  title: string;
  subtitle: string;
  description: string;
  expectedVerdict: StandardizedVerdict;
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
    date: "2025-09-18",
    contractA: "GOLDM",
    contractB: "GOLDTEN",
    title: "Credible Purity-Adjusted Basis Divergence",
    subtitle: "Passes all 10 diagnostic checks with positive weight-matched net edge",
    description:
      "After normalizing GOLDM (100g, 995 fineness, ₹/10g) and GOLDTEN (10g, 999 fineness, ₹/10g) to ₹/g of 999 fine gold, GOLDM traded +₹24/g above parity. With clean OHLC bars, active volume, safe DTE, and ₹5.6/g round-trip costs on a 100g hedge unit (1 lot GOLDM vs 10 lots GOLDTEN), the spread reverted over 6 sessions.",
    expectedVerdict: "CREDIBLE ANOMALY",
    expectedClassification: "WORTH_INVESTIGATING",
    keyTakeaway:
      "Survives normalization audit, expiry/liquidity checks, and 4-leg MCX transaction costs.",
  },
  {
    id: "case_2_expiry_trap",
    date: "2025-10-01",
    contractA: "GOLDM",
    contractB: "GOLDGUINEA",
    title: "Tender-Window Expiry Distortion",
    subtitle: "High Z-score rejected because GOLDM is 2 days from compulsory delivery expiry",
    description:
      "GOLDM spiked sharply relative to GOLDGUINEA just 2 days prior to its 2025-10-03 expiry. Although the statistical Z-score exceeds +4σ, MCX tender-period delivery margins (25%+) and rollover liquidity drain invalidate mean-reversion assumptions.",
    expectedVerdict: "REJECTED",
    expectedClassification: "EXPIRY_SENSITIVE",
    keyTakeaway:
      "High Z-scores inside tender/delivery windows reflect settlement squeeze mechanics, not statistical arbitrage.",
  },
  {
    id: "case_3_friction_mirage",
    date: "2025-11-12",
    contractA: "GOLDGUINEA",
    contractB: "GOLDPETAL",
    title: "Small-Lot Transaction Cost Mirage",
    subtitle: "Statistically unusual spread erased by 8-gram hedge friction",
    description:
      "GOLDGUINEA (8g) widened +₹8.5/g above GOLDPETAL (1g). On an exact 8-gram hedge unit (1 lot GOLDGUINEA vs 8 lots GOLDPETAL), fixed per-order brokerage (₹80 across 4 orders = ₹10.00/g) plus taxes and retail slippage exceed the gross spread, leaving negative net P&L.",
    expectedVerdict: "REJECTED",
    expectedClassification: "REJECTED_AFTER_COSTS",
    keyTakeaway:
      "Statistically unusual does not mean economically tradeable on small-denomination contracts.",
  },
  {
    id: "case_4_corrupted_tick",
    date: "2025-12-03",
    contractA: "GOLDM",
    contractB: "GOLDPETAL",
    title: "Corrupted Bhavcopy Print (Data Forensics)",
    subtitle: "Material data-integrity failure overrides extreme Z-score",
    description:
      "Source row ROW_GOLDPETAL_2025-12-03 recorded an erroneous -12% print where Close fell below Session Low (violating Low ≤ Close ≤ High and MCX daily price limits). Data Forensics isolates the corrupt row and blocks the false signal.",
    expectedVerdict: "REJECTED",
    expectedClassification: "DATA_UNRELIABLE",
    keyTakeaway:
      "Data-quality failures always override attractive Z-scores and simulated P&L.",
  },
];

function buildValidOHLC(
  closeQuote: number,
  openDeltaSign: number,
  tickRange: number,
  prng: () => number
) {
  const open = Math.round(closeQuote + openDeltaSign * Math.round(prng() * tickRange * 0.55));
  const upperWick = Math.max(1, Math.round(prng() * tickRange * 0.65));
  const lowerWick = Math.max(1, Math.round(prng() * tickRange * 0.65));
  const high = Math.max(open, closeQuote) + upperWick;
  const low = Math.max(1, Math.min(open, closeQuote) - lowerWick);
  return { open, high, low, close: closeQuote };
}

/**
 * Generates a deterministic, reproducible synthetic MCX gold dataset (May–Dec 2025).
 * Explicitly marked isSynthetic = true; never represented as live exchange data.
 */
export function generateSyntheticMCXDataset(): DailyContractPoint[] {
  let seed = 421337;
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const tradingDays: string[] = [];
  const startDate = new Date("2025-05-01");
  const endDate = new Date("2025-12-26");

  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      tradingDays.push(cur.toISOString().split("T")[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }

  const records: DailyContractPoint[] = [];
  let baseGold10g = 91800; // Realistic 2025 MCX gold level in ₹/10g

  // Seed several realistic historical basis dislocations across H2 2025 so Spread DNA & Backtester
  // have genuine prior & out-of-sample episodes without manufacturing 100% wins
  const goldmBasisEpisodes: Record<string, number> = {
    // Episode A (June — converges smoothly)
    "2025-06-17": 21.5,
    "2025-06-18": 18.0,
    "2025-06-19": 12.0,
    "2025-06-20": 6.5,
    "2025-06-23": 1.5,
    // Episode B (July — converges slowly over 7 sessions)
    "2025-07-22": 22.5,
    "2025-07-23": 20.0,
    "2025-07-24": 15.5,
    "2025-07-25": 11.0,
    "2025-07-28": 6.0,
    "2025-07-29": 2.0,
    // Episode C (August — partial reversion only -> mild loss or small gain after costs!)
    "2025-08-19": -20.5,
    "2025-08-20": -22.0,
    "2025-08-21": -19.5,
    "2025-08-22": -17.0,
    "2025-08-25": -15.5,
    "2025-08-26": -14.0,
    "2025-08-27": -13.0,
    // Case 1 Seed (September — clean convergence)
    "2025-09-18": 24.5,
    "2025-09-19": 21.0,
    "2025-09-22": 14.5,
    "2025-09-23": 8.0,
    "2025-09-24": 3.0,
    "2025-09-25": 0.5,
    // Case 2 Seed (Oct 1-2 — right before 2025-10-03 GOLDM expiry -> DISQUALIFIED by DTE <= 4d!)
    "2025-10-01": 36.0,
    "2025-10-02": 41.0,
    // Episode D (November Out-of-Sample — clean convergence)
    "2025-11-04": -23.0,
    "2025-11-05": -18.5,
    "2025-11-06": -11.0,
    "2025-11-07": -4.0,
    "2025-11-10": -0.5,
  };

  for (let dIdx = 0; dIdx < tradingDays.length; dIdx++) {
    const date = tradingDays[dIdx];
    const dailyReturn = (pseudoRandom() - 0.488) * 0.009;
    baseGold10g = baseGold10g * (1 + dailyReturn);

    const basePricePerGram999 = (baseGold10g / 10) * (999 / 995);

    // MCX Expiry Schedules:
    // GOLD & GOLDM expire on 5th of contract month (2025-08-05, 2025-10-03, 2025-12-05, 2026-02-05)
    const expiry5th =
      date <= "2025-08-05"
        ? "2025-08-05"
        : date <= "2025-10-03"
        ? "2025-10-03"
        : date <= "2025-12-05"
        ? "2025-12-05"
        : "2026-02-05";

    // GOLDTEN, GOLDGUINEA, GOLDPETAL expire on last business day of contract month
    const expiryEOM =
      date <= "2025-07-31"
        ? "2025-07-31"
        : date <= "2025-09-30"
        ? "2025-09-30"
        : date <= "2025-10-31"
        ? "2025-10-31"
        : date <= "2025-11-28"
        ? "2025-11-28"
        : "2025-12-31";

    const calcDTE = (exp: string) =>
      Math.max(0, Math.round((new Date(exp).getTime() - new Date(date).getTime()) / 86400000));

    const dte5th = calcDTE(expiry5th);
    const dteEOM = calcDTE(expiryEOM);

    // 1. GOLDM (100g lot, 995 fineness, quoted in ₹ per 10g)
    const noiseM = (pseudoRandom() - 0.5) * 3.6;
    const episodeOffsetM = goldmBasisEpisodes[date] || 0;
    const goldmPerGram999 = basePricePerGram999 + noiseM + episodeOffsetM;
    const goldmCloseQuoted = Math.round(goldmPerGram999 * (995 / 999) * 10);
    const goldmOHLC = buildValidOHLC(
      goldmCloseQuoted,
      episodeOffsetM !== 0 ? -0.15 : pseudoRandom() - 0.5,
      140,
      pseudoRandom
    );
    const goldmNorm = normalizePrice(goldmCloseQuoted, "GOLDM");
    const volGOLDM =
      dte5th <= 3 ? Math.round(420 + pseudoRandom() * 250) : Math.round(12500 + pseudoRandom() * 5500);

    records.push({
      rowId: `ROW_GOLDM_${date}`,
      symbol: "GOLDM",
      date,
      expiryDate: expiry5th,
      ...goldmOHLC,
      volume: volGOLDM,
      openInterest: Math.round(18200 + pseudoRandom() * 4200),
      normalizedPriceG999: goldmNorm.normalizedPriceG999,
      daysToExpiry: dte5th,
      qualityFlag: dte5th <= 3 ? "warning" : "clean",
      qualityNotes:
        dte5th <= 3 ? `Contract within tender/delivery window (${dte5th}d to expiry)` : undefined,
    });

    // 2. GOLDTEN (10g lot, 999 fineness, quoted in ₹ per 10g per MCX/TRD/714/2024)
    const noiseTen = (pseudoRandom() - 0.5) * 3.0;
    const goldtenPerGram999 = basePricePerGram999 + noiseTen;
    const goldtenCloseQuoted = Math.round(goldtenPerGram999 * 10); // Quoted per 10 grams!
    const goldtenOHLC = buildValidOHLC(
      goldtenCloseQuoted,
      pseudoRandom() - 0.5,
      130,
      pseudoRandom
    );
    const goldtenNorm = normalizePrice(goldtenCloseQuoted, "GOLDTEN");

    records.push({
      rowId: `ROW_GOLDTEN_${date}`,
      symbol: "GOLDTEN",
      date,
      expiryDate: expiryEOM,
      ...goldtenOHLC,
      volume: Math.round(9200 + pseudoRandom() * 3400),
      openInterest: Math.round(11800 + pseudoRandom() * 2600),
      normalizedPriceG999: goldtenNorm.normalizedPriceG999,
      daysToExpiry: dteEOM,
      qualityFlag: dteEOM <= 3 ? "warning" : "clean",
      qualityNotes:
        dteEOM <= 3 ? `Contract within tender/delivery window (${dteEOM}d to expiry)` : undefined,
    });

    // 3. GOLDGUINEA (8g coin lot, 999 fineness, quoted in ₹ per 8g)
    const noiseGuinea = (pseudoRandom() - 0.5) * 3.2;
    const case3Offset =
      date === "2025-11-12"
        ? 8.5
        : date === "2025-11-13"
        ? 7.2
        : date === "2025-11-14"
        ? 4.8
        : 0;
    const guineaPerGram999 = basePricePerGram999 + noiseGuinea + case3Offset;
    const guineaCloseQuoted = Math.round(guineaPerGram999 * 8);
    const guineaOHLC = buildValidOHLC(
      guineaCloseQuoted,
      pseudoRandom() - 0.5,
      95,
      pseudoRandom
    );
    const guineaNorm = normalizePrice(guineaCloseQuoted, "GOLDGUINEA");

    records.push({
      rowId: `ROW_GOLDGUINEA_${date}`,
      symbol: "GOLDGUINEA",
      date,
      expiryDate: expiryEOM,
      ...guineaOHLC,
      volume: Math.round(3400 + pseudoRandom() * 1400),
      openInterest: Math.round(4500 + pseudoRandom() * 1100),
      normalizedPriceG999: guineaNorm.normalizedPriceG999,
      daysToExpiry: dteEOM,
      qualityFlag: dteEOM <= 3 ? "warning" : "clean",
      qualityNotes:
        dteEOM <= 3 ? `Contract within tender/delivery window (${dteEOM}d to expiry)` : undefined,
    });

    // 4. GOLDPETAL (1g lot, 999 fineness, quoted in ₹ per 1g)
    const noisePetal = (pseudoRandom() - 0.5) * 3.0;
    let petalPerGram999 = basePricePerGram999 + noisePetal;
    let petalQualityFlag: "clean" | "warning" | "corrupted" =
      dteEOM <= 3 ? "warning" : "clean";
    let petalQualityNotes: string | undefined =
      dteEOM <= 3 ? `Contract within tender/delivery window (${dteEOM}d to expiry)` : undefined;

    const petalNormalClose = Math.round(petalPerGram999);
    const petalNormalOHLC = buildValidOHLC(
      petalNormalClose,
      pseudoRandom() - 0.5,
      16,
      pseudoRandom
    );

    if (date === "2025-12-03") {
      // Seed Case 4: Corrupted Bhavcopy print (-12% erroneous close below session Low!)
      const corruptedClose = Math.round(petalPerGram999 * 0.88);
      const corruptedNorm = normalizePrice(corruptedClose, "GOLDPETAL");
      petalQualityFlag = "corrupted";
      petalQualityNotes =
        "Corrupted source print: Close falls below Session Low & breaches MCX daily price limit (-12.0%)";
      records.push({
        rowId: `ROW_GOLDPETAL_${date}`,
        symbol: "GOLDPETAL",
        date,
        expiryDate: expiryEOM,
        open: petalNormalOHLC.open,
        high: petalNormalOHLC.high,
        low: petalNormalOHLC.low, // Close < Low -> genuine structural OHLC bar violation!
        close: corruptedClose,
        volume: Math.round(4100 + pseudoRandom() * 1600),
        openInterest: Math.round(5900 + pseudoRandom() * 1200),
        normalizedPriceG999: corruptedNorm.normalizedPriceG999,
        daysToExpiry: dteEOM,
        qualityFlag: petalQualityFlag,
        qualityNotes: petalQualityNotes,
      });
    } else {
      const petalNorm = normalizePrice(petalNormalClose, "GOLDPETAL");
      records.push({
        rowId: `ROW_GOLDPETAL_${date}`,
        symbol: "GOLDPETAL",
        date,
        expiryDate: expiryEOM,
        ...petalNormalOHLC,
        volume: Math.round(4100 + pseudoRandom() * 1600),
        openInterest: Math.round(5900 + pseudoRandom() * 1200),
        normalizedPriceG999: petalNorm.normalizedPriceG999,
        daysToExpiry: dteEOM,
        qualityFlag: petalQualityFlag,
        qualityNotes: petalQualityNotes,
      });
    }

    // 5. GOLD (1kg institutional lot, 995 fineness, quoted in ₹ per 10g)
    const noiseBig = (pseudoRandom() - 0.5) * 2.2;
    const goldBigPerGram999 = basePricePerGram999 + noiseBig;
    const goldBigCloseQuoted = Math.round(goldBigPerGram999 * (995 / 999) * 10);
    const goldBigOHLC = buildValidOHLC(
      goldBigCloseQuoted,
      pseudoRandom() - 0.5,
      115,
      pseudoRandom
    );
    const goldBigNorm = normalizePrice(goldBigCloseQuoted, "GOLD");

    records.push({
      rowId: `ROW_GOLD_${date}`,
      symbol: "GOLD",
      date,
      expiryDate: expiry5th,
      ...goldBigOHLC,
      volume: Math.round(25500 + pseudoRandom() * 8200),
      openInterest: Math.round(35500 + pseudoRandom() * 7200),
      normalizedPriceG999: goldBigNorm.normalizedPriceG999,
      daysToExpiry: dte5th,
      qualityFlag: dte5th <= 3 ? "warning" : "clean",
      qualityNotes:
        dte5th <= 3 ? `Contract within tender/delivery window (${dte5th}d to expiry)` : undefined,
    });
  }

  return records;
}
