export interface ContractMetadata {
  symbol: string;
  exchange: string;
  category: string;
  nominalQtyGrams: number;
  qtyUnit: string;
  quotationBasis: string; // e.g., '10g', '1g', '8g', '100g', '1kg'
  quotationMultiplier: number; // Multiplier to turn quoted price into price per nominal 1 gram
  referencePurity: number; // 999 or 995
  lotSize: number;
  priceUnit: string;
  currency: string;
  description: string;
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
    quotationMultiplier: 0.1, // quoted per 10g, so / 10 to get per gram
    referencePurity: 995,
    lotSize: 1, // 100 grams
    priceUnit: "INR",
    currency: "INR",
    description: "MCX Gold Mini Futures (100g, 995 purity). Quoted per 10 grams.",
    specificationSource: "MCX India Gold Mini Circular Ref 2024/298",
    lastVerifiedDate: "2025-01-15",
  },
  GOLDTEN: {
    symbol: "GOLDTEN",
    exchange: "MCX",
    category: "GOLD_TEN",
    nominalQtyGrams: 10,
    qtyUnit: "g",
    quotationBasis: "1g",
    quotationMultiplier: 1.0, // quoted per 1g
    referencePurity: 999,
    lotSize: 1, // 10 grams (10 lots of 1g or 1 lot of 10g)
    priceUnit: "INR",
    currency: "INR",
    description: "MCX Gold Ten Futures (10g, 999 purity). Quoted per 1 gram.",
    specificationSource: "MCX India Gold Ten Circular Ref 2024/112",
    lastVerifiedDate: "2025-01-15",
  },
  GOLDGUINEA: {
    symbol: "GOLDGUINEA",
    exchange: "MCX",
    category: "GOLD_GUINEA",
    nominalQtyGrams: 8,
    qtyUnit: "g",
    quotationBasis: "8g",
    quotationMultiplier: 0.125, // quoted per 8g, so / 8 to get per gram
    referencePurity: 999,
    lotSize: 1, // 8 grams
    priceUnit: "INR",
    currency: "INR",
    description: "MCX Gold Guinea Futures (8g, 999 purity). Quoted per 8 grams (1 Guinea).",
    specificationSource: "MCX India Gold Guinea Circular Ref 2024/055",
    lastVerifiedDate: "2025-01-15",
  },
  GOLDPETAL: {
    symbol: "GOLDPETAL",
    exchange: "MCX",
    category: "GOLD_PETAL",
    nominalQtyGrams: 1,
    qtyUnit: "g",
    quotationBasis: "1g",
    quotationMultiplier: 1.0, // quoted per 1g
    referencePurity: 999,
    lotSize: 1, // 1 gram
    priceUnit: "INR",
    currency: "INR",
    description: "MCX Gold Petal Futures (1g, 999 purity). Quoted per 1 gram.",
    specificationSource: "MCX India Gold Petal Circular Ref 2024/082",
    lastVerifiedDate: "2025-01-15",
  },
  GOLD: {
    symbol: "GOLD",
    exchange: "MCX",
    category: "GOLD_STANDARD",
    nominalQtyGrams: 1000,
    qtyUnit: "kg",
    quotationBasis: "10g",
    quotationMultiplier: 0.1, // quoted per 10g
    referencePurity: 995,
    lotSize: 1, // 1 kg
    priceUnit: "INR",
    currency: "INR",
    description: "MCX Standard Gold Futures (1kg, 995 purity). Quoted per 10 grams.",
    specificationSource: "MCX India Big Gold Circular Ref 2024/001",
    lastVerifiedDate: "2025-01-15",
  },
};

export interface NormalizationResult {
  symbol: string;
  rawPrice: number;
  quotationBasis: string;
  pricePerGramRawPurity: number;
  referencePurity: number;
  targetPurity: number; // standard reference is 999
  purityAdjustmentFactor: number;
  normalizedPriceG999: number;
  formulaDescription: string;
  steps: string[];
}

/**
 * Normalizes exchange quoted price to standardized Rs / gram of 999 reference purity.
 *
 * Mathematical derivation:
 * 1. Step 1: Base Unit Conversion
 *    PricePerGram_Raw = RawPrice * QuotationMultiplier
 *    (e.g., if quoted per 10g, PricePerGram_Raw = RawPrice / 10)
 *
 * 2. Step 2: Purity Normalization
 *    Standard Reference Purity Target = 999 (fine gold).
 *    PurityAdjustmentFactor = TargetPurity / ContractReferencePurity
 *    If contract is 995 purity, 1 gram of 995 has 0.995g pure gold.
 *    To compare with 999 fine gold: NormalizedPrice = PricePerGram_Raw * (999 / 995)
 *    If contract is already 999 purity: PurityAdjustmentFactor = 1.000000.
 */
export function normalizePrice(
  rawPrice: number,
  symbol: string,
  customRegistry?: Record<string, ContractMetadata>,
  targetPurity = 999
): NormalizationResult {
  const registry = customRegistry || DEFAULT_CONTRACT_REGISTRY;
  const contract = registry[symbol.toUpperCase()] || {
    symbol,
    exchange: "MCX",
    category: "CUSTOM",
    nominalQtyGrams: 10,
    qtyUnit: "g",
    quotationBasis: "10g",
    quotationMultiplier: 0.1,
    referencePurity: 995,
    lotSize: 1,
    priceUnit: "INR",
    currency: "INR",
    description: "Custom / Unregistered Contract",
    specificationSource: "Auto-detected fallback",
    lastVerifiedDate: new Date().toISOString().split("T")[0],
  };

  const pricePerGramRawPurity = rawPrice * contract.quotationMultiplier;
  const purityAdjustmentFactor = targetPurity / contract.referencePurity;
  const normalizedPriceG999 = pricePerGramRawPurity * purityAdjustmentFactor;

  const steps = [
    `Contract identified: ${contract.symbol} (${contract.description})`,
    `Raw quoted price: ₹${rawPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Quotation basis: ${contract.quotationBasis})`,
    `Unit conversion: ₹${rawPrice} × ${contract.quotationMultiplier} = ₹${pricePerGramRawPurity.toFixed(4)} / gram (${contract.referencePurity} purity)`,
    `Purity conversion: ${contract.referencePurity} ➔ ${targetPurity} target = factor (${targetPurity}/${contract.referencePurity}) = ${purityAdjustmentFactor.toFixed(6)}`,
    `Final Normalized Price: ₹${normalizedPriceG999.toFixed(4)} / gram (${targetPurity} Standard Equivalent)`,
  ];

  const formulaDescription = `[Raw Price: ₹${rawPrice} / ${contract.quotationBasis}] ➔ (÷ ${1 / contract.quotationMultiplier}) ➔ [₹${pricePerGramRawPurity.toFixed(2)}/g @ ${contract.referencePurity}] ➔ (× ${purityAdjustmentFactor.toFixed(4)}) ➔ ₹${normalizedPriceG999.toFixed(2)}/g @ ${targetPurity}`;

  return {
    symbol: contract.symbol,
    rawPrice,
    quotationBasis: contract.quotationBasis,
    pricePerGramRawPurity,
    referencePurity: contract.referencePurity,
    targetPurity,
    purityAdjustmentFactor,
    normalizedPriceG999,
    formulaDescription,
    steps,
  };
}
