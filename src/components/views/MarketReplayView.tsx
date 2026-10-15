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
  History,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Clock,
  ArrowRight,
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
  onNavigate,
}: MarketReplayViewProps) {
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(alignedSpreads.length - 1, 35) // start at day 35
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x

  const totalDays = alignedSpreads.length;
  const currentPoint = alignedSpreads[currentIndex] || alignedSpreads[0];

  // Strictly lookback slice available at date T
  const replaySlice = alignedSpreads.slice(0, currentIndex + 1);

  // Run diagnostics strictly using only information up to currentIndex
  const profitCheck = calculateProfitReality(
    currentPoint.priceA_Norm,
    currentPoint.priceB_Norm,
    Math.abs(currentPoint.spreadAbsolute),
    100
  );
  const diag = runFalseSignalDetective(currentPoint, replaySlice, profitCheck, 100);

  // Auto-play timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= totalDays - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, totalDays]);

  // Jump to next anomaly
  const handleJumpNextAnomaly = () => {
    for (let i = currentIndex + 1; i < totalDays; i++) {
      if (alignedSpreads[i].isAnomaly) {
        setCurrentIndex(i);
        return;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              SIGNATURE EXPERIENCE C • HISTORICAL SIMULATION SCRUBBER
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <History className="h-5 w-5 text-amber-400" />
            <span>Interactive Market Replay: Step-by-Step Decision Scrubber</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulate standing at historical trading date T. Zero future lookahead leakage.
          </p>
        </div>

        {/* Current Replay Date Badge */}
        <div className="flex items-center gap-2">
          <div className="rounded-2xl glass-elevated px-4 py-2 border border-amber-500/30 shadow-lg text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Replay Decision Date</span>
            <span className="font-mono text-base font-bold text-amber-300">{currentPoint.date}</span>
          </div>
        </div>
      </div>

      {/* Scrubbing & Playback Controls */}
      <GlassCard variant="standard" padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Media Player Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="p-2.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-white/10 disabled:opacity-40"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-slate-950" /> : <Play className="h-4 w-4 fill-slate-950" />}
              <span>{isPlaying ? "Pause Replay" : "Play Replay"}</span>
            </button>

            <button
              onClick={() => setCurrentIndex(Math.min(totalDays - 1, currentIndex + 1))}
              disabled={currentIndex === totalDays - 1}
              className="p-2.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-white/10 disabled:opacity-40"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <button
              onClick={handleJumpNextAnomaly}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-amber-300 border border-white/10 text-xs font-semibold hover:bg-slate-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next Anomaly</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(0);
              }}
              className="p-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-white/10"
              title="Reset to Day 1"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Speed:</span>
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all ${
                  playbackSpeed === s
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Slider Scrubber */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={totalDays - 1}
            value={currentIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentIndex(parseInt(e.target.value));
            }}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-900 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Session 1 ({alignedSpreads[0]?.date})</span>
            <span className="text-amber-400 font-bold">
              Session {currentIndex + 1} of {totalDays}
            </span>
            <span>Session {totalDays} ({alignedSpreads[totalDays - 1]?.date})</span>
          </div>
        </div>
      </GlassCard>

      {/* Snapshot Information Available at Day T */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-400">Price at Decision Date</span>
          <div className="font-mono text-base font-bold text-slate-100">
            {contractA}: ₹{currentPoint.priceA_Norm.toFixed(2)}/g
          </div>
          <span className="text-[10px] text-slate-400">{contractB}: ₹{currentPoint.priceB_Norm.toFixed(2)}/g</span>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-400">Relative Spread</span>
          <div className="font-mono text-base font-bold text-amber-300">
            ₹{currentPoint.spreadAbsolute.toFixed(2)} / g
          </div>
          <span className="text-[10px] text-slate-400">{currentPoint.spreadPercentage.toFixed(2)}% difference</span>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-400">Rolling Z-Score (Lookback Only)</span>
          <div className={`font-mono text-base font-bold ${
            currentPoint.zScore && Math.abs(currentPoint.zScore) >= 1.8 ? "text-rose-400" : "text-emerald-400"
          }`}>
            {currentPoint.zScore?.toFixed(2) || "N/A"}σ
          </div>
          <span className="text-[10px] text-slate-400">{currentPoint.historicalPercentile}th %ile</span>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-400">Diagnostic Verdict at T</span>
          <div className={`font-mono text-sm font-bold truncate ${
            diag.overallStatus === "APPROVED" ? "text-emerald-400" : "text-rose-400"
          }`}>
            {diag.finalClassification}
          </div>
          <span className="text-[10px] text-slate-400">Min DTE: {Math.min(currentPoint.dteA, currentPoint.dteB)}d</span>
        </GlassCard>
      </div>

      {/* Historical Time Series Chart up to Date T */}
      <GlassCard variant="standard" padding="md" className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <span className="font-bold text-xs text-slate-200">
            Spread History Available at {currentPoint.date} (Past {replaySlice.length} Sessions)
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">● NO FUTURE LEAKAGE</span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={replaySlice.slice(-45)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                      <div className="rounded-xl glass-elevated p-2.5 border border-amber-500/30 text-xs shadow-2xl">
                        <div className="font-bold text-slate-200">{label}</div>
                        <div className="text-amber-400 font-mono font-bold mt-1">
                          Spread: ₹{pt.spreadAbsolute.toFixed(2)}/g
                        </div>
                        <div className="text-slate-300 font-mono text-[11px]">
                          Z-Score: {pt.zScore?.toFixed(2)}σ
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />

              <Line
                type="monotone"
                dataKey="spreadAbsolute"
                name="Spread (₹/g)"
                stroke="#e5c07b"
                strokeWidth={2.2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="rollingMean"
                name="Rolling Mean"
                stroke="#38bdf8"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}
