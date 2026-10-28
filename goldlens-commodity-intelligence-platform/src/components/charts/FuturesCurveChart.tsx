"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart,
} from "recharts";
import { DailyContractPoint } from "@/lib/analytics/spreads";

interface FuturesCurveChartProps {
  records: DailyContractPoint[];
  selectedDate?: string;
}

export function FuturesCurveChart({ records, selectedDate }: FuturesCurveChartProps) {
  const dates = Array.from(new Set(records.map((r) => r.date))).sort();
  const [activeDate, setActiveDate] = useState(selectedDate || dates[dates.length - 1] || "2024-12-27");

  const contractsOnDate = records
    .filter((r) => r.date === activeDate)
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  return (
    <div className="space-y-4">
      {/* Date Switcher */}
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-400 font-medium">Observation Date: </span>
          <span className="font-bold text-amber-300 font-mono">{activeDate}</span>
        </div>

        <select
          value={activeDate}
          onChange={(e) => setActiveDate(e.target.value)}
          className="rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
        >
          {dates.slice(-20).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Curve Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={contractsOnDate} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="symbol" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              domain={["dataMin - 10", "dataMax + 10"]}
              tickLine={false}
              tickFormatter={(v) => `₹${v.toFixed(0)}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as DailyContractPoint;
                  return (
                    <div className="rounded-xl glass-elevated p-3 border border-amber-500/30 text-xs shadow-2xl space-y-1">
                      <div className="font-bold text-slate-200 pb-1 border-b border-white/10 flex justify-between gap-4">
                        <span>{pt.symbol}</span>
                        <span className="text-amber-400">{pt.expiryDate}</span>
                      </div>
                      <div className="pt-1 space-y-1 text-slate-300">
                        <div className="flex justify-between gap-4">
                          <span>Raw Quoted Price:</span>
                          <span className="font-mono font-bold text-slate-100">
                            ₹{pt.close.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Normalized (999 Fine):</span>
                          <span className="font-mono font-bold text-amber-300">
                            ₹{pt.normalizedPriceG999.toFixed(2)} / g
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Days to Expiry (DTE):</span>
                          <span className="font-mono text-slate-200">{pt.daysToExpiry} days</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Daily Volume:</span>
                          <span className="font-mono text-slate-200">{pt.volume.toLocaleString()} lots</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Bar
              dataKey="normalizedPriceG999"
              name="Normalized Price (₹/g)"
              fill="#e5c07b"
              radius={[6, 6, 0, 0]}
              opacity={0.85}
            />
            <Line
              type="monotone"
              dataKey="normalizedPriceG999"
              name="Futures Curve"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={{ r: 4, fill: "#38bdf8" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs pt-2 border-t border-white/5">
        {contractsOnDate.map((c) => (
          <div key={c.symbol} className="rounded-xl glass-subtle p-2 space-y-0.5 border border-white/5">
            <div className="font-bold text-slate-200">{c.symbol}</div>
            <div className="text-[11px] text-amber-400 font-mono font-semibold">
              ₹{c.normalizedPriceG999.toFixed(2)}/g
            </div>
            <div className="text-[10px] text-slate-400">{c.daysToExpiry}d to expiry</div>
          </div>
        ))}
      </div>
    </div>
  );
}
