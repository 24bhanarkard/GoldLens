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

export function EquityCurveChart({ equityCurve }: EquityCurveChartProps) {
  const [viewMode, setViewMode] = useState<"pnl" | "capital">("pnl");

  if (!equityCurve || equityCurve.length <= 1) {
    return (
      <div className="h-56 flex items-center justify-center rounded-xl bg-[#080A0D] border border-white/[0.06] text-xs text-[#A1A1AA]">
        Insufficient executed trades to plot cumulative return path.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[#F4F4F5]">
          {viewMode === "pnl"
            ? "Simulated Cumulative P&L — Gross (#76A9FA) vs Net After Costs (#E6BD58)"
            : "Simulated Capital Trajectory (₹)"}
        </span>

        <div className="inline-flex items-center gap-1 bg-[#080A0D] p-1 rounded-lg border border-white/[0.07]">
          <button
            type="button"
            onClick={() => setViewMode("pnl")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              viewMode === "pnl"
                ? "bg-[#171B22] text-[#E6BD58]"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            Gross vs Net P&L
          </button>
          <button
            type="button"
            onClick={() => setViewMode("capital")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              viewMode === "capital"
                ? "bg-[#171B22] text-[#E6BD58]"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            Portfolio Capital
          </button>
        </div>
      </div>

      <div className="h-60 w-full rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={equityCurve} margin={{ top: 10, right: 12, left: -4, bottom: 0 }}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis
              dataKey="date"
              stroke="#A1A1AA"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v: string) => {
                const parts = v.split("-");
                return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : v;
              }}
            />
            <YAxis
              stroke="#A1A1AA"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                `₹${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as EquityCurvePoint;
                  return (
                    <div className="rounded-xl bg-[#171B22] p-3 border border-white/12 text-xs shadow-xl space-y-1 num-font">
                      <div className="font-semibold text-[#F4F4F5] pb-1.5 border-b border-white/[0.08] flex justify-between gap-4">
                        <span className="text-[#A1A1AA]">Exit Date</span>
                        <span className="font-mono">{label}</span>
                      </div>
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between gap-4 text-[#76A9FA]">
                          <span>Gross P&L:</span>
                          <span className="font-semibold">
                            ₹{pt.grossCumulativeINR.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-[#E6BD58]">
                          <span>Net P&L (After Costs):</span>
                          <span className="font-semibold">
                            ₹{pt.netCumulativeINR.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-[#F87171]">
                          <span>Drawdown:</span>
                          <span>
                            -₹{pt.drawdownINR.toLocaleString("en-IN")} ({pt.drawdownPct.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <ReferenceLine y={0} stroke="rgba(255,255,255,0.14)" />

            {viewMode === "pnl" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="grossCumulativeINR"
                  name="Gross P&L"
                  stroke="#76A9FA"
                  strokeWidth={1.8}
                  strokeDasharray="4 3"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="netCumulativeINR"
                  name="Net P&L"
                  stroke="#E6BD58"
                  strokeWidth={2.4}
                  isAnimationActive={false}
                  dot={{ r: 3.5, fill: "#E6BD58", stroke: "#080A0D", strokeWidth: 1.5 }}
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="capitalINR"
                name="Simulated Capital"
                stroke="#76A9FA"
                fill="#76A9FA"
                fillOpacity={0.14}
                strokeWidth={2}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
