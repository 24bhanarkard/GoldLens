# GOLDLENS — Commodity Derivatives Intelligence Platform

> **Tagline:** *See the signal behind the spread.*

GoldLens is a full-stack commodity derivatives intelligence platform designed to analyze MCX gold futures contracts, detect statistically unusual relative pricing, investigate whether historical patterns provide credible evidence, and test whether apparent opportunities survive realistic execution friction and market constraints.

---

## 1. Product Vision & Philosophy

When two related gold futures contracts trade at an unusual relative price, is that a meaningful, historically supported opportunity—or merely noise, poor data, low liquidity, or an expiry-related distortion?

GoldLens distinguishes between:
- A statistically unusual price relationship ($|Z| \ge 1.8\sigma$).
- A historically recurring pattern (Spread DNA vector matching).
- A plausible convergence hypothesis.
- A backtested strategy after realistic MCX statutory taxes and execution costs.
- An apparent opportunity that disappears after realistic constraints.

**Scientific Principle:** A scientifically honest negative result (**“NO PERSISTENT EDGE DETECTED”** or **“OPPORTUNITY REJECTED AFTER COSTS”**) is a successful analytical outcome.

---

## 2. The 10 Distinctive GoldLens Features

1. **Feature 1: False Signal Detective**
   - 10 rigorous diagnostic checks (Expiry proximity $\le 3$d, low volume, low open interest, bad tick spikes, statistical instability, excessive cost-to-edge ratio).
2. **Feature 2: Spread DNA — Historical Pattern Matching**
   - Vector similarity search over historical setups with forward trajectory tracking ($T-3$ to $T+15$), Maximum Favorable Excursion (MFE), Maximum Adverse Excursion (MAE), and median convergence paths.
3. **Feature 3: Profit Reality Check**
   - Full 4-leg roundtrip MCX transaction cost modeling (Brokerage ₹20/order, MCX turnover fees ~0.0021%, CTT 0.01% on sell side, GST 18%, Stamp duty 0.002%, SEBI fees, and bid-ask slippage).
4. **Feature 4: Signal Autopsy**
   - 9-step structured investigation narrative dissecting detection, rarity, data trust, comparability, expiry, historical analogue recurrence, cost survival, and final classification.
5. **Feature 5: Data Trust Score (0 to 100)**
   - 12-check automated data integrity scoring verifying positive prices, High $\ge$ Low geometry, duplicate detection, date validity, and uncircuit-broken single-day spikes.
6. **Feature 6: Time-Travel Backtester**
   - Lookahead-bias-free historical backtesting engine with walk-forward development (65% In-Sample / 35% Out-of-Sample) and trade execution audit logs.
7. **Feature 7: Expiry-Aware Intelligence**
   - Contract lifecycle mapping, Days to Expiry (DTE) tracker, delivery exclusion bands, and futures term structure curve explorer.
8. **Feature 8: What-If Simulator**
   - Real-time parameter sensitivity sandbox comparing Baseline vs Simulated outcomes (Z-score threshold, holding period, slippage) with overfitting risk alerts.
9. **Feature 9: Opportunity vs Evidence Meter**
   - Signature dual-gauge visual separating **Statistical Anomaly Strength** ($Z$-score extremity) from **Practical Trading Evidence** (data trust, recurrence, expiry safety, net edge).
10. **Feature 10: One-Click Research Report**
    - Instant institutional quantitative research dossier generator with downloadable JSON, CSV exports, and printable formatted report.

---

## 3. Four Seeded Reproducible Case Studies

GoldLens includes 4 seeded pedagogical case studies in the synthetic demo dataset:

1. **Case 1: The Classic Purity Basis Convergence** (`GOLDM` vs `GOLDTEN` on 2024-09-18)
   - $Z = +2.65\sigma$ deviation with healthy liquidity and 28d DTE. Cleanly converges over 6 sessions, netting $+₹18.40$/g profit after ₹4.20/g friction. (Verdict: `WORTH_INVESTIGATING`).
2. **Case 2: The Expiry Proximity Trap** (`GOLDM` vs `GOLDGUINEA` on 2024-10-02)
   - $Z = +3.4\sigma$ deviation just 3 days prior to expiry. Disqualified by False Signal Detective due to delivery margins and rollover decay. (Verdict: `EXPIRY_SENSITIVE`).
3. **Case 3: The Illiquidity & Friction Mirage** (`GOLDGUINEA` vs `GOLDPETAL` on 2024-11-12)
   - $Z = +2.15\sigma$ deviation with ₹7.50/g gross edge. Execution friction and retail bid-ask slippage total ₹9.80/g, turning net edge negative ($-₹2.30$/g). (Verdict: `REJECTED_AFTER_COSTS`).
4. **Case 4: The Corrupted Bhavcopy Print** (`GOLDM` vs `GOLDPETAL` on 2024-12-03)
   - Erroneous single-day $-12\%$ price glitch on GOLDPETAL. Data Trust Score catches the bar geometry violation and blocks execution. (Verdict: `DATA_UNRELIABLE`).

---

## 4. Technology Stack & Architecture

- **Frontend & Workstation UI:** Next.js (App Router), React 19, Tailwind CSS (Liquid Glass design system), Lucide React icons, Recharts interactive charts.
- **Backend Analytics Engine:** Modular TypeScript quantitative calculations (normalization, spreads, rolling lookbacks, diagnostics, backtesting).
- **Database & Persistence:** PostgreSQL via Drizzle ORM storing contract specifications, market data, datasets, signals, and research reports.

---

## 5. Local Setup & Execution

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database instance

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Push database schema
npx drizzle-kit push

# 3. Build & start application
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. API Endpoints Reference

- `GET  /api/health` — Service health check
- `GET  /api/contracts` — Contract specifications & normalization rules
- `POST /api/demo/load` — Load / reload synthetic demo dataset
- `POST /api/datasets/upload` — Ingest and validate MCX CSV file
- `POST /api/analytics/spread` — Aligned spreads, rolling bands & distributions
- `POST /api/analytics/scan` — Run 12-stage multi-pair intelligence scan
- `POST /api/analytics/signal-autopsy` — 9-step structured autopsy & False Signal Detective
- `POST /api/analytics/pattern-matches` — Spread DNA historical analogue search
- `POST /api/backtest/run` — Time-travel walk-forward backtest simulator
- `POST /api/replay/step` — Historical day-by-day scrubber (no lookahead)
- `POST /api/reports/generate` — Compile institutional quantitative dossier
- `GET  /api/test` — Run self-contained quantitative validation test suite

---

## 7. Financial Research Disclaimer

GoldLens is an educational and quantitative research intelligence platform. Its outputs are statistical analyses based on selected datasets, contract metadata, and configured assumptions. Results are not investment advice or a guarantee of future performance. Synthetic demo data is not real market data. Backtested performance may not reflect executable results.
