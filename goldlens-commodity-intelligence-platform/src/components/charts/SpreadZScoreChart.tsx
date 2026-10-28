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
}: SpreadZScoreChartProps) {
  const [showBands, setShowBands] = useState(true);

  if (spreads.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#A1A1AA]">
        No aligned spread observations available for this contract pair.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart 1: Normalized Spread Series + Prior Rolling Bands */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#F4F4F5]">
            Normalized Spread: {contractA} − {contractB} (₹/g, 999 fineness)
          </span>
          <button
            type="button"
            onClick={() => setShowBands(!showBands)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#171B22] text-[#A1A1AA] hover:text-[#F4F4F5] border border-white/[0.08]"
          >
            {showBands ? "Hide ±2σ Bands" : "Show ±2σ Bands"}
          </button>
        </div>

        <div className="h-56 w-full rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={spreads}
              margin={{ top: 10, right: 12, left: -6, bottom: 0 }}
              onClick={(e: unknown) => {
                const event = e as { activePayload?: { payload: AlignedSpreadPoint }[] };
                if (event?.activePayload?.[0] && onSelectDate) {
                  onSelectDate(event.activePayload[0].payload.date);
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
                fontSize={10}
                tickLine={false}
                minTickGap={26}
                tickFormatter={(v: string) => {
                  const parts = v.split("-");
                  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : v;
                }}
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
                    const pt = payload[0].payload as AlignedSpreadPoint;
                    return (
                      <div className="rounded-xl bg-[#171B22] p-3 border border-white/12 text-xs shadow-xl space-y-1.5">
                        <div className="font-semibold text-[#F4F4F5] pb-1.5 border-b border-white/[0.08] flex items-center justify-between gap-4">
                          <span className="text-[#A1A1AA]">Date</span>
                          <span className="font-mono">{label}</span>
                        </div>
                        <div className="space-y-1 text-[#A1A1AA] num-font">
                          <div className="flex justify-between gap-4">
                            <span>Spread:</span>
                            <span className="font-semibold text-[#E6BD58]">
                              {pt.spreadAbsolute >= 0 ? "+" : ""}₹{pt.spreadAbsolute.toFixed(2)}/g
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Prior Mean (μ):</span>
                            <span className="text-[#76A9FA]">
                              {pt.rollingMean !== null ? `₹${pt.rollingMean.toFixed(2)}/g` : "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Prior Std (σ):</span>
                            <span className="text-[#F4F4F5]">
                              {pt.rollingStd !== null ? `₹${pt.rollingStd.toFixed(2)}/g` : "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Z-Score:</span>
                            <span
                              className={`font-semibold ${
                                pt.qualityStatus === "corrupted"
                                  ? "text-[#F87171]"
                                  : pt.zScore !== null && Math.abs(pt.zScore) >= zScoreThreshold
                                  ? "text-[#E6BD58]"
                                  : "text-[#4ADE80]"
                              }`}
                            >
                              {pt.zScore !== null ? `${pt.zScore.toFixed(2)}σ` : "Unavailable"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />

              {showBands && (
                <>
                  <Line
                    type="monotone"
                    dataKey="rollingUpperBand2"
                    name="+2σ Band"
                    stroke="rgba(230,189,88,0.45)"
                    strokeDasharray="4 4"
                    strokeWidth={1.1}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rollingLowerBand2"
                    name="-2σ Band"
                    stroke="rgba(230,189,88,0.45)"
                    strokeDasharray="4 4"
                    strokeWidth={1.1}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              )}

              <Line
                type="monotone"
                dataKey="rollingMean"
                name="Prior Rolling Mean"
                stroke="#76A9FA"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="spreadAbsolute"
                name="Spread (₹/g)"
                stroke="#E6BD58"
                strokeWidth={2}
                isAnimationActive={false}
                dot={(props: { cx?: number; cy?: number; payload?: AlignedSpreadPoint }) => {
                  const { cx, cy, payload } = props;
                  if (payload?.isAnomaly && cx !== undefined && cy !== undefined) {
                    const fill =
                      payload.qualityStatus === "corrupted" ? "#F87171" : "#E6BD58";
                    return (
                      <circle
                        key={payload.date}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={fill}
                        stroke="#080A0D"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  return (
                    <circle
                      key={payload?.date || `sp_${cx ?? 0}_${cy ?? 0}`}
                      cx={cx || 0}
                      cy={cy || 0}
                      r={0}
                    />
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Strictly Prior Rolling Z-Score */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#F4F4F5]">
            Prior-Window Rolling Z-Score (Zero Look-Ahead)
          </span>
          <span className="text-[11px] text-[#A1A1AA] num-font">
            Threshold: <strong className="text-[#E6BD58]">|Z| ≥ {zScoreThreshold.toFixed(1)}σ</strong>
          </span>
        </div>

        <div className="h-44 w-full rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={spreads}
              margin={{ top: 6, right: 12, left: -6, bottom: 0 }}
              onClick={(e: unknown) => {
                const event = e as { activePayload?: { payload: AlignedSpreadPoint }[] };
                if (event?.activePayload?.[0] && onSelectDate) {
                  onSelectDate(event.activePayload[0].payload.date);
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
                fontSize={10}
                tickLine={false}
                minTickGap={26}
                tickFormatter={(v: string) => {
                  const parts = v.split("-");
                  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : v;
                }}
              />
              <YAxis
                stroke="#A1A1AA"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}σ`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const pt = payload[0].payload as AlignedSpreadPoint;
                    return (
                      <div className="rounded-xl bg-[#171B22] p-2.5 border border-white/12 text-xs shadow-xl num-font">
                        <div className="font-semibold text-[#F4F4F5]">{label}</div>
                        <div className="text-[#E6BD58] font-semibold mt-1">
                          Z-Score: {pt.zScore !== null ? `${pt.zScore.toFixed(2)}σ` : "Unavailable"}
                        </div>
                        <div className="text-[11px] text-[#A1A1AA]">
                          Prior Sample: {pt.sampleSizeUsed} sessions
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
              <ReferenceLine y={zScoreThreshold} stroke="#F87171" strokeDasharray="3 3" />
              <ReferenceLine y={-zScoreThreshold} stroke="#F87171" strokeDasharray="3 3" />

              <Line
                type="monotone"
                dataKey="zScore"
                stroke="#76A9FA"
                strokeWidth={1.8}
                isAnimationActive={false}
                dot={(props: { cx?: number; cy?: number; payload?: AlignedSpreadPoint }) => {
                  const { cx, cy, payload } = props;
                  if (payload?.isAnomaly && cx !== undefined && cy !== undefined) {
                    return (
                      <circle
                        key={payload.date}
                        cx={cx}
                        cy={cy}
                        r={3.8}
                        fill={payload.qualityStatus === "corrupted" ? "#F87171" : "#E6BD58"}
                        stroke="#080A0D"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  return (
                    <circle
                      key={payload?.date || `zs_${cx ?? 0}_${cy ?? 0}`}
                      cx={cx || 0}
                      cy={cy || 0}
                      r={0}
                    />
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
