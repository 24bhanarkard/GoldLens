"use client";

import React, { useState, useEffect, useMemo } from "react";
import { GlassCard } from "../ui/GlassCard";
import { EquityCurveChart } from "../charts/EquityCurveChart";
import {
  FlaskConical,
  Play,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import {
  BacktestResult,
  DEFAULT_BACKTEST_PARAMS,
  BacktestParameters,
  runBacktest,
} from "@/lib/analytics/backtester";
import {
  runOpportunityStressTest,
  StressScenarioInputs,
} from "@/lib/analytics/profitRealityCheck";
import { AlignedSpreadPoint } from "@/lib/analytics/spreads";

interface StrategyLabConsolidatedViewProps {
  alignedSpreads: AlignedSpreadPoint[];
  scannedSignals: any[];
  selectedSignal: any;
  contractA: string;
  contractB: string;
  initialSubTab?: "backtest" | "stress" | "robustness";
  onRunBacktestAPI: (params: Partial<BacktestParameters>) => Promise<BacktestResult>;
}

export function StrategyLabConsolidatedView({
  alignedSpreads,
  scannedSignals,
  selectedSignal,
  contractA,
  contractB,
  initialSubTab = "backtest",
  onRunBacktestAPI,
}: StrategyLabConsolidatedViewProps) {
  const [subTab, setSubTab] = useState<"backtest" | "stress" | "robustness">(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // Backtest configuration state
  const [params, setParams] = useState<BacktestParameters>({
    ...DEFAULT_BACKTEST_PARAMS,
    contractA,
    contractB,
  });

  useEffect(() => {
    setParams((prev) => ({ ...prev, contractA, contractB }));
  }, [contractA, contractB]);

  // Compute deterministic baseline backtest immediately from real alignedSpreads,
  // and update via backend API whenever user clicks Run Backtest
  const computedDefaultResult = useMemo(
    () => runBacktest(alignedSpreads, { ...params, contractA, contractB }),
    [alignedSpreads, params, contractA, contractB]
  );

  const [apiResult, setApiResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [ledgerTab, setLedgerTab] = useState<"trades" | "rejected">("trades");

  // Clear stale API result when contract pair changes
  useEffect(() => {
    setApiResult(null);
  }, [contractA, contractB]);

  const activeBacktest = apiResult || computedDefaultResult;
  const metrics = activeBacktest.metrics;
  const scorecard = activeBacktest.honestyScorecard;

  const handleExecuteBacktest = async () => {
    setIsRunning(true);
    try {
      const res = await onRunBacktestAPI(params);
      if (res && res.metrics) {
        setApiResult(res);
      }
    } catch (err) {
      console.error("Backtest API error:", err);
    } finally {
      setIsRunning(false);
    }
  };

  // Stress Test State (Part 6 — Opportunity Stress Test)
  const [selectedStressSignalId, setSelectedStressSignalId] = useState<string>(
    selectedSignal?.id || scannedSignals[0]?.id || ""
  );

  useEffect(() => {
    if (selectedSignal?.id) {
      setSelectedStressSignalId(selectedSignal.id);
    }
  }, [selectedSignal?.id]);

  const stressTargetSignal = useMemo(() => {
    return (
      scannedSignals.find((s) => s.id === selectedStressSignalId) ||
      selectedSignal ||
      scannedSignals[0] ||
      null
    );
  }, [scannedSignals, selectedStressSignalId, selectedSignal]);

  const [stressInputs, setStressInputs] = useState<StressScenarioInputs>({
    costIncreasePct: 25,
    slippagePerGramINR: 1.75,
    convergenceCapturePct: 75,
    liquidityImpactPerGramINR: 0.5,
    approachingExpiryDragINR: 0,
  });

  const stressEvaluation = useMemo(() => {
    if (!stressTargetSignal) return null;
    const minDte = Math.min(stressTargetSignal.dteA ?? 20, stressTargetSignal.dteB ?? 20);
    return runOpportunityStressTest(
      stressTargetSignal.contractA,
      stressTargetSignal.contractB,
      stressTargetSignal.priceA_Norm,
      stressTargetSignal.priceB_Norm,
      Math.abs(stressTargetSignal.spreadAbsolute),
      minDte,
      stressInputs
    );
  }, [stressTargetSignal, stressInputs]);

  const downloadTradesCSV = () => {
    if (!activeBacktest.trades.length) return;
    const headers =
      "TradeID,SignalDate,EntryDate_NextOpen,ExitDate,Direction,HoldingDays,EntrySpreadAbs,ExitSpreadAbs,GrossPnLINR,FrictionINR,NetPnLINR,ExitReason,SampleSet\n";
    const rows = activeBacktest.trades
      .map(
        (t) =>
          `${t.id},${t.signalDate},${t.entryDate},${t.exitDate},${t.direction},${t.holdingDays},${t.entrySpreadAbs},${t.exitSpreadAbs},${t.totalGrossPnLINR},${t.totalFrictionINR},${t.totalNetPnLINR},${t.exitReason},${t.sampleSet}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GoldLens_Backtest_${contractA}_${contractB}.csv`;
    a.click();
  };

  const getScorecardStyle = (verdict: string) => {
    if (verdict === "EVIDENCE SUPPORTS FURTHER INVESTIGATION") return "status-positive-box";
    if (verdict === "INSUFFICIENT EVIDENCE") return "status-caution-box";
    return "status-error-box";
  };

  return (
    <div className="space-y-6">
      {/* Header + 3 Internal Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E6BD58]">
            Strategy Lab & Robustness Testing
          </span>
          <h1 className="text-xl font-bold text-[#F4F4F5] mt-0.5">
            Next-Open Backtesting, Stress Testing & Honesty Scorecard
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Active pair: <strong className="text-[#E6BD58]">{contractA} / {contractB}</strong> • Simulation outputs are historical estimates, never forecasts.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Strategy Lab tabs"
          className="inline-flex items-center gap-1 bg-[#11151B] p-1 rounded-xl border border-white/[0.08] text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "backtest"}
            onClick={() => setSubTab("backtest")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors ${
              subTab === "backtest"
                ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            <span>Backtest</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === "stress"}
            onClick={() => setSubTab("stress")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors ${
              subTab === "stress"
                ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Stress Test</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === "robustness"}
            onClick={() => setSubTab("robustness")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors ${
              subTab === "robustness"
                ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Robustness</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: BACKTEST + BACKTEST HONESTY SCORECARD                      */}
      {/* ================================================================= */}
      {subTab === "backtest" && (
        <div className="space-y-5">
          {/* Compact Strategy Configuration Bar */}
          <GlassCard variant="standard" padding="md" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.07]">
              <div>
                <span className="text-xs font-bold text-[#F4F4F5]">
                  Strategy Rules (Next-Session Open Fills • {activeBacktest.hedgeSizingExplanation})
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setApiResult(null);
                    setParams({ ...DEFAULT_BACKTEST_PARAMS, contractA, contractB });
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteBacktest}
                  disabled={isRunning}
                  className="btn-gold-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-[#080A0D]" />
                  <span>{isRunning ? "Running…" : "Run Backtest"}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs num-font">
              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA]">Entry |Z| Threshold</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.2"
                  max="4.0"
                  value={params.entryZScore}
                  onChange={(e) => {
                    setApiResult(null);
                    setParams({ ...params, entryZScore: parseFloat(e.target.value) || 2.0 });
                  }}
                  className="w-full rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1.5 text-xs text-[#F4F4F5]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA]">Exit Target |Z|</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.0"
                  max="1.5"
                  value={params.exitZScore}
                  onChange={(e) => {
                    setApiResult(null);
                    setParams({ ...params, exitZScore: parseFloat(e.target.value) || 0.3 });
                  }}
                  className="w-full rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1.5 text-xs text-[#F4F4F5]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA]">Stop Loss |Z|</label>
                <input
                  type="number"
                  step="0.1"
                  min="2.5"
                  max="5.5"
                  value={params.stopLossZScore}
                  onChange={(e) => {
                    setApiResult(null);
                    setParams({ ...params, stopLossZScore: parseFloat(e.target.value) || 3.5 });
                  }}
                  className="w-full rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1.5 text-xs text-[#F4F4F5]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA]">Max Hold (Days)</label>
                <input
                  type="number"
                  step="1"
                  min="2"
                  max="30"
                  value={params.maxHoldingDays}
                  onChange={(e) => {
                    setApiResult(null);
                    setParams({ ...params, maxHoldingDays: parseInt(e.target.value) || 10 });
                  }}
                  className="w-full rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1.5 text-xs text-[#F4F4F5]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA]">Min Expiry (DTE)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="20"
                  value={params.minDTEToEnter}
                  onChange={(e) => {
                    setApiResult(null);
                    setParams({ ...params, minDTEToEnter: parseInt(e.target.value) || 5 });
                  }}
                  className="w-full rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1.5 text-xs text-[#F4F4F5]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA]">Leg Slippage (₹/g)</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="10"
                  value={params.costs?.slippagePerGramINR ?? 1.25}
                  onChange={(e) => {
                    setApiResult(null);
                    setParams({
                      ...params,
                      costs: {
                        ...params.costs,
                        slippagePerGramINR: parseFloat(e.target.value) || 0,
                      },
                    });
                  }}
                  className="w-full rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1.5 text-xs text-[#F4F4F5]"
                />
              </div>
            </div>
          </GlassCard>

          {/* PART 7: BACKTEST HONESTY SCORECARD */}
          <GlassCard variant="elevated" padding="md" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E6BD58]">
                  Backtest Honesty Scorecard
                </span>
                <h2 className="text-base font-bold text-[#F4F4F5] mt-0.5">
                  Evidence Strength & Sample-Size Audit
                </h2>
              </div>

              <div
                className={`rounded-lg px-3 py-1.5 text-xs font-bold self-start sm:self-auto ${getScorecardStyle(
                  scorecard.evidenceVerdict
                )}`}
              >
                {scorecard.evidenceVerdict}
              </div>
            </div>

            <p className="text-xs text-[#F4F4F5]/95 leading-relaxed">
              {scorecard.evidenceExplanation}
            </p>

            {/* Core Scorecard Metrics (Always pairing Win Rate with Sample Size & 95% Wilson CI!) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs num-font">
              <div className="rounded-xl bg-[#11151B] p-3 border border-white/[0.07]">
                <span className="text-[11px] text-[#A1A1AA] block">Executed / Blocked</span>
                <span className="text-lg font-bold text-[#F4F4F5] mt-0.5 block">
                  {metrics.eligibleTradesExecuted} trades
                </span>
                <span className="text-[10px] text-[#F87171]">
                  {metrics.rejectedSignalsCount} signals blocked
                </span>
              </div>

              <div className="rounded-xl bg-[#11151B] p-3 border border-white/[0.07]">
                <span className="text-[11px] text-[#A1A1AA] block">
                  Win Rate (n = {metrics.eligibleTradesExecuted})
                </span>
                <span className="text-lg font-bold text-[#76A9FA] mt-0.5 block">
                  {metrics.winRatePct !== null
                    ? `${metrics.winRatePct}% (${metrics.winningTradesCount}/${metrics.eligibleTradesExecuted})`
                    : "Unavailable"}
                </span>
                <span className="text-[10px] text-[#A1A1AA]">
                  {scorecard.winRateWilson95CI.lowerPct !== null
                    ? `95% CI: [${scorecard.winRateWilson95CI.lowerPct}%, ${scorecard.winRateWilson95CI.upperPct}%]`
                    : "No sample"}
                </span>
              </div>

              <div className="rounded-xl bg-[#11151B] p-3 border border-white/[0.07]">
                <span className="text-[11px] text-[#A1A1AA] block">Gross vs Net P&L</span>
                <span
                  className={`text-lg font-bold mt-0.5 block ${
                    metrics.totalNetPnLINR > 0 ? "text-[#4ADE80]" : "text-[#F87171]"
                  }`}
                >
                  {metrics.totalNetPnLINR >= 0 ? "+" : ""}₹
                  {metrics.totalNetPnLINR.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-[#A1A1AA]">
                  Gross: ₹{metrics.totalGrossPnLINR.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="rounded-xl bg-[#11151B] p-3 border border-white/[0.07]">
                <span className="text-[11px] text-[#A1A1AA] block">Modeled Costs</span>
                <span className="text-lg font-bold text-[#F87171] mt-0.5 block">
                  ₹{metrics.totalFrictionINR.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-[#A1A1AA]">
                  Avg hold: {metrics.averageHoldingDays}d • Max DD: {metrics.maxDrawdownPct}%
                </span>
              </div>

              <div className="rounded-xl bg-[#11151B] p-3 border border-white/[0.07]">
                <span className="text-[11px] text-[#A1A1AA] block">Out-of-Sample Split</span>
                <span className="text-lg font-bold text-[#E6BD58] mt-0.5 block">
                  {metrics.outOfSampleNetPnLINR >= 0 ? "+" : ""}₹
                  {metrics.outOfSampleNetPnLINR.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-[#A1A1AA]">
                  {metrics.outOfSampleTradesCount} OOS trades • {metrics.inSampleTradesCount} IS trades
                </span>
              </div>

              <div className="rounded-xl bg-[#11151B] p-3 border border-white/[0.07]">
                <span className="text-[11px] text-[#A1A1AA] block">t-Test & Fragility</span>
                <span className="text-lg font-bold text-[#F4F4F5] mt-0.5 block">
                  {scorecard.meanNetTradeCI95.oneSidedPValue !== null
                    ? `p = ${scorecard.meanNetTradeCI95.oneSidedPValue}`
                    : "Undefined (df=0)"}
                </span>
                <span className="text-[10px] text-[#A1A1AA]">
                  Grid stability: {scorecard.parameterSensitivity.stabilityLabel}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Cumulative Performance Chart */}
          <GlassCard variant="standard" padding="md">
            <EquityCurveChart
              equityCurve={activeBacktest.equityCurve}
              initialCapital={params.initialCapitalINR}
            />
          </GlassCard>

          {/* Trade Ledger & Blocked Signals Audit */}
          <GlassCard variant="standard" padding="md" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.07]">
              <div className="inline-flex items-center gap-1 bg-[#080A0D] p-1 rounded-lg border border-white/[0.07] text-xs">
                <button
                  type="button"
                  onClick={() => setLedgerTab("trades")}
                  className={`px-3 py-1 rounded-md font-semibold ${
                    ledgerTab === "trades"
                      ? "bg-[#171B22] text-[#E6BD58]"
                      : "text-[#A1A1AA] hover:text-[#F4F4F5]"
                  }`}
                >
                  Executed Trades ({activeBacktest.trades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerTab("rejected")}
                  className={`px-3 py-1 rounded-md font-semibold ${
                    ledgerTab === "rejected"
                      ? "bg-[#171B22] text-[#F87171]"
                      : "text-[#A1A1AA] hover:text-[#F4F4F5]"
                  }`}
                >
                  Blocked / Rejected Signals ({activeBacktest.rejectedSignals.length})
                </button>
              </div>

              {ledgerTab === "trades" && activeBacktest.trades.length > 0 && (
                <button
                  type="button"
                  onClick={downloadTradesCSV}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#171B22] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] border border-white/[0.1]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            {ledgerTab === "trades" ? (
              activeBacktest.trades.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#A1A1AA]">
                  Zero trades executed under the current filter and threshold configuration.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[#A1A1AA]">
                        <th className="py-2 pr-3">Signal Close (T)</th>
                        <th className="py-2 pr-3">Entry Fill (T+1 Open)</th>
                        <th className="py-2 pr-3">Exit Fill</th>
                        <th className="py-2 pr-3">Direction</th>
                        <th className="py-2 pr-3">Hold</th>
                        <th className="py-2 pr-3">Gross P&L</th>
                        <th className="py-2 pr-3">Costs</th>
                        <th className="py-2 pr-3">Net P&L</th>
                        <th className="py-2 pr-3">Split / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] num-font text-[11px]">
                      {activeBacktest.trades.map((t) => (
                        <tr key={t.id} className="hover:bg-[#171B22]/50">
                          <td className="py-2 pr-3 font-mono text-[#A1A1AA]">{t.signalDate}</td>
                          <td className="py-2 pr-3 font-mono text-[#F4F4F5]">{t.entryDate}</td>
                          <td className="py-2 pr-3 font-mono text-[#A1A1AA]">{t.exitDate}</td>
                          <td className="py-2 pr-3 text-[#E6BD58] font-medium">{t.direction}</td>
                          <td className="py-2 pr-3 text-[#F4F4F5]">{t.holdingDays}d</td>
                          <td className="py-2 pr-3 text-[#F4F4F5]">
                            ₹{t.totalGrossPnLINR.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 pr-3 text-[#F87171]">
                            ₹{t.totalFrictionINR.toLocaleString("en-IN")}
                          </td>
                          <td
                            className={`py-2 pr-3 font-bold ${
                              t.isWin ? "text-[#4ADE80]" : "text-[#F87171]"
                            }`}
                          >
                            {t.totalNetPnLINR >= 0 ? "+" : ""}₹
                            {t.totalNetPnLINR.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 pr-3 text-[#A1A1AA]">
                            {t.sampleSet === "OUT_OF_SAMPLE" ? "OOS" : "IS"} • {t.exitReason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : activeBacktest.rejectedSignals.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#A1A1AA]">
                No candidate signals were blocked during this run.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06] max-h-72 overflow-y-auto">
                {activeBacktest.rejectedSignals.map((rej, idx) => (
                  <div
                    key={idx}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-mono font-semibold text-[#F4F4F5] mr-2">
                        {rej.date}
                      </span>
                      <span className="num-font text-[#76A9FA] mr-2">({rej.zScore}σ)</span>
                      <span className="text-[#A1A1AA]">{rej.rejectionReason}</span>
                    </div>
                    <span className="status-error-box rounded px-2 py-0.5 text-[10px] font-bold self-start sm:self-auto">
                      BLOCKED ({rej.category})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: OPPORTUNITY STRESS TEST (PART 6)                           */}
      {/* ================================================================= */}
      {subTab === "stress" && (
        <div className="space-y-5">
          <GlassCard variant="standard" padding="md" className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#76A9FA]">
                  Parametric Simulation (Not a Market Forecast)
                </span>
                <h2 className="text-base font-bold text-[#F4F4F5] mt-0.5">
                  Opportunity Stress Test — Test Alternative Market & Cost Assumptions
                </h2>
              </div>

              {scannedSignals.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <label htmlFor="stress-signal-picker" className="text-[#A1A1AA]">
                    Detected Signal:
                  </label>
                  <select
                    id="stress-signal-picker"
                    value={stressTargetSignal?.id || ""}
                    onChange={(e) => setSelectedStressSignalId(e.target.value)}
                    className="rounded-lg bg-[#080A0D] border border-white/[0.1] px-3 py-1.5 text-xs text-[#F4F4F5]"
                  >
                    {scannedSignals.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.date} • {s.contractA}/{s.contractB} ({s.spreadAbsolute >= 0 ? "+" : ""}₹{s.spreadAbsolute.toFixed(1)}/g — {s.verdict})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {!stressTargetSignal || !stressEvaluation ? (
              <div className="py-12 text-center text-xs text-[#A1A1AA]">
                No detected anomaly available to stress test on the active dataset.
              </div>
            ) : (
              <>
                {stressTargetSignal.isDataIntegrityFailure && (
                  <div className="status-error-box rounded-xl p-3.5 text-xs">
                    <strong>Data Integrity Limitation:</strong> This signal ({stressTargetSignal.date}) originates from a corrupted source record. Parametric stress numbers below illustrate cost math only — the underlying spread is an invalid print.
                  </div>
                )}

                {/* Quick Cost Shock Preset Buttons (+0%, +25%, +50%, +100%) */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#A1A1AA] font-medium">Quick Stress Presets:</span>
                  {[
                    {
                      label: "Base (0% Shock)",
                      cfg: {
                        costIncreasePct: 0,
                        slippagePerGramINR: 1.25,
                        convergenceCapturePct: 100,
                        liquidityImpactPerGramINR: 0,
                        approachingExpiryDragINR: 0,
                      },
                    },
                    {
                      label: "Costs +25%",
                      cfg: {
                        costIncreasePct: 25,
                        slippagePerGramINR: 1.55,
                        convergenceCapturePct: 100,
                        liquidityImpactPerGramINR: 0,
                        approachingExpiryDragINR: 0,
                      },
                    },
                    {
                      label: "Costs +50%",
                      cfg: {
                        costIncreasePct: 50,
                        slippagePerGramINR: 1.9,
                        convergenceCapturePct: 100,
                        liquidityImpactPerGramINR: 0,
                        approachingExpiryDragINR: 0,
                      },
                    },
                    {
                      label: "Costs +100%",
                      cfg: {
                        costIncreasePct: 100,
                        slippagePerGramINR: 2.5,
                        convergenceCapturePct: 100,
                        liquidityImpactPerGramINR: 0,
                        approachingExpiryDragINR: 0,
                      },
                    },
                    {
                      label: "Slow Convergence + Thin Book",
                      cfg: {
                        costIncreasePct: 25,
                        slippagePerGramINR: 2.25,
                        convergenceCapturePct: 55,
                        liquidityImpactPerGramINR: 1.5,
                        approachingExpiryDragINR: 0,
                      },
                    },
                    {
                      label: "Approaching Expiry Squeeze",
                      cfg: {
                        costIncreasePct: 50,
                        slippagePerGramINR: 2.5,
                        convergenceCapturePct: 50,
                        liquidityImpactPerGramINR: 1.5,
                        approachingExpiryDragINR: 4.5,
                      },
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setStressInputs(preset.cfg)}
                      className="rounded-lg bg-[#171B22] hover:border-[#E6BD58]/45 border border-white/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-[#F4F4F5] transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* 5 Interactive Assumption Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs num-font">
                  <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Fee & Tax Increase</span>
                      <span className="font-bold text-[#E6BD58]">+{stressInputs.costIncreasePct}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="150"
                      step="25"
                      aria-label="Fee and tax increase percentage"
                      value={stressInputs.costIncreasePct}
                      onChange={(e) =>
                        setStressInputs({
                          ...stressInputs,
                          costIncreasePct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#E6BD58]"
                    />
                  </div>

                  <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Slippage / Leg</span>
                      <span className="font-bold text-[#76A9FA]">
                        ₹{stressInputs.slippagePerGramINR.toFixed(2)}/g
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.25"
                      aria-label="Slippage per leg in rupees per gram"
                      value={stressInputs.slippagePerGramINR}
                      onChange={(e) =>
                        setStressInputs({
                          ...stressInputs,
                          slippagePerGramINR: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#76A9FA]"
                    />
                  </div>

                  <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Convergence Capture</span>
                      <span className="font-bold text-[#E6BD58]">
                        {stressInputs.convergenceCapturePct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="5"
                      aria-label="Percentage of spread convergence captured"
                      value={stressInputs.convergenceCapturePct}
                      onChange={(e) =>
                        setStressInputs({
                          ...stressInputs,
                          convergenceCapturePct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#E6BD58]"
                    />
                  </div>

                  <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Illiquidity Penalty</span>
                      <span className="font-bold text-[#F87171]">
                        ₹{stressInputs.liquidityImpactPerGramINR.toFixed(2)}/g
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5.0"
                      step="0.25"
                      aria-label="Reduced liquidity fill penalty"
                      value={stressInputs.liquidityImpactPerGramINR}
                      onChange={(e) =>
                        setStressInputs({
                          ...stressInputs,
                          liquidityImpactPerGramINR: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#F87171]"
                    />
                  </div>

                  <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Expiry Basis Drag</span>
                      <span className="font-bold text-[#FBBF24]">
                        ₹{stressInputs.approachingExpiryDragINR.toFixed(2)}/g
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8.0"
                      step="0.5"
                      aria-label="Approaching contract expiry basis drag"
                      value={stressInputs.approachingExpiryDragINR}
                      onChange={(e) =>
                        setStressInputs({
                          ...stressInputs,
                          approachingExpiryDragINR: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#FBBF24]"
                    />
                  </div>
                </div>

                {/* Base Case vs Stressed Scenario Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs num-font">
                  {/* Base-Case Estimate */}
                  <div className="rounded-xl bg-[#080A0D] p-4 border border-white/[0.07] space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.07]">
                      <span className="font-bold text-[#A1A1AA]">
                        BASE-CASE SIMULATION ({stressEvaluation.matchedGrams}g Hedge Unit)
                      </span>
                      <span className="font-mono text-[#76A9FA]">100% Capture • 1.0× Costs</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#A1A1AA]">Estimated Gross Result:</span>
                        <span className="font-semibold text-[#F4F4F5]">
                          ₹{stressEvaluation.baseCase.grossTotalINR.toLocaleString("en-IN")} (₹
                          {stressEvaluation.baseCase.grossPerGram}/g)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A1A1AA]">Estimated Costs:</span>
                        <span className="font-semibold text-[#F87171]">
                          -₹{stressEvaluation.baseCase.costsTotalINR.toLocaleString("en-IN")} (₹
                          {stressEvaluation.baseCase.costsPerGram}/g)
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-white/[0.07] text-sm">
                        <span className="font-semibold text-[#F4F4F5]">Base Net Result:</span>
                        <span
                          className={`font-bold ${
                            stressEvaluation.baseCase.viable ? "text-[#4ADE80]" : "text-[#F87171]"
                          }`}
                        >
                          {stressEvaluation.baseCase.netTotalINR >= 0 ? "+" : ""}₹
                          {stressEvaluation.baseCase.netTotalINR.toLocaleString("en-IN")} (
                          {stressEvaluation.baseCase.netPerGram >= 0 ? "+" : ""}₹
                          {stressEvaluation.baseCase.netPerGram}/g)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stressed Scenario Estimate */}
                  <div className="rounded-xl bg-[#171B22] p-4 border border-[#E6BD58]/35 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                      <span className="font-bold text-[#E6BD58]">STRESSED SCENARIO ESTIMATE</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          stressEvaluation.stressedCase.verdict === "SURVIVES_STRESS"
                            ? "status-positive-box"
                            : stressEvaluation.stressedCase.verdict === "FRAGILE_EDGE"
                            ? "status-caution-box"
                            : "status-error-box"
                        }`}
                      >
                        {stressEvaluation.stressedCase.verdict}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#A1A1AA]">Scenario Gross Result:</span>
                        <span className="font-semibold text-[#F4F4F5]">
                          ₹{stressEvaluation.stressedCase.grossTotalINR.toLocaleString("en-IN")} (₹
                          {stressEvaluation.stressedCase.grossPerGram}/g)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A1A1AA]">Scenario Costs:</span>
                        <span className="font-semibold text-[#F87171]">
                          -₹{stressEvaluation.stressedCase.costsTotalINR.toLocaleString("en-IN")} (₹
                          {stressEvaluation.stressedCase.costsPerGram}/g)
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-white/[0.08] text-sm">
                        <span className="font-semibold text-[#F4F4F5]">Scenario Net Result:</span>
                        <span
                          className={`font-bold ${
                            stressEvaluation.stressedCase.viable
                              ? "text-[#4ADE80]"
                              : "text-[#F87171]"
                          }`}
                        >
                          {stressEvaluation.stressedCase.netTotalINR >= 0 ? "+" : ""}₹
                          {stressEvaluation.stressedCase.netTotalINR.toLocaleString("en-IN")} (
                          {stressEvaluation.stressedCase.netPerGram >= 0 ? "+" : ""}₹
                          {stressEvaluation.stressedCase.netPerGram}/g)
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#A1A1AA]">Difference vs Base Case:</span>
                        <span className="font-semibold text-[#FBBF24]">
                          {stressEvaluation.stressedCase.deltaTotalINR >= 0 ? "+" : ""}₹
                          {stressEvaluation.stressedCase.deltaTotalINR.toLocaleString("en-IN")} (
                          {stressEvaluation.stressedCase.deltaPerGram >= 0 ? "+" : ""}₹
                          {stressEvaluation.stressedCase.deltaPerGram}/g)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Standard Stress Matrix (+25%, +50%, +100%, Slow Convergence, Illiquidity, Expiry) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[#A1A1AA]">
                        <th className="py-2 pr-3">Standardized Stress Scenario</th>
                        <th className="py-2 pr-3">Assumptions</th>
                        <th className="py-2 pr-3">Gross (₹)</th>
                        <th className="py-2 pr-3">Costs (₹)</th>
                        <th className="py-2 pr-3">Simulated Net (₹)</th>
                        <th className="py-2 pr-3">Δ vs Base</th>
                        <th className="py-2 pr-3">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] num-font text-[11px]">
                      {stressEvaluation.presetMatrix.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 pr-3 font-semibold text-[#F4F4F5]">{row.label}</td>
                          <td className="py-2 pr-3 text-[#A1A1AA]">{row.assumptionSummary}</td>
                          <td className="py-2 pr-3 text-[#F4F4F5]">
                            ₹{row.grossINR.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 pr-3 text-[#F87171]">
                            ₹{row.costsINR.toLocaleString("en-IN")}
                          </td>
                          <td
                            className={`py-2 pr-3 font-bold ${
                              row.survives ? "text-[#4ADE80]" : "text-[#F87171]"
                            }`}
                          >
                            {row.netINR >= 0 ? "+" : ""}₹{row.netINR.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 pr-3 text-[#A1A1AA]">
                            {row.deltaVsBaseINR >= 0 ? "+" : ""}₹
                            {row.deltaVsBaseINR.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 pr-3">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                row.survives ? "status-positive-box" : "status-error-box"
                              }`}
                            >
                              {row.survives ? "POSITIVE" : "NEGATIVE"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Explicit Assumptions & Limitations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-[#A1A1AA] pt-2 border-t border-white/[0.07]">
                  <div>
                    <strong className="text-[#F4F4F5] block mb-1">Modeled Assumptions:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      {stressEvaluation.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong className="text-[#F4F4F5] block mb-1">Important Limitations:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      {stressEvaluation.limitations.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </GlassCard>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: ROBUSTNESS, WALK-FORWARD & PARAMETER SENSITIVITY           */}
      {/* ================================================================= */}
      {subTab === "robustness" && (
        <div className="space-y-5">
          {/* 3x3 Parameter Sensitivity Matrix */}
          <GlassCard variant="standard" padding="md" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.07]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#76A9FA]">
                  Overfitting & Parameter Fragility Audit
                </span>
                <h2 className="text-base font-bold text-[#F4F4F5] mt-0.5">
                  3 × 3 Neighboring Parameter Sensitivity Grid
                </h2>
              </div>

              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                  scorecard.parameterSensitivity.stabilityLabel === "STABLE"
                    ? "status-positive-box"
                    : scorecard.parameterSensitivity.stabilityLabel === "MODERATE"
                    ? "status-caution-box"
                    : "status-error-box"
                }`}
              >
                {scorecard.parameterSensitivity.stabilityLabel} (
                {scorecard.parameterSensitivity.profitableNeighborsCount}/
                {scorecard.parameterSensitivity.totalGridCells} Net Positive)
              </span>
            </div>

            <p className="text-xs text-[#A1A1AA]">
              {scorecard.parameterSensitivity.summary} Strategies that perform well only at a single narrow threshold are likely overfit to historical noise.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs num-font pt-1">
              {scorecard.parameterSensitivity.grid.map((cell, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl p-3 border space-y-1 ${
                    cell.isBaseline
                      ? "bg-[#171B22] border-[#E6BD58]/50"
                      : "bg-[#080A0D] border-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#F4F4F5]">
                      |Z| ≥ {cell.entryZScore}σ • Max {cell.maxHoldingDays}d
                    </span>
                    {cell.isBaseline && (
                      <span className="text-[9px] font-bold text-[#E6BD58]">SELECTED</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A1A1AA]">
                      {cell.tradesCount} trade(s)
                      {cell.winRatePct !== null ? ` • ${cell.winRatePct}% win` : ""}
                    </span>
                    <span
                      className={`font-bold ${
                        cell.netPnLINR > 0
                          ? "text-[#4ADE80]"
                          : cell.netPnLINR < 0
                          ? "text-[#F87171]"
                          : "text-[#A1A1AA]"
                      }`}
                    >
                      {cell.netPnLINR >= 0 ? "+" : ""}₹{cell.netPnLINR.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Chronological Walk-Forward Folds */}
          <GlassCard variant="standard" padding="md" className="space-y-3">
            <div className="pb-2 border-b border-white/[0.07]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E6BD58]">
                Temporal Stability
              </span>
              <h3 className="text-base font-bold text-[#F4F4F5] mt-0.5">
                Sequential Period Breakdown & Bias Safeguards
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs num-font">
              {scorecard.walkForwardFolds.map((fold) => (
                <div
                  key={fold.foldName}
                  className="rounded-xl bg-[#080A0D] p-3.5 border border-white/[0.06] space-y-1.5"
                >
                  <div className="flex justify-between font-semibold text-[#F4F4F5]">
                    <span>{fold.foldName}</span>
                    <span className="font-mono text-[11px] text-[#A1A1AA]">
                      {fold.periodStart} → {fold.periodEnd}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Executed Trades:</span>
                    <span className="text-[#F4F4F5]">{fold.tradesCount}</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Gross / Costs:</span>
                    <span>
                      ₹{fold.grossPnLINR.toLocaleString("en-IN")} / -₹
                      {fold.costsINR.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/[0.06]">
                    <span className="text-[#A1A1AA]">Net Period Result:</span>
                    <span
                      className={`font-bold ${
                        fold.netPnLINR > 0
                          ? "text-[#4ADE80]"
                          : fold.netPnLINR < 0
                          ? "text-[#F87171]"
                          : "text-[#A1A1AA]"
                      }`}
                    >
                      {fold.netPnLINR >= 0 ? "+" : ""}₹{fold.netPnLINR.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Methodological Safeguard Checklist */}
            <div className="space-y-2 pt-2">
              {scorecard.safeguardChecks.map((chk) => (
                <div
                  key={chk.id}
                  className="rounded-lg bg-[#080A0D] p-3 border border-white/[0.06] flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    {chk.status === "VERIFIED" ? (
                      <CheckCircle2 className="h-4 w-4 text-[#4ADE80] shrink-0 mt-0.5" />
                    ) : chk.status === "WARNING" ? (
                      <AlertTriangle className="h-4 w-4 text-[#FBBF24] shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-4 w-4 text-[#76A9FA] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold text-[#F4F4F5]">{chk.label}: </span>
                      <span className="text-[#A1A1AA]">{chk.detail}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#A1A1AA] shrink-0">
                    {chk.status}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
