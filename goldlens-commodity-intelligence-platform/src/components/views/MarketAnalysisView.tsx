"use client";

import React, { useState, useEffect, useMemo } from "react";
import { GlassCard } from "../ui/GlassCard";
import { SpreadZScoreChart } from "../charts/SpreadZScoreChart";
import { SpreadDistributionChart } from "../charts/SpreadDistributionChart";
import { AnomalyHeatmap } from "../charts/AnomalyHeatmap";
import { FuturesCurveChart } from "../charts/FuturesCurveChart";
import { HistoricalPatternsView } from "./HistoricalPatternsView";
import { MarketReplayView } from "./MarketReplayView";
import { TrendingUp, Dna, History } from "lucide-react";
import {
  DailyContractPoint,
  AlignedSpreadPoint,
  calculateSpreadDistribution,
} from "@/lib/analytics/spreads";

interface MarketAnalysisViewProps {
  marketRecords: DailyContractPoint[];
  alignedSpreads: AlignedSpreadPoint[];
  scannedSignals: any[];
  contractA: string;
  contractB: string;
  initialSubTab?: "spread" | "analogues" | "replay";
  onSelectSignalDate: (date: string, pairOverride?: { a: string; b: string }) => void;
  onNavigate: (view: string) => void;
}

export function MarketAnalysisView({
  marketRecords,
  alignedSpreads,
  scannedSignals,
  contractA,
  contractB,
  initialSubTab = "spread",
  onSelectSignalDate,
  onNavigate,
}: MarketAnalysisViewProps) {
  const [subTab, setSubTab] = useState<"spread" | "analogues" | "replay">(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const validSpreads = useMemo(
    () =>
      alignedSpreads
        .filter((s) => s.qualityStatus !== "corrupted")
        .map((s) => s.spreadAbsolute),
    [alignedSpreads]
  );

  const distribution = useMemo(
    () => calculateSpreadDistribution(validSpreads, 22),
    [validSpreads]
  );

  const latest = alignedSpreads[alignedSpreads.length - 1];

  const dates = useMemo(
    () => Array.from(new Set(marketRecords.map((r) => r.date))).sort(),
    [marketRecords]
  );

  const heatmapPairs = [
    "GOLDM / GOLDTEN",
    "GOLDM / GOLDGUINEA",
    "GOLDGUINEA / GOLDPETAL",
    "GOLDM / GOLDPETAL",
    "GOLD / GOLDM",
  ];

  const heatmapCells = useMemo(
    () =>
      scannedSignals.map((s) => ({
        pairKey: `${s.contractA} / ${s.contractB}`,
        date: s.date,
        zScore: s.zScore,
        spreadAbs: s.spreadAbsolute,
        isAnomaly: true,
        classification: s.verdict,
      })),
    [scannedSignals]
  );

  return (
    <div className="space-y-6">
      {/* Header + Sub-Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#76A9FA]">
            Market Analysis
          </span>
          <h1 className="text-xl font-bold text-[#F4F4F5] mt-0.5">
            Spread Dynamics, Historical Analogues & Market Replay
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Active pair: <strong className="text-[#E6BD58]">{contractA} / {contractB}</strong> ({alignedSpreads.length} aligned sessions)
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Market Analysis views"
          className="inline-flex items-center gap-1 bg-[#11151B] p-1 rounded-xl border border-white/[0.08] text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "spread"}
            onClick={() => setSubTab("spread")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors ${
              subTab === "spread"
                ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Spread & Statistics</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === "analogues"}
            onClick={() => setSubTab("analogues")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors ${
              subTab === "analogues"
                ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            <Dna className="h-3.5 w-3.5" />
            <span>Historical Analogues</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === "replay"}
            onClick={() => setSubTab("replay")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors ${
              subTab === "replay"
                ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Market Replay</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: SPREAD & STATISTICS */}
      {subTab === "spread" && (
        <div className="space-y-6">
          <GlassCard variant="standard" padding="md">
            <SpreadZScoreChart
              spreads={alignedSpreads}
              contractA={contractA}
              contractB={contractB}
              zScoreThreshold={1.8}
              onSelectDate={(date) => onSelectSignalDate(date)}
            />
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <GlassCard variant="standard" padding="md" className="space-y-3">
              <div className="pb-2 border-b border-white/[0.07]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#76A9FA]">
                  Empirical Distribution (Clean Sessions)
                </span>
                <h3 className="text-sm font-bold text-[#F4F4F5] mt-0.5">
                  Historical Spread Histogram & Quantiles
                </h3>
                <p className="text-[11px] text-[#A1A1AA]">
                  Empirical quantiles shown directly without assuming Gaussian normality.
                </p>
              </div>
              <SpreadDistributionChart
                distribution={distribution}
                currentSpread={latest?.spreadAbsolute}
                contractA={contractA}
                contractB={contractB}
              />
            </GlassCard>

            <GlassCard variant="standard" padding="md" className="space-y-3">
              <div className="pb-2 border-b border-white/[0.07]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E6BD58]">
                  Maturity Term Structure
                </span>
                <h3 className="text-sm font-bold text-[#F4F4F5] mt-0.5">
                  Cross-Contract Futures Curve Explorer
                </h3>
                <p className="text-[11px] text-[#A1A1AA]">
                  Compares quoted vs 999-normalized prices and remaining DTE on any session.
                </p>
              </div>
              <FuturesCurveChart records={marketRecords} />
            </GlassCard>
          </div>

          <GlassCard variant="standard" padding="md" className="space-y-3">
            <div className="pb-2 border-b border-white/[0.07]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E6BD58]">
                Cross-Pair Deviation Matrix
              </span>
              <h3 className="text-sm font-bold text-[#F4F4F5] mt-0.5">
                Multi-Pair Anomaly Heatmap (Click any cell to open Signal Autopsy)
              </h3>
            </div>
            <AnomalyHeatmap
              cells={heatmapCells}
              pairs={heatmapPairs}
              dates={dates}
              onSelectCell={(pairKey, date) => {
                const [a, b] = pairKey.split(" / ").map((s) => s.trim());
                onSelectSignalDate(date, { a, b });
              }}
            />
          </GlassCard>
        </div>
      )}

      {/* SUB-TAB 2: HISTORICAL ANALOGUES (SPREAD DNA) */}
      {subTab === "analogues" && (
        <HistoricalPatternsView
          alignedSpreads={alignedSpreads}
          contractA={contractA}
          contractB={contractB}
          onNavigate={onNavigate}
        />
      )}

      {/* SUB-TAB 3: MARKET REPLAY */}
      {subTab === "replay" && (
        <MarketReplayView
          alignedSpreads={alignedSpreads}
          contractA={contractA}
          contractB={contractB}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
