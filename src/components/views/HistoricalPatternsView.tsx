"use client";

import React, { useState } from "react";
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
import { Dna, TrendingUp, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
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
  contractA,
  contractB,
  onNavigate,
}: HistoricalPatternsViewProps) {
  const anomalies = alignedSpreads.filter((s) => s.isAnomaly);
  const [selectedTargetDate, setSelectedTargetDate] = useState<string>(
    anomalies[0]?.date || alignedSpreads[alignedSpreads.length - 1]?.date || "2024-09-18"
  );

  const targetPoint = alignedSpreads.find((s) => s.date === selectedTargetDate) || alignedSpreads[alignedSpreads.length - 1];
  const dnaReport = findSpreadDNAPatterns(targetPoint, alignedSpreads, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              FEATURE 2 & VISUALIZATION G/H
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <Dna className="h-5 w-5 text-amber-400" />
            <span>Spread DNA — Historical Pattern Matching & Convergence Timeline</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Reconstructing forward trajectories (T-3 to T+15) of historically similar setups without lookahead bias.
          </p>
        </div>

        {/* Target Event Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Target Setup:</span>
          <select
            value={selectedTargetDate}
            onChange={(e) => setSelectedTargetDate(e.target.value)}
            className="rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            {alignedSpreads.map((s) => (
              <option key={s.date} value={s.date}>
                {s.date} (Spread: ₹{s.spreadAbsolute.toFixed(1)}/g, Z: {s.zScore?.toFixed(2)}σ)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target Setup Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-400">Target Spread Setup</span>
          <div className="font-mono text-base font-bold text-amber-300">
            ₹{targetPoint.spreadAbsolute.toFixed(2)} / g
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Z-Score: {targetPoint.zScore?.toFixed(2)}σ</div>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-400">Historical Analogs Found</span>
          <div className="font-mono text-base font-bold text-slate-100">
            {dnaReport.matchesCount} setups
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">
            {dnaReport.isSufficientHistoricalEvidence ? "Sufficient Sample (≥2)" : "Low Sample Size"}
          </div>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-400">10-Day Convergence Rate</span>
          <div className="font-mono text-base font-bold text-emerald-400">
            {dnaReport.summaryStats.historicalConvergenceRatePct}%
          </div>
          <div className="text-[10px] text-slate-400">Reverted to mean ±0.5σ</div>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-400">Average Favorable Excursion</span>
          <div className="font-mono text-base font-bold text-sky-400">
            +₹{dnaReport.summaryStats.averageMFE_INR_per_g} / g
          </div>
          <div className="text-[10px] text-rose-400">MAE: -₹{dnaReport.summaryStats.averageMAE_INR_per_g}/g</div>
        </GlassCard>
      </div>

      {/* Historical Convergence Timeline Chart */}
      <GlassCard variant="standard" padding="md" className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              VISUALIZATION G • HISTORICAL CONVERGENCE TIMELINE
            </span>
            <h3 className="text-sm font-bold text-slate-100">
              Forward Spread Trajectory Path (T-3 to T+15 Relative Trading Days)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Event Alignment: Day 0</span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dnaReport.medianTrajectory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="relativeDay"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                tickFormatter={(v) => `T${v >= 0 ? `+${v}` : v}d`}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                tickFormatter={(v) => `₹${v.toFixed(1)}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const pt = payload[0].payload;
                    return (
                      <div className="rounded-xl glass-elevated p-2.5 border border-amber-500/30 text-xs shadow-2xl space-y-1">
                        <div className="font-bold text-slate-200">
                          Timeline: T{Number(label) >= 0 ? `+${label}` : label} days from setup
                        </div>
                        <div className="text-amber-400 font-mono font-bold">
                          Median Favorable Convergence: ₹{pt.medianSpreadDelta} / g
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          25th–75th %ile Band: ₹{pt.lowerPercentile25} to ₹{pt.upperPercentile75} / g
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine x={0} stroke="#f43f5e" strokeWidth={2} label={{ value: "Setup Trigger (T0)", fill: "#f43f5e", fontSize: 10 }} />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />

              <Line
                type="monotone"
                dataKey="medianSpreadDelta"
                name="Median Convergence Path"
                stroke="#e5c07b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#e5c07b" }}
              />
              <Line
                type="monotone"
                dataKey="upperPercentile75"
                name="75th %ile Band"
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeWidth={1.2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="lowerPercentile25"
                name="25th %ile Band"
                stroke="#f43f5e"
                strokeDasharray="3 3"
                strokeWidth={1.2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Matched Analogues Detailed Table */}
      <GlassCard variant="standard" padding="md" className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <span className="font-bold text-xs text-slate-200">
            Top Historical Analogue Matches ({dnaReport.matches.length})
          </span>
          <span className="text-[10px] text-slate-400">Vector Euclidean & Cosine Similarity</span>
        </div>

        <div className="divide-y divide-white/5">
          {dnaReport.matches.map((m, idx) => (
            <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{m.eventDate}</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                    {m.similarityScore}% Similarity
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Initial Spread: ₹{m.initialSpreadAbs.toFixed(2)}/g (Z: {m.initialZScore.toFixed(2)}σ) | {m.daysToExpiry}d to Expiry
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-[10px] text-slate-400 block">Max Convergence (MFE)</span>
                  <span className="font-mono font-bold text-emerald-400">+₹{m.maxConvergenceGrams}/g</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Max Adverse (MAE)</span>
                  <span className="font-mono font-bold text-rose-400">-₹{m.maxAdverseMovementGrams}/g</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Status</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.didConvergeWithin10d ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                    {m.didConvergeWithin10d ? `Converged @ T+${m.convergenceDay}d` : "Did not converge"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
