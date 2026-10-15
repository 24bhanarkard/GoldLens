"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { EquityCurveChart } from "../charts/EquityCurveChart";
import {
  FlaskConical,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Sliders,
  DollarSign,
  Download,
  AlertTriangle,
} from "lucide-react";
import { BacktestResult, DEFAULT_BACKTEST_PARAMS, BacktestParameters } from "@/lib/analytics/backtester";
import { AlignedSpreadPoint } from "@/lib/analytics/spreads";

interface StrategyLabViewProps {
  alignedSpreads: AlignedSpreadPoint[];
  contractA: string;
  contractB: string;
  initialBacktest?: BacktestResult;
  onRunBacktest: (params: Partial<BacktestParameters>) => Promise<BacktestResult>;
}

export function StrategyLabView({
  alignedSpreads,
  contractA,
  contractB,
  initialBacktest,
  onRunBacktest,
}: StrategyLabViewProps) {
  const [params, setParams] = useState<BacktestParameters>(
    initialBacktest?.params || { ...DEFAULT_BACKTEST_PARAMS, contractA, contractB }
  );
  const [result, setResult] = useState<BacktestResult | null>(initialBacktest || null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"trades" | "rejected" | "walkforward">("trades");

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await onRunBacktest(params);
      setResult(res);
    } catch (err) {
      console.error("Backtest failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const metrics = result?.metrics;

  const downloadTradesCSV = () => {
    if (!result || result.trades.length === 0) return;
    const headers = "TradeID,EntryDate,ExitDate,Direction,HoldingDays,EntrySpreadAbs,ExitSpreadAbs,GrossPnLINR,FrictionINR,NetPnLINR,ReturnPct,ExitReason,IsWin\n";
    const rows = result.trades
      .map(
        (t) =>
          `${t.id},${t.entryDate},${t.exitDate},${t.direction},${t.holdingDays},${t.entrySpreadAbs},${t.exitSpreadAbs},${t.totalGrossPnLINR},${t.totalFrictionINR},${t.totalNetPnLINR},${t.returnPct},${t.exitReason},${t.isWin}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GoldLens_Backtest_Trades_${contractA}_${contractB}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              FEATURE 6 • TIME-TRAVEL BACKTESTER
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <FlaskConical className="h-5 w-5 text-amber-400" />
            <span>Strategy Lab: {contractA} vs {contractB}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Walk-forward simulation strictly preventing lookahead bias. Decisions at date T execute on T+1 after full MCX statutory friction.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer disabled:opacity-50"
        >
          <Play className={`h-4 w-4 fill-slate-950 ${isRunning ? "animate-pulse" : ""}`} />
          <span>{isRunning ? "Simulating Market..." : "Execute Backtest"}</span>
        </button>
      </div>

      {/* Strategy Parameter Controls */}
      <GlassCard variant="standard" padding="md" className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <span className="font-bold text-xs text-slate-200">Execution Parameters & Safeguards</span>
          <button
            onClick={() => setParams({ ...DEFAULT_BACKTEST_PARAMS, contractA, contractB })}
            className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Restore Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          {/* Entry Z */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Entry Threshold (|Z|)</label>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="4.0"
              value={params.entryZScore}
              onChange={(e) => setParams({ ...params, entryZScore: parseFloat(e.target.value) || 2.0 })}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Exit Z */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Exit Target (|Z|)</label>
            <input
              type="number"
              step="0.1"
              min="0.0"
              max="1.5"
              value={params.exitZScore}
              onChange={(e) => setParams({ ...params, exitZScore: parseFloat(e.target.value) || 0.3 })}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Stop Loss Z */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Stop Loss (|Z|)</label>
            <input
              type="number"
              step="0.1"
              min="2.5"
              max="5.0"
              value={params.stopLossZScore}
              onChange={(e) => setParams({ ...params, stopLossZScore: parseFloat(e.target.value) || 3.5 })}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Max Holding Days */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Max Holding Days</label>
            <input
              type="number"
              step="1"
              min="2"
              max="30"
              value={params.maxHoldingDays}
              onChange={(e) => setParams({ ...params, maxHoldingDays: parseInt(e.target.value) || 10 })}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Min DTE */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Min Days to Expiry</label>
            <input
              type="number"
              step="1"
              min="1"
              max="15"
              value={params.minDTEToEnter}
              onChange={(e) => setParams({ ...params, minDTEToEnter: parseInt(e.target.value) || 5 })}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Slippage Per Gram */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Slippage (₹/g)</label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="10"
              value={params.costs?.slippagePerGramINR ?? 1.25}
              onChange={(e) =>
                setParams({
                  ...params,
                  costs: { ...params.costs, slippagePerGramINR: parseFloat(e.target.value) || 1.25 },
                })
              }
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-white/5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={params.enableDiagnosticFilter}
              onChange={(e) => setParams({ ...params, enableDiagnosticFilter: e.target.checked })}
              className="rounded bg-slate-900 border-white/20 text-amber-500 focus:ring-0"
            />
            <span>Enable False Signal Detective Pre-Trade Filter (Disqualifies expiry & friction traps)</span>
          </label>
        </div>
      </GlassCard>

      {/* Performance Summary Metrics */}
      {metrics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
            <GlassCard variant="standard" padding="sm" className="space-y-0.5">
              <span className="text-[10px] text-slate-400">Net Strategy PnL</span>
              <div
                className={`font-mono text-base font-bold ${
                  metrics.totalNetPnLINR >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {metrics.totalNetPnLINR >= 0 ? "+" : ""}₹{metrics.totalNetPnLINR.toLocaleString("en-IN")}
              </div>
              <span className="text-[10px] text-slate-500">Gross: ₹{metrics.totalGrossPnLINR.toLocaleString("en-IN")}</span>
            </GlassCard>

            <GlassCard variant="standard" padding="sm" className="space-y-0.5">
              <span className="text-[10px] text-slate-400">Total Friction</span>
              <div className="font-mono text-base font-bold text-rose-400">
                ₹{metrics.totalFrictionINR.toLocaleString("en-IN")}
              </div>
              <span className="text-[10px] text-slate-500">{metrics.costToGrossPnLRatioPct}% of gross</span>
            </GlassCard>

            <GlassCard variant="standard" padding="sm" className="space-y-0.5">
              <span className="text-[10px] text-slate-400">Win Rate</span>
              <div className="font-mono text-base font-bold text-amber-300">
                {metrics.winRatePct}%
              </div>
              <span className="text-[10px] text-slate-500">{metrics.winningTradesCount}W / {metrics.losingTradesCount}L</span>
            </GlassCard>

            <GlassCard variant="standard" padding="sm" className="space-y-0.5">
              <span className="text-[10px] text-slate-400">Executed Trades</span>
              <div className="font-mono text-base font-bold text-slate-100">
                {metrics.eligibleTradesExecuted}
              </div>
              <span className="text-[10px] text-rose-400">{metrics.rejectedSignalsCount} rejected</span>
            </GlassCard>

            <GlassCard variant="standard" padding="sm" className="space-y-0.5">
              <span className="text-[10px] text-slate-400">Profit Factor</span>
              <div className="font-mono text-base font-bold text-sky-400">
                {metrics.profitFactor ? `${metrics.profitFactor}x` : "N/A"}
              </div>
              <span className="text-[10px] text-slate-500">Gross wins/losses</span>
            </GlassCard>

            <GlassCard variant="standard" padding="sm" className="space-y-0.5">
              <span className="text-[10px] text-slate-400">Max Drawdown</span>
              <div className="font-mono text-base font-bold text-rose-400">
                {metrics.maxDrawdownPct}%
              </div>
              <span className="text-[10px] text-slate-500">-₹{metrics.maxDrawdownINR.toLocaleString("en-IN")}</span>
            </GlassCard>

            <GlassCard variant="standard" padding="sm" className="space-y-0.5">
              <span className="text-[10px] text-slate-400">Sharpe Ratio</span>
              <div className="font-mono text-base font-bold text-slate-200">
                {metrics.sharpeRatioApprox ? `${metrics.sharpeRatioApprox}` : "N/A"}
              </div>
              <span className="text-[10px] text-slate-500">Annualized approx</span>
            </GlassCard>

            <GlassCard variant="standard" padding="sm" className="space-y-0.5">
              <span className="text-[10px] text-slate-400">Avg Hold Duration</span>
              <div className="font-mono text-base font-bold text-slate-100">
                {metrics.averageHoldingDays.toFixed(1)}d
              </div>
              <span className="text-[10px] text-slate-500">Max {params.maxHoldingDays}d</span>
            </GlassCard>
          </div>

          {/* Verdict Banner */}
          <GlassCard
            variant="elevated"
            padding="sm"
            className={`border ${
              metrics.conclusion === "VIABLE_EDGE_FOUND"
                ? "border-emerald-500/30 glass-emerald-glow"
                : "border-rose-500/30 glass-rose-glow"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-amber-400 uppercase tracking-wider">Strategy Execution Verdict</span>
              <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] ${
                metrics.conclusion === "VIABLE_EDGE_FOUND"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
              }`}>
                {metrics.conclusionTitle}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">{metrics.conclusionDescription}</p>
          </GlassCard>

          {/* Equity & Drawdown Chart */}
          <GlassCard variant="standard" padding="md">
            <EquityCurveChart equityCurve={result.equityCurve} initialCapital={params.initialCapitalINR} />
          </GlassCard>
        </div>
      )}

      {/* Tabs: Executed Trades vs Rejected Signals vs Walk-Forward Analysis */}
      {result && (
        <GlassCard variant="standard" padding="md" className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab("trades")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === "trades"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Executed Trade Ledger ({result.trades.length})
              </button>

              <button
                onClick={() => setActiveTab("rejected")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === "rejected"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Filtered / Blocked Candidates ({result.rejectedSignals.length})
              </button>

              <button
                onClick={() => setActiveTab("walkforward")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === "walkforward"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Walk-Forward Analysis (IS vs OOS)
              </button>
            </div>

            {activeTab === "trades" && (
              <button
                onClick={downloadTradesCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            )}
          </div>

          {/* Tab 1: Trade Ledger */}
          {activeTab === "trades" && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-bold">
                    <th className="py-2 pr-3">Trade ID</th>
                    <th className="py-2 pr-3">Entry Date</th>
                    <th className="py-2 pr-3">Exit Date</th>
                    <th className="py-2 pr-3">Direction</th>
                    <th className="py-2 pr-3">Duration</th>
                    <th className="py-2 pr-3">Gross PnL (₹/g)</th>
                    <th className="py-2 pr-3">Friction (₹/g)</th>
                    <th className="py-2 pr-3">Net PnL (₹)</th>
                    <th className="py-2 pr-3">Exit Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {result.trades.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="py-2 font-bold text-slate-300">{t.id}</td>
                      <td className="py-2 text-slate-400">{t.entryDate}</td>
                      <td className="py-2 text-slate-400">{t.exitDate}</td>
                      <td className="py-2 text-amber-300 font-semibold">{t.direction}</td>
                      <td className="py-2 text-slate-300">{t.holdingDays}d</td>
                      <td className="py-2 text-slate-200">₹{t.grossPnLPerGram.toFixed(2)}/g</td>
                      <td className="py-2 text-rose-400">₹{t.frictionPerGram.toFixed(2)}/g</td>
                      <td className={`py-2 font-bold ${t.isWin ? "text-emerald-400" : "text-rose-400"}`}>
                        {t.totalNetPnLINR >= 0 ? "+" : ""}₹{t.totalNetPnLINR.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                          {t.exitReason}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Rejected Candidates */}
          {activeTab === "rejected" && (
            <div className="space-y-2">
              <span className="text-xs text-slate-400 block">
                Audited list of signals blocked by safeguards (prevented bad-tick and expiry losses):
              </span>
              <div className="divide-y divide-white/5">
                {result.rejectedSignals.map((rej, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <span>{rej.date}</span>
                        <span className="font-mono text-amber-400 font-bold">Z: {rej.zScore.toFixed(2)}σ</span>
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">
                          {rej.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{rej.rejectionReason}</div>
                    </div>
                    <span className="text-[10px] text-rose-400 font-bold border border-rose-500/20 px-2 py-0.5 rounded-lg bg-rose-500/10">
                      FILTERED OUT
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Walk-Forward Analysis */}
          {activeTab === "walkforward" && metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl glass-subtle p-3 space-y-2 border border-white/5">
                <span className="font-bold text-sky-400 block text-xs">In-Sample Development (65% Window)</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>In-Sample Net PnL:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      ₹{metrics.inSampleNetPnLINR.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>In-Sample Win Rate:</span>
                    <span className="font-mono font-bold text-amber-300">{metrics.inSampleWinRatePct}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl glass-subtle p-3 space-y-2 border border-white/5">
                <span className="font-bold text-amber-400 block text-xs">Out-of-Sample Verification (35% Window)</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Out-of-Sample Net PnL:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      ₹{metrics.outOfSampleNetPnLINR.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Out-of-Sample Win Rate:</span>
                    <span className="font-mono font-bold text-amber-300">{metrics.outOfSampleWinRatePct}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
