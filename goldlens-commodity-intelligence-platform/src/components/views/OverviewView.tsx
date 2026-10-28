"use client";

import React, { useMemo, useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { RelativePriceLandscape } from "../charts/RelativePriceLandscape";
import { PAIR_OPTIONS } from "../layout/Navbar";
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Activity,
  ArrowRight,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Database,
} from "lucide-react";
import { DailyContractPoint, AlignedSpreadPoint } from "@/lib/analytics/spreads";
import { SEEDED_CASE_STUDIES, SeededCaseInfo } from "@/lib/analytics/syntheticData";

interface OverviewViewProps {
  marketRecords: DailyContractPoint[];
  alignedSpreads: AlignedSpreadPoint[];
  scannedSignals: any[];
  activePair: { a: string; b: string };
  selectedPair: { a: string; b: string };
  onPairChange: (pair: { a: string; b: string }) => void;
  lookbackWindow: number;
  selectedLookbackWindow: number;
  onLookbackChange: (val: number) => void;
  hasPendingAnalysis: boolean;
  pendingDatasetName?: string;
  isDemo: boolean;
  datasetName?: string;
  dataTrustScore: number;
  forensicFlagsCount: number;
  scanError?: string | null;
  onNavigate: (view: string) => void;
  onSelectCase: (c: SeededCaseInfo) => void;
  onSelectSignalForAutopsy: (sig: any) => void;
  onSelectSignalForStressTest: (sig: any) => void;
  onRunScan: () => void;
  isScanning: boolean;
}

export function OverviewView({
  marketRecords,
  alignedSpreads,
  scannedSignals,
  activePair,
  selectedPair,
  onPairChange,
  lookbackWindow,
  selectedLookbackWindow,
  onLookbackChange,
  hasPendingAnalysis,
  pendingDatasetName,
  isDemo,
  datasetName,
  dataTrustScore,
  forensicFlagsCount,
  scanError,
  onNavigate,
  onSelectCase,
  onSelectSignalForAutopsy,
  onSelectSignalForStressTest,
  onRunScan,
  isScanning,
}: OverviewViewProps) {
  const [findingIndex, setFindingIndex] = useState(0);

  // Filter signals belonging to active pair first
  const pairSignals = useMemo(() => {
    const matching = scannedSignals.filter(
      (s) => s.contractA === activePair.a && s.contractB === activePair.b
    );
    // Prioritize seeded or highest |zScore| event first so the flagship finding is immediately meaningful
    return [...matching].sort((x, y) => {
      if (x.isSeeded && !y.isSeeded) return -1;
      if (!x.isSeeded && y.isSeeded) return 1;
      return Math.abs(y.zScore || 0) - Math.abs(x.zScore || 0);
    });
  }, [scannedSignals, activePair.a, activePair.b]);

  const safeIdx = pairSignals.length > 0 ? findingIndex % pairSignals.length : 0;
  const primaryFinding = pairSignals[safeIdx] || scannedSignals[0] || null;

  const latestObservation = alignedSpreads[alignedSpreads.length - 1] || null;

  const credibleCount = scannedSignals.filter((s) => s.verdict === "CREDIBLE ANOMALY").length;
  const investigationCount = scannedSignals.filter(
    (s) => s.verdict === "NEEDS INVESTIGATION"
  ).length;
  const rejectedCount = scannedSignals.filter((s) => s.verdict === "REJECTED").length;

  const anomalyPins = useMemo(
    () =>
      pairSignals.map((s) => ({
        date: s.date,
        verdict: s.verdict || "NEEDS INVESTIGATION",
        spreadAbsolute: s.spreadAbsolute,
      })),
    [pairSignals]
  );

  // Dynamic contract pair list (includes any custom uploaded symbols automatically)
  const availablePairs = useMemo(() => {
    const syms = Array.from(new Set(marketRecords.map((r) => r.symbol)));
    const base = [...PAIR_OPTIONS];
    if (
      syms.length >= 2 &&
      !base.some((p) => p.a === selectedPair.a && p.b === selectedPair.b)
    ) {
      base.unshift({
        a: selectedPair.a,
        b: selectedPair.b,
        label: `${selectedPair.a} / ${selectedPair.b} (selected)` ,
      });
    }
    return base;
  }, [marketRecords, selectedPair.a, selectedPair.b]);

  const getVerdictStyle = (verdict?: string, integrityFailed?: boolean) => {
    if (integrityFailed || verdict === "REJECTED") {
      return {
        pill: "status-error-box",
        icon: XCircle,
        border: "border-[#F87171]/35",
      };
    }
    if (verdict === "CREDIBLE ANOMALY") {
      return {
        pill: "status-positive-box",
        icon: CheckCircle2,
        border: "border-[#4ADE80]/30",
      };
    }
    return {
      pill: "status-caution-box",
      icon: AlertTriangle,
      border: "border-[#FBBF24]/30",
    };
  };

  const dates = useMemo(
    () => Array.from(new Set(marketRecords.map((r) => r.date))).sort(),
    [marketRecords]
  );

  return (
    <div className="space-y-6">
      {/* 1. COMPACT HERO SECTION */}
      <GlassCard variant="elevated" padding="md" className="border-white/[0.09]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold tracking-tight text-[#F4F4F5]">
                GoldLens
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6BD58]">
                COMMODITY INTELLIGENCE
              </span>
              <span className="text-white/15">•</span>
              {isDemo ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBBF24]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#FBBF24] border border-[#FBBF24]/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" />
                  Synthetic demo data ({dates[0] || "—"} to {dates[dates.length - 1] || "—"})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#76A9FA]/12 px-2.5 py-0.5 text-[11px] font-medium text-[#76A9FA] border border-[#76A9FA]/30">
                  <Database className="h-3 w-3" />
                  Uploaded data: {datasetName || "Custom CSV"}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
              See the signal behind the spread.
            </h1>

            <p className="text-sm text-[#A1A1AA]">
              Compare gold futures. Investigate anomalies. Test whether the evidence holds up.
            </p>
          </div>

          {/* Compact Walkthrough Presets for Quick 3-Min Demo */}
          {isDemo && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A1A1AA]">
                Reference Scenarios (Synthetic Demo)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SEEDED_CASE_STUDIES.map((cs, i) => {
                  const isActivePair =
                    selectedPair.a === cs.contractA && selectedPair.b === cs.contractB;
                  return (
                    <button
                      key={cs.id}
                      type="button"
                      onClick={() => onSelectCase(cs)}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium border transition-colors ${
                        isActivePair
                          ? "bg-[#171B22] text-[#E6BD58] border-[#E6BD58]/40"
                          : "bg-[#11151B] text-[#A1A1AA] hover:text-[#F4F4F5] border-white/[0.07]"
                      }`}
                    >
                      {i + 1}. {cs.contractA}/{cs.contractB} ({cs.expectedVerdict === "CREDIBLE ANOMALY" ? "Credible" : cs.expectedClassification === "EXPIRY_SENSITIVE" ? "Expiry Trap" : cs.expectedClassification === "REJECTED_AFTER_COSTS" ? "Cost Mirage" : "Corrupt Print"})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. CONTRACT-SELECTION TOOLBAR */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Contract Pair Selector */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="hero-pair-select"
                className="text-xs font-medium text-[#A1A1AA]"
              >
                Contract Pair
              </label>
              <select
                id="hero-pair-select"
                disabled={isScanning}
                value={`${selectedPair.a}_${selectedPair.b}`}
                onChange={(e) => {
                  const [a, b] = e.target.value.split("_");
                  setFindingIndex(0);
                  onPairChange({ a, b });
                }}
                className="rounded-lg bg-[#080A0D] px-3 py-2 text-xs font-semibold text-[#F4F4F5] border border-white/[0.1] hover:border-[#E6BD58]/40 transition-colors"
              >
                {availablePairs.map((opt) => (
                  <option key={`${opt.a}_${opt.b}`} value={`${opt.a}_${opt.b}`}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Lookback Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#A1A1AA]">Lookback</span>
              <div
                role="group"
                aria-label="Rolling lookback window"
                className="inline-flex rounded-lg bg-[#080A0D] p-1 border border-white/[0.09]"
              >
                {[20, 30, 60, 90].map((w) => (
                  <button
                    key={w}
                    type="button"
                    disabled={isScanning}
                    onClick={() => onLookbackChange(w)}
                    className={`rounded-md px-2.5 py-1 text-xs num-font transition-colors ${
                      selectedLookbackWindow === w
                        ? "bg-[#171B22] text-[#E6BD58] font-semibold"
                        : "text-[#A1A1AA] hover:text-[#F4F4F5]"
                    }`}
                  >
                    {w}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-h-[46px] min-w-[208px] flex-col items-end justify-center gap-1">
            <span
              aria-live="polite"
              className={`h-3.5 max-w-full truncate text-[10px] ${
                scanError
                  ? "text-[#F87171]"
                  : isScanning
                  ? "text-[#76A9FA]"
                  : hasPendingAnalysis
                  ? "text-[#FBBF24]"
                  : "text-transparent"
              }`}
            >
              {scanError ||
                (isScanning
                  ? "Analyzing selection… current results remain visible"
                  : hasPendingAnalysis
                  ? pendingDatasetName
                    ? `Ready to analyze ${pendingDatasetName}`
                    : "Selection changed — run a scan to apply"
                  : "Ready")}
            </span>
            <button
              type="button"
              onClick={onRunScan}
              disabled={isScanning}
              aria-busy={isScanning}
              className="btn-gold-primary inline-flex h-9 w-[208px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-xs cursor-pointer"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
              <span>Run Intelligence Scan</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* 3. FOUR COMPACT SUMMARY METRICS (Data Integrity First!) */}
      <div className="grid auto-rows-[116px] grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Metric 1: Data Integrity Status (Highest visual priority) */}
        <GlassCard
          variant="interactive"
          padding="sm"
          onClick={() => onNavigate("data_contracts")}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span className="font-medium">Data Integrity Status</span>
            <ShieldCheck
              className={`h-4 w-4 ${
                dataTrustScore >= 85 ? "text-[#4ADE80]" : "text-[#FBBF24]"
              }`}
            />
          </div>
          <div className="flex items-baseline gap-2 num-font">
            <span
              className={`text-2xl font-bold ${
                dataTrustScore >= 85
                  ? "text-[#4ADE80]"
                  : dataTrustScore >= 65
                  ? "text-[#FBBF24]"
                  : "text-[#F87171]"
              }`}
            >
              {dataTrustScore}/100
            </span>
            <span className="text-xs text-[#A1A1AA]">
              {marketRecords.length.toLocaleString("en-IN")} rows audited
            </span>
          </div>
          <p className="text-[11px] text-[#A1A1AA]">
            {forensicFlagsCount > 0
              ? `${forensicFlagsCount} source anomaly isolated by Data Forensics`
              : "OHLC bar bounds & quote continuity verified"}
          </p>
        </GlassCard>

        {/* Metric 2: Detected Events */}
        <GlassCard
          variant="interactive"
          padding="sm"
          onClick={() => onNavigate("signal_intelligence")}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span className="font-medium">Detected Events (|Z| ≥ 1.8σ)</span>
            <Activity className="h-4 w-4 text-[#76A9FA]" />
          </div>
          <div className="flex items-baseline gap-2 num-font">
            <span className="text-2xl font-bold text-[#F4F4F5]">{pairSignals.length}</span>
            <span className="text-xs text-[#76A9FA]">
              on {activePair.a}/{activePair.b}
            </span>
          </div>
          <p className="text-[11px] text-[#A1A1AA] num-font">
            {scannedSignals.length} total events across 5 MCX gold pairs
          </p>
        </GlassCard>

        {/* Metric 3: Diagnostic Classification Split */}
        <GlassCard
          variant="interactive"
          padding="sm"
          onClick={() => onNavigate("signal_intelligence")}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span className="font-medium">Signal Qualification</span>
            <ShieldAlert className="h-4 w-4 text-[#E6BD58]" />
          </div>
          <div className="flex items-baseline gap-3 num-font">
            <span className="text-2xl font-bold text-[#4ADE80]">{credibleCount}</span>
            <span className="text-xs text-[#A1A1AA]">Credible</span>
            <span className="text-sm font-semibold text-[#FBBF24]">{investigationCount}</span>
            <span className="text-xs text-[#A1A1AA]">Review</span>
            <span className="text-sm font-semibold text-[#F87171]">{rejectedCount}</span>
            <span className="text-xs text-[#A1A1AA]">Rejected</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA]">
            Filtered for expiry, liquidity, costs & bad prints
          </p>
        </GlassCard>

        {/* Metric 4: Current Analysis Status */}
        <GlassCard
          variant="interactive"
          padding="sm"
          onClick={() => onNavigate("market_analysis")}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span className="font-medium">Latest Aligned Session</span>
            <span className="font-mono text-[11px] text-[#76A9FA]">
              {latestObservation?.date || "—"}
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 num-font">
            <span className="text-2xl font-bold text-[#E6BD58]">
              {latestObservation
                ? `${latestObservation.spreadAbsolute >= 0 ? "+" : ""}₹${latestObservation.spreadAbsolute.toFixed(2)}/g`
                : "Unavailable"}
            </span>
            {latestObservation?.zScore !== null && latestObservation?.zScore !== undefined && (
              <span className="text-xs text-[#A1A1AA]">
                ({latestObservation.zScore.toFixed(2)}σ)
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#A1A1AA]">
            {latestObservation
              ? latestObservation.isAnomaly
                ? "Active statistical divergence on latest close"
                : `Within normal ${lookbackWindow}d range (μ = ₹${latestObservation.rollingMean?.toFixed(2) ?? "—"}/g)`
              : "Insufficient aligned observations"}
          </p>
        </GlassCard>
      </div>

      {/* 4. PRIMARY HERO VISUALIZATION: NORMALIZED RELATIVE-PRICE LANDSCAPE */}
      <GlassCard variant="standard" padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/[0.07]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#76A9FA]">
              Normalized Relative-Price Landscape
            </span>
            <h2 className="text-base font-bold text-[#F4F4F5] mt-0.5">
              {activePair.a} vs {activePair.b} — Standardized ₹/g (999-Fineness Equivalent)
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("market_analysis")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#76A9FA] hover:text-[#F4F4F5] transition-colors"
          >
            <span>Open Spread & Distribution Analysis</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="pt-4">
          <RelativePriceLandscape
            records={marketRecords}
            contractA={activePair.a}
            contractB={activePair.b}
            lookbackWindow={lookbackWindow}
            anomalyPoints={anomalyPins}
            activeAnomalyDate={primaryFinding?.date}
            onSelectAnomalyDate={(date) => {
              const match =
                pairSignals.find((s) => s.date === date) ||
                scannedSignals.find((s) => s.date === date);
              if (match) {
                onSelectSignalForAutopsy(match);
              }
            }}
          />
        </div>
      </GlassCard>

      {/* 5. PRIMARY INTELLIGENCE FINDING */}
      {primaryFinding ? (
        (() => {
          const style = getVerdictStyle(
            primaryFinding.verdict,
            primaryFinding.isDataIntegrityFailure
          );
          const VerdictIcon = style.icon;

          return (
            <GlassCard
              variant="elevated"
              padding="md"
              className={`min-h-[360px] space-y-4 ${style.border}`}
            >
              {/* Prominent Material Integrity Override Banner when Data Integrity Fails */}
              {primaryFinding.isDataIntegrityFailure && (
                <div className="status-error-box rounded-xl p-3.5 flex items-start gap-3 text-xs">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold">
                      Material Data Integrity Failure Overrides High Z-Score
                    </div>
                    <p className="text-[#F4F4F5]/90 leading-relaxed">
                      {primaryFinding.integrityWarningBanner}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E6BD58]">
                      Highlighted Intelligence Finding
                    </span>
                    {pairSignals.length > 1 && (
                      <div className="inline-flex items-center gap-1 ml-2">
                        <button
                          type="button"
                          aria-label="Previous detected event"
                          onClick={() =>
                            setFindingIndex(
                              (prev) => (prev - 1 + pairSignals.length) % pairSignals.length
                            )
                          }
                          className="rounded p-0.5 bg-[#11151B] text-[#A1A1AA] hover:text-[#F4F4F5] border border-white/[0.08]"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-[11px] text-[#A1A1AA] num-font px-1">
                          {safeIdx + 1} / {pairSignals.length}
                        </span>
                        <button
                          type="button"
                          aria-label="Next detected event"
                          onClick={() =>
                            setFindingIndex((prev) => (prev + 1) % pairSignals.length)
                          }
                          className="rounded p-0.5 bg-[#11151B] text-[#A1A1AA] hover:text-[#F4F4F5] border border-white/[0.08]"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#F4F4F5]">
                    {primaryFinding.contractA} vs {primaryFinding.contractB} • Observation{" "}
                    <span className="font-mono text-[#E6BD58]">{primaryFinding.date}</span>
                    {primaryFinding.seedCaseTitle ? ` — ${primaryFinding.seedCaseTitle}` : ""}
                  </h3>
                </div>

                {/* Standardized Verdict Pill */}
                <div
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold self-start sm:self-auto ${style.pill}`}
                >
                  <VerdictIcon className="h-4 w-4" />
                  <span>{primaryFinding.verdict}</span>
                </div>
              </div>

              {/* Key Quantitative Evidence Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs num-font">
                <div className="rounded-lg bg-[#11151B] p-3 border border-white/[0.06]">
                  <span className="text-[11px] text-[#A1A1AA] block">Observed Spread</span>
                  <span className="text-base font-bold text-[#E6BD58] mt-0.5 block">
                    {primaryFinding.spreadAbsolute >= 0 ? "+" : ""}₹
                    {primaryFinding.spreadAbsolute.toFixed(2)}/g
                  </span>
                  <span className="text-[10px] text-[#A1A1AA]">
                    {primaryFinding.spreadPercentage?.toFixed(2)}% relative basis
                  </span>
                </div>

                <div className="rounded-lg bg-[#11151B] p-3 border border-white/[0.06]">
                  <span className="text-[11px] text-[#A1A1AA] block">Statistical Rarity</span>
                  <span className="text-base font-bold text-[#76A9FA] mt-0.5 block">
                    {primaryFinding.zScore > 0 ? "+" : ""}
                    {primaryFinding.zScore?.toFixed(2)}σ
                  </span>
                  <span className="text-[10px] text-[#A1A1AA]">
                    {primaryFinding.percentile}th %ile vs prior window
                  </span>
                </div>

                <div className="rounded-lg bg-[#11151B] p-3 border border-white/[0.06]">
                  <span className="text-[11px] text-[#A1A1AA] block">Data Quality Status</span>
                  <span
                    className={`text-base font-bold mt-0.5 block uppercase ${
                      primaryFinding.isDataIntegrityFailure
                        ? "text-[#F87171]"
                        : primaryFinding.qualityStatus === "warning"
                        ? "text-[#FBBF24]"
                        : "text-[#4ADE80]"
                    }`}
                  >
                    {primaryFinding.isDataIntegrityFailure
                      ? "INTEGRITY FAIL"
                      : primaryFinding.qualityStatus || "CLEAN"}
                  </span>
                  <span className="text-[10px] text-[#A1A1AA]">
                    {primaryFinding.diagnostics?.passedChecksCount ?? 0}/10 checks passed
                  </span>
                </div>

                <div className="rounded-lg bg-[#11151B] p-3 border border-white/[0.06]">
                  <span className="text-[11px] text-[#A1A1AA] block">
                    Modeled Net Edge ({primaryFinding.profitCheck?.nominalGramsTraded ?? 100}g)
                  </span>
                  <span
                    className={`text-base font-bold mt-0.5 block ${
                      primaryFinding.isDataIntegrityFailure
                        ? "text-[#A1A1AA] line-through"
                        : (primaryFinding.profitCheck?.netEdgePerGram ?? 0) > 0
                        ? "text-[#4ADE80]"
                        : "text-[#F87171]"
                    }`}
                  >
                    {(primaryFinding.profitCheck?.netEdgePerGram ?? 0) >= 0 ? "+" : ""}₹
                    {(primaryFinding.profitCheck?.netEdgePerGram ?? 0).toFixed(2)}/g
                  </span>
                  <span className="text-[10px] text-[#A1A1AA]">
                    {primaryFinding.isDataIntegrityFailure
                      ? "Invalidated by bad print"
                      : `Friction: ₹${(primaryFinding.profitCheck?.totalFrictionPerGram ?? 0).toFixed(2)}/g`}
                  </span>
                </div>
              </div>

              {/* Plain-English Diagnostic Explanation + Inspect Evidence CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <p className="text-xs text-[#F4F4F5]/90 leading-relaxed max-w-3xl">
                  <strong className="text-[#A1A1AA] font-semibold">Diagnostic Outcome: </strong>
                  {primaryFinding.diagnostics?.executiveSummary}
                </p>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectSignalForStressTest(primaryFinding)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#11151B] hover:bg-[#171B22] px-3.5 py-2 text-xs font-semibold text-[#F4F4F5] border border-white/[0.1] transition-colors"
                  >
                    <Sliders className="h-3.5 w-3.5 text-[#76A9FA]" />
                    <span>Stress Test</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectSignalForAutopsy(primaryFinding)}
                    className="btn-gold-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs cursor-pointer"
                  >
                    <span>Inspect Evidence</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </GlassCard>
          );
        })()
      ) : (
        <GlassCard variant="standard" padding="md" className="min-h-[360px] text-center py-10 space-y-2">
          <div className="text-sm font-semibold text-[#F4F4F5]">
            No statistical spread anomalies exceeded the threshold for {activePair.a} / {activePair.b}
          </div>
          <p className="text-xs text-[#A1A1AA] max-w-lg mx-auto">
            An absence of anomalies means observed price differences stayed within normal rolling bounds. Switch contract pairs or run a fresh scan to inspect other contracts.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
