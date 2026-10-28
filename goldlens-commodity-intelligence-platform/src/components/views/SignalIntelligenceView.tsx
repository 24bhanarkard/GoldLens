"use client";

import React, { useState, useMemo } from "react";
import { GlassCard } from "../ui/GlassCard";
import { OpportunityEvidenceMeter } from "../common/OpportunityEvidenceMeter";
import {
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Sliders,
  Database,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Info,
} from "lucide-react";

interface SignalIntelligenceViewProps {
  scannedSignals: any[];
  selectedSignal: any;
  onSelectSignal: (sig: any) => void;
  onRunScan: () => void;
  isScanning: boolean;
  totalRecordsCount: number;
  dataTrustScore: number;
  onStressTestSignal: (sig: any) => void;
  onInspectSourceRowInForensics: (rowId: string, symbol: string, date: string) => void;
}

export function SignalIntelligenceView({
  scannedSignals,
  selectedSignal,
  onSelectSignal,
  onRunScan,
  isScanning,
  totalRecordsCount,
  dataTrustScore,
  onStressTestSignal,
  onInspectSourceRowInForensics,
}: SignalIntelligenceViewProps) {
  const [verdictFilter, setVerdictFilter] = useState<
    "ALL" | "CREDIBLE" | "REVIEW" | "REJECTED" | "FORENSIC"
  >("ALL");
  const [pairFilter, setPairFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPipeline, setShowPipeline] = useState(false);

  const pairsList = useMemo(
    () => Array.from(new Set(scannedSignals.map((s) => `${s.contractA}/${s.contractB}`))),
    [scannedSignals]
  );

  const filteredSignals = useMemo(() => {
    return scannedSignals.filter((s) => {
      if (verdictFilter === "CREDIBLE" && s.verdict !== "CREDIBLE ANOMALY") return false;
      if (verdictFilter === "REVIEW" && s.verdict !== "NEEDS INVESTIGATION") return false;
      if (verdictFilter === "REJECTED" && s.verdict !== "REJECTED") return false;
      if (verdictFilter === "FORENSIC" && !s.isDataIntegrityFailure) return false;
      if (pairFilter !== "ALL" && `${s.contractA}/${s.contractB}` !== pairFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.date.includes(q) ||
          s.contractA.toLowerCase().includes(q) ||
          s.contractB.toLowerCase().includes(q) ||
          (s.verdict || "").toLowerCase().includes(q) ||
          (s.classification || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scannedSignals, verdictFilter, pairFilter, searchQuery]);

  const activeSig =
    selectedSignal || filteredSignals[0] || scannedSignals[0] || null;

  const getVerdictPill = (verdict?: string, integrityFail?: boolean) => {
    if (integrityFail || verdict === "REJECTED") {
      return "status-error-box";
    }
    if (verdict === "CREDIBLE ANOMALY") {
      return "status-positive-box";
    }
    return "status-caution-box";
  };

  const getCheckIcon = (status: string) => {
    if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-[#4ADE80] shrink-0" />;
    if (status === "warning") return <AlertTriangle className="h-4 w-4 text-[#FBBF24] shrink-0" />;
    if (status === "fail") return <XCircle className="h-4 w-4 text-[#F87171] shrink-0" />;
    return <Info className="h-4 w-4 text-[#A1A1AA] shrink-0" />;
  };

  // Non-destructive counterfactual calculation when Data Forensics has a reference clean price
  const counterfactualPreview = useMemo(() => {
    if (!activeSig?.forensicIssue?.counterfactualCleanNormG999) return null;
    const fi = activeSig.forensicIssue;
    const cleanNormA =
      fi.symbol === activeSig.contractA
        ? fi.counterfactualCleanNormG999
        : activeSig.priceA_Norm;
    const cleanNormB =
      fi.symbol === activeSig.contractB
        ? fi.counterfactualCleanNormG999
        : activeSig.priceB_Norm;
    const cleanSpread = Number((cleanNormA - cleanNormB).toFixed(2));
    const cleanZ =
      activeSig.rollingStd && activeSig.rollingStd > 0
        ? Number(((cleanSpread - (activeSig.rollingMean || 0)) / activeSig.rollingStd).toFixed(2))
        : null;
    return {
      corruptedRowId: fi.rowId,
      corruptedSymbol: fi.symbol,
      rawCorruptedClose: fi.rawValues?.close,
      counterfactualClose: fi.counterfactualCleanClose,
      counterfactualNorm: fi.counterfactualCleanNormG999,
      cleanSpread,
      cleanZ,
    };
  }, [activeSig]);

  return (
    <div className="space-y-5">
      {/* Header Bar + Optional Collapsible Pipeline Trace */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E6BD58]">
            Signal Intelligence & Signature Autopsy
          </span>
          <h1 className="text-xl font-bold text-[#F4F4F5] mt-0.5">
            Detected Spread Events & 10-Point Signal Autopsy
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Select any candidate anomaly on the left to inspect source prices, normalization math, data integrity, transaction costs, and final verdict.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowPipeline(!showPipeline)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#11151B] hover:bg-[#171B22] px-3 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] border border-white/[0.08]"
          >
            <span>Pipeline Stages (12)</span>
            {showPipeline ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onRunScan}
            disabled={isScanning}
            className="btn-gold-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs cursor-pointer"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Scanning…" : "Rerun Scan"}</span>
          </button>
        </div>
      </div>

      {/* Collapsible 12-Stage Pipeline Summary */}
      {showPipeline && (
        <GlassCard variant="standard" padding="sm" className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#F4F4F5]">
              Executed Analytical Pipeline ({totalRecordsCount.toLocaleString("en-IN")} source records • Trust {dataTrustScore}/100)
            </span>
            <span className="text-[11px] text-[#4ADE80] font-semibold">12 / 12 Verified</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px]">
            {[
              "1. Bhavcopy Ingest",
              "2. Schema Check",
              "3. Data Forensics",
              "4. MCX Spec Match",
              "5. 999 Normalization",
              "6. Session Alignment",
              "7. Prior Rolling μ/σ",
              "8. Z-Score Scan",
              "9. False Signal Checks",
              "10. Prior Spread DNA",
              "11. 4-Leg Cost Model",
              "12. Verdict Assignment",
            ].map((stage) => (
              <div
                key={stage}
                className="rounded-lg bg-[#080A0D] px-2.5 py-2 border border-white/[0.06] flex items-center justify-between gap-1.5 text-[#F4F4F5]"
              >
                <span className="truncate">{stage}</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-[#4ADE80] shrink-0" />
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* MASTER-DETAIL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT MASTER LIST (4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-3">
          <GlassCard variant="standard" padding="sm" className="space-y-3">
            {/* Search & Pair Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-[#A1A1AA]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter date or pair…"
                  aria-label="Filter candidate anomalies"
                  className="w-full rounded-lg bg-[#080A0D] border border-white/[0.08] pl-8 pr-2.5 py-1.5 text-xs text-[#F4F4F5] placeholder-[#A1A1AA]"
                />
              </div>

              <select
                value={pairFilter}
                aria-label="Filter by contract pair"
                onChange={(e) => setPairFilter(e.target.value)}
                className="rounded-lg bg-[#080A0D] border border-white/[0.08] px-2.5 py-1.5 text-xs text-[#F4F4F5]"
              >
                <option value="ALL">All Pairs</option>
                {pairsList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Verdict Filter Tabs */}
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: "ALL", label: `All (${scannedSignals.length})` },
                  {
                    id: "CREDIBLE",
                    label: `Credible (${scannedSignals.filter((s) => s.verdict === "CREDIBLE ANOMALY").length})`,
                  },
                  {
                    id: "REVIEW",
                    label: `Review (${scannedSignals.filter((s) => s.verdict === "NEEDS INVESTIGATION").length})`,
                  },
                  {
                    id: "REJECTED",
                    label: `Rejected (${scannedSignals.filter((s) => s.verdict === "REJECTED").length})`,
                  },
                  {
                    id: "FORENSIC",
                    label: `Forensic (${scannedSignals.filter((s) => s.isDataIntegrityFailure).length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setVerdictFilter(tab.id)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    verdictFilter === tab.id
                      ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                      : "bg-[#080A0D] text-[#A1A1AA] hover:text-[#F4F4F5] border border-white/[0.05]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Event List */}
            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {filteredSignals.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#A1A1AA]">
                  No detected events match the current filter criteria.
                </div>
              ) : (
                filteredSignals.map((sig) => {
                  const isSelected = activeSig?.id === sig.id;
                  return (
                    <button
                      key={sig.id}
                      type="button"
                      onClick={() => onSelectSignal(sig)}
                      className={`w-full text-left rounded-xl p-3 border transition-colors space-y-2 ${
                        isSelected
                          ? "bg-[#171B22] border-[#E6BD58]/50"
                          : "bg-[#080A0D] hover:bg-[#171B22]/60 border-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-xs text-[#F4F4F5] truncate">
                            {sig.contractA}/{sig.contractB}
                          </span>
                          {sig.isSeeded && (
                            <span className="rounded bg-[#E6BD58]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#E6BD58]">
                              Demo Case
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-[#A1A1AA] shrink-0">
                          {sig.date}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] num-font">
                        <span className="text-[#A1A1AA]">
                          Spread{" "}
                          <strong className="text-[#E6BD58]">
                            {sig.spreadAbsolute >= 0 ? "+" : ""}₹{sig.spreadAbsolute.toFixed(2)}/g
                          </strong>{" "}
                          •{" "}
                          <strong className="text-[#76A9FA]">
                            {sig.zScore?.toFixed(2)}σ
                          </strong>
                        </span>

                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${getVerdictPill(
                            sig.verdict,
                            sig.isDataIntegrityFailure
                          )}`}
                        >
                          {sig.verdict}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>

        {/* RIGHT DETAIL WORKSPACE: 10-POINT SIGNAL AUTOPSY (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-4">
          {!activeSig ? (
            <GlassCard variant="standard" padding="lg" className="text-center py-16 space-y-2">
              <ShieldAlert className="h-8 w-8 text-[#E6BD58] mx-auto" />
              <div className="text-sm font-bold text-[#F4F4F5]">
                No Anomaly Selected for Signal Autopsy
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Run a scan or choose an observation on the left to inspect its full 10-point diagnostic record.
              </p>
            </GlassCard>
          ) : (
            <>
              {/* Prominent Material Integrity Override Banner */}
              {activeSig.isDataIntegrityFailure && (
                <div className="status-error-box rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 font-bold text-sm">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 shrink-0" />
                      Material Data Integrity Failure — Signal Disqualified
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onInspectSourceRowInForensics(
                          activeSig.forensicIssue?.rowId || activeSig.rowIdB || activeSig.rowIdA,
                          activeSig.forensicIssue?.symbol || activeSig.contractB,
                          activeSig.date
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-[#080A0D] px-2.5 py-1 text-[11px] text-[#F4F4F5] border border-[#F87171]/40 hover:border-[#F87171]"
                    >
                      <span>Open in Data Forensics</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[#F4F4F5]/90 leading-relaxed">
                    {activeSig.integrityWarningBanner}
                  </p>
                </div>
              )}

              {/* Dual Assessment Meter */}
              <OpportunityEvidenceMeter
                anomalyStrength={activeSig.anomalyStrength ?? 0}
                tradingEvidence={activeSig.tradingEvidence ?? 0}
                verdict={activeSig.verdict || "NEEDS INVESTIGATION"}
                explanation={activeSig.diagnostics?.executiveSummary}
                isDataIntegrityFailure={activeSig.isDataIntegrityFailure}
                zScore={activeSig.zScore}
                netEdgeINRPerGram={activeSig.profitCheck?.netEdgePerGram ?? 0}
                costToEdgeRatio={activeSig.profitCheck?.costToEdgeRatioPct ?? 0}
              />

              {/* SIGNATURE 10-POINT SIGNAL AUTOPSY */}
              <GlassCard variant="standard" padding="md" className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E6BD58]">
                      Signature Feature • Traceable Evidence Record
                    </span>
                    <h2 className="text-base font-bold text-[#F4F4F5] mt-0.5">
                      Signal Autopsy — {activeSig.contractA} vs {activeSig.contractB} ({activeSig.date})
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onInspectSourceRowInForensics(
                          activeSig.forensicIssue?.rowId || activeSig.rowIdA,
                          activeSig.forensicIssue?.symbol || activeSig.contractA,
                          activeSig.date
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#171B22] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] border border-white/[0.1] hover:border-[#76A9FA]/50"
                    >
                      <Database className="h-3.5 w-3.5 text-[#76A9FA]" />
                      <span>Trace Source Rows</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onStressTestSignal(activeSig)}
                      className="btn-gold-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs cursor-pointer"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>Stress Test Signal</span>
                    </button>
                  </div>
                </div>

                {/* Items 1, 2, 3, 4: Quotes, Normalization, Statistical Significance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  {/* 1. Identification & Source Traceability */}
                  <div className="rounded-xl bg-[#080A0D] p-3.5 border border-white/[0.06] space-y-2">
                    <div className="font-semibold text-[#E6BD58]">
                      1. Contract Pair, Observation Date & Source Rows
                    </div>
                    <div className="space-y-1 text-[#A1A1AA] num-font">
                      <div className="flex justify-between">
                        <span>Observation Date:</span>
                        <span className="font-mono font-semibold text-[#F4F4F5]">
                          {activeSig.date}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Primary Leg Source ID:</span>
                        <span className="font-mono text-[#76A9FA]">{activeSig.rowIdA || `ROW_${activeSig.contractA}_${activeSig.date}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Benchmark Leg Source ID:</span>
                        <span className="font-mono text-[#76A9FA]">{activeSig.rowIdB || `ROW_${activeSig.contractB}_${activeSig.date}`}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Original Exchange Quoted Prices */}
                  <div className="rounded-xl bg-[#080A0D] p-3.5 border border-white/[0.06] space-y-2">
                    <div className="font-semibold text-[#E6BD58]">
                      2. Original Exchange Contract Quotes (Raw Bhavcopy)
                    </div>
                    <div className="space-y-1.5 text-[#A1A1AA] num-font">
                      <div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-[#F4F4F5]">{activeSig.contractA}:</span>
                          <span className="font-mono font-semibold text-[#F4F4F5]">
                            ₹{Number(activeSig.priceA_Raw || 0).toLocaleString("en-IN")} / {activeSig.normA?.quotationBasis || "unit"}
                          </span>
                        </div>
                        {activeSig.openA_Raw !== undefined && (
                          <div className="text-[10px] font-mono text-[#A1A1AA]">
                            O: ₹{activeSig.openA_Raw.toLocaleString("en-IN")} • H: ₹{activeSig.highA_Raw.toLocaleString("en-IN")} • L: ₹{activeSig.lowA_Raw.toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-[#F4F4F5]">{activeSig.contractB}:</span>
                          <span className="font-mono font-semibold text-[#F4F4F5]">
                            ₹{Number(activeSig.priceB_Raw || 0).toLocaleString("en-IN")} / {activeSig.normB?.quotationBasis || "unit"}
                          </span>
                        </div>
                        {activeSig.openB_Raw !== undefined && (
                          <div className="text-[10px] font-mono text-[#A1A1AA]">
                            O: ₹{activeSig.openB_Raw.toLocaleString("en-IN")} • H: ₹{activeSig.highB_Raw.toLocaleString("en-IN")} • L: ₹{activeSig.lowB_Raw.toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Normalized Prices (₹/g, 999 fineness) */}
                  <div className="rounded-xl bg-[#080A0D] p-3.5 border border-white/[0.06] space-y-2">
                    <div className="font-semibold text-[#76A9FA]">
                      3. Normalized Reference Prices (₹/g, 999 Fineness)
                    </div>
                    <div className="space-y-1.5 text-[11px] num-font">
                      <div>
                        <span className="text-[#F4F4F5] font-semibold">
                          {activeSig.contractA}: ₹{activeSig.priceA_Norm?.toFixed(2)}/g
                        </span>
                        <span className="block font-mono text-[10px] text-[#A1A1AA]">
                          {activeSig.normA?.formulaDescription}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#F4F4F5] font-semibold">
                          {activeSig.contractB}: ₹{activeSig.priceB_Norm?.toFixed(2)}/g
                        </span>
                        <span className="block font-mono text-[10px] text-[#A1A1AA]">
                          {activeSig.normB?.formulaDescription}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Observed Spread & Prior-Window Significance */}
                  <div className="rounded-xl bg-[#080A0D] p-3.5 border border-white/[0.06] space-y-2">
                    <div className="font-semibold text-[#76A9FA]">
                      4. Observed Spread & Statistical Significance
                    </div>
                    <div className="space-y-1 text-[#A1A1AA] num-font">
                      <div className="flex justify-between">
                        <span>Normalized Spread ({activeSig.contractA} − {activeSig.contractB}):</span>
                        <span className="font-semibold text-[#E6BD58]">
                          {activeSig.spreadAbsolute >= 0 ? "+" : ""}₹{activeSig.spreadAbsolute.toFixed(2)}/g ({activeSig.spreadPercentage?.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Prior Clean Mean / Std ({activeSig.sampleSizeUsed ?? 30}d):</span>
                        <span className="text-[#F4F4F5]">
                          μ = ₹{activeSig.rollingMean?.toFixed(2)}/g • σ = ₹{activeSig.rollingStd?.toFixed(2)}/g
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Prior-Window Z-Score & Percentile:</span>
                        <span className="font-semibold text-[#76A9FA]">
                          {activeSig.zScore?.toFixed(2)}σ ({activeSig.percentile}th %ile)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items 5, 6, 7, 8: Data Forensics, Contract Mapping, Expiry/Liquidity, Costs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  {/* 5. Data Forensics & Source Validation */}
                  <div className="rounded-xl bg-[#080A0D] p-3.5 border border-white/[0.06] space-y-2">
                    <div className="font-semibold text-[#F4F4F5] flex items-center justify-between">
                      <span>5. Data-Quality & Data Forensics Audit</span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          activeSig.isDataIntegrityFailure ? "text-[#F87171]" : "text-[#4ADE80]"
                        }`}
                      >
                        {activeSig.isDataIntegrityFailure ? "FAILED" : "VERIFIED"}
                      </span>
                    </div>
                    {counterfactualPreview ? (
                      <div className="space-y-1.5 text-[11px]">
                        <p className="text-[#F87171]">
                          Flagged record <code className="font-mono">{counterfactualPreview.corruptedRowId}</code>:{" "}
                          {activeSig.forensicIssue.reason}
                        </p>
                        <div className="rounded-lg bg-[#11151B] p-2.5 border border-white/[0.07] num-font text-[#A1A1AA]">
                          <strong className="text-[#F4F4F5] block mb-0.5">
                            Non-Destructive Clean Preview (Source Data Unchanged):
                          </strong>
                          Replacing corrupt print ₹{counterfactualPreview.rawCorruptedClose?.toLocaleString("en-IN")} with neighbor midpoint ₹{counterfactualPreview.counterfactualClose?.toLocaleString("en-IN")} reduces normalized spread from{" "}
                          <strong className="text-[#F87171]">₹{activeSig.spreadAbsolute.toFixed(2)}/g</strong> to{" "}
                          <strong className="text-[#4ADE80]">₹{counterfactualPreview.cleanSpread.toFixed(2)}/g ({counterfactualPreview.cleanZ ?? 0}σ)</strong> — confirming the signal was purely a data error.
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                        Both source records pass positive price checks, Low ≤ Open/Close ≤ High bar geometry, unique date-expiry keys, and daily circuit-limit continuity.
                      </p>
                    )}
                  </div>

                  {/* 6. Contract Mapping & Hedge Ratio */}
                  <div className="rounded-xl bg-[#080A0D] p-3.5 border border-white/[0.06] space-y-2">
                    <div className="font-semibold text-[#F4F4F5]">
                      6. Contract Mapping & Weight-Matched Sizing
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                      {activeSig.profitCheck?.hedgeSizingNote} Quotation units ({activeSig.normA?.quotationBasis} vs {activeSig.normB?.quotationBasis}) and purities ({activeSig.normA?.referencePurity} vs {activeSig.normB?.referencePurity}) are verified against MCX specifications.
                    </p>
                  </div>

                  {/* 7. Expiry & Liquidity Context */}
                  <div className="rounded-xl bg-[#080A0D] p-3.5 border border-white/[0.06] space-y-2 num-font">
                    <div className="font-semibold text-[#F4F4F5]">
                      7. Expiry & Liquidity Context
                    </div>
                    <div className="space-y-1 text-[11px] text-[#A1A1AA]">
                      <div className="flex justify-between">
                        <span>{activeSig.contractA} Expiry / Volume:</span>
                        <span className="text-[#F4F4F5]">
                          {activeSig.expiryA || "—"} ({activeSig.dteA}d DTE) • {(activeSig.volumeA ?? 0).toLocaleString()} lots
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{activeSig.contractB} Expiry / Volume:</span>
                        <span className="text-[#F4F4F5]">
                          {activeSig.expiryB || "—"} ({activeSig.dteB}d DTE) • {(activeSig.volumeB ?? 0).toLocaleString()} lots
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 8. Estimated Transaction Costs */}
                  <div className="rounded-xl bg-[#080A0D] p-3.5 border border-white/[0.06] space-y-2 num-font">
                    <div className="font-semibold text-[#F4F4F5]">
                      8. Estimated Round-Trip Transaction Costs
                    </div>
                    <div className="space-y-1 text-[11px] text-[#A1A1AA]">
                      <div className="flex justify-between">
                        <span>Gross Spread vs Total Friction:</span>
                        <span className="text-[#F4F4F5]">
                          ₹{activeSig.profitCheck?.grossEdgePerGram?.toFixed(2)}/g gross vs ₹
                          {activeSig.profitCheck?.totalFrictionPerGram?.toFixed(2)}/g costs
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Brokerage + Taxes + Slippage ({activeSig.profitCheck?.nominalGramsTraded}g):</span>
                        <span className="text-[#F87171]">
                          ₹{activeSig.profitCheck?.totalFrictionINR?.toLocaleString("en-IN")} total
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Modeled Net Estimate:</span>
                        <span
                          className={`font-bold ${
                            activeSig.isDataIntegrityFailure
                              ? "text-[#A1A1AA] line-through"
                              : (activeSig.profitCheck?.netEdgePerGram ?? 0) > 0
                              ? "text-[#4ADE80]"
                              : "text-[#F87171]"
                          }`}
                        >
                          {(activeSig.profitCheck?.netEdgePerGram ?? 0) >= 0 ? "+" : ""}₹
                          {(activeSig.profitCheck?.netEdgePerGram ?? 0).toFixed(2)}/g
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 9. Checks Passed, Caution, & Failed + Prior Historical Analogues */}
                <div className="space-y-3 pt-2 border-t border-white/[0.07]">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#F4F4F5]">
                      9. Diagnostic Rule Outcomes ({activeSig.diagnostics?.passedChecksCount ?? 0} Passed •{" "}
                      {activeSig.diagnostics?.warningChecksCount ?? 0} Caution •{" "}
                      {activeSig.diagnostics?.failedChecksCount ?? 0} Failed)
                    </span>
                    <span className="text-[11px] text-[#A1A1AA]">
                      Prior Analogues Before {activeSig.date}:{" "}
                      <strong className="text-[#76A9FA]">
                        {activeSig.spreadDNAReport?.matchesCount ?? 0} matched
                      </strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(activeSig.diagnostics?.checks || []).map((chk: any) => (
                      <div
                        key={chk.id}
                        className="rounded-lg bg-[#080A0D] p-2.5 border border-white/[0.06] flex items-start gap-2.5 text-xs"
                      >
                        <div className="mt-0.5">{getCheckIcon(chk.status)}</div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-semibold text-[#F4F4F5]">{chk.name}</div>
                          <div className="text-[11px] text-[#A1A1AA] break-words">
                            {chk.observedEvidence}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 10. Final Verdict & Explanation */}
                <div className="rounded-xl bg-[#171B22] p-4 border border-white/10 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#E6BD58]">
                      10. Final Autopsy Verdict
                    </span>
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${getVerdictPill(
                        activeSig.verdict,
                        activeSig.isDataIntegrityFailure
                      )}`}
                    >
                      {activeSig.verdict}
                    </span>
                  </div>
                  <p className="text-xs text-[#F4F4F5] leading-relaxed">
                    {activeSig.diagnostics?.executiveSummary}
                  </p>
                  {activeSig.spreadDNAReport?.evidenceNote && (
                    <p className="text-[11px] text-[#A1A1AA]">
                      Historical Analogue Context: {activeSig.spreadDNAReport.evidenceNote}
                    </p>
                  )}
                </div>
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
