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
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  Eye,
} from "lucide-react";
import { AlignedSpreadPoint } from "@/lib/analytics/spreads";
import { calculateProfitReality } from "@/lib/analytics/profitRealityCheck";
import { runFalseSignalDetective } from "@/lib/analytics/falseSignalDetective";

interface MarketReplayViewProps {
  alignedSpreads: AlignedSpreadPoint[];
  contractA: string;
  contractB: string;
  onNavigate: (view: string) => void;
}

export function MarketReplayView({
  alignedSpreads,
  contractA,
  contractB,
}: MarketReplayViewProps) {
  const [rawIndex, setCurrentIndex] = useState(
    Math.min(Math.max(0, alignedSpreads.length - 1), 35)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showPostDecisionOutcome, setShowPostDecisionOutcome] = useState(false);

  const totalDays = alignedSpreads.length;
  const currentIndex = Math.min(Math.max(0, totalDays - 1), rawIndex);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying && totalDays > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= totalDays - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 900 / playbackSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, totalDays]);

  if (totalDays === 0) {
    return (
      <GlassCard variant="standard" padding="md" className="text-center py-10 text-xs text-[#A1A1AA]">
        No aligned trading sessions available for replay.
      </GlassCard>
    );
  }

  const currentPoint = alignedSpreads[currentIndex] || alignedSpreads[0];
  const replaySlice = alignedSpreads.slice(0, currentIndex + 1);

  const profitCheck = calculateProfitReality(
    currentPoint.priceA_Norm,
    currentPoint.priceB_Norm,
    Math.abs(currentPoint.spreadAbsolute),
    undefined,
    { contractA, contractB }
  );
  const diag = runFalseSignalDetective(currentPoint, replaySlice, profitCheck, 90);

  // Subsequent 5d outcome (strictly separated and hidden unless explicitly inspected)
  const outcome5dPoint =
    currentIndex + 5 < totalDays ? alignedSpreads[currentIndex + 5] : null;

  const handleJumpNextAnomaly = () => {
    for (let i = currentIndex + 1; i < totalDays; i++) {
      if (alignedSpreads[i].isAnomaly) {
        setCurrentIndex(i);
        return;
      }
    }
    for (let i = 0; i <= currentIndex; i++) {
      if (alignedSpreads[i].isAnomaly) {
        setCurrentIndex(i);
        return;
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <GlassCard variant="standard" padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="Previous trading day"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg bg-[#080A0D] text-[#F4F4F5] border border-white/[0.1] disabled:opacity-40"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="btn-gold-primary px-4 py-2 rounded-lg text-xs inline-flex items-center gap-2 cursor-pointer"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            <button
              type="button"
              aria-label="Next trading day"
              onClick={() => setCurrentIndex(Math.min(totalDays - 1, currentIndex + 1))}
              disabled={currentIndex === totalDays - 1}
              className="p-2 rounded-lg bg-[#080A0D] text-[#F4F4F5] border border-white/[0.1] disabled:opacity-40"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleJumpNextAnomaly}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/30 text-xs font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Jump to Anomaly</span>
            </button>

            <button
              type="button"
              aria-label="Restart replay"
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(0);
              }}
              className="p-2 rounded-lg bg-[#080A0D] text-[#A1A1AA] hover:text-[#F4F4F5] border border-white/[0.1]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="inline-flex items-center gap-1 bg-[#080A0D] p-1 rounded-lg border border-white/[0.08]">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-0.5 rounded font-mono ${
                    playbackSpeed === s ? "bg-[#171B22] text-[#E6BD58] font-bold" : "text-[#A1A1AA]"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowPostDecisionOutcome(!showPostDecisionOutcome)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#171B22] px-3 py-1.5 text-xs text-[#76A9FA] border border-white/[0.08]"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{showPostDecisionOutcome ? "Hide T+5 Outcome" : "Peek Post-Decision T+5"}</span>
            </button>
          </div>
        </div>

        <div className="space-y-1 num-font">
          <input
            type="range"
            min="0"
            max={totalDays - 1}
            aria-label="Market replay timeline scrubber"
            value={currentIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentIndex(parseInt(e.target.value));
            }}
            className="w-full accent-[#E6BD58] cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-[#A1A1AA] font-mono">
            <span>{alignedSpreads[0]?.date}</span>
            <span className="text-[#E6BD58] font-semibold">
              Decision Date: {currentPoint.date} (Session {currentIndex + 1} / {totalDays})
            </span>
            <span>{alignedSpreads[totalDays - 1]?.date}</span>
          </div>
        </div>
      </GlassCard>

      {/* Decision-Time Information vs Optional Post-Decision Outcome */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs num-font">
        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <span className="text-[11px] text-[#A1A1AA]">Known Prices at {currentPoint.date}</span>
          <div className="text-base font-bold text-[#F4F4F5]">
            {contractA}: ₹{currentPoint.priceA_Norm.toFixed(2)}/g
          </div>
          <span className="text-[11px] text-[#76A9FA]">
            {contractB}: ₹{currentPoint.priceB_Norm.toFixed(2)}/g
          </span>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <span className="text-[11px] text-[#A1A1AA]">Spread & Prior Z-Score</span>
          <div className="text-base font-bold text-[#E6BD58]">
            {currentPoint.spreadAbsolute >= 0 ? "+" : ""}₹{currentPoint.spreadAbsolute.toFixed(2)}/g
          </div>
          <span className="text-[11px] text-[#A1A1AA]">
            Z: {currentPoint.zScore !== null ? `${currentPoint.zScore.toFixed(2)}σ` : "Warm-up (<15d)"}
          </span>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <span className="text-[11px] text-[#A1A1AA]">Decision-Time Verdict</span>
          <div
            className={`text-sm font-bold ${
              diag.standardizedVerdict === "CREDIBLE ANOMALY"
                ? "text-[#4ADE80]"
                : diag.standardizedVerdict === "NEEDS INVESTIGATION"
                ? "text-[#FBBF24]"
                : "text-[#F87171]"
            }`}
          >
            {diag.standardizedVerdict}
          </div>
          <span className="text-[11px] text-[#A1A1AA]">
            Net Est: {profitCheck.netEdgePerGram >= 0 ? "+" : ""}₹{profitCheck.netEdgePerGram.toFixed(2)}/g
          </span>
        </GlassCard>

        <GlassCard
          variant="standard"
          padding="sm"
          className="space-y-1 border-dashed border-[#76A9FA]/30"
        >
          <span className="text-[11px] text-[#76A9FA]">
            Later Outcome (Unobservable at {currentPoint.date})
          </span>
          {showPostDecisionOutcome ? (
            outcome5dPoint ? (
              <>
                <div className="text-base font-bold text-[#F4F4F5]">
                  T+5 ({outcome5dPoint.date}): ₹{outcome5dPoint.spreadAbsolute.toFixed(2)}/g
                </div>
                <span className="text-[11px] text-[#A1A1AA]">
                  Δ Spread: {(outcome5dPoint.spreadAbsolute - currentPoint.spreadAbsolute).toFixed(2)} ₹/g
                </span>
              </>
            ) : (
              <div className="text-xs text-[#A1A1AA] pt-1">End of dataset reached</div>
            )
          ) : (
            <div className="text-xs text-[#A1A1AA] pt-1">
              Hidden to preserve zero look-ahead replay
            </div>
          )}
        </GlassCard>
      </div>

      {/* Strictly Known History Chart */}
      <GlassCard variant="standard" padding="md" className="space-y-3">
        <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.07]">
          <span className="font-semibold text-[#F4F4F5]">
            Information Set Observable Up To {currentPoint.date}
          </span>
          <span className="text-[11px] font-mono text-[#4ADE80]">Zero Future Leakage</span>
        </div>

        <div className="h-64 w-full rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={replaySlice.slice(-50)}
              margin={{ top: 10, right: 12, left: -8, bottom: 0 }}
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
                      <div className="rounded-xl bg-[#171B22] p-2.5 border border-white/12 text-xs num-font">
                        <div className="font-semibold text-[#F4F4F5]">{label}</div>
                        <div className="text-[#E6BD58] font-semibold mt-0.5">
                          Spread: ₹{pt.spreadAbsolute.toFixed(2)}/g
                        </div>
                        <div className="text-[#A1A1AA] text-[11px]">
                          Z-Score: {pt.zScore !== null ? `${pt.zScore.toFixed(2)}σ` : "N/A"}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="spreadAbsolute"
                stroke="#E6BD58"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="rollingMean"
                stroke="#76A9FA"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}
