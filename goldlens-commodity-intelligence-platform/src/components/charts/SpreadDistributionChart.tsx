"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { SpreadDistributionStats } from "@/lib/analytics/spreads";

interface SpreadDistributionChartProps {
  distribution: SpreadDistributionStats;
  currentSpread?: number;
  contractA: string;
  contractB: string;
}

export function SpreadDistributionChart({
  distribution,
  currentSpread,
  contractA,
  contractB,
}: SpreadDistributionChartProps) {
  if (!distribution || distribution.histogramBuckets.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-500">No distribution data</div>;
  }

  const { mean, median, stdDev, percentiles, skewness, kurtosis, count } = distribution;

  return (
    <div className="space-y-4">
      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
        <div className="rounded-xl glass-subtle p-2.5 border border-white/5">
          <div className="text-[10px] text-slate-400">Sample Count</div>
          <div className="font-mono font-bold text-slate-100">{count} sessions</div>
        </div>
        <div className="rounded-xl glass-subtle p-2.5 border border-white/5">
          <div className="text-[10px] text-slate-400">Mean Spread (μ)</div>
          <div className="font-mono font-bold text-amber-300">₹{mean.toFixed(2)}/g</div>
        </div>
        <div className="rounded-xl glass-subtle p-2.5 border border-white/5">
          <div className="text-[10px] text-slate-400">Median Spread</div>
          <div className="font-mono font-bold text-slate-200">₹{median.toFixed(2)}/g</div>
        </div>
        <div className="rounded-xl glass-subtle p-2.5 border border-white/5">
          <div className="text-[10px] text-slate-400">Std Deviation (σ)</div>
          <div className="font-mono font-bold text-sky-300">₹{stdDev.toFixed(2)}/g</div>
        </div>
        <div className="rounded-xl glass-subtle p-2.5 border border-white/5">
          <div className="text-[10px] text-slate-400">Skewness</div>
          <div className="font-mono font-bold text-slate-200">{skewness.toFixed(3)}</div>
        </div>
        <div className="rounded-xl glass-subtle p-2.5 border border-white/5">
          <div className="text-[10px] text-slate-400">Excess Kurtosis</div>
          <div className="font-mono font-bold text-slate-200">{kurtosis.toFixed(3)}</div>
        </div>
      </div>

      {/* Histogram Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution.histogramBuckets} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="midpoint"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => `₹${Number(v).toFixed(0)}`}
            />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const b = payload[0].payload;
                  return (
                    <div className="rounded-xl glass-elevated p-2.5 border border-amber-500/30 text-xs shadow-2xl space-y-1">
                      <div className="font-bold text-slate-200">
                        Spread Range: ₹{b.rangeMin} to ₹{b.rangeMax} / g
                      </div>
                      <div className="text-amber-400 font-mono font-bold">
                        Frequency: {b.count} sessions ({(b.density * 100).toFixed(1)}%)
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <ReferenceLine x={mean} stroke="#38bdf8" strokeWidth={2} label={{ value: `μ: ₹${mean}`, fill: "#38bdf8", fontSize: 10, position: "top" }} />
            <ReferenceLine x={mean + 2 * stdDev} stroke="#f59e0b" strokeDasharray="3 3" />
            <ReferenceLine x={mean - 2 * stdDev} stroke="#f59e0b" strokeDasharray="3 3" />

            {currentSpread !== undefined && (
              <ReferenceLine
                x={currentSpread}
                stroke="#f43f5e"
                strokeWidth={2}
                label={{ value: `Latest: ₹${currentSpread.toFixed(1)}`, fill: "#f43f5e", fontSize: 10, position: "insideTopRight" }}
              />
            )}

            <Bar
              dataKey="count"
              name="Observations"
              fill="#e5c07b"
              radius={[4, 4, 0, 0]}
              opacity={0.85}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Percentiles Bar */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
        <span>5th %ile: <strong className="text-slate-200 font-mono">₹{percentiles.p5}</strong></span>
        <span>25th %ile: <strong className="text-slate-200 font-mono">₹{percentiles.p25}</strong></span>
        <span>50th %ile: <strong className="text-slate-200 font-mono">₹{percentiles.p50}</strong></span>
        <span>75th %ile: <strong className="text-slate-200 font-mono">₹{percentiles.p75}</strong></span>
        <span>95th %ile: <strong className="text-slate-200 font-mono">₹{percentiles.p95}</strong></span>
        <span>99th %ile: <strong className="text-slate-200 font-mono">₹{percentiles.p99}</strong></span>
      </div>
    </div>
  );
}
