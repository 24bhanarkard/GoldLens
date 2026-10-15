"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceDot,
} from "recharts";
import { DailyContractPoint } from "@/lib/analytics/spreads";

interface RelativePriceLandscapeProps {
  records: DailyContractPoint[];
  onSelectAnomalyDate?: (date: string, contractA: string, contractB: string) => void;
  activeAnomalyDate?: string;
}

const CONTRACT_COLORS: Record<string, string> = {
  GOLDM: "#e5c07b", // champagne gold
  GOLDTEN: "#38bdf8", // cyan
  GOLDGUINEA: "#a855f7", // purple
  GOLDPETAL: "#f43f5e", // rose
  GOLD: "#10b981", // emerald
};

export function RelativePriceLandscape({
  records,
  onSelectAnomalyDate,
  activeAnomalyDate,
}: RelativePriceLandscapeProps) {
  const [visibleContracts, setVisibleContracts] = useState<Record<string, boolean>>({
    GOLDM: true,
    GOLDTEN: true,
    GOLDGUINEA: true,
    GOLDPETAL: true,
    GOLD: false,
  });

  const symbols = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.symbol)));
  }, [records]);

  // Pivot data by date
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | string>>();
    records.forEach((r) => {
      let entry = dateMap.get(r.date);
      if (!entry) {
        entry = { date: r.date };
        dateMap.set(r.date, entry);
      }
      entry[r.symbol] = Number(r.normalizedPriceG999.toFixed(2));
      entry[`${r.symbol}_raw`] = r.close;
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [records]);

  const toggleContract = (sym: string) => {
    setVisibleContracts((prev) => ({ ...prev, [sym]: !prev[sym] }));
  };

  // Find price min/max for YAxis scaling
  const [minPrice, maxPrice] = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    records.forEach((r) => {
      if (visibleContracts[r.symbol]) {
        if (r.normalizedPriceG999 < min) min = r.normalizedPriceG999;
        if (r.normalizedPriceG999 > max) max = r.normalizedPriceG999;
      }
    });
    if (min === Infinity) return [7000, 8000];
    return [Math.floor(min - 20), Math.ceil(max + 20)];
  }, [records, visibleContracts]);

  return (
    <div className="space-y-4">
      {/* Top Controls & Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-slate-400 font-medium">Standardized Reference Basis: </span>
          <span className="font-bold text-amber-300">₹ / gram (999 Fine Gold Equivalent)</span>
        </div>

        {/* Legend Filter Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {symbols.map((sym) => {
            const isVisible = visibleContracts[sym] !== false;
            const color = CONTRACT_COLORS[sym] || "#cbd5e1";
            return (
              <button
                key={sym}
                onClick={() => toggleContract(sym)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                  isVisible
                    ? "bg-slate-800 text-slate-100 border-white/20 shadow-sm"
                    : "bg-slate-900/40 text-slate-500 border-white/5 opacity-50"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{sym}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => {
                const parts = v.split("-");
                return `${parts[1]}/${parts[2]}`;
              }}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `₹${v.toLocaleString()}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl glass-elevated p-3 border border-amber-500/30 text-xs shadow-2xl">
                      <div className="font-bold text-slate-200 pb-1.5 border-b border-white/10 flex items-center justify-between gap-4">
                        <span>Trading Session</span>
                        <span className="font-mono text-amber-400">{label}</span>
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {payload.map((p) => {
                          const sym = p.name as string;
                          const normVal = Number(p.value);
                          const rawVal = p.payload[`${sym}_raw`];
                          return (
                            <div key={sym} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 font-medium" style={{ color: p.color }}>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                                {sym}:
                              </span>
                              <div className="text-right">
                                <span className="font-bold text-slate-100 font-mono">
                                  ₹{normVal.toFixed(2)}/g
                                </span>
                                {rawVal && (
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    Raw: ₹{rawVal.toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-white/10 text-[10px] text-slate-400">
                        Normalized per gram 999 standard purity
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {symbols.map((sym) => {
              if (!visibleContracts[sym]) return null;
              const color = CONTRACT_COLORS[sym] || "#cbd5e1";
              return (
                <Line
                  key={sym}
                  type="monotone"
                  dataKey={sym}
                  name={sym}
                  stroke={color}
                  strokeWidth={sym === "GOLDM" ? 2.5 : 1.8}
                  dot={false}
                  activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: "#0c1017" }}
                />
              );
            })}

            {/* Highlight Active Anomaly Point */}
            {activeAnomalyDate && (
              <ReferenceDot
                x={activeAnomalyDate}
                y={
                  (chartData.find((d) => d.date === activeAnomalyDate)?.GOLDM as number) ||
                  minPrice + 50
                }
                r={6}
                fill="#f43f5e"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
