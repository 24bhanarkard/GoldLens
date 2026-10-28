"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { SpreadZScoreChart } from "../charts/SpreadZScoreChart";
import { SpreadDistributionChart } from "../charts/SpreadDistributionChart";
import { TrendingUp, Activity, BarChart2, ArrowRight } from "lucide-react";
import { AlignedSpreadPoint, SpreadDistributionStats, calculateSpreadDistribution } from "@/lib/analytics/spreads";

interface SpreadAnalysisViewProps {
  alignedSpreads: AlignedSpreadPoint[];
  contractA: string;
  contractB: string;
  distribution?: SpreadDistributionStats;
  onSelectDate?: (date: string) => void;
  onNavigate: (view: string) => void;
}

export function SpreadAnalysisView({
  alignedSpreads,
  contractA,
  contractB,
  distribution: propDist,
  onSelectDate,
  onNavigate,
}: SpreadAnalysisViewProps) {
  const [measureType, setMeasureType] = useState<"absolute" | "percentage" | "ratio">("absolute");

  const spreadValues = alignedSpreads.map((s) => s.spreadAbsolute);
  const distribution = propDist || calculateSpreadDistribution(spreadValues, 24);
  const latest = alignedSpreads[alignedSpreads.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              ANALYTICAL TOOL • RELATIVE SPREAD DYNAMICS
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <TrendingUp className="h-5 w-5 text-amber-400" />
            <span>Spread Analysis & Frequency Distribution</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing {contractA} vs {contractB} over {alignedSpreads.length} aligned sessions with rolling volatility bands and distribution moments.
          </p>
        </div>

        {/* Measure Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setMeasureType("absolute")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              measureType === "absolute"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Absolute (₹/g)
          </button>
          <button
            onClick={() => setMeasureType("percentage")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              measureType === "percentage"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Percentage (%)
          </button>
          <button
            onClick={() => setMeasureType("ratio")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              measureType === "ratio"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Price Ratio
          </button>
        </div>
      </div>

      {/* Main Spread and Z-Score Time Series */}
      <GlassCard variant="standard" padding="md">
        <SpreadZScoreChart
          spreads={alignedSpreads}
          contractA={contractA}
          contractB={contractB}
          zScoreThreshold={2.0}
          onSelectDate={onSelectDate}
        />
      </GlassCard>

      {/* Spread Distribution Histogram & Statistics */}
      <GlassCard variant="standard" padding="md">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              VISUALIZATION C • SPREAD DISTRIBUTION EXPLORER
            </span>
            <h3 className="text-sm font-bold text-slate-100">Historical Spread Frequency & Gaussian Density</h3>
          </div>
          <span className="text-xs text-slate-400">
            Latest: <strong className="text-amber-400 font-mono">₹{latest?.spreadAbsolute.toFixed(2)}/g</strong> ({latest?.historicalPercentile}th %ile)
          </span>
        </div>

        <div className="pt-3">
          <SpreadDistributionChart
            distribution={distribution}
            currentSpread={latest?.spreadAbsolute}
            contractA={contractA}
            contractB={contractB}
          />
        </div>
      </GlassCard>
    </div>
  );
}
