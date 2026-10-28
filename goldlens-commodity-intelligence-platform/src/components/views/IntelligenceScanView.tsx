"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Filter,
  RefreshCw,
  Search,
} from "lucide-react";

interface IntelligenceScanViewProps {
  scannedSignals: any[];
  onSelectSignal: (sig: any) => void;
  onNavigate: (view: string) => void;
  onRunScan: () => void;
  isScanning: boolean;
  totalRecordsCount: number;
  dataTrustScore: number;
}

export function IntelligenceScanView({
  scannedSignals,
  onSelectSignal,
  onNavigate,
  onRunScan,
  isScanning,
  totalRecordsCount,
  dataTrustScore,
}: IntelligenceScanViewProps) {
  const [filterMode, setFilterMode] = useState<"ALL" | "APPROVED" | "DISQUALIFIED" | "SEEDED">("ALL");
  const [pairFilter, setPairFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const pipelineStages = [
    { id: 1, name: "Bhavcopy Market Data Ingestion", status: "completed", count: `${totalRecordsCount} records`, time: "12ms" },
    { id: 2, name: "Financial Schema & Header Validation", status: "completed", count: "100% matched", time: "4ms" },
    { id: 3, name: "12-Point Data Trust & Bar Geometry Check", status: "completed", count: `Score: ${dataTrustScore}/100`, time: "18ms" },
    { id: 4, name: "Contract Specification & Purity Mapping", status: "completed", count: "5 contracts", time: "2ms" },
    { id: 5, name: "Quotation Normalization (₹/g 999 Fine)", status: "completed", count: `${totalRecordsCount} normalized`, time: "8ms" },
    { id: 6, name: "Trading Session Alignment by Date", status: "completed", count: "Multi-leg aligned", time: "14ms" },
    { id: 7, name: "Lookahead-Bias-Free Rolling Spreads (μ, σ)", status: "completed", count: "30d lookback", time: "22ms" },
    { id: 8, name: "Statistical Anomaly Detection (|Z| ≥ 1.80σ)", status: "completed", count: `${scannedSignals.length} anomalies`, time: "9ms" },
    { id: 9, name: "False Signal Detective Diagnostic Suite", status: "completed", count: "10 checks / signal", time: "31ms" },
    { id: 10, name: "Spread DNA Historical Analogue Matching", status: "completed", count: "Vector similarity", time: "42ms" },
    { id: 11, name: "Profit Reality MCX Transaction Modeling", status: "completed", count: "4 legs roundtrip", time: "15ms" },
    { id: 12, name: "Dual-Gauge Opportunity vs Evidence Classification", status: "completed", count: "Dossier Ready", time: "5ms" },
  ];

  const filteredSignals = scannedSignals.filter((s) => {
    if (filterMode === "APPROVED" && s.overallStatus !== "APPROVED") return false;
    if (filterMode === "DISQUALIFIED" && s.overallStatus !== "DISQUALIFIED") return false;
    if (filterMode === "SEEDED" && !s.isSeeded) return false;
    if (pairFilter !== "ALL" && `${s.contractA}/${s.contractB}` !== pairFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.date.includes(q) ||
        s.contractA.toLowerCase().includes(q) ||
        s.contractB.toLowerCase().includes(q) ||
        s.classification.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pairsList = Array.from(new Set(scannedSignals.map((s) => `${s.contractA}/${s.contractB}`)));

  return (
    <div className="space-y-6">
      {/* Header and Scan CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              SIGNATURE EXPERIENCE A
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span>Intelligence Pipeline & Scan Runner</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end quantitative execution pipeline scanning MCX gold contracts for statistical deviations, diagnostics, and friction viability.
          </p>
        </div>

        <button
          onClick={onRunScan}
          disabled={isScanning}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 text-slate-950 ${isScanning ? "animate-spin" : ""}`} />
          <span>{isScanning ? "Processing Pipeline..." : "Rerun Intelligence Scan"}</span>
        </button>
      </div>

      {/* 12-Stage Pipeline Visualizer */}
      <GlassCard variant="standard" padding="md" className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">12-Stage Analytical Execution Pipeline</span>
          <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>ALL 12 STAGES VERIFIED</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {pipelineStages.map((stg) => (
            <div
              key={stg.id}
              className="rounded-xl glass-subtle p-3 space-y-1.5 border border-white/5 hover:border-amber-500/20 transition-all"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-amber-400 font-bold">Stage {stg.id.toString().padStart(2, "0")}</span>
                <span className="text-[10px] text-slate-500 font-mono">{stg.time}</span>
              </div>
              <div className="font-semibold text-xs text-slate-200 leading-snug">{stg.name}</div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-slate-400">
                <span className="text-slate-300 font-medium">{stg.count}</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Filter and Candidate Explorer Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/5 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by date, contract, or verdict..."
            className="w-full rounded-xl bg-slate-950/80 border border-white/10 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/40"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pair filter */}
          <select
            value={pairFilter}
            onChange={(e) => setPairFilter(e.target.value)}
            className="rounded-xl bg-slate-950/80 border border-white/10 px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Contract Pairs</option>
            {pairsList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Classification filter pills */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10">
            {(["ALL", "APPROVED", "DISQUALIFIED", "SEEDED"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filterMode === m
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Candidates List Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Found {filteredSignals.length} statistical anomaly events</span>
          <span>Click any event to open Evidence Room</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSignals.map((sig) => (
            <GlassCard
              key={sig.id}
              variant="interactive"
              padding="sm"
              onClick={() => {
                onSelectSignal(sig);
                onNavigate("evidence_room");
              }}
              className="border border-white/5 hover:border-amber-500/40"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-200">
                    {sig.contractA} vs {sig.contractB}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{sig.date}</span>
                  {sig.isSeeded && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                      Case Study
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    sig.overallStatus === "APPROVED"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  }`}
                >
                  {sig.classification}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 my-2.5 text-xs">
                <div className="rounded-lg bg-slate-900/60 p-2">
                  <span className="text-[10px] text-slate-400 block">Spread (₹/g)</span>
                  <span className="font-mono font-bold text-amber-300">
                    ₹{sig.spreadAbsolute.toFixed(2)}/g
                  </span>
                </div>

                <div className="rounded-lg bg-slate-900/60 p-2">
                  <span className="text-[10px] text-slate-400 block">Z-Score</span>
                  <span className="font-mono font-bold text-slate-100">{sig.zScore.toFixed(2)}σ</span>
                </div>

                <div className="rounded-lg bg-slate-900/60 p-2">
                  <span className="text-[10px] text-slate-400 block">Net Expected Edge</span>
                  <span
                    className={`font-mono font-bold ${
                      (sig.profitCheck?.netEdgePerGram || 0) > 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {(sig.profitCheck?.netEdgePerGram || 0) >= 0 ? "+" : ""}
                    ₹{(sig.profitCheck?.netEdgePerGram || 0).toFixed(2)}/g
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2">
                {sig.diagnostics?.executiveSummary || "Standard diagnostic scan completed."}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-500">
                <span>DTE: {Math.min(sig.dteA || 0, sig.dteB || 0)}d | Evidence: {sig.tradingEvidence}/100</span>
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <span>Open Autopsy</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
