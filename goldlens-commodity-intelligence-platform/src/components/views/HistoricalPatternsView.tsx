"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "../ui/GlassCard";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { AlignedSpreadPoint } from "@/lib/analytics/spreads";
import { findSpreadDNAPatterns } from "@/lib/analytics/spreadDNA";

interface HistoricalPatternsViewProps {
  alignedSpreads: AlignedSpreadPoint[];
  contractA: string;
  contractB: string;
  onNavigate: (view: string) => void;
}

export function HistoricalPatternsView({
  alignedSpreads,
}: HistoricalPatternsViewProps) {
  const cleanAnomalies = alignedSpreads.filter(
    (s) => s.isAnomaly && s.qualityStatus !== "corrupted"
  );
  const defaultDate =
    cleanAnomalies[cleanAnomalies.length - 1]?.date ||
    alignedSpreads[alignedSpreads.length - 1]?.date ||
    "";

  const [selectedTargetDate, setSelectedTargetDate] = useState<string>(defaultDate);

  if (alignedSpreads.length === 0) {
    return (
      <GlassCard variant="standard" padding="md" className="text-center py-10 text-xs text-[#A1A1AA]">
        Insufficient aligned observations for historical analogue search.
      </GlassCard>
    );
  }

  const targetPoint =
    alignedSpreads.find((s) => s.date === selectedTargetDate) ||
    alignedSpreads.find((s) => s.date === defaultDate) ||
    alignedSpreads[alignedSpreads.length - 1];

  const dnaReport = findSpreadDNAPatterns(targetPoint, alignedSpreads, 5, true);

  return (
    <div className="space-y-5">
      {/* Selector & Prior-Only Notice */}
      <GlassCard variant="standard" padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#76A9FA]">
              Strict Prior-History Analogue Search (Zero Look-Ahead)
            </span>
            <h2 className="text-base font-bold text-[#F4F4F5] mt-0.5">
              Spread DNA — Prior Analogues & Event-Aligned Convergence Timeline
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="dna-target-date" className="text-[#A1A1AA]">
              Target Date:
            </label>
            <select
              id="dna-target-date"
              value={targetPoint.date}
              onChange={(e) => setSelectedTargetDate(e.target.value)}
              className="rounded-lg bg-[#080A0D] border border-white/[0.1] px-3 py-1.5 text-xs text-[#F4F4F5]"
            >
              {alignedSpreads.slice(25).map((s) => (
                <option key={s.date} value={s.date}>
                  {s.date} ({s.spreadAbsolute >= 0 ? "+" : ""}₹{s.spreadAbsolute.toFixed(1)}/g •{" "}
                  {s.zScore?.toFixed(2) ?? "—"}σ)
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-[#A1A1AA]">{dnaReport.evidenceNote}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs num-font">
          <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
            <span className="text-[11px] text-[#A1A1AA] block">Prior Analogues Found</span>
            <span className="text-lg font-bold text-[#F4F4F5]">
              {dnaReport.matchesCount} setups
            </span>
          </div>
          <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
            <span className="text-[11px] text-[#A1A1AA] block">10-Day Reversion Ratio</span>
            <span className="text-lg font-bold text-[#76A9FA]">
              {dnaReport.matchesCount > 0
                ? `${dnaReport.summaryStats.historicalConvergenceRatePct}%`
                : "Unavailable"}
            </span>
          </div>
          <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
            <span className="text-[11px] text-[#A1A1AA] block">Mean Favorable Excursion</span>
            <span className="text-lg font-bold text-[#4ADE80]">
              +₹{dnaReport.summaryStats.averageMFE_INR_per_g}/g
            </span>
          </div>
          <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
            <span className="text-[11px] text-[#A1A1AA] block">Mean Adverse Excursion</span>
            <span className="text-lg font-bold text-[#F87171]">
              -₹{dnaReport.summaryStats.averageMAE_INR_per_g}/g
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Event-Aligned Convergence Timeline */}
      {dnaReport.medianTrajectory.length > 0 && (
        <GlassCard variant="standard" padding="md" className="space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.07]">
            <span className="font-semibold text-[#F4F4F5]">
              Event-Aligned Favorable Convergence Path (T−3 Setup vs T+1 … T+15 Subsequent Outcome)
            </span>
            <span className="text-[11px] text-[#A1A1AA]">
              Historical outcomes are not guaranteed to repeat
            </span>
          </div>

          <div className="h-60 w-full rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dnaReport.medianTrajectory}
                margin={{ top: 10, right: 12, left: -8, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="relativeDay"
                  stroke="#A1A1AA"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v: number) => `T${v >= 0 ? `+${v}` : v}d`}
                />
                <YAxis
                  stroke="#A1A1AA"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `₹${v.toFixed(0)}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const pt = payload[0].payload;
                      return (
                        <div className="rounded-xl bg-[#171B22] p-2.5 border border-white/12 text-xs num-font">
                          <div className="font-semibold text-[#F4F4F5]">
                            Relative Day T{Number(label) >= 0 ? `+${label}` : label}
                          </div>
                          <div className="text-[#E6BD58] font-semibold mt-0.5">
                            Median Convergence: ₹{pt.medianSpreadDelta}/g
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x={0} stroke="#76A9FA" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.14)" />
                <Line
                  type="monotone"
                  dataKey="medianSpreadDelta"
                  stroke="#E6BD58"
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: "#E6BD58" }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="upperPercentile75"
                  stroke="#4ADE80"
                  strokeDasharray="3 3"
                  strokeWidth={1.2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="lowerPercentile25"
                  stroke="#F87171"
                  strokeDasharray="3 3"
                  strokeWidth={1.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

      {/* Matched Prior Analogues List */}
      {dnaReport.matches.length > 0 && (
        <GlassCard variant="standard" padding="md" className="space-y-3">
          <h3 className="text-sm font-bold text-[#F4F4F5]">
            Matched Prior Analogue Episodes ({dnaReport.matches.length})
          </h3>
          <div className="divide-y divide-white/[0.06] text-xs num-font">
            {dnaReport.matches.map((m) => (
              <div
                key={m.eventDate}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-mono font-bold text-[#F4F4F5] mr-2">
                    {m.eventDate}
                  </span>
                  <span className="rounded bg-[#171B22] px-2 py-0.5 text-[10px] font-semibold text-[#E6BD58] border border-[#E6BD58]/30">
                    {m.similarityScore}% similarity
                  </span>
                  <div className="text-[11px] text-[#A1A1AA] mt-0.5">
                    Setup: ₹{m.initialSpreadAbs.toFixed(2)}/g ({m.initialZScore.toFixed(2)}σ) •{" "}
                    {m.daysToExpiry}d DTE
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="text-[#4ADE80]">MFE: +₹{m.maxConvergenceGrams}/g</span>
                  <span className="text-[#F87171]">MAE: -₹{m.maxAdverseMovementGrams}/g</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      m.didConvergeWithin10d ? "status-positive-box" : "status-caution-box"
                    }`}
                  >
                    {m.didConvergeWithin10d ? `Converged T+${m.convergenceDay}d` : "Incomplete 10d"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
