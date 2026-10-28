"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import { DailyContractPoint } from "@/lib/analytics/spreads";

interface RelativePriceLandscapeProps {
  records: DailyContractPoint[];
  contractA?: string;
  contractB?: string;
  lookbackWindow?: number;
  anomalyPoints?: { date: string; verdict: string; spreadAbsolute: number }[];
  onSelectAnomalyDate?: (date: string, contractA: string, contractB: string) => void;
  activeAnomalyDate?: string;
}

const SECONDARY_COLORS: Record<string, string> = {
  GOLD: "#94A3B8",
  GOLDM: "#C084FC",
  GOLDTEN: "#38BDF8",
  GOLDGUINEA: "#FB923C",
  GOLDPETAL: "#F472B6",
};

export function RelativePriceLandscape({
  records,
  contractA = "GOLDM",
  contractB = "GOLDTEN",
  lookbackWindow = 30,
  anomalyPoints = [],
  onSelectAnomalyDate,
  activeAnomalyDate,
}: RelativePriceLandscapeProps) {
  const pairKey = `${contractA}_${contractB}`;
  const [extraVisibleByPair, setExtraVisibleByPair] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const extraVisible = useMemo(
    () => extraVisibleByPair[pairKey] || {},
    [extraVisibleByPair, pairKey]
  );
  const [rangeMode, setRangeMode] = useState<"ALL" | "LOOKBACK" | "90D">("ALL");

  const symbols = useMemo(() => {
    const unique = Array.from(new Set(records.map((r) => r.symbol)));
    // Put contractA and contractB first
    return [
      contractA,
      contractB,
      ...unique.filter((s) => s !== contractA && s !== contractB),
    ].filter((s) => unique.includes(s));
  }, [records, contractA, contractB]);

  const fullChartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | string>>();
    records.forEach((r) => {
      let entry = dateMap.get(r.date);
      if (!entry) {
        entry = { date: r.date };
        dateMap.set(r.date, entry);
      }
      entry[r.symbol] = Number(r.normalizedPriceG999.toFixed(2));
      entry[`${r.symbol}_raw`] = r.close;
      entry[`${r.symbol}_flag`] = r.qualityFlag;
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [records]);

  const chartData = useMemo(() => {
    if (rangeMode === "LOOKBACK") {
      return fullChartData.slice(-Math.max(15, lookbackWindow));
    }
    if (rangeMode === "90D") {
      return fullChartData.slice(-90);
    }
    return fullChartData;
  }, [fullChartData, rangeMode, lookbackWindow]);

  const isSymbolActive = (sym: string) =>
    sym === contractA || sym === contractB || Boolean(extraVisible[sym]);

  const getSeriesColor = (sym: string) => {
    if (sym === contractA) return "#E6BD58"; // Champagne Gold
    if (sym === contractB) return "#76A9FA"; // Muted Analytical Blue
    return SECONDARY_COLORS[sym] || "#A1A1AA";
  };

  const [minPrice, maxPrice] = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    chartData.forEach((row) => {
      symbols.forEach((sym) => {
        const active =
          sym === contractA || sym === contractB || Boolean(extraVisible[sym]);
        if (active && typeof row[sym] === "number") {
          const v = row[sym] as number;
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    });
    if (!isFinite(min) || !isFinite(max)) return [8500, 10000];
    const pad = Math.max(15, (max - min) * 0.06);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [chartData, symbols, contractA, contractB, extraVisible]);

  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center rounded-xl bg-[#080A0D] border border-white/[0.06] text-xs text-[#A1A1AA]">
        No normalized contract observations available for the selected range.
      </div>
    );
  }

  const visibleAnomalies = anomalyPoints.filter((ap) =>
    chartData.some((row) => row.date === ap.date)
  );

  return (
    <div className="space-y-4">
      {/* Legend & Range Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Series A (Champagne Gold) */}
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#171B22] px-3 py-1.5 font-semibold text-[#F4F4F5] border border-[#E6BD58]/35">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E6BD58]" />
            <span>{contractA}</span>
            <span className="text-[10px] text-[#A1A1AA] font-normal">Primary Leg</span>
          </span>

          {/* Primary Series B (Muted Blue) */}
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#171B22] px-3 py-1.5 font-semibold text-[#F4F4F5] border border-[#76A9FA]/35">
            <span className="h-2.5 w-2.5 rounded-full bg-[#76A9FA]" />
            <span>{contractB}</span>
            <span className="text-[10px] text-[#A1A1AA] font-normal">Benchmark Leg</span>
          </span>

          {/* Optional extra contract overlays */}
          {symbols
            .filter((s) => s !== contractA && s !== contractB)
            .map((sym) => {
              const active = Boolean(extraVisible[sym]);
              const col = getSeriesColor(sym);
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() =>
                    setExtraVisibleByPair((prev) => ({
                      ...prev,
                      [pairKey]: { ...(prev[pairKey] || {}), [sym]: !prev[pairKey]?.[sym] },
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors border ${
                    active
                      ? "bg-[#171B22] text-[#F4F4F5] border-white/20 font-medium"
                      : "bg-transparent text-[#A1A1AA] border-white/[0.06] hover:text-[#F4F4F5]"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: col, opacity: active ? 1 : 0.45 }}
                  />
                  <span>+{sym}</span>
                </button>
              );
            })}
        </div>

        {/* Zoom Range Switcher */}
        <div
          role="group"
          aria-label="Chart horizon"
          className="inline-flex items-center gap-1 rounded-lg bg-[#080A0D] p-1 border border-white/[0.07]"
        >
          {(
            [
              { id: "ALL", label: "Full History" },
              { id: "90D", label: "Last 90d" },
              { id: "LOOKBACK", label: `Lookback (${lookbackWindow}d)` },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangeMode(r.id)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                rangeMode === r.id
                  ? "bg-[#171B22] text-[#E6BD58]"
                  : "text-[#A1A1AA] hover:text-[#F4F4F5]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Surface */}
      <div
        role="img"
        aria-label={`Normalized relative price landscape comparing ${contractA} and ${contractB} in rupees per gram of 999-fineness gold`}
        className="h-[340px] w-full rounded-xl bg-[#080A0D] p-3 sm:p-4 border border-white/[0.06]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 16, left: 4, bottom: 6 }}
            onClick={(e: unknown) => {
              const evt = e as { activeLabel?: string };
              if (evt?.activeLabel && onSelectAnomalyDate) {
                onSelectAnomalyDate(evt.activeLabel, contractA, contractB);
              }
            }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis
              dataKey="date"
              stroke="#A1A1AA"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              minTickGap={28}
              tickFormatter={(v: string) => {
                const parts = v.split("-");
                return parts.length === 3 ? `${parts[1]}/${parts[2]}` : v;
              }}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              stroke="#A1A1AA"
              fontSize={11}
              width={66}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const row = payload[0].payload as Record<string, number | string>;
                  const valA = typeof row[contractA] === "number" ? (row[contractA] as number) : null;
                  const valB = typeof row[contractB] === "number" ? (row[contractB] as number) : null;
                  const diff = valA !== null && valB !== null ? valA - valB : null;

                  return (
                    <div className="rounded-xl bg-[#171B22] p-3.5 border border-white/12 text-xs shadow-xl min-w-[235px]">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                        <span className="text-[#A1A1AA] font-medium">Trading Date</span>
                        <span className="font-mono font-semibold text-[#F4F4F5]">{label}</span>
                      </div>

                      <div className="mt-2.5 space-y-2">
                        {payload.map((p) => {
                          const sym = String(p.name);
                          const normVal = Number(p.value);
                          const rawVal = row[`${sym}_raw`];
                          const qFlag = row[`${sym}_flag`];
                          return (
                            <div key={sym} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: p.color }}
                                />
                                <span className="font-semibold text-[#F4F4F5]">{sym}</span>
                                {qFlag === "corrupted" && (
                                  <span className="text-[10px] font-bold text-[#F87171]">
                                    [CORRUPT]
                                  </span>
                                )}
                              </div>
                              <div className="text-right num-font">
                                <span className="font-semibold text-[#F4F4F5]">
                                  ₹{normVal.toFixed(2)}/g
                                </span>
                                {rawVal !== undefined && (
                                  <span className="block text-[10px] text-[#A1A1AA]">
                                    Quoted: ₹{Number(rawVal).toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {diff !== null && (
                        <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] num-font">
                          <span className="text-[#A1A1AA]">
                            Spread ({contractA} − {contractB})
                          </span>
                          <span className="font-bold text-[#E6BD58]">
                            {diff >= 0 ? "+" : ""}₹{diff.toFixed(2)}/g
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            {symbols.map((sym) => {
              if (!isSymbolActive(sym)) return null;
              const color = getSeriesColor(sym);
              const isPrimary = sym === contractA || sym === contractB;
              return (
                <Line
                  key={sym}
                  type="monotone"
                  dataKey={sym}
                  name={sym}
                  stroke={color}
                  strokeWidth={isPrimary ? 2.2 : 1.4}
                  strokeDasharray={isPrimary ? undefined : "4 3"}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{
                    r: 4.5,
                    stroke: color,
                    strokeWidth: 2,
                    fill: "#080A0D",
                  }}
                />
              );
            })}

            {visibleAnomalies.slice(0, 8).map((ap) => {
              const row = chartData.find((d) => d.date === ap.date);
              const yVal = row && typeof row[contractA] === "number" ? (row[contractA] as number) : null;
              if (yVal === null) return null;
              const pinColor =
                ap.verdict === "CREDIBLE ANOMALY"
                  ? "#4ADE80"
                  : ap.verdict === "NEEDS INVESTIGATION"
                  ? "#FBBF24"
                  : "#F87171";
              return (
                <ReferenceDot
                  key={ap.date}
                  x={ap.date}
                  y={yVal}
                  r={activeAnomalyDate === ap.date ? 6 : 4.5}
                  fill={pinColor}
                  stroke="#080A0D"
                  strokeWidth={1.5}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Subtle Axis Caption */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#A1A1AA]">
        <span>
          Y-axis: Standardized ₹/gram (999-fineness gold equivalent) • Click any session to inspect its autopsy
        </span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#4ADE80]" />
            <span>Credible</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FBBF24]" />
            <span>Needs Investigation</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#F87171]" />
            <span>Rejected / Integrity Flag</span>
          </span>
        </div>
      </div>
    </div>
  );
}
