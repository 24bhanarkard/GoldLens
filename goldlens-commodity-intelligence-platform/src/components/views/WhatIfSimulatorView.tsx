"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { Sliders, Sparkles, ArrowRight, TrendingUp, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { runBacktest, BacktestParameters, DEFAULT_BACKTEST_PARAMS } from "@/lib/analytics/backtester";
import { AlignedSpreadPoint } from "@/lib/analytics/spreads";

interface WhatIfSimulatorViewProps {
  alignedSpreads: AlignedSpreadPoint[];
  contractA: string;
  contractB: string;
}

export function WhatIfSimulatorView({
  alignedSpreads,
  contractA,
  contractB,
}: WhatIfSimulatorViewProps) {
  // Baseline (Default)
  const baseResult = runBacktest(alignedSpreads, { contractA, contractB });

  // Simulated State
  const [simParams, setSimParams] = useState<BacktestParameters>({
    ...DEFAULT_BACKTEST_PARAMS,
    contractA,
    contractB,
    entryZScore: 2.2,
    exitZScore: 0.2,
    maxHoldingDays: 8,
    minDTEToEnter: 6,
    costs: {
      brokeragePerOrderINR: 20,
      slippagePerGramINR: 1.5,
    },
  });

  const simResult = runBacktest(alignedSpreads, simParams);

  const baseMetrics = baseResult.metrics;
  const simMetrics = simResult.metrics;

  const deltaNet = simMetrics.totalNetPnLINR - baseMetrics.totalNetPnLINR;
  const deltaWinRate = (simMetrics.winRatePct ?? 0) - (baseMetrics.winRatePct ?? 0);
  const deltaTrades = simMetrics.eligibleTradesExecuted - baseMetrics.eligibleTradesExecuted;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              FEATURE 8 • SENSITIVITY & OVERFITTING LAB
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <Sliders className="h-5 w-5 text-amber-400" />
            <span>What-If Simulator: Real-Time Sensitivity Analysis</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Explore how parameter adjustments impact net expectancy, friction drag, and overfitting vulnerability.
          </p>
        </div>

        <button
          onClick={() =>
            setSimParams({
              ...DEFAULT_BACKTEST_PARAMS,
              contractA,
              contractB,
            })
          }
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset to Base</span>
        </button>
      </div>

      {/* Parameter Sliders Panel */}
      <GlassCard variant="standard" padding="md" className="space-y-4">
        <span className="font-bold text-xs text-slate-200 block">Interactive Parameter Tuning Sandbox</span>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
          {/* Slider 1: Entry Z */}
          <div className="space-y-2 rounded-xl glass-subtle p-3 border border-white/5">
            <div className="flex justify-between">
              <span className="text-slate-400">Entry Z-Score:</span>
              <span className="font-mono font-bold text-amber-400">{simParams.entryZScore}σ</span>
            </div>
            <input
              type="range"
              min="1.2"
              max="3.5"
              step="0.1"
              value={simParams.entryZScore}
              onChange={(e) => setSimParams({ ...simParams, entryZScore: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Base: {baseParams.entryZScore}σ</span>
          </div>

          {/* Slider 2: Exit Z */}
          <div className="space-y-2 rounded-xl glass-subtle p-3 border border-white/5">
            <div className="flex justify-between">
              <span className="text-slate-400">Exit Target:</span>
              <span className="font-mono font-bold text-sky-400">{simParams.exitZScore}σ</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.2"
              step="0.1"
              value={simParams.exitZScore}
              onChange={(e) => setSimParams({ ...simParams, exitZScore: parseFloat(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Base: {baseParams.exitZScore}σ</span>
          </div>

          {/* Slider 3: Max Holding Days */}
          <div className="space-y-2 rounded-xl glass-subtle p-3 border border-white/5">
            <div className="flex justify-between">
              <span className="text-slate-400">Max Hold Period:</span>
              <span className="font-mono font-bold text-slate-200">{simParams.maxHoldingDays}d</span>
            </div>
            <input
              type="range"
              min="3"
              max="25"
              step="1"
              value={simParams.maxHoldingDays}
              onChange={(e) => setSimParams({ ...simParams, maxHoldingDays: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Base: {baseParams.maxHoldingDays}d</span>
          </div>

          {/* Slider 4: Slippage */}
          <div className="space-y-2 rounded-xl glass-subtle p-3 border border-white/5">
            <div className="flex justify-between">
              <span className="text-slate-400">Slippage (₹/g):</span>
              <span className="font-mono font-bold text-rose-400">₹{simParams.costs.slippagePerGramINR}/g</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="5.0"
              step="0.25"
              value={simParams.costs.slippagePerGramINR ?? 1.25}
              onChange={(e) =>
                setSimParams({
                  ...simParams,
                  costs: { ...simParams.costs, slippagePerGramINR: parseFloat(e.target.value) },
                })
              }
              className="w-full accent-rose-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Base: ₹1.25/g</span>
          </div>

          {/* Slider 5: Min DTE */}
          <div className="space-y-2 rounded-xl glass-subtle p-3 border border-white/5">
            <div className="flex justify-between">
              <span className="text-slate-400">Min Expiry (DTE):</span>
              <span className="font-mono font-bold text-purple-400">{simParams.minDTEToEnter}d</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={simParams.minDTEToEnter}
              onChange={(e) => setSimParams({ ...simParams, minDTEToEnter: parseInt(e.target.value) })}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Base: {baseParams.minDTEToEnter}d</span>
          </div>
        </div>
      </GlassCard>

      {/* Side-by-Side Comparison Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Baseline Model */}
        <GlassCard variant="standard" padding="md" className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="font-bold text-xs text-slate-400">BASE CONFIGURATION</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              Z={baseParams.entryZScore}σ | Hold {baseParams.maxHoldingDays}d
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Net Strategy PnL:</span>
              <span className={`font-mono font-bold ${baseMetrics.totalNetPnLINR >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                ₹{baseMetrics.totalNetPnLINR.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Win Rate:</span>
              <span className="font-mono font-bold text-amber-300">{baseMetrics.winRatePct}%</span>
            </div>

            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Executed Trades:</span>
              <span className="font-mono font-bold text-slate-100">{baseMetrics.eligibleTradesExecuted} trades</span>
            </div>

            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Total Execution Friction:</span>
              <span className="font-mono font-bold text-rose-400">₹{baseMetrics.totalFrictionINR.toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-400">Max Drawdown:</span>
              <span className="font-mono font-bold text-slate-300">{baseMetrics.maxDrawdownPct}%</span>
            </div>
          </div>
        </GlassCard>

        {/* What-If Simulated Model */}
        <GlassCard variant="standard" padding="md" className="space-y-3 border-amber-500/30 glass-gold-glow">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>WHAT-IF SIMULATION</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
              Z={simParams.entryZScore}σ | Hold {simParams.maxHoldingDays}d
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-300">Simulated Net PnL:</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${simMetrics.totalNetPnLINR >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  ₹{simMetrics.totalNetPnLINR.toLocaleString("en-IN")}
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  deltaNet >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                }`}>
                  {deltaNet >= 0 ? "+" : ""}₹{deltaNet.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-300">Simulated Win Rate:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-300">{simMetrics.winRatePct}%</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  deltaWinRate >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                }`}>
                  {deltaWinRate >= 0 ? "+" : ""}{deltaWinRate.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-300">Executed Trades:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-100">{simMetrics.eligibleTradesExecuted}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({deltaTrades >= 0 ? `+${deltaTrades}` : deltaTrades} vs base)
                </span>
              </div>
            </div>

            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-300">Total Execution Friction:</span>
              <span className="font-mono font-bold text-rose-400">₹{simMetrics.totalFrictionINR.toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-300">Max Drawdown:</span>
              <span className="font-mono font-bold text-slate-200">{simMetrics.maxDrawdownPct}%</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Overfitting Caution Box */}
      <GlassCard variant="subtle" padding="sm" className="border border-amber-500/20 flex items-start gap-3 text-xs">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold text-amber-300">Quantitative Safeguard: Overfitting Vulnerability Warning</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Repeated parameter tweaking on the same historical sample will create hindsight curve-fitting illusions. Always confirm walk-forward out-of-sample stability before considering a strategy robust.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

const baseParams = DEFAULT_BACKTEST_PARAMS;
