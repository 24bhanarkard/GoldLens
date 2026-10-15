"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { EquityCurvePoint } from "@/lib/analytics/backtester";

interface EquityCurveChartProps {
  equityCurve: EquityCurvePoint[];
  initialCapital?: number;
}

export function EquityCurveChart({ equityCurve, initialCapital = 500000 }: EquityCurveChartProps) {
  const [viewMode, setViewMode] = useState<"pnl" | "capital">("pnl");

  if (!equityCurve || equityCurve.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-500">No equity data</div>;
  }

  const latest = equityCurve[equityCurve.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-200">
            {viewMode === "pnl" ? "Cumulative Strategy PnL (₹ Gross vs Net)" : "Portfolio Capital Trajectory (₹)"}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode("pnl")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "pnl"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Gross vs Net PnL
          </button>
          <button
            onClick={() => setViewMode("capital")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "capital"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Total Capital
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={equityCurve} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => {
                const parts = v.split("-");
                return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : v;
              }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as EquityCurvePoint;
                  return (
                    <div className="rounded-xl glass-elevated p-3 border border-amber-500/30 text-xs shadow-2xl space-y-1">
                      <div className="font-bold text-slate-200 pb-1 border-b border-white/10 flex justify-between gap-4">
                        <span>Date</span>
                        <span className="font-mono text-amber-400">{label}</span>
                      </div>
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between gap-4 text-emerald-300">
                          <span>Gross PnL:</span>
                          <span className="font-mono font-bold">
                            ₹{pt.grossCumulativeINR.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-amber-300">
                          <span>Net PnL (after costs):</span>
                          <span className="font-mono font-bold">
                            ₹{pt.netCumulativeINR.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-rose-400">
                          <span>Drawdown:</span>
                          <span className="font-mono">
                            -₹{pt.drawdownINR.toLocaleString("en-IN")} ({pt.drawdownPct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-300 pt-1 border-t border-white/10">
                          <span>Portfolio Capital:</span>
                          <span className="font-mono font-bold">
                            ₹{pt.capitalINR.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <ReferenceLine y={0} stroke="#475569" />

            {viewMode === "pnl" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="grossCumulativeINR"
                  name="Gross Cumulative PnL"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="netCumulativeINR"
                  name="Net Cumulative PnL"
                  stroke="#e5c07b"
                  strokeWidth={2.5}
                  dot={(props: { cx?: number; cy?: number; payload?: EquityCurvePoint }) => {
                    const { cx, cy, payload } = props;
                    if (payload?.isTradeExit && cx !== undefined && cy !== undefined) {
                      return (
                        <circle
                          key={payload.date}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="#e5c07b"
                          stroke="#0c1017"
                          strokeWidth={1.5}
                        />
                      );
                    }
                    return <circle key={payload?.date || Math.random()} cx={cx || 0} cy={cy || 0} r={0} />;
                  }}
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="capitalINR"
                name="Total Capital"
                stroke="#38bdf8"
                fill="#38bdf8"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
