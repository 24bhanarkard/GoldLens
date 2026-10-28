"use client";

import React, { useState, useEffect, useMemo } from "react";
import { GlassCard } from "../ui/GlassCard";
import { FuturesCurveChart } from "../charts/FuturesCurveChart";
import {
  Database,
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Download,
  Search,
  RefreshCw,
  Coins,
  Eye,
  FileWarning,
} from "lucide-react";
import {
  DEFAULT_CONTRACT_REGISTRY,
  normalizePrice,
  getHedgeMatchedSizing,
  ContractMetadata,
} from "@/lib/analytics/contracts";
import {
  DailyContractPoint,
  calculateAlignedSpreads,
} from "@/lib/analytics/spreads";
import { calculateDatasetTrustScore } from "@/lib/analytics/dataQuality";

interface DataContractsViewProps {
  marketRecords: DailyContractPoint[];
  rejectedRows: any[];
  dataTrustScore: number;
  isDemo: boolean;
  datasetName?: string;
  highlightedRowId?: string | null;
  initialSubTab?: "forensics" | "explorer" | "contracts";
  onResetDemo: () => void;
  onUploadCSV: (
    csvText: string,
    datasetName: string,
    columnMapping?: Record<string, string>
  ) => Promise<any>;
}

const SAMPLE_VALIDATION_CSV = `Symbol,Date,ExpiryDate,Open,High,Low,Close,Volume,OpenInterest
GOLDM,2025-11-03,2025-12-05,92400,92680,92250,92540,14200,19100
GOLDTEN,2025-11-03,2025-11-28,92810,93020,92690,92910,9600,12400
GOLDM,2025-11-04,2025-12-05,92550,92890,92410,92720,13800,19300
GOLDTEN,2025-11-04,2025-11-28,92920,93150,92800,93080,9900,12550
GOLDM,2025-11-05,2025-12-05,92700,92100,92600,92500,11200,19000
GOLDTEN,2025-11-05,2025-11-28,93050,93200,-100,93100,8500,12100`;

export function DataContractsView({
  marketRecords,
  rejectedRows,
  dataTrustScore,
  isDemo,
  datasetName,
  highlightedRowId,
  initialSubTab = "explorer",
  onResetDemo,
  onUploadCSV,
}: DataContractsViewProps) {
  const [subTab, setSubTab] = useState<"forensics" | "explorer" | "contracts">(
    highlightedRowId ? "forensics" : initialSubTab
  );

  useEffect(() => {
    if (highlightedRowId) {
      setSubTab("forensics");
    }
  }, [highlightedRowId]);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // Data Forensics counterfactual preview toggle
  const [previewCleanMode, setPreviewCleanMode] = useState(false);

  // Explorer filter, sort, pagination state
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [qualityFilter, setQualityFilter] = useState<"ALL" | "clean" | "warning" | "corrupted">(
    "ALL"
  );
  const [dateMinFilter, setDateMinFilter] = useState("");
  const [dateMaxFilter, setDateMaxFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "close" | "norm" | "volume" | "dte">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const pageSize = 20;

  // CSV Upload state
  const [uploadText, setUploadText] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    isError: boolean;
    message: string;
  } | null>(null);

  // Contract Explorer state
  const [selectedSymbol, setSelectedSymbol] = useState("GOLDTEN");
  const [customTestQuote, setCustomTestQuote] = useState<number>(92900);

  const trustReport = useMemo(
    () =>
      calculateDatasetTrustScore(
        marketRecords.map((r) => ({
          rowId: r.rowId,
          symbol: r.symbol,
          date: r.date,
          expiryDate: r.expiryDate,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.volume,
          openInterest: r.openInterest,
          qualityFlag: r.qualityFlag,
          qualityNotes: r.qualityNotes,
        }))
      ),
    [marketRecords]
  );

  // Non-destructive forensic impact comparison on GOLDM / GOLDPETAL around corrupted print
  const forensicSpreadComparison = useMemo(() => {
    const dataM = marketRecords.filter((r) => r.symbol === "GOLDM");
    const dataP = marketRecords.filter((r) => r.symbol === "GOLDPETAL");
    if (dataM.length < 16 || dataP.length < 16) return null;

    const rawAligned = calculateAlignedSpreads(dataM, dataP, {
      lookbackWindow: 30,
      excludeCorruptedRows: false,
    });
    const cleanAligned = calculateAlignedSpreads(dataM, dataP, {
      lookbackWindow: 30,
      excludeCorruptedRows: true,
    });

    const corruptSession = rawAligned.find((s) => s.qualityStatus === "corrupted");
    return {
      rawAnomaliesCount: rawAligned.filter((s) => s.isAnomaly).length,
      cleanAnomaliesCount: cleanAligned.filter((s) => s.isAnomaly).length,
      corruptSession,
    };
  }, [marketRecords]);

  const symbols = useMemo(
    () => Array.from(new Set(marketRecords.map((r) => r.symbol))),
    [marketRecords]
  );

  const filteredAndSortedRecords = useMemo(() => {
    const list = marketRecords.filter((r) => {
      if (symbolFilter !== "ALL" && r.symbol !== symbolFilter) return false;
      if (qualityFilter !== "ALL" && r.qualityFlag !== qualityFilter) return false;
      if (dateMinFilter && r.date < dateMinFilter) return false;
      if (dateMaxFilter && r.date > dateMaxFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.date.includes(q) ||
          r.symbol.toLowerCase().includes(q) ||
          (r.rowId || "").toLowerCase().includes(q) ||
          (r.qualityNotes || "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") cmp = a.date.localeCompare(b.date);
      else if (sortBy === "close") cmp = a.close - b.close;
      else if (sortBy === "norm") cmp = a.normalizedPriceG999 - b.normalizedPriceG999;
      else if (sortBy === "volume") cmp = a.volume - b.volume;
      else if (sortBy === "dte") cmp = a.daysToExpiry - b.daysToExpiry;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [
    marketRecords,
    symbolFilter,
    qualityFilter,
    dateMinFilter,
    dateMaxFilter,
    searchQuery,
    sortBy,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRecords.length / pageSize));
  const pagedRecords = filteredAndSortedRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSort = (col: "date" | "close" | "norm" | "volume" | "dte") => {
    if (sortBy === col) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadName(file.name.replace(/\.csv$/i, ""));
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadText(String(ev.target?.result || ""));
      };
      reader.readAsText(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadText.trim()) return;
    setIsUploading(true);
    setUploadFeedback(null);
    try {
      const res = await onUploadCSV(uploadText, uploadName || "Uploaded MCX CSV");
      if (res.success) {
        setUploadFeedback({
          isError: false,
          message: res.staged
            ? `Validated and staged ${res.validRows} valid row(s) with ${res.rejectedRows} rejected row(s). The active dashboard is unchanged. Click “Run Intelligence Scan” in the top bar to apply this dataset.`
            : `Imported ${res.validRows} valid row(s) and flagged ${res.rejectedRows} rejected row(s). Dataset Trust Score: ${res.dataTrustScore}/100.`,
        });
        setUploadText("");
        if (res.staged) setSubTab("explorer");
      } else {
        setUploadFeedback({
          isError: true,
          message: res.error || "CSV validation failed.",
        });
      }
    } catch (err: unknown) {
      setUploadFeedback({
        isError: true,
        message: err instanceof Error ? err.message : "Upload failed.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const exportValidCSV = () => {
    const headers =
      "RowID,Symbol,Date,ExpiryDate,DTE,QuotedOpen,QuotedHigh,QuotedLow,QuotedClose,NormalizedPriceG999,Volume,OpenInterest,QualityStatus\n";
    const rows = filteredAndSortedRecords
      .map(
        (r) =>
          `${r.rowId || ""},${r.symbol},${r.date},${r.expiryDate},${r.daysToExpiry},${r.open},${r.high},${r.low},${r.close},${r.normalizedPriceG999.toFixed(4)},${r.volume},${r.openInterest},${r.qualityFlag}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GoldLens_Audited_Records.csv";
    a.click();
  };

  const exportRejectedCSV = () => {
    const headers = "RowNumber,RejectionReason,RawRecordJSON\n";
    const rows = rejectedRows
      .map(
        (r) =>
          `${r.rowNumber},"${String(r.rejectionReason || "").replace(/"/g, '""')}","${JSON.stringify(
            r.rawData || {}
          ).replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GoldLens_Rejected_Rows.csv";
    a.click();
  };

  const selectedContract: ContractMetadata =
    DEFAULT_CONTRACT_REGISTRY[selectedSymbol] || DEFAULT_CONTRACT_REGISTRY["GOLDTEN"];
  const liveNormalization = normalizePrice(customTestQuote, selectedSymbol);

  return (
    <div className="space-y-6">
      {/* Header + 3 Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E6BD58]">
            Data Provenance, Forensics & MCX Registry
          </span>
          <h1 className="text-xl font-bold text-[#F4F4F5] mt-0.5">
            Data & Contracts — {isDemo ? "Synthetic Demo Dataset" : datasetName || "Uploaded CSV"}
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Data Trust Score: <strong className="text-[#4ADE80]">{dataTrustScore}/100</strong> •{" "}
            {marketRecords.length.toLocaleString("en-IN")} accepted records •{" "}
            {rejectedRows.length} rejected import rows • {trustReport.forensicIssues.length} forensic flags
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Data and Contracts tabs"
          className="inline-flex items-center gap-1 bg-[#11151B] p-1 rounded-xl border border-white/[0.08] text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "forensics"}
            onClick={() => setSubTab("forensics")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors ${
              subTab === "forensics"
                ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            <FileWarning className="h-3.5 w-3.5" />
            <span>Data Forensics ({trustReport.forensicIssues.length + rejectedRows.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === "explorer"}
            onClick={() => setSubTab("explorer")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors ${
              subTab === "explorer"
                ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Data Explorer & CSV</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === "contracts"}
            onClick={() => setSubTab("contracts")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors ${
              subTab === "contracts"
                ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            <span>Contract Specifications</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SUB-TAB 1: DATA FORENSICS (PART 8)                                */}
      {/* ================================================================= */}
      {subTab === "forensics" && (
        <div className="space-y-5">
          {/* Trust Score Rule Breakdown */}
          <GlassCard variant="standard" padding="md" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.07]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#76A9FA]">
                  Rule-Based Source Audit
                </span>
                <h2 className="text-base font-bold text-[#F4F4F5] mt-0.5">
                  Data Trust Score ({trustReport.overallScore}/100) & Validation Rules
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPreviewCleanMode(!previewCleanMode)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  previewCleanMode
                    ? "bg-[#171B22] text-[#4ADE80] border-[#4ADE80]/40"
                    : "bg-[#080A0D] text-[#F4F4F5] border-white/[0.1]"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>
                  {previewCleanMode
                    ? "Showing Clean Counterfactual Preview (Source Preserved)"
                    : "Preview Counterfactual Clean Impact"}
                </span>
              </button>
            </div>

            {previewCleanMode && forensicSpreadComparison?.corruptSession && (
              <div className="status-positive-box rounded-xl p-3.5 text-xs space-y-1 num-font">
                <div className="font-bold">
                  Non-Destructive Forensics Preview (Original Source Data Unmodified)
                </div>
                <p className="text-[#F4F4F5]/90 leading-relaxed">
                  Excluding corrupt record{" "}
                  <code className="font-mono">
                    {forensicSpreadComparison.corruptSession.rowIdB}
                  </code>{" "}
                  ({forensicSpreadComparison.corruptSession.date}, raw spread ₹
                  {forensicSpreadComparison.corruptSession.spreadAbsolute.toFixed(2)}/g) removes the phantom{" "}
                  {forensicSpreadComparison.corruptSession.zScore?.toFixed(2)}σ outlier on GOLDM/GOLDPETAL and reduces total pair anomalies from{" "}
                  <strong>{forensicSpreadComparison.rawAnomaliesCount}</strong> to{" "}
                  <strong>{forensicSpreadComparison.cleanAnomaliesCount}</strong>. Source records in memory and CSV exports remain untouched.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {trustReport.checks.map((chk) => (
                <div
                  key={chk.id}
                  className="rounded-xl bg-[#080A0D] p-3.5 border border-white/[0.06] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#F4F4F5] flex items-center gap-2">
                      {chk.status === "pass" ? (
                        <CheckCircle2 className="h-4 w-4 text-[#4ADE80] shrink-0" />
                      ) : chk.status === "warning" ? (
                        <AlertTriangle className="h-4 w-4 text-[#FBBF24] shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[#F87171] shrink-0" />
                      )}
                      {chk.name}
                    </span>
                    <span className="font-mono text-[11px] text-[#A1A1AA]">
                      {chk.scoreImpact > 0 ? `-${chk.scoreImpact} pts` : "0 penalty"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">{chk.explanation}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Flagged Source Records Table */}
          <GlassCard variant="standard" padding="md" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.07]">
              <h3 className="text-sm font-bold text-[#F4F4F5]">
                Flagged Source Records & Traceable Forensic Diagnostics ({trustReport.forensicIssues.length})
              </h3>
              {rejectedRows.length > 0 && (
                <button
                  type="button"
                  onClick={exportRejectedCSV}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#171B22] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] border border-white/[0.1]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Rejected Import Rows ({rejectedRows.length})</span>
                </button>
              )}
            </div>

            {trustReport.forensicIssues.length === 0 && rejectedRows.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#A1A1AA]">
                Zero suspicious or rejected records detected in the active dataset.
              </div>
            ) : (
              <div className="space-y-2.5">
                {trustReport.forensicIssues.map((fi) => {
                  const isHighlighted = highlightedRowId === fi.rowId;
                  return (
                    <div
                      key={`${fi.rowId}_${fi.ruleId}`}
                      className={`rounded-xl p-4 border text-xs space-y-2 ${
                        isHighlighted
                          ? "bg-[#171B22] border-[#E6BD58]"
                          : "bg-[#080A0D] border-white/[0.07]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#E6BD58]">{fi.rowId}</span>
                          <span className="font-semibold text-[#F4F4F5]">
                            {fi.symbol} • {fi.date} (Exp: {fi.expiryDate})
                          </span>
                          {isHighlighted && (
                            <span className="rounded bg-[#E6BD58] px-2 py-0.5 text-[10px] font-bold text-[#080A0D]">
                              TRACED FROM SIGNAL AUTOPSY
                            </span>
                          )}
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            fi.severity === "critical" ? "status-error-box" : "status-caution-box"
                          }`}
                        >
                          {fi.ruleName}
                        </span>
                      </div>

                      <div className="font-mono text-[11px] text-[#A1A1AA] num-font">
                        Original Source Values — Open: ₹{fi.rawValues.open.toLocaleString("en-IN")} • High: ₹
                        {fi.rawValues.high.toLocaleString("en-IN")} • Low: ₹
                        {fi.rawValues.low.toLocaleString("en-IN")} • Close:{" "}
                        <strong className="text-[#F87171]">
                          ₹{fi.rawValues.close.toLocaleString("en-IN")}
                        </strong>{" "}
                        • Volume: {fi.rawValues.volume.toLocaleString("en-IN")}
                        {fi.counterfactualCleanClose && (
                          <span className="ml-2 text-[#4ADE80]">
                            [Reference Clean Close Preview: ₹
                            {fi.counterfactualCleanClose.toLocaleString("en-IN")} → ₹
                            {fi.counterfactualCleanNormG999}/g]
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#F4F4F5]/90">
                        <strong className="text-[#A1A1AA]">Rule Violation: </strong>
                        {fi.reason}
                      </p>
                      <p className="text-[11px] text-[#A1A1AA]">
                        <strong className="text-[#76A9FA]">Impact on Analytics: </strong>
                        {fi.impactOnAnalytics}
                      </p>
                    </div>
                  );
                })}

                {rejectedRows.map((rej, idx) => (
                  <div
                    key={`rej_${idx}`}
                    className="rounded-xl bg-[#080A0D] p-3.5 border border-[#F87171]/30 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F87171]">
                        Rejected CSV Row #{rej.rowNumber}
                      </span>
                      <span className="status-error-box rounded px-2 py-0.5 text-[10px] font-bold">
                        EXCLUDED ON IMPORT
                      </span>
                    </div>
                    <p className="text-[11px] text-[#F4F4F5]">{rej.rejectionReason}</p>
                    <pre className="text-[10px] text-[#A1A1AA] font-mono overflow-x-auto">
                      {JSON.stringify(rej.rawData)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 2: DATA EXPLORER & CSV UPLOAD                             */}
      {/* ================================================================= */}
      {subTab === "explorer" && (
        <div className="space-y-5">
          {/* Compact CSV Upload & Sample Test Loader */}
          <GlassCard variant="standard" padding="md" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.07]">
              <div>
                <h2 className="text-sm font-bold text-[#F4F4F5]">
                  Import MCX Bhavcopy CSV (With Structural Validation & Rejected-Row Audit)
                </h2>
                <p className="text-[11px] text-[#A1A1AA]">
                  Accepts Symbol, Date, ExpiryDate, Open, High, Low, Close, Volume, OpenInterest. Invalid rows are never silently discarded.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadName("Sample Validation Test CSV");
                    setUploadText(SAMPLE_VALIDATION_CSV);
                  }}
                  className="rounded-lg bg-[#171B22] px-3 py-1.5 text-xs font-medium text-[#76A9FA] border border-[#76A9FA]/30 hover:text-[#F4F4F5]"
                >
                  Load Sample CSV (4 Valid + 2 Bad Rows)
                </button>

                {!confirmResetOpen ? (
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#171B22] px-3 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] border border-white/[0.08]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Reset Demo Dataset</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmResetOpen(false);
                        onResetDemo();
                      }}
                      className="rounded-lg bg-[#F87171] px-2.5 py-1.5 text-xs font-bold text-[#080A0D]"
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetOpen(false)}
                      className="rounded-lg bg-[#11151B] px-2.5 py-1.5 text-xs text-[#A1A1AA]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start text-xs">
              <div className="rounded-xl bg-[#080A0D] p-4 border border-dashed border-white/15 space-y-2">
                <UploadCloud className="h-6 w-6 text-[#E6BD58]" />
                <div className="font-semibold text-[#F4F4F5]">Select Local `.csv` File</div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Upload MCX CSV file"
                  onChange={handleFileUpload}
                  className="w-full text-[11px] text-[#A1A1AA]"
                />
              </div>

              <div className="lg:col-span-2 space-y-2">
                <textarea
                  rows={4}
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  placeholder="Symbol,Date,ExpiryDate,Open,High,Low,Close,Volume,OpenInterest"
                  className="w-full rounded-xl bg-[#080A0D] border border-white/[0.1] p-3 font-mono text-[11px] text-[#F4F4F5] placeholder-[#A1A1AA]"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {uploadFeedback ? (
                    <span
                      className={`text-xs font-medium ${
                        uploadFeedback.isError ? "text-[#F87171]" : "text-[#4ADE80]"
                      }`}
                    >
                      {uploadFeedback.message}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#A1A1AA]">
                      Source values remain unaltered alongside normalized ₹/g columns.
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleUploadSubmit}
                    disabled={isUploading || !uploadText.trim()}
                    className="btn-gold-primary rounded-lg px-4 py-1.5 text-xs cursor-pointer"
                  >
                    {isUploading ? "Validating…" : "Validate & Import CSV"}
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Filterable, Sortable, Paginated Records Table */}
          <GlassCard variant="standard" padding="md" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-[#A1A1AA]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search row ID, symbol, date…"
                    className="rounded-lg bg-[#080A0D] border border-white/[0.1] pl-8 pr-3 py-1.5 text-xs text-[#F4F4F5]"
                  />
                </div>

                <select
                  value={symbolFilter}
                  aria-label="Filter records by contract symbol"
                  onChange={(e) => {
                    setSymbolFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1.5 text-xs text-[#F4F4F5]"
                >
                  <option value="ALL">All Symbols</option>
                  {symbols.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={qualityFilter}
                  aria-label="Filter records by quality status"
                  onChange={(e) => {
                    setQualityFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1.5 text-xs text-[#F4F4F5]"
                >
                  <option value="ALL">All Quality States</option>
                  <option value="clean">Clean</option>
                  <option value="warning">Warning (Near Expiry / Thin)</option>
                  <option value="corrupted">Corrupted</option>
                </select>

                <input
                  type="date"
                  value={dateMinFilter}
                  aria-label="Start date filter"
                  onChange={(e) => {
                    setDateMinFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1.5 text-xs text-[#F4F4F5]"
                />
                <input
                  type="date"
                  value={dateMaxFilter}
                  aria-label="End date filter"
                  onChange={(e) => {
                    setDateMaxFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1.5 text-xs text-[#F4F4F5]"
                />
              </div>

              <button
                type="button"
                onClick={exportValidCSV}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#171B22] px-3 py-1.5 text-xs font-semibold text-[#F4F4F5] border border-white/[0.1]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Filtered CSV ({filteredAndSortedRecords.length})</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[#A1A1AA]">
                    <th className="py-2 pr-2">Contract</th>
                    <th className="py-2 pr-2">
                      <button
                        type="button"
                        onClick={() => toggleSort("date")}
                        className="font-semibold hover:text-[#F4F4F5]"
                      >
                        Date {sortBy === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="py-2 pr-2">Expiry</th>
                    <th className="py-2 pr-2">
                      <button
                        type="button"
                        onClick={() => toggleSort("dte")}
                        className="font-semibold hover:text-[#F4F4F5]"
                      >
                        DTE {sortBy === "dte" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="py-2 pr-2">Open</th>
                    <th className="py-2 pr-2">High</th>
                    <th className="py-2 pr-2">Low</th>
                    <th className="py-2 pr-2">
                      <button
                        type="button"
                        onClick={() => toggleSort("close")}
                        className="font-semibold hover:text-[#F4F4F5]"
                      >
                        Quoted Close {sortBy === "close" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="py-2 pr-2">
                      <button
                        type="button"
                        onClick={() => toggleSort("norm")}
                        className="font-semibold text-[#E6BD58]"
                      >
                        Normalized ₹/g (999) {sortBy === "norm" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="py-2 pr-2">
                      <button
                        type="button"
                        onClick={() => toggleSort("volume")}
                        className="font-semibold hover:text-[#F4F4F5]"
                      >
                        Volume {sortBy === "volume" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="py-2 pr-2">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] num-font text-[11px]">
                  {pagedRecords.map((r, idx) => (
                    <tr key={`${r.rowId || idx}`} className="hover:bg-[#171B22]/50">
                      <td className="py-2 pr-2 font-bold text-[#F4F4F5]">{r.symbol}</td>
                      <td className="py-2 pr-2 font-mono text-[#A1A1AA]">{r.date}</td>
                      <td className="py-2 pr-2 font-mono text-[#A1A1AA]">{r.expiryDate}</td>
                      <td className="py-2 pr-2 text-[#A1A1AA]">{r.daysToExpiry}d</td>
                      <td className="py-2 pr-2 text-[#A1A1AA]">
                        ₹{r.open.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 pr-2 text-[#A1A1AA]">
                        ₹{r.high.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 pr-2 text-[#A1A1AA]">
                        ₹{r.low.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 pr-2 font-semibold text-[#F4F4F5]">
                        ₹{r.close.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 pr-2 font-semibold text-[#E6BD58]">
                        ₹{r.normalizedPriceG999.toFixed(2)}/g
                      </td>
                      <td className="py-2 pr-2 text-[#A1A1AA]">{r.volume.toLocaleString()}</td>
                      <td className="py-2 pr-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            r.qualityFlag === "clean"
                              ? "status-positive-box"
                              : r.qualityFlag === "warning"
                              ? "status-caution-box"
                              : "status-error-box"
                          }`}
                        >
                          {r.qualityFlag}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.07] text-xs text-[#A1A1AA] num-font">
              <span>
                Showing{" "}
                {filteredAndSortedRecords.length === 0
                  ? 0
                  : (currentPage - 1) * pageSize + 1}{" "}
                – {Math.min(currentPage * pageSize, filteredAndSortedRecords.length)} of{" "}
                {filteredAndSortedRecords.length} records
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1 disabled:opacity-40 text-[#F4F4F5]"
                >
                  Prev
                </button>
                <span className="px-2 font-semibold text-[#F4F4F5]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg bg-[#080A0D] border border-white/[0.1] px-2.5 py-1 disabled:opacity-40 text-[#F4F4F5]"
                >
                  Next
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 3: VERIFIED MCX CONTRACT SPECIFICATIONS                   */}
      {/* ================================================================= */}
      {subTab === "contracts" && (
        <div className="space-y-5">
          {/* Contract Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.values(DEFAULT_CONTRACT_REGISTRY).map((c) => {
              const isSelected = selectedSymbol === c.symbol;
              return (
                <button
                  key={c.symbol}
                  type="button"
                  onClick={() => {
                    setSelectedSymbol(c.symbol);
                    setCustomTestQuote(
                      c.quotationGrams === 10
                        ? 92900
                        : c.quotationGrams === 8
                        ? 74320
                        : 9290
                    );
                  }}
                  className={`text-left rounded-xl p-3.5 border transition-colors space-y-2 ${
                    isSelected
                      ? "bg-[#171B22] border-[#E6BD58]/50"
                      : "bg-[#11151B] hover:bg-[#171B22] border-white/[0.07]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#F4F4F5]">{c.symbol}</span>
                    <span className="font-mono text-xs text-[#E6BD58]">
                      {c.nominalQtyGrams >= 1000 ? `${c.nominalQtyGrams / 1000}kg` : `${c.nominalQtyGrams}g`}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#A1A1AA]">
                    Quote: <strong className="text-[#F4F4F5]">{c.priceUnit}</strong>
                  </div>
                  <div className="text-[11px] text-[#A1A1AA] flex justify-between num-font">
                    <span>{c.referencePurity} fine</span>
                    <span>From {c.applicableFrom.slice(0, 7)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Specification + Interactive Normalization Verifier */}
          <GlassCard variant="standard" padding="md" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.07]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E6BD58]">
                  Verified MCX Contract Specification
                </span>
                <h2 className="text-base font-bold text-[#F4F4F5] mt-0.5">
                  {selectedContract.symbol} — {selectedContract.description}
                </h2>
              </div>
              <span className="text-xs font-mono text-[#76A9FA]">
                {selectedContract.specificationSource}
              </span>
            </div>

            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              {selectedContract.specificationNotes}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs num-font">
              <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
                <span className="text-[11px] text-[#A1A1AA] block">Trading Unit (Lot)</span>
                <span className="font-bold text-[#F4F4F5] mt-0.5 block">
                  {selectedContract.nominalQtyGrams} grams
                </span>
              </div>
              <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
                <span className="text-[11px] text-[#A1A1AA] block">Quotation Basis</span>
                <span className="font-bold text-[#E6BD58] mt-0.5 block">
                  {selectedContract.priceUnit} (×{selectedContract.quotationMultiplier})
                </span>
              </div>
              <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
                <span className="text-[11px] text-[#A1A1AA] block">Fineness & Factor</span>
                <span className="font-bold text-[#76A9FA] mt-0.5 block">
                  {selectedContract.referencePurity} (×{(999 / selectedContract.referencePurity).toFixed(6)})
                </span>
              </div>
              <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
                <span className="text-[11px] text-[#A1A1AA] block">Effective / Expiry Rule</span>
                <span className="font-semibold text-[#F4F4F5] mt-0.5 block text-[11px]">
                  {selectedContract.expiryRule}
                </span>
              </div>
            </div>

            {/* Interactive Quote Normalization Tester */}
            <div className="rounded-xl bg-[#080A0D] p-4 border border-white/[0.07] space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#F4F4F5]">
                  Interactive Normalization Verifier ({selectedContract.symbol})
                </span>
                <div className="flex items-center gap-2 num-font">
                  <label htmlFor="norm-test-input" className="text-[#A1A1AA]">
                    Raw Exchange Quote (₹):
                  </label>
                  <input
                    id="norm-test-input"
                    type="number"
                    value={customTestQuote}
                    onChange={(e) => setCustomTestQuote(Number(e.target.value) || 0)}
                    className="w-28 rounded-lg bg-[#11151B] border border-white/[0.12] px-2.5 py-1 text-xs text-[#F4F4F5] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 font-mono text-[11px] text-[#A1A1AA]">
                {liveNormalization.steps.map((st, idx) => (
                  <div key={idx}>• {st}</div>
                ))}
              </div>
            </div>

            {/* Pairwise Hedge Matching Table */}
            <div className="overflow-x-auto pt-1">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[#A1A1AA]">
                    <th className="py-2 pr-3">Contract Pair</th>
                    <th className="py-2 pr-3">Matched Weight (LCM)</th>
                    <th className="py-2 pr-3">Exact Hedge Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-[11px] num-font">
                  {[
                    ["GOLDM", "GOLDTEN"],
                    ["GOLDM", "GOLDGUINEA"],
                    ["GOLDGUINEA", "GOLDPETAL"],
                    ["GOLDM", "GOLDPETAL"],
                    ["GOLD", "GOLDM"],
                  ].map(([a, b]) => {
                    const h = getHedgeMatchedSizing(a, b);
                    return (
                      <tr key={`${a}_${b}`}>
                        <td className="py-2 pr-3 font-semibold text-[#F4F4F5]">
                          {a} / {b}
                        </td>
                        <td className="py-2 pr-3 text-[#E6BD58] font-semibold">
                          {h.matchedGrams} grams
                        </td>
                        <td className="py-2 pr-3 text-[#A1A1AA]">{h.explanation}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GlassCard variant="standard" padding="md">
            <FuturesCurveChart records={marketRecords} />
          </GlassCard>
        </div>
      )}
    </div>
  );
}
