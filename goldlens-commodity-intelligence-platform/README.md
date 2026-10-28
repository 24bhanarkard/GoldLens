# GoldLens — Commodity Intelligence

> **See the signal behind the spread.**  
> Compare MCX gold futures. Investigate anomalies. Test whether the evidence holds up.

GoldLens analyzes MCX gold futures contracts (`GOLD`, `GOLDM`, `GOLDTEN`, `GOLDGUINEA`, `GOLDPETAL`) by standardizing quotation bases and purities into `₹/g` of 999-fineness gold, flagging unusual relative-price deviations, auditing source-data integrity, modeling weight-matched 4-leg transaction costs, and evaluating historical strategy evidence without look-ahead bias.

---

## Navigation Architecture (6 Focused Sections)

1. **Overview** — Compact hero, contract-pair & lookback toolbar, primary scan action, 4 core summary metrics (prioritizing Data Integrity first), the Normalized Relative-Price Landscape (`#E6BD58` Champagne Gold vs `#76A9FA` Muted Blue), and the primary Intelligence Finding card.
2. **Signal Intelligence** — Master-detail workspace pairing detected events with the **10-Point Signal Autopsy**, False Signal Detective rule matrix, weight-matched MCX cost breakdown, strict prior-only Spread DNA analogues, and inline Data Forensics traceability.
3. **Market Analysis** — Internal tabs for **Spread & Statistics** (rolling bands, empirical quantiles, cross-pair heatmap, futures curve explorer), **Historical Analogues** (event-aligned convergence timelines), and **Market Replay** (day-by-day zero-leakage scrubber).
4. **Strategy Lab** — Internal tabs for **Backtest** (next-session open fills + **Backtest Honesty Scorecard** with exact 95% Wilson score binomial confidence intervals & Student's *t* tests), **Stress Test** (**Opportunity Stress Test** across +25% / +50% / +100% cost shocks, higher slippage, partial convergence, illiquidity, and expiry drag), and **Robustness** ($3 \times 3$ parameter sensitivity grid & chronological walk-forward folds).
5. **Data & Contracts** — Internal tabs for **Data Forensics** (source-row violation audit & non-destructive counterfactual preview), **Data Explorer & CSV** (search, sort, filter, pagination, validated CSV upload, valid/rejected exports, Reset Demo), and **Contract Specifications** (verified MCX registry & interactive normalization verifier).
6. **Reports & Methodology** — Functional dossier generator with HTML/JSON/Print export and complete mathematical derivations & limitations.

---

## Verified MCX Gold Contract Registry

| Symbol | Trading Unit | Quotation Basis | Reference Purity | Conversion to ₹/g (999 Fine) | Expiry Rule |
| --- | ---: | --- | ---: | --- | --- |
| `GOLD` | 1,000 g (1 kg) | ₹ per 10 g | 995 | `(Quote ÷ 10) × (999 / 995)` | 5th of contract month |
| `GOLDM` | 100 g | ₹ per 10 g | 995 | `(Quote ÷ 10) × (999 / 995)` | 5th of contract month |
| `GOLDTEN` | 10 g | ₹ per 10 g | 999 | `(Quote ÷ 10) × 1.0` | Last business day of month *(eff. Apr 1, 2025, MCX/TRD/714/2024)* |
| `GOLDGUINEA` | 8 g | ₹ per 8 g | 999 | `(Quote ÷ 8) × 1.0` | Last business day of month |
| `GOLDPETAL` | 1 g | ₹ per 1 g | 999 | `Quote × 1.0` | Last business day of month |

---

## Local Setup & Vercel Preview Compatibility

```bash
npm install
npm run lint
npm exec tsc -- --noEmit
npm run build
npm run start
```

- **Environment variables:** None strictly required for Vercel preview deployments (`DATABASE_URL` is optional; when provided, datasets, signals, backtest runs, and reports sync to PostgreSQL via Drizzle ORM; when omitted, an automatic server-side store preserves both synthetic demo and uploaded CSV datasets cleanly).
- **Automated Verification Suite:** `GET /api/test` runs 12 quantitative assertions verifying contract normalization, LCM hedge sizing, OHLC bar validation, prior-window isolation, cost rejection math, data-integrity overrides, next-open backtest fills, Wilson 95% confidence intervals, and Spread DNA look-ahead prevention.

---

## Research Disclaimer

GoldLens is an analytical and educational tool. Synthetic demo data is explicitly labeled and never represents live exchange quotes. Historical simulations and parametric stress tests do not forecast live trading returns or constitute financial advice.
