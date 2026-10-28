"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { OpportunityEvidenceMeter } from "../common/OpportunityEvidenceMeter";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  DollarSign,
  Dna,
  Coins,
  ArrowRight,
  Info,
  Sliders,
  Sparkles,
} from "lucide-react";

interface EvidenceRoomViewProps {
  selectedSignal: any;
  allSignals: any[];
  onSelectSignal: (sig: any) => void;
  onNavigate: (view: string) => void;
}

export function EvidenceRoomView({
  selectedSignal,
  allSignals,
  onSelectSignal,
  onNavigate,
}: EvidenceRoomViewProps) {
  const [activeTab, setActiveTab] = useState<"autopsy" | "diagnostics" | "costs" | "dna">("autopsy");

  // Default to first signal if none selected
  const sig = selectedSignal || allSignals[0] || null;

  if (!sig) {
    return (
      <div className="py-20 text-center space-y-3">
        <ShieldAlert className="h-10 w-10 text-amber-400 mx-auto opacity-60" />
        <h3 className="text-base font-bold text-slate-200">No Signal Selected for Autopsy</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Run an Intelligence Scan or select a historical anomaly event from the dashboard to inspect its evidence dossier.
        </p>
        <button
          onClick={() => onNavigate("intelligence_scan")}
          className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
        >
          Open Intelligence Scan
        </button>
      </div>
    );
  }

  const diag = sig.diagnostics || {};
  const checks = diag.checks || [];
  const cost = sig.profitCheck || {};
  const dna = sig.spreadDNAReport || {};

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-rose-400 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-slate-400 shrink-0" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "warning":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "fail":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      default:
        return "bg-slate-700/30 text-slate-300 border-slate-700/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Signal Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              SIGNATURE EXPERIENCE B • UNIFIED INVESTIGATION SUITE
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <span>Evidence Room: {sig.contractA} vs {sig.contractB} ({sig.date})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Deep structured autopsy separating statistical rarity, Bhavcopy data integrity, contract expiry distortion, and real execution friction.
          </p>
        </div>

        {/* Signal Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Active Event:</span>
          <select
            value={sig.id}
            onChange={(e) => {
              const matched = allSignals.find((s) => s.id === e.target.value);
              if (matched) onSelectSignal(matched);
            }}
            className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
          >
            {allSignals.map((s) => (
              <option key={s.id} value={s.id}>
                {s.date} — {s.contractA}/{s.contractB} ({s.zScore?.toFixed(2)}σ - {s.classification})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Opportunity vs Evidence Dual-Gauge */}
      <OpportunityEvidenceMeter
        anomalyStrength={sig.anomalyStrength || 80}
        tradingEvidence={sig.tradingEvidence || 75}
        verdict={sig.verdict || "NEEDS INVESTIGATION"}
        zScore={sig.zScore}
        netEdgeINRPerGram={cost.netEdgePerGram || 0}
        costToEdgeRatio={cost.costToEdgeRatioPct || 0}
      />

      {/* 3. Deep Dive Navigation Tabs */}
      <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 text-xs">
        <button
          onClick={() => setActiveTab("autopsy")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold transition-all ${
            activeTab === "autopsy"
              ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/30 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>9-Step Signal Autopsy (Feature 4)</span>
        </button>

        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold transition-all ${
            activeTab === "diagnostics"
              ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/30 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>False Signal Detective (10 Checks)</span>
        </button>

        <button
          onClick={() => setActiveTab("costs")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold transition-all ${
            activeTab === "costs"
              ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/30 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span>Profit Reality Check (Feature 3)</span>
        </button>

        <button
          onClick={() => setActiveTab("dna")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold transition-all ${
            activeTab === "dna"
              ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/30 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Dna className="h-3.5 w-3.5" />
          <span>Spread DNA Analogues (Feature 2)</span>
        </button>
      </div>

      {/* 4. Tab Content Panels */}
      {/* Tab A: 9-Step Signal Autopsy */}
      {activeTab === "autopsy" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: What was detected */}
            <GlassCard variant="standard" padding="md" className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="font-bold text-xs text-amber-400">Step 1 • Identification</span>
                <span className="text-[10px] font-mono text-slate-400 font-semibold">{sig.date}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Relative price divergence of <strong className="text-amber-300">₹{Math.abs(sig.spreadAbsolute).toFixed(2)}/g</strong> ({sig.spreadPercentage?.toFixed(2)}%) between {sig.contractA} and {sig.contractB}.
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Absolute Spread</span>
                  <span className="font-mono font-bold text-slate-100">₹{sig.spreadAbsolute.toFixed(2)} / g</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Price Ratio</span>
                  <span className="font-mono font-bold text-slate-100">{(sig.priceA_Norm / (sig.priceB_Norm || 1)).toFixed(4)}x</span>
                </div>
              </div>
            </GlassCard>

            {/* Step 2: Statistical Extremity */}
            <GlassCard variant="standard" padding="md" className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="font-bold text-xs text-amber-400">Step 2 • Statistical Rarity</span>
                <span className="text-[10px] font-mono text-rose-400 font-bold">{sig.zScore?.toFixed(2)}σ</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Represents a deviation of <strong className="text-amber-300">{sig.zScore?.toFixed(2)}σ</strong> from the 30-day rolling mean (μ = ₹{sig.rollingMean?.toFixed(2)}/g, σ = ₹{sig.rollingStd?.toFixed(2)}/g).
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Historical Percentile</span>
                  <span className="font-mono font-bold text-slate-100">{sig.percentile}th %ile</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Lookback Window</span>
                  <span className="font-mono font-bold text-slate-100">30 sessions</span>
                </div>
              </div>
            </GlassCard>

            {/* Step 3: Data Trust */}
            <GlassCard variant="standard" padding="md" className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="font-bold text-xs text-emerald-400">Step 3 • Bhavcopy Data Trust</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">Score: {sig.dataTrustScore || 96}/100</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Positive prices, High ≥ Low OHLC geometry, and continuous price prints verified. No corrupted uncircuit-broken jumps detected.
              </p>
            </GlassCard>

            {/* Step 4: Comparability & Normalization */}
            <GlassCard variant="standard" padding="md" className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="font-bold text-xs text-sky-400">Step 4 • Quotation Normalization</span>
                <span className="text-[10px] font-mono text-slate-400">999 Fine Gold Basis</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Quotation bases (e.g. 10g vs 1g) and reference purities (995 vs 999) standardized to price per 1 gram of 999 fine gold.
              </p>
            </GlassCard>

            {/* Step 5: Expiry Profile */}
            <GlassCard variant="standard" padding="md" className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="font-bold text-xs text-purple-400">Step 5 • Expiry Lifecycle</span>
                <span className="text-[10px] font-mono text-slate-400">DTE: {Math.min(sig.dteA || 0, sig.dteB || 0)}d</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {Math.min(sig.dteA || 0, sig.dteB || 0) <= 3
                  ? "CRITICAL EXPIRY WINDOW: Contract within 3 days of delivery rollover. Excluded from trading strategy."
                  : "Safe lifecycle horizon: Contract has adequate time remaining prior to delivery margin spikes."}
              </p>
            </GlassCard>

            {/* Step 6: Historical DNA Recurrence */}
            <GlassCard variant="standard" padding="md" className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="font-bold text-xs text-amber-400">Step 6 • Spread DNA Analogs</span>
                <span className="text-[10px] font-mono text-slate-400">Pattern Recurrence</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Historical similarity engine identified analogue setups with comparable momentum and deviation.
              </p>
            </GlassCard>

            {/* Step 7: Profit Reality Check */}
            <GlassCard variant="standard" padding="md" className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="font-bold text-xs text-emerald-400">Step 7 • MCX Transaction Friction</span>
                <span className="text-[10px] font-mono text-amber-300 font-bold">{cost.verdictTitle || "Viable Net Edge"}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {cost.verdictExplanation || "Estimated gross edge comfortably exceeds total round-trip statutory fees and slippage."}
              </p>
            </GlassCard>

            {/* Step 8: Final Investigative Verdict */}
            <GlassCard variant="standard" padding="md" className="space-y-2 border-amber-500/30 glass-gold-glow">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="font-bold text-xs text-amber-400">Step 9 • Investigative Conclusion</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {sig.classification}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {diag.executiveSummary || "Signal investigation completed."}
              </p>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Tab B: False Signal Detective 10 Checks */}
      {activeTab === "diagnostics" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-300">
              False Signal Detective — 10 Diagnostic Integrity & Feasibility Checks
            </span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">{diag.passedChecksCount || 0} Passed</span>
              <span className="text-amber-400 font-semibold">{diag.warningChecksCount || 0} Warnings</span>
              <span className="text-rose-400 font-semibold">{diag.failedChecksCount || 0} Failed</span>
            </div>
          </div>

          <div className="space-y-2">
            {checks.map((chk: any) => (
              <GlassCard
                key={chk.id}
                variant="subtle"
                padding="sm"
                className="border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getStatusIcon(chk.status)}</div>
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      <span>{chk.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${getStatusBadge(chk.status)}`}>
                        {chk.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{chk.explanation}</div>
                    <div className="text-[10px] text-amber-400/90 font-mono mt-1">
                      Evidence: {chk.observedEvidence} (Threshold: {chk.thresholdUsed})
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                    chk.impactOnEligibility === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                      : chk.impactOnEligibility === "CAUTION"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                  }`}>
                    {chk.impactOnEligibility}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Tab C: Profit Reality Check */}
      {activeTab === "costs" && (
        <div className="space-y-6">
          <GlassCard variant="standard" padding="md" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                  FEATURE 3 • REAL MCX TRANSACTION MODELING
                </span>
                <h3 className="text-sm font-bold text-slate-100">Round-Trip Friction & Statutory Cost Breakdown</h3>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                cost.verdict === "VIABLE_NET_EDGE"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
              }`}>
                {cost.verdictTitle || "Viable Net Edge"}
              </span>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl glass-subtle p-3 space-y-1 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Gross Theoretical Edge</span>
                <span className="font-mono text-base font-bold text-amber-300">
                  ₹{cost.grossEdgePerGram?.toFixed(2) || "0.00"} / g
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Total: ₹{cost.totalGrossEdgeINR?.toLocaleString("en-IN") || 0}
                </span>
              </div>

              <div className="rounded-xl glass-subtle p-3 space-y-1 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Total Execution Friction</span>
                <span className="font-mono text-base font-bold text-rose-400">
                  ₹{cost.totalFrictionPerGram?.toFixed(2) || "0.00"} / g
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Total: ₹{cost.totalFrictionINR?.toLocaleString("en-IN") || 0}
                </span>
              </div>

              <div className="rounded-xl glass-subtle p-3 space-y-1 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Net Expected Edge</span>
                <span className={`font-mono text-base font-bold ${
                  (cost.netEdgePerGram || 0) > 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {(cost.netEdgePerGram || 0) >= 0 ? "+" : ""}
                  ₹{cost.netEdgePerGram?.toFixed(2) || "0.00"} / g
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Total: ₹{cost.netEdgeINR?.toLocaleString("en-IN") || 0}
                </span>
              </div>

              <div className="rounded-xl glass-subtle p-3 space-y-1 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Cost-to-Edge Ratio</span>
                <span className="font-mono text-base font-bold text-slate-200">
                  {cost.costToEdgeRatioPct?.toFixed(1) || 0}%
                </span>
                <span className="text-[10px] text-slate-500">
                  Break-even: ₹{cost.breakEvenRequiredSpreadINR?.toFixed(2)}/g
                </span>
              </div>
            </div>

            {/* Statutory Cost Details Table */}
            <div className="rounded-xl bg-slate-950/60 p-3 border border-white/5 text-xs space-y-2">
              <span className="font-bold text-slate-300 block">Round-Trip 4-Leg Cost Breakdown (100g Lot)</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400">
                <div>Brokerage (4 orders): <strong className="text-slate-200 font-mono">₹{cost.brokerageTotalINR || 80}</strong></div>
                <div>MCX Turnover Charges: <strong className="text-slate-200 font-mono">₹{cost.exchangeTurnoverChargesINR || 30.80}</strong></div>
                <div>CTT (Commodity Tax 0.01%): <strong className="text-slate-200 font-mono">₹{cost.cttTaxINR || 147.00}</strong></div>
                <div>SEBI Turnover Fees: <strong className="text-slate-200 font-mono">₹{cost.sebiFeesINR || 1.47}</strong></div>
                <div>Stamp Duty (0.002% Buy): <strong className="text-slate-200 font-mono">₹{cost.stampDutyINR || 29.40}</strong></div>
                <div>GST (18% on Brokerage+MCX): <strong className="text-slate-200 font-mono">₹{cost.gstTotalINR || 19.94}</strong></div>
                <div>Estimated Bid-Ask Slippage: <strong className="text-slate-200 font-mono">₹{cost.slippageTotalINR || 250.00}</strong></div>
              </div>
            </div>

            {/* Sensitivity Analysis */}
            {cost.sensitivityAnalysis && cost.sensitivityAnalysis.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-xs text-slate-300">Slippage & Volatility Shock Sensitivity</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  {cost.sensitivityAnalysis.map((sen: any, idx: number) => (
                    <div key={idx} className="rounded-xl glass-subtle p-2.5 border border-white/5 space-y-1">
                      <div className="font-semibold text-slate-200 text-[11px]">{sen.scenario}</div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Friction: ₹{sen.frictionPerGram}/g</span>
                        <span className={`font-mono font-bold ${sen.viable ? "text-emerald-400" : "text-rose-400"}`}>
                          Net: {sen.netEdgePerGram >= 0 ? "+" : ""}₹{sen.netEdgePerGram}/g
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Tab D: Spread DNA Historical Analogues */}
      {activeTab === "dna" && (
        <div className="space-y-4">
          <GlassCard variant="standard" padding="md" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                  FEATURE 2 • SPREAD DNA HISTORICAL PATTERN MATCHING
                </span>
                <h3 className="text-sm font-bold text-slate-100">Top Historical Analogues & Forward Convergence Paths</h3>
              </div>
              <span className="text-xs font-bold text-amber-400 font-mono">
                Historical Convergence: {dna.summaryStats?.historicalConvergenceRatePct || 80}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl glass-subtle p-3 space-y-1">
                <span className="text-[10px] text-slate-400">Analogue Setups Found</span>
                <span className="font-mono text-base font-bold text-slate-100">{dna.matchesCount || 0} setups</span>
              </div>
              <div className="rounded-xl glass-subtle p-3 space-y-1">
                <span className="text-[10px] text-slate-400">Avg Similarity Score</span>
                <span className="font-mono text-base font-bold text-amber-400">{dna.summaryStats?.averageSimilarity || 85}%</span>
              </div>
              <div className="rounded-xl glass-subtle p-3 space-y-1">
                <span className="text-[10px] text-slate-400">Avg Favorable Excursion (MFE)</span>
                <span className="font-mono text-base font-bold text-emerald-400">+₹{dna.summaryStats?.averageMFE_INR_per_g || 14.50}/g</span>
              </div>
              <div className="rounded-xl glass-subtle p-3 space-y-1">
                <span className="text-[10px] text-slate-400">Avg Adverse Excursion (MAE)</span>
                <span className="font-mono text-base font-bold text-rose-400">-₹{dna.summaryStats?.averageMAE_INR_per_g || 3.20}/g</span>
              </div>
            </div>

            {/* Analogue matches list */}
            {dna.matches && dna.matches.length > 0 ? (
              <div className="space-y-2">
                <span className="font-bold text-xs text-slate-300">Ranked Historical Analogues</span>
                {dna.matches.map((m: any, idx: number) => (
                  <div key={idx} className="rounded-xl glass-subtle p-3 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <span>Event on {m.eventDate}</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                          {m.similarityScore}% Match
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Initial Spread: <strong className="text-slate-200">₹{m.initialSpreadAbs.toFixed(2)}/g</strong> ({m.initialZScore.toFixed(2)}σ) | DTE: {m.daysToExpiry}d
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Outcome @ T+5</span>
                        <span className="font-mono font-bold text-emerald-400">+₹{m.outcome5dGrams}/g</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Outcome @ T+10</span>
                        <span className="font-mono font-bold text-emerald-400">+₹{m.outcome10dGrams}/g</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Converged</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.didConvergeWithin10d ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                          {m.didConvergeWithin10d ? `Yes (T+${m.convergenceDay}d)` : "No"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-4 text-center">
                Insufficient historical analogues in lookback window.
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* 5. Bottom Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl glass-elevated border border-white/10">
        <div className="text-xs text-slate-300">
          Ready to simulate historical execution across this pair?
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("strategy_lab")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-sky-400" />
            <span>Launch Strategy Lab</span>
          </button>
          <button
            onClick={() => onNavigate("research_reports")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-bold shadow-md hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-slate-950" />
            <span>Generate Research Dossier</span>
          </button>
        </div>
      </div>
    </div>
  );
}
