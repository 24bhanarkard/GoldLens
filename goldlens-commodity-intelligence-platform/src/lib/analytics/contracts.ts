export interface ContractMetadata {
  symbol: string;
  exchange: string;
  category: string;
  nominalQtyGrams: number;
  qtyUnit: string;
  quotationBasis: string; // e.g., '10g', '1g', '8g'
  quotationGrams: number; // numeric grams in quotation unit (10, 8, 1)
  quotationMultiplier: number; // 1 / quotationGrams -> turns quoted price into ₹ per 1g raw purity
  referencePurity: number; // 999 or 995
  lotSize: number;
  tickSizeINR: number;
  priceUnit: string;
  currency: string;
  deliveryCenter: string;
  expiryRule: string;
  applicableFrom: string; // YYYY-MM-DD contract spec effective / launch date
  description: string;
  specificationNotes: string;
  specificationSource: string;
  lastVerifiedDate: string;
}

export const DEFAULT_CONTRACT_REGISTRY: Record<string, ContractMetadata> = {
  GOLDM: {
    symbol: "GOLDM",
    exchange: "MCX",
    category: "GOLD_MINI",
    nominalQtyGrams: 100,
    qtyUnit: "g",
    quotationBasis: "10g",
    quotationGrams: 10,
    quotationMultiplier: 0.1, // Quoted in ₹ per 10 grams -> ÷ 10 for ₹/g
    referencePurity: 995,
    lotSize: 1, // 1 lot = 100 grams
    tickSizeINR: 1, // ₹1 per 10g (₹10 per lot)
    priceUnit: "INR / 10g",
    currency: "INR",
    deliveryCenter: "Ahmedabad (Primary)",
    expiryRule: "5th day of contract expiry month (or preceding business day)",
    applicableFrom: "2008-01-01",
    description: "MCX Gold Mini Futures — 100g trading unit, 995 fineness, quoted per 10 grams.",
    specificationNotes:
      "Compulsory physical delivery in 100g bars (995 purity). Enters staggered tender/delivery margin window in the final 3–5 trading days prior to the 5th of the expiry month.",
    specificationSource: "MCX Gold Mini Contract Specifications & Circular MCX/TRD/456/2025",
    lastVerifiedDate: "2026-04-01",
  },
  GOLDTEN: {
    symbol: "GOLDTEN",
    exchange: "MCX",
    category: "GOLD_TEN",
    nominalQtyGrams: 10,
    qtyUnit: "g",
    quotationBasis: "10g",
    quotationGrams: 10,
    quotationMultiplier: 0.1, // Verified MCX spec: Quoted in ₹ per 10 grams -> ÷ 10 for ₹/g
    referencePurity: 999,
    lotSize: 1, // 1 lot = 10 grams
    tickSizeINR: 1, // ₹1 per 10g (₹1 per lot)
    priceUnit: "INR / 10g",
    currency: "INR",
    deliveryCenter: "Ahmedabad, Mumbai, New Delhi",
    expiryRule: "Last calendar day of contract expiry month (or preceding business day)",
    applicableFrom: "2025-04-01",
    description: "MCX Gold Ten Futures — 10g trading unit, 999 fineness, quoted per 10 grams.",
    specificationNotes:
      "Launched on MCX effective April 1, 2025 (MCX/TRD/714/2024). Both Trading Unit and Quotation/Base Value are 10 grams of 999 purity gold. Note: expires end-of-month, unlike GOLDM (5th of month).",
    specificationSource: "MCX Circulars MCX/TRD/714/2024 & MCX/TRD/456/2025",
    lastVerifiedDate: "2026-04-01",
  },
  GOLDGUINEA: {
    symbol: "GOLDGUINEA",
    exchange: "MCX",
    category: "GOLD_GUINEA",
    nominalQtyGrams: 8,
    qtyUnit: "g",
    quotationBasis: "8g",
    quotationGrams: 8,
    quotationMultiplier: 0.125, // Quoted in ₹ per 8 grams -> ÷ 8 for ₹/g
    referencePurity: 999,
    lotSize: 1, // 1 lot = 8 grams
    tickSizeINR: 1, // ₹1 per 8g (₹1 per lot)
    priceUnit: "INR / 8g",
    currency: "INR",
    deliveryCenter: "Ahmedabad (Primary)",
    expiryRule: "Last calendar day of contract expiry month (or preceding business day)",
    applicableFrom: "2008-06-01",
    description: "MCX Gold Guinea Futures — 8g coin trading unit, 999 fineness, quoted per 8 grams.",
    specificationNotes:
      "Retail-denomination coin contract quoted per 8 grams. Small lot weight (8g) causes fixed per-order brokerage to represent a much larger ₹/gram cost than 100g or 1kg contracts.",
    specificationSource: "MCX Gold Guinea Contract Specifications & Circular MCX/TRD/456/2025",
    lastVerifiedDate: "2026-04-01",
  },
  GOLDPETAL: {
    symbol: "GOLDPETAL",
    exchange: "MCX",
    category: "GOLD_PETAL",
    nominalQtyGrams: 1,
    qtyUnit: "g",
    quotationBasis: "1g",
    quotationGrams: 1,
    quotationMultiplier: 1.0, // Quoted in ₹ per 1 gram -> ÷ 1 for ₹/g
    referencePurity: 999,
    lotSize: 1, // 1 lot = 1 gram
    tickSizeINR: 1, // ₹1 per 1g (₹1 per lot)
    priceUnit: "INR / 1g",
    currency: "INR",
    deliveryCenter: "Mumbai / Ahmedabad",
    expiryRule: "Last calendar day of contract expiry month (or preceding business day)",
    applicableFrom: "2011-04-01",
    description: "MCX Gold Petal Futures — 1g retail unit, 999 fineness, quoted per 1 gram.",
    specificationNotes:
      "Micro 1-gram contract quoted Ex-Mumbai/Ahmedabad per 1 gram (minimum physical delivery 8g). Retail bid-ask spreads and per-order brokerage dominate small spread deviations.",
    specificationSource: "MCX Gold Petal Contract Specifications",
    lastVerifiedDate: "2026-04-01",
  },
  GOLD: {
    symbol: "GOLD",
    exchange: "MCX",
    category: "GOLD_STANDARD",
    nominalQtyGrams: 1000,
    qtyUnit: "g",
    quotationBasis: "10g",
    quotationGrams: 10,
    quotationMultiplier: 0.1, // Quoted in ₹ per 10 grams -> ÷ 10 for ₹/g
    referencePurity: 995,
    lotSize: 1, // 1 lot = 1,000 grams (1 kg)
    tickSizeINR: 1, // ₹1 per 10g (₹100 per lot)
    priceUnit: "INR / 10g",
    currency: "INR",
    deliveryCenter: "Ahmedabad (Primary)",
    expiryRule: "5th day of contract expiry month (or preceding business day)",
    applicableFrom: "2003-11-10",
    description: "MCX Standard Gold Futures — 1kg institutional unit, 995 fineness, quoted per 10 grams.",
    specificationNotes:
      "Flagship institutional bullion contract (1 kg = 1,000g lot size, 995 fineness, quoted in ₹/10g). Deepest orderbook liquidity on MCX.",
    specificationSource: "MCX Standard Gold Contract Specifications",
    lastVerifiedDate: "2026-04-01",
  },
};

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function lcm(a: number, b: number): number {
  if (!a || !b) return 100;
  return Math.abs(Math.round(a * b)) / gcd(a, b);
}

export interface HedgeMatchedSizing {
  symbolA: string;
  symbolB: string;
  lotGramsA: number;
  lotGramsB: number;
  lotsA: number;
  lotsB: number;
  matchedGrams: number;
  explanation: string;
}

/**
 * Computes the minimum exact weight-matched hedge ratio between two MCX gold contracts.
 * Example:
 *  - GOLDM (100g) vs GOLDTEN (10g) -> 100g matched weight (1 lot GOLDM vs 10 lots GOLDTEN)
 *  - GOLDGUINEA (8g) vs GOLDPETAL (1g) -> 8g matched weight (1 lot GOLDGUINEA vs 8 lots GOLDPETAL)
 *  - GOLDM (100g) vs GOLDGUINEA (8g) -> 200g matched weight (2 lots GOLDM vs 25 lots GOLDGUINEA)
 */
export function getHedgeMatchedSizing(
  symbolA: string,
  symbolB: string,
  customRegistry?: Record<string, ContractMetadata>
): HedgeMatchedSizing {
  const reg = customRegistry || DEFAULT_CONTRACT_REGISTRY;
  const cA = reg[symbolA.toUpperCase()];
  const cB = reg[symbolB.toUpperCase()];
  const gA = cA?.nominalQtyGrams || 100;
  const gB = cB?.nominalQtyGrams || 10;
  const matchedGrams = lcm(gA, gB);
  const lotsA = Math.max(1, Math.round(matchedGrams / gA));
  const lotsB = Math.max(1, Math.round(matchedGrams / gB));

  return {
    symbolA: symbolA.toUpperCase(),
    symbolB: symbolB.toUpperCase(),
    lotGramsA: gA,
    lotGramsB: gB,
    lotsA,
    lotsB,
    matchedGrams,
    explanation: `Weight-neutral hedge unit: ${matchedGrams}g (${lotsA} lot${lotsA > 1 ? "s" : ""} ${symbolA.toUpperCase()} [${gA}g] vs ${lotsB} lot${lotsB > 1 ? "s" : ""} ${symbolB.toUpperCase()} [${gB}g]).`,
  };
}

export interface NormalizationResult {
  symbol: string;
  isKnownContract: boolean;
  rawPrice: number;
  quotationBasis: string;
  quotationGrams: number;
  pricePerGramRawPurity: number;
  referencePurity: number;
  targetPurity: number; // standard reference is 999
  purityAdjustmentFactor: number;
  normalizedPriceG999: number;
  applicableFrom: string;
  formulaDescription: string;
  steps: string[];
}

/**
 * Normalizes exchange quoted price to standardized ₹ / gram of 999 reference purity.
 *
 * Step 1: Weight Basis Conversion
 *   PricePerGram_Raw = RawPrice * QuotationMultiplier  (= RawPrice / QuotationGrams)
 *
 * Step 2: Fineness Standardization (999 Fine Gold Equivalent)
 *   PurityAdjustmentFactor = TargetPurity (999) / ContractReferencePurity
 *   NormalizedPriceG999 = PricePerGram_Raw * (999 / ContractReferencePurity)
 */
export function normalizePrice(
  rawPrice: number,
  symbol: string,
  customRegistry?: Record<string, ContractMetadata>,
  targetPurity = 999
): NormalizationResult {
  const registry = customRegistry || DEFAULT_CONTRACT_REGISTRY;
  const known = registry[symbol.toUpperCase()];
  const contract: ContractMetadata = known || {
    symbol: symbol.toUpperCase(),
    exchange: "MCX",
    category: "UNREGISTERED",
    nominalQtyGrams: 10,
    qtyUnit: "g",
    quotationBasis: "10g",
    quotationGrams: 10,
    quotationMultiplier: 0.1,
    referencePurity: 995,
    lotSize: 1,
    tickSizeINR: 1,
    priceUnit: "INR / 10g",
    currency: "INR",
    deliveryCenter: "Unverified",
    expiryRule: "Unverified specification",
    applicableFrom: "1970-01-01",
    description: "Unregistered Contract (Fallback Specification Applied — Verify Metadata)",
    specificationNotes: "Symbol was not found in the verified contract registry; fallback 10g / 995 rules used.",
    specificationSource: "Unverified fallback",
    lastVerifiedDate: "Unverified",
  };

  const pricePerGramRawPurity = rawPrice * contract.quotationMultiplier;
  const purityAdjustmentFactor = targetPurity / contract.referencePurity;
  const normalizedPriceG999 = pricePerGramRawPurity * purityAdjustmentFactor;

  const steps = [
    `Contract matched: ${contract.symbol} (${contract.description})`,
    `Exchange quote: ₹${rawPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per ${contract.quotationBasis}`,
    `Weight conversion: ₹${rawPrice.toLocaleString("en-IN")} ÷ ${contract.quotationGrams}g = ₹${pricePerGramRawPurity.toFixed(4)}/g (${contract.referencePurity} fineness)`,
    `Fineness standardization (${contract.referencePurity} ➔ ${targetPurity}): × (${targetPurity} / ${contract.referencePurity}) = × ${purityAdjustmentFactor.toFixed(6)}`,
    `Normalized reference value: ₹${normalizedPriceG999.toFixed(4)} / g (${targetPurity}-fineness equivalent)`,
  ];

  const formulaDescription = `(₹${rawPrice.toLocaleString("en-IN")} ÷ ${contract.quotationGrams}g) × (${targetPurity} / ${contract.referencePurity}) = ₹${normalizedPriceG999.toFixed(2)}/g`;

  return {
    symbol: contract.symbol,
    isKnownContract: Boolean(known),
    rawPrice,
    quotationBasis: contract.quotationBasis,
    quotationGrams: contract.quotationGrams,
    pricePerGramRawPurity,
    referencePurity: contract.referencePurity,
    targetPurity,
    purityAdjustmentFactor,
    normalizedPriceG999,
    applicableFrom: contract.applicableFrom,
    formulaDescription,
    steps,
  };
}
