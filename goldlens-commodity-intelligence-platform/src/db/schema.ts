import { pgTable, text, serial, timestamp, integer, doublePrecision, boolean, jsonb } from "drizzle-orm/pg-core";

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  exchange: text("exchange").notNull().default("MCX"),
  category: text("category").notNull(), // 'GOLD', 'GOLDM', 'GOLDTEN', 'GOLDGUINEA', 'GOLDPETAL', etc.
  nominalQtyGrams: doublePrecision("nominal_qty_grams").notNull(),
  qtyUnit: text("qty_unit").notNull().default("g"), // 'g', 'kg'
  quotationBasis: text("quotation_basis").notNull(), // '10g', '1g', '8g', '100g', '1kg'
  quotationMultiplier: doublePrecision("quotation_multiplier").notNull().default(1.0), // multiplier to convert quote to per 1 gram
  referencePurity: doublePrecision("reference_purity").notNull().default(999), // 995, 999
  lotSize: integer("lot_size").notNull().default(1),
  priceUnit: text("price_unit").notNull().default("INR"),
  currency: text("currency").notNull().default("INR"),
  description: text("description"),
  specificationSource: text("specification_source").default("MCX Contract Specifications"),
  lastVerifiedDate: text("last_verified_date").default("2025-01-15"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const datasets = pgTable("datasets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sourceType: text("source_type").notNull().default("demo"), // 'demo' | 'uploaded'
  rowCount: integer("row_count").notNull().default(0),
  validRows: integer("valid_rows").notNull().default(0),
  rejectedRows: integer("rejected_rows").notNull().default(0),
  dateMin: text("date_min"),
  dateMax: text("date_max"),
  dataTrustScore: doublePrecision("data_trust_score").default(100),
  qualitySummary: jsonb("quality_summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marketData = pgTable("market_data", {
  id: serial("id").primaryKey(),
  datasetId: text("dataset_id").notNull(),
  symbol: text("symbol").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  expiryDate: text("expiry_date").notNull(), // YYYY-MM-DD
  open: doublePrecision("open").notNull(),
  high: doublePrecision("high").notNull(),
  low: doublePrecision("low").notNull(),
  close: doublePrecision("close").notNull(),
  volume: integer("volume").notNull().default(0),
  openInterest: integer("open_interest").notNull().default(0),
  normalizedPriceG999: doublePrecision("normalized_price_g999").notNull(), // Standardized Rs/gram 999 purity
  daysToExpiry: integer("days_to_expiry").default(0),
  qualityFlag: text("quality_flag").default("clean"), // 'clean', 'warning', 'corrupted'
  qualityNotes: text("quality_notes"),
  isSynthetic: boolean("is_synthetic").default(true),
});

export const rejectedRecords = pgTable("rejected_records", {
  id: serial("id").primaryKey(),
  datasetId: text("dataset_id").notNull(),
  rowNumber: integer("row_number").notNull(),
  rawData: jsonb("raw_data").notNull(),
  rejectionReason: text("rejection_reason").notNull(),
  severity: text("severity").notNull().default("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const signals = pgTable("signals", {
  id: text("id").primaryKey(),
  datasetId: text("dataset_id").notNull(),
  signalDate: text("signal_date").notNull(),
  contractA: text("contract_a").notNull(),
  contractB: text("contract_b").notNull(),
  spreadValue: doublePrecision("spread_value").notNull(),
  zScore: doublePrecision("z_score").notNull(),
  percentile: doublePrecision("percentile").notNull(),
  rollingMean: doublePrecision("rolling_mean").notNull(),
  rollingStd: doublePrecision("rolling_std").notNull(),
  lookbackWindow: integer("lookback_window").notNull().default(30),
  direction: text("direction").notNull(), // 'A_OVERPRICED' | 'B_OVERPRICED'
  classification: text("classification").notNull(), // 'WORTH_INVESTIGATING' | 'REJECTED_AFTER_COSTS' | 'EXPIRY_SENSITIVE' | 'DATA_UNRELIABLE' | 'NO_PERSISTENT_EDGE' | 'INSUFFICIENT_EVIDENCE'
  anomalyStrength: doublePrecision("anomaly_strength").notNull().default(0), // 0 to 100
  tradingEvidence: doublePrecision("trading_evidence").notNull().default(0), // 0 to 100
  dataTrustScore: doublePrecision("data_trust_score").notNull().default(100),
  diagnostics: jsonb("diagnostics"),
  costAnalysis: jsonb("cost_analysis"),
  patternMatches: jsonb("pattern_matches"),
  isSeeded: boolean("is_seeded").default(false),
  seedCaseTitle: text("seed_case_title"),
  seedCaseDescription: text("seed_case_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const backtestRuns = pgTable("backtest_runs", {
  id: text("id").primaryKey(),
  datasetId: text("dataset_id").notNull(),
  name: text("name").notNull(),
  contractA: text("contract_a").notNull(),
  contractB: text("contract_b").notNull(),
  params: jsonb("params").notNull(),
  metrics: jsonb("metrics").notNull(),
  trades: jsonb("trades").notNull(),
  equityCurve: jsonb("equity_curve").notNull(),
  conclusion: text("conclusion").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const researchReports = pgTable("research_reports", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  datasetId: text("dataset_id").notNull(),
  dataMode: text("data_mode").notNull(), // 'synthetic_demo' | 'uploaded_csv'
  contractPair: text("contract_pair").notNull(),
  analysisPeriod: text("analysis_period").notNull(),
  summary: text("summary").notNull(),
  conclusion: text("conclusion").notNull(), // 'WORTH_INVESTIGATING' | 'REJECTED_AFTER_COSTS' | 'NO_PERSISTENT_EDGE' | 'INSUFFICIENT_EVIDENCE'
  sections: jsonb("sections").notNull(),
  metrics: jsonb("metrics").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
