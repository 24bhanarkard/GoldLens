"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { AlignedSpreadPoint } from "@/lib/analytics/spreads";

interface SpreadZScoreChartProps {
  spreads: AlignedSpreadPoint[];
  contractA: string;
  contractB: string;
  zScoreThreshold?: number;
  onSelectDate?: (date: string) => void;
  selectedDate?: string;
}

export function SpreadZScoreChart({
  spreads,
  contractA,
  contractB,
  zScoreThreshold = 2.0,
  onSelectDate,
  selectedDate,
}: SpreadZScoreChartProps) {
  const [showBands, setShowBands] = useState(true);

  if (spreads.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-500">
        No aligned spread data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart 1: Spread with Rolling Mean & Volatility Bands */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">
              Absolute Spread: {contractA} − {contractB} (₹/gram 999)
            </span>
          </div>

          <button
            onClick={() => setShowBands(!showBands)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-white/10"
          >
            {showBands ? "Hide ±2σ Bands" : "Show ±2σ Bands"}
          </button>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={spreads}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onClick={(e: unknown) => {
                const event = e as { activePayload?: { payload: AlignedSpreadPoint }[] };
                if (event?.activePayload?.[0]) {
                  const pt = event.activePayload[0].payload;
                  if (onSelectDate) onSelectDate(pt.date);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                tickFormatter={(v) => {
                  const parts = v.split("-");
                  return `${parts[1]}/${parts[2]}`;
                }}
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
                    const pt = payload[0].payload as AlignedSpreadPoint;
                    return (
                      <div className="rounded-xl glass-elevated p-3 border border-amber-500/30 text-xs shadow-2xl space-y-1">
                        <div className="font-bold text-slate-200 pb-1 border-b border-white/10 flex items-center justify-between gap-4">
                          <span>Session</span>
                          <span className="font-mono text-amber-400">{label}</span>
                        </div>
                        <div className="pt-1 space-y-1 text-slate-300">
                          <div className="flex justify-between gap-4">
                            <span>Spread (₹/g):</span>
                            <span className="font-mono font-bold text-amber-300">
                              ₹{pt.spreadAbsolute.toFixed(2)} / g
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Rolling Mean (μ):</span>
                            <span className="font-mono text-slate-400">
                              ₹{pt.rollingMean?.toFixed(2) || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Rolling Std (σ):</span>
                            <span className="font-mono text-slate-400">
                              ₹{pt.rollingStd?.toFixed(2) || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Z-Score:</span>
                            <span
                              className={`font-mono font-bold ${
                                pt.zScore && Math.abs(pt.zScore) >= 2.0
                                  ? "text-rose-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {pt.zScore ? `${pt.zScore.toFixed(2)}σ` : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />

              {showBands && (
                <>
                  <Line
                    type="monotone"
                    dataKey="rollingUpperBand2"
                    name="+2σ Upper Band"
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rollingLowerBand2"
                    name="-2σ Lower Band"
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.2}
                    dot={false}
                  />
                </>
              )}

              <Line
                type="monotone"
                dataKey="rollingMean"
                name="Rolling Mean"
                stroke="#38bdf8"
                strokeWidth={1.5}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="spreadAbsolute"
                name="Spread (₹/g)"
                stroke="#e5c07b"
                strokeWidth={2.2}
                dot={(props: { cx?: number; cy?: number; payload?: AlignedSpreadPoint }) => {
                  const { cx, cy, payload } = props;
                  if (payload?.isAnomaly && cx !== undefined && cy !== undefined) {
                    return (
                      <circle
                        key={payload.date}
                        cx={cx}
                        cy={cy}
                        r={4.5}
                        fill="#f43f5e"
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  return <circle key={payload?.date || Math.random()} cx={cx || 0} cy={cy || 0} r={0} />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Lookback Rolling Z-Score Oscillator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200">
            Rolling Lookahead-Bias-Free Z-Score (σ Deviation)
          </span>
          <span className="text-[11px] text-slate-400">
            Anomaly Threshold: <strong className="text-rose-400">|Z| ≥ {zScoreThreshold.toFixed(1)}σ</strong>
          </span>
        </div>

        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={spreads}
              margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              onClick={(e: unknown) => {
                const event = e as { activePayload?: { payload: AlignedSpreadPoint }[] };
                if (event?.activePayload?.[0]) {
                  const pt = event.activePayload[0].payload;
                  if (onSelectDate) onSelectDate(pt.date);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                tickFormatter={(v) => {
                  const parts = v.split("-");
                  return `${parts[1]}/${parts[2]}`;
                }}
              />
              <YAxis
                domain={[-4, 4]}
                ticks={[-3, -2, -1, 0, 1, 2, 3]}
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                tickFormatter={(v) => `${v}σ`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const pt = payload[0].payload as AlignedSpreadPoint;
                    return (
                      <div className="rounded-xl glass-elevated p-2.5 border border-amber-500/30 text-xs shadow-2xl">
                        <div className="font-bold text-slate-200">{label}</div>
                        <div className="text-amber-400 font-mono font-bold mt-1">
                          Z-Score: {pt.zScore?.toFixed(2)}σ
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Percentile: {pt.historicalPercentile}th %ile
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine y={0} stroke="#64748b" />
              <ReferenceLine y={zScoreThreshold} stroke="#f43f5e" strokeDasharray="3 3" />
              <ReferenceLine y={-zScoreThreshold} stroke="#f43f5e" strokeDasharray="3 3" />

              <Line
                type="monotone"
                dataKey="zScore"
                stroke="#38bdf8"
                strokeWidth={1.8}
                dot={(props: { cx?: number; cy?: number; payload?: AlignedSpreadPoint }) => {
                  const { cx, cy, payload } = props;
                  if (payload?.isAnomaly && cx !== undefined && cy !== undefined) {
                    return (
                      <circle
                        key={payload.date}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#f43f5e"
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  return <circle key={payload?.date || Math.random()} cx={cx || 0} cy={cy || 0} r={0} />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
