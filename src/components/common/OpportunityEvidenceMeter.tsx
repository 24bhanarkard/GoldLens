"use client";

import React from "react";
import { GlassCard } from "../ui/GlassCard";
import { ShieldCheck, Zap, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";

interface OpportunityEvidenceMeterProps {
  anomalyStrength: number; // 0 to 100
  tradingEvidence: number; // 0 to 100
  classification: string;
  zScore: number | null;
  netEdgeINRPerGram?: number;
  costToEdgeRatio?: number;
  dataTrustScore?: number;
}

export function OpportunityEvidenceMeter({
  anomalyStrength,
  tradingEvidence,
  classification,
  zScore,
  netEdgeINRPerGram = 0,
  costToEdgeRatio = 0,
  dataTrustScore = 100,
}: OpportunityEvidenceMeterProps) {
  // Classification styling
  const configMap: Record<
    string,
    { title: string; color: string; badgeBg: string; border: string; desc: string; icon: typeof CheckCircle2 }
  > = {
    WORTH_INVESTIGATING: {
      title: "WORTH INVESTIGATING",
      color: "text-emerald-400",
      badgeBg: "bg-emerald-500/15 text-emerald-300",
      border: "border-emerald-500/30 shadow-[0_0_30px_-5px_rgba(16,185,129,0.25)]",
      desc: "Strong statistical deviation with verified data integrity, sufficient liquidity, safe expiry horizon, and positive net edge after full MCX costs.",
      icon: CheckCircle2,
    },
    REJECTED_AFTER_COSTS: {
      title: "REJECTED AFTER COSTS",
      color: "text-rose-400",
      badgeBg: "bg-rose-500/15 text-rose-300",
      border: "border-rose-500/30 shadow-[0_0_30px_-5px_rgba(244,63,94,0.25)]",
      desc: "Statistical anomaly detected, but total transaction friction (brokerage, exchange charges, CTT, GST, slippage) consumes 100% of theoretical gross edge.",
      icon: XCircle,
    },
    EXPIRY_SENSITIVE: {
      title: "EXPIRY DISTORTION DISQUALIFIED",
      color: "text-purple-400",
      badgeBg: "bg-purple-500/15 text-purple-300",
      border: "border-purple-500/30 shadow-[0_0_30px_-5px_rgba(168,85,247,0.25)]",
      desc: "Anomaly occurs within the critical delivery/rollover window (DTE ≤ 3 days). Physical delivery margins and liquidity collapse distort relative pricing.",
      icon: AlertTriangle,
    },
    DATA_UNRELIABLE: {
      title: "DATA INTEGRITY FAILURE",
      color: "text-rose-400",
      badgeBg: "bg-rose-500/15 text-rose-300",
      border: "border-rose-500/30 shadow-[0_0_30px_-5px_rgba(244,63,94,0.25)]",
      desc: "Spread is an illusion created by a corrupted Bhavcopy tick, bar geometry violation, or single-day uncircuit-broken spike.",
      icon: XCircle,
    },
    ILLIQUID_MIRAGE: {
      title: "ILLIQUID PHANTOM QUOTE",
      color: "text-amber-400",
      badgeBg: "bg-amber-500/15 text-amber-300",
      border: "border-amber-500/30",
      desc: "Zero trading volume recorded in one contract leg. Spread is based on stale indicative quotes rather than executable depth.",
      icon: AlertTriangle,
    },
    INSUFFICIENT_EVIDENCE: {
      title: "INSUFFICIENT EVIDENCE",
      color: "text-amber-400",
      badgeBg: "bg-amber-500/15 text-amber-300",
      border: "border-amber-500/30",
      desc: "Sample size in lookback window is too small (< 15 sessions) or historical analogues lack credible recurrence.",
      icon: Info,
    },
    NO_PERSISTENT_EDGE: {
      title: "NO PERSISTENT EDGE DETECTED",
      color: "text-slate-400",
      badgeBg: "bg-slate-700/40 text-slate-300",
      border: "border-slate-700/40",
      desc: "A scientifically honest negative result. Relative price variation does not exhibit reliable mean-reverting edge.",
      icon: Info,
    },
  };

  const current = configMap[classification] || configMap["NO_PERSISTENT_EDGE"];
  const StatusIcon = current.icon;

  return (
    <GlassCard variant="elevated" className={`border ${current.border} relative overflow-hidden`}>
      {/* Background radial gradient glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              FEATURE 9 • DUAL-GAUGE INTELLIGENCE
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <span>Opportunity vs Evidence Meter</span>
          </h3>
        </div>

        {/* Classification Badge */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold ${current.badgeBg} border-current/20`}>
          <StatusIcon className="h-4 w-4" />
          <span>{current.title}</span>
        </div>
      </div>

      {/* 2D Dual Gauge Meters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-5">
        {/* Gauge A: Anomaly Strength */}
        <div className="rounded-2xl glass-subtle p-4 space-y-2 border border-white/5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Statistical Anomaly Strength</span>
            </div>
            <span className="font-mono text-sm font-bold text-amber-400">
              {anomalyStrength} <span className="text-[10px] text-slate-500">/ 100</span>
            </span>
          </div>

          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max(5, anomalyStrength)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Z-Score: <strong className="text-slate-200">{zScore ? `${zScore.toFixed(2)}σ` : "N/A"}</strong></span>
            <span>Rarity: <strong className="text-slate-200">{anomalyStrength >= 70 ? "Top 5% Rarity" : "Moderate Rarity"}</strong></span>
          </div>
        </div>

        {/* Gauge B: Practical Trading Evidence */}
        <div className="rounded-2xl glass-subtle p-4 space-y-2 border border-white/5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Practical Trading Evidence</span>
            </div>
            <span className={`font-mono text-sm font-bold ${tradingEvidence >= 70 ? "text-emerald-400" : tradingEvidence >= 40 ? "text-amber-400" : "text-rose-400"}`}>
              {tradingEvidence} <span className="text-[10px] text-slate-500">/ 100</span>
            </span>
          </div>

          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                tradingEvidence >= 70
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                  : tradingEvidence >= 40
                  ? "bg-gradient-to-r from-amber-600 to-amber-400"
                  : "bg-gradient-to-r from-rose-600 to-rose-400"
              }`}
              style={{ width: `${Math.max(5, tradingEvidence)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Net Edge: <strong className="text-slate-200">{netEdgeINRPerGram >= 0 ? `+₹${netEdgeINRPerGram.toFixed(2)}/g` : `-₹${Math.abs(netEdgeINRPerGram).toFixed(2)}/g`}</strong></span>
            <span>Cost-to-Edge: <strong className="text-slate-200">{costToEdgeRatio.toFixed(0)}%</strong></span>
          </div>
        </div>
      </div>

      {/* Narrative Explanation */}
      <div className="rounded-xl bg-slate-950/60 p-3.5 border border-white/5 text-xs text-slate-300 leading-relaxed">
        <span className="font-semibold text-slate-200">Analytical Evaluation: </span>
        {current.desc}
      </div>
    </GlassCard>
  );
}
