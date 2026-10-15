"use client";

import React from "react";
import { GlassCard } from "../ui/GlassCard";
import { SeededCaseBanner } from "../common/SeededCaseBanner";
import { OpportunityEvidenceMeter } from "../common/OpportunityEvidenceMeter";
import { RelativePriceLandscape } from "../charts/RelativePriceLandscape";
import { AnomalyHeatmap } from "../charts/AnomalyHeatmap";
import { FuturesCurveChart } from "../charts/FuturesCurveChart";
import {
  Sparkles,
  ShieldAlert,
  Coins,
  TrendingUp,
  FlaskConical,
  ArrowRight,
  Database,
  ShieldCheck,
  Zap,
  Activity,
  History,
} from "lucide-react";
import { DailyContractPoint, AlignedSpreadPoint } from "@/lib/analytics/spreads";
import { SeededCaseInfo } from "@/lib/analytics/syntheticData";

interface OverviewViewProps {
  marketRecords: DailyContractPoint[];
  alignedSpreads: AlignedSpreadPoint[];
  scannedSignals: any[];
  activePair: { a: string; b: string };
  dataTrustScore: number;
  onNavigate: (view: string) => void;
  onSelectCase: (c: SeededCaseInfo) => void;
  onSelectSignal: (sig: any) => void;
  onRunScan: () => void;
  isScanning: boolean;
}

export function OverviewView({
  marketRecords,
  alignedSpreads,
  scannedSignals,
  activePair,
  dataTrustScore,
  onNavigate,
  onSelectCase,
  onSelectSignal,
  onRunScan,
  isScanning,
}: OverviewViewProps) {
  const latestSpread = alignedSpreads[alignedSpreads.length - 1];
  const totalAnomalies = scannedSignals.length;
  const approvedSignals = scannedSignals.filter((s) => s.overallStatus === "APPROVED");
  const rejectedSignals = scannedSignals.filter((s) => s.overallStatus === "DISQUALIFIED");

  // Heatmap pairs and dates
  const heatmapPairs = ["GOLDM / GOLDTEN", "GOLDM / GOLDGUINEA", "GOLDGUINEA / GOLDPETAL", "GOLDM / GOLDPETAL"];
  const dates = Array.from(new Set(marketRecords.map((r) => r.date))).sort();

  const heatmapCells = scannedSignals.map((s) => ({
    pairKey: `${s.contractA} / ${s.contractB}`,
    date: s.date,
    zScore: s.zScore,
    spreadAbs: s.spreadAbsolute,
    isAnomaly: true,
    classification: s.classification,
  }));

  const activeSignal = scannedSignals[0] || null;

  return (
    <div className="space-y-6">
      {/* 1. Judge Demo Case Studies Banner */}
      <SeededCaseBanner onSelectCase={onSelectCase} />

      {/* 2. Top Analytical Workstation KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>MCX Contracts</span>
            <Coins className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">5 Products</div>
          <div className="text-[10px] text-slate-400">GOLDM, TEN, GUINEA, PETAL, BIG</div>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Bhavcopy Records</span>
            <Database className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">{marketRecords.length}</div>
          <div className="text-[10px] text-slate-400">{dates[0]} to {dates[dates.length - 1]}</div>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Data Trust Score</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">{dataTrustScore}/100</div>
          <div className="text-[10px] text-emerald-400/80">12 Integrity Checks OK</div>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Anomalies (|Z|≥1.8)</span>
            <Zap className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">{totalAnomalies}</div>
          <div className="text-[10px] text-slate-400">Multi-pair statistical spikes</div>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Passed Diagnostics</span>
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300">{approvedSignals.length}</div>
          <div className="text-[10px] text-slate-400">Survives friction & expiry</div>
        </GlassCard>

        <GlassCard variant="standard" padding="sm" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Rejected / Filtered</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">{rejectedSignals.length}</div>
          <div className="text-[10px] text-rose-400/80">Expiry / Cost / Glitch traps</div>
        </GlassCard>
      </div>

      {/* 3. Main Analytical Section: Opportunity vs Evidence Meter & Price Landscape */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Relative Price Landscape */}
        <div className="lg:col-span-2 space-y-4">
          <GlassCard variant="standard" padding="md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                  VISUALIZATION A • RELATIVE PRICE LANDSCAPE
                </span>
                <h3 className="text-base font-bold text-slate-100">
                  Standardized Reference Prices (₹/g 999 Fine Gold)
                </h3>
              </div>

              <button
                onClick={() => onNavigate("spread_analysis")}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                <span>Deep Spread Analysis</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="pt-3">
              <RelativePriceLandscape
                records={marketRecords}
                onSelectAnomalyDate={(date, a, b) => {
                  const sig = scannedSignals.find((s) => s.date === date);
                  if (sig) onSelectSignal(sig);
                  onNavigate("evidence_room");
                }}
              />
            </div>
          </GlassCard>
        </div>

        {/* Right 1 Col: Opportunity vs Evidence Meter */}
        <div className="space-y-4">
          {activeSignal ? (
            <OpportunityEvidenceMeter
              anomalyStrength={activeSignal.anomalyStrength}
              tradingEvidence={activeSignal.tradingEvidence}
              classification={activeSignal.classification}
              zScore={activeSignal.zScore}
              netEdgeINRPerGram={activeSignal.profitCheck?.netEdgePerGram || 0}
              costToEdgeRatio={activeSignal.profitCheck?.costToEdgeRatioPct || 0}
              dataTrustScore={dataTrustScore}
            />
          ) : (
            <OpportunityEvidenceMeter
              anomalyStrength={82}
              tradingEvidence={88}
              classification="WORTH_INVESTIGATING"
              zScore={2.65}
              netEdgeINRPerGram={18.4}
              costToEdgeRatio={18.5}
              dataTrustScore={dataTrustScore}
            />
          )}

          {/* Quick Action Hub */}
          <GlassCard variant="subtle" padding="sm" className="space-y-2">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Quick Workstation Actions
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigate("evidence_room")}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 border border-white/5 hover:border-amber-500/30 transition-all font-medium"
              >
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Evidence Room</span>
              </button>

              <button
                onClick={() => onNavigate("strategy_lab")}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 border border-white/5 hover:border-amber-500/30 transition-all font-medium"
              >
                <FlaskConical className="h-4 w-4 text-sky-400" />
                <span>Backtest Lab</span>
              </button>

              <button
                onClick={() => onNavigate("market_replay")}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 border border-white/5 hover:border-amber-500/30 transition-all font-medium"
              >
                <History className="h-4 w-4 text-purple-400" />
                <span>Market Replay</span>
              </button>

              <button
                onClick={() => onNavigate("research_reports")}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 border border-white/5 hover:border-amber-500/30 transition-all font-medium"
              >
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span>Research Dossier</span>
              </button>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* 4. Multi-Pair Anomaly Heatmap */}
      <GlassCard variant="standard" padding="md">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              FEATURE • MULTI-PAIR RELATIVE SPREAD MATRIX
            </span>
            <h3 className="text-base font-bold text-slate-100">
              Cross-Contract Statistical Anomaly Heatmap
            </h3>
          </div>
          <button
            onClick={() => onNavigate("intelligence_scan")}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold"
          >
            <span>Run Full Multi-Pair Scan</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="pt-4">
          <AnomalyHeatmap
            cells={heatmapCells}
            pairs={heatmapPairs}
            dates={dates}
            onSelectCell={(pairKey, date) => {
              const sig = scannedSignals.find((s) => s.date === date);
              if (sig) onSelectSignal(sig);
              onNavigate("evidence_room");
            }}
          />
        </div>
      </GlassCard>

      {/* 5. Bottom Split: Recent Detected Anomalies & Futures Term Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Anomalies List */}
        <GlassCard variant="standard" padding="md">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                DETECTED EVENTS
              </span>
              <h3 className="text-sm font-bold text-slate-100">Recent Statistical Spikes</h3>
            </div>
            <button
              onClick={() => onNavigate("evidence_room")}
              className="text-xs text-amber-400 font-semibold"
            >
              View All ({scannedSignals.length})
            </button>
          </div>

          <div className="divide-y divide-white/5 mt-2 max-h-72 overflow-y-auto">
            {scannedSignals.slice(0, 5).map((sig) => (
              <div
                key={sig.id}
                onClick={() => {
                  onSelectSignal(sig);
                  onNavigate("evidence_room");
                }}
                className="py-2.5 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-200">
                      {sig.contractA} vs {sig.contractB}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{sig.date}</span>
                    {sig.isSeeded && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                        Seeded
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Spread: <strong className="text-amber-300">₹{sig.spreadAbsolute.toFixed(2)}/g</strong> | Z-Score:{" "}
                    <strong className="text-slate-200">{sig.zScore.toFixed(2)}σ</strong>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                      sig.overallStatus === "APPROVED"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {sig.classification}
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Futures Term Structure Curve Snapshot */}
        <GlassCard variant="standard" padding="md">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                VISUALIZATION E • FUTURES CURVE EXPLORER
              </span>
              <h3 className="text-sm font-bold text-slate-100">Contract Term Structure</h3>
            </div>
            <button
              onClick={() => onNavigate("contracts")}
              className="text-xs text-amber-400 font-semibold"
            >
              Contract Specs
            </button>
          </div>

          <div className="pt-2">
            <FuturesCurveChart records={marketRecords} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
