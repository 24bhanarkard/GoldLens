"use client";

import React from "react";
import { GlassCard } from "../ui/GlassCard";
import { ShieldCheck, Zap, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";

interface OpportunityEvidenceMeterProps {
  anomalyStrength: number;
  tradingEvidence: number;
  verdict: string;
  explanation?: string;
  isDataIntegrityFailure?: boolean;
  zScore: number | null;
  netEdgeINRPerGram?: number;
  costToEdgeRatio?: number;
}

export function OpportunityEvidenceMeter({
  anomalyStrength,
  tradingEvidence,
  verdict,
  explanation,
  isDataIntegrityFailure = false,
  zScore,
  netEdgeINRPerGram = 0,
  costToEdgeRatio = 0,
}: OpportunityEvidenceMeterProps) {
  const verdictMeta: Record<
    string,
    { pill: string; border: string; icon: typeof CheckCircle2; fallback: string }
  > = {
    "CREDIBLE ANOMALY": {
      pill: "status-positive-box",
      border: "border-[#4ADE80]/30",
      icon: CheckCircle2,
      fallback:
        "Statistical deviation passes source integrity, contract mapping, expiry safety, liquidity, and 4-leg MCX cost checks.",
    },
    "NEEDS INVESTIGATION": {
      pill: "status-caution-box",
      border: "border-[#FBBF24]/30",
      icon: AlertTriangle,
      fallback:
        "Core integrity checks pass, with caution warnings on tenor carry, sample count, or cost buffer requiring review.",
    },
    REJECTED: {
      pill: "status-error-box",
      border: "border-[#F87171]/35",
      icon: XCircle,
      fallback:
        "Disqualified due to source data corruption, tender-window expiry proximity, illiquidity, or transaction costs exceeding spread.",
    },
    "INSUFFICIENT DATA": {
      pill: "status-caution-box",
      border: "border-[#FBBF24]/30",
      icon: Info,
      fallback:
        "Prior clean sample count is insufficient to estimate stable rolling parameters without look-ahead bias.",
    },
  };

  const meta = verdictMeta[verdict] || verdictMeta["NEEDS INVESTIGATION"];
  const StatusIcon = meta.icon;

  return (
    <GlassCard variant="elevated" padding="md" className={`space-y-4 ${meta.border}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#76A9FA]">
            Statistical Rarity vs Practical Evidence
          </span>
          <h3 className="text-sm font-bold text-[#F4F4F5] mt-0.5">
            Opportunity vs Evidence Assessment
          </h3>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold self-start sm:self-auto ${meta.pill}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          <span>{verdict}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gauge A: Statistical Rarity */}
        <div className="rounded-xl bg-[#11151B] p-3.5 space-y-2 border border-white/[0.07]">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#F4F4F5]">
              <Zap className="h-3.5 w-3.5 text-[#76A9FA]" />
              <span>Statistical Rarity (|Z-Score|)</span>
            </div>
            <span className="num-font text-sm font-bold text-[#76A9FA]">
              {anomalyStrength}/100
            </span>
          </div>

          <div className="w-full bg-[#080A0D] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#76A9FA] h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(4, anomalyStrength)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#A1A1AA] num-font">
            <span>
              Z-Score:{" "}
              <strong className="text-[#F4F4F5]">
                {zScore !== null ? `${zScore.toFixed(2)}σ` : "Unavailable"}
              </strong>
            </span>
            <span>
              {isDataIntegrityFailure ? (
                <span className="text-[#F87171] font-semibold">Artifact of bad print</span>
              ) : (
                "Prior-window scale (|Z| / 3.5σ)"
              )}
            </span>
          </div>
        </div>

        {/* Gauge B: Practical Feasibility & Evidence */}
        <div className="rounded-xl bg-[#11151B] p-3.5 space-y-2 border border-white/[0.07]">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#F4F4F5]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#E6BD58]" />
              <span>Supporting Practical Evidence</span>
            </div>
            <span
              className={`num-font text-sm font-bold ${
                tradingEvidence >= 70
                  ? "text-[#4ADE80]"
                  : tradingEvidence >= 40
                  ? "text-[#FBBF24]"
                  : "text-[#F87171]"
              }`}
            >
              {tradingEvidence}/100
            </span>
          </div>

          <div className="w-full bg-[#080A0D] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                tradingEvidence >= 70
                  ? "bg-[#4ADE80]"
                  : tradingEvidence >= 40
                  ? "bg-[#FBBF24]"
                  : "bg-[#F87171]"
              }`}
              style={{ width: `${Math.max(4, tradingEvidence)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#A1A1AA] num-font">
            <span>
              Net Edge:{" "}
              <strong className={isDataIntegrityFailure ? "line-through" : "text-[#F4F4F5]"}>
                {netEdgeINRPerGram >= 0 ? "+" : ""}₹{netEdgeINRPerGram.toFixed(2)}/g
              </strong>
            </span>
            <span>
              Friction Load: <strong className="text-[#F4F4F5]">{costToEdgeRatio.toFixed(0)}%</strong>
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#A1A1AA] leading-relaxed">
        <strong className="text-[#F4F4F5] font-semibold">Interpretation: </strong>
        {explanation || meta.fallback}
      </p>
    </GlassCard>
  );
}
