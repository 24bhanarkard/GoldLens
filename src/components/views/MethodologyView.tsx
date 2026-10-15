"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, HelpCircle, ShieldAlert } from "lucide-react";

export function MethodologyView() {
  const [openSection, setOpenSection] = useState<string>("normalization");

  const toggle = (id: string) => {
    setOpenSection(openSection === id ? "" : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              TRANSPARENT METHODOLOGY & MATHEMATICAL DERIVATIONS
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <BookOpen className="h-5 w-5 text-amber-400" />
            <span>Quantitative Methodology & Analytical Formulas</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete mathematical derivation of normalization rules, lookback-only Z-scores, Data Trust scoring, False Signal Detective logic, and backtest execution safeguards.
          </p>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="space-y-3">
        {/* Section 1: Normalization */}
        <GlassCard variant="standard" padding="md" className="space-y-2">
          <div
            onClick={() => toggle("normalization")}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
              <span className="text-amber-400 font-mono">01.</span>
              <span>Contract Quotation Normalization & Purity Standard</span>
            </div>
            {openSection === "normalization" ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </div>

          {openSection === "normalization" && (
            <div className="pt-3 border-t border-white/5 text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                MCX Gold futures contracts quote in different weight bases and reference purities. To compare contracts without price illusions, GoldLens applies a two-step standardized reference conversion:
              </p>

              <div className="rounded-xl bg-slate-950/80 p-3.5 font-mono text-amber-300 space-y-1.5 border border-white/5">
                <div>Step 1: PricePerGram_Raw = RawPrice × QuotationMultiplier</div>
                <div>Step 2: PurityFactor = TargetPurity (999) / ReferencePurity</div>
                <div className="text-emerald-400 font-bold">
                  NormalizedPrice (₹/g 999) = PricePerGram_Raw × PurityFactor
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                <strong>Worked Example (GOLDM):</strong> Quoted ₹72,500 per 10 grams (995 purity).
                <br />
                Unit conversion: ₹72,500 ÷ 10 = ₹7,250.00 / gram (995 purity).
                <br />
                Purity conversion: ₹7,250.00 × (999 / 995) = <strong>₹7,279.14 / gram (999 Fine Gold Equivalent)</strong>.
              </div>
            </div>
          )}
        </GlassCard>

        {/* Section 2: Relative Price & Rolling Statistics */}
        <GlassCard variant="standard" padding="md" className="space-y-2">
          <div
            onClick={() => toggle("spreads")}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
              <span className="text-amber-400 font-mono">02.</span>
              <span>Relative Spreads, Lookahead-Free Rolling Statistics & Z-Scores</span>
            </div>
            {openSection === "spreads" ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </div>

          {openSection === "spreads" && (
            <div className="pt-3 border-t border-white/5 text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                To avoid lookahead bias, rolling mean and standard deviation on trading date $T$ compute strictly over past historical observations $[T - w + 1 \dots T]$:
              </p>

              <div className="rounded-xl bg-slate-950/80 p-3.5 font-mono text-amber-300 space-y-1.5 border border-white/5">
                <div>Absolute Spread: S_t = P_norm(A, t) − P_norm(B, t)</div>
                <div>Rolling Mean: μ_t(w) = (1 / w) ∑ [i=1..w] S_(t-i+1)</div>
                <div>Rolling Std Dev: σ_t(w) = √[ (1 / (w - 1)) ∑ [i=1..w] (S_(t-i+1) − μ_t)^2 ]</div>
                <div className="text-emerald-400 font-bold">
                  Rolling Z-Score: Z_t = (S_t − μ_t) / σ_t   (with guard for σ_t &gt; 1e-6)
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Section 3: Data Trust Score */}
        <GlassCard variant="standard" padding="md" className="space-y-2">
          <div
            onClick={() => toggle("datatrust")}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
              <span className="text-amber-400 font-mono">03.</span>
              <span>12-Check Data Trust Score (0 to 100) Formulation</span>
            </div>
            {openSection === "datatrust" ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </div>

          {openSection === "datatrust" && (
            <div className="pt-3 border-t border-white/5 text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                The Data Trust Score starts at 100 points and deducts penalties for specific financial integrity violations:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Non-positive price print ($P \le 0$): -5 pts per violation (max 25)</li>
                <li>High &lt; Low violation: -5 pts per violation (max 25)</li>
                <li>Open or Close outside [Low, High] range: -5 pts per violation (max 25)</li>
                <li>Duplicate session records: -3 pts per duplicate (max 15)</li>
                <li>Date parsing or trading post-expiry ($Date &gt; Expiry$): -3 pts per violation (max 15)</li>
                <li>Unexplained 1-day price discontinuity (&gt;15% jump): -3 pts per violation (max 10)</li>
                <li>Zero trading volume (stale quote): -15% proportional penalty</li>
              </ul>
            </div>
          )}
        </GlassCard>

        {/* Section 4: Profit Reality & MCX Costs */}
        <GlassCard variant="standard" padding="md" className="space-y-2">
          <div
            onClick={() => toggle("costs")}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
              <span className="text-amber-400 font-mono">04.</span>
              <span>Profit Reality: MCX Statutory Transaction Cost Modeling</span>
            </div>
            {openSection === "costs" ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </div>

          {openSection === "costs" && (
            <div className="pt-3 border-t border-white/5 text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                A spread trade requires 4 executed orders roundtrip (Buy Leg A + Sell Leg B on entry; Sell Leg A + Buy Leg B on exit). GoldLens applies the exact MCX statutory fee schedule:
              </p>
              <div className="rounded-xl bg-slate-950/80 p-3 font-mono text-[11px] text-slate-300 space-y-1">
                <div>• Brokerage: ₹20 / order × 4 orders = ₹80.00</div>
                <div>• MCX Exchange Turnover Charge: 0.0021% on total roundtrip turnover</div>
                <div>• Commodity Transaction Tax (CTT): 0.01% on sell-side turnover</div>
                <div>• GST: 18% on Brokerage + Exchange charges</div>
                <div>• Stamp Duty: 0.002% on buy-side turnover</div>
                <div>• SEBI Turnover Fee: ₹10 / Crore (0.0001%)</div>
                <div>• Slippage & Market Impact: ₹1.25 / gram across 2 legs entry & exit</div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Section 5: Scientific Honesty */}
        <GlassCard variant="standard" padding="md" className="space-y-2">
          <div
            onClick={() => toggle("honesty")}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
              <span className="text-amber-400 font-mono">05.</span>
              <span>Scientific Honesty: "No Persistent Edge Detected" is a Valid Outcome</span>
            </div>
            {openSection === "honesty" ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </div>

          {openSection === "honesty" && (
            <div className="pt-3 border-t border-white/5 text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                GoldLens is built on quantitative rigor rather than promotional optimism. When an observed statistical anomaly does not survive realistic transaction friction, when expiry distortion causes artificial divergence, or when out-of-sample walk-forward tests fail to produce positive net expectancy, the system explicitly returns:
              </p>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-center font-bold text-amber-300 font-mono text-sm">
                "NO PERSISTENT EDGE DETECTED"
              </div>
              <p className="text-[11px] text-slate-400">
                A transparent negative result prevents capital destruction and represents a successful analytical outcome in quantitative research.
              </p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Financial Disclaimer Banner */}
      <GlassCard variant="subtle" padding="md" className="border border-white/10 space-y-2">
        <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
          <ShieldAlert className="h-4 w-4" />
          <span>Financial Research & Educational Disclaimer</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          GoldLens is a research and educational intelligence platform. Its outputs are statistical analyses based on selected datasets, contract metadata, and configured assumptions. Results are not investment advice or a guarantee of future performance. Synthetic demo data is not real market data. Backtested performance may not reflect executable results.
        </p>
      </GlassCard>
    </div>
  );
}
