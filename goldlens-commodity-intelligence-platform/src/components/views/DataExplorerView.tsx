"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import {
  FileSpreadsheet,
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Download,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { DailyContractPoint } from "@/lib/analytics/spreads";
import { calculateDatasetTrustScore } from "@/lib/analytics/dataQuality";

interface DataExplorerViewProps {
  marketRecords: DailyContractPoint[];
  dataTrustScore: number;
  isDemo: boolean;
  onResetDemo: () => void;
  onUploadCSV: (csvText: string, datasetName: string) => Promise<any>;
}

export function DataExplorerView({
  marketRecords,
  dataTrustScore,
  isDemo,
  onResetDemo,
  onUploadCSV,
}: DataExplorerViewProps) {
  const [activeTab, setActiveTab] = useState<"records" | "upload" | "trust" | "rejected">("records");
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Upload state
  const [uploadText, setUploadText] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const trustReport = calculateDatasetTrustScore(
    marketRecords.map((r) => ({
      symbol: r.symbol,
      date: r.date,
      expiryDate: r.expiryDate,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
      openInterest: r.openInterest,
    }))
  );

  const symbols = Array.from(new Set(marketRecords.map((r) => r.symbol)));

  const filtered = marketRecords.filter((r) => {
    if (symbolFilter !== "ALL" && r.symbol !== symbolFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.date.includes(q) || r.symbol.toLowerCase().includes(q) || (r.qualityNotes && r.qualityNotes.toLowerCase().includes(q));
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleUploadSubmit = async () => {
    if (!uploadText.trim()) return;
    setIsUploading(true);
    setUploadMessage(null);
    try {
      const res = await onUploadCSV(uploadText, datasetName || "Uploaded MCX Bhavcopy");
      setUploadMessage(`Upload successful! Processed ${res.totalRows} rows (${res.validRows} accepted, ${res.rejectedRows} rejected).`);
      setUploadText("");
      setActiveTab("records");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadMessage(`Error: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDatasetName(file.name.replace(".csv", ""));
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setUploadText(text);
      };
      reader.readAsText(file);
    }
  };

  const downloadRecordsCSV = () => {
    const headers = "Symbol,Date,ExpiryDate,Open,High,Low,Close,Volume,OpenInterest,NormalizedPriceG999,DaysToExpiry,QualityFlag\n";
    const rows = marketRecords
      .map(
        (r) =>
          `${r.symbol},${r.date},${r.expiryDate},${r.open},${r.high},${r.low},${r.close},${r.volume},${r.openInterest},${r.normalizedPriceG999},${r.daysToExpiry},${r.qualityFlag}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GoldLens_Normalized_Market_Data.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              DATA INGESTION & QUALITY MATRIX
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <FileSpreadsheet className="h-5 w-5 text-amber-400" />
            <span>Data Explorer & CSV Ingestion Pipeline</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Validate Bhavcopy records, inspect normalized prices, audit rejected rows, and evaluate the 12-check Data Trust Score.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDemo && (
            <button
              onClick={onResetDemo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-amber-300 hover:text-white border border-white/10 text-xs font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset Demo Data</span>
            </button>
          )}

          <button
            onClick={downloadRecordsCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 text-xs">
        <button
          onClick={() => setActiveTab("records")}
          className={`flex-1 py-2 rounded-xl font-bold transition-all ${
            activeTab === "records"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Cleaned Market Records ({marketRecords.length})
        </button>

        <button
          onClick={() => setActiveTab("trust")}
          className={`flex-1 py-2 rounded-xl font-bold transition-all ${
            activeTab === "trust"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Data Trust Score ({dataTrustScore}/100)
        </button>

        <button
          onClick={() => setActiveTab("upload")}
          className={`flex-1 py-2 rounded-xl font-bold transition-all ${
            activeTab === "upload"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Upload MCX CSV (Mode A)
        </button>
      </div>

      {/* Tab 1: Cleaned Market Records Table */}
      {activeTab === "records" && (
        <GlassCard variant="standard" padding="md" className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by date or symbol..."
                className="w-full rounded-xl bg-slate-950/80 border border-white/10 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Contract:</span>
              <select
                value={symbolFilter}
                onChange={(e) => {
                  setSymbolFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Contracts</option>
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-bold">
                  <th className="py-2 pr-2">Symbol</th>
                  <th className="py-2 pr-2">Trading Date</th>
                  <th className="py-2 pr-2">Expiry Date</th>
                  <th className="py-2 pr-2">DTE</th>
                  <th className="py-2 pr-2">Open</th>
                  <th className="py-2 pr-2">High</th>
                  <th className="py-2 pr-2">Low</th>
                  <th className="py-2 pr-2">Close (Quoted)</th>
                  <th className="py-2 pr-2">Normalized (₹/g 999)</th>
                  <th className="py-2 pr-2">Volume</th>
                  <th className="py-2 pr-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {pagedRecords.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2 font-bold text-amber-300">{r.symbol}</td>
                    <td className="py-2 text-slate-300">{r.date}</td>
                    <td className="py-2 text-slate-400">{r.expiryDate}</td>
                    <td className="py-2 text-slate-400">{r.daysToExpiry}d</td>
                    <td className="py-2 text-slate-300">₹{r.open.toLocaleString("en-IN")}</td>
                    <td className="py-2 text-slate-300">₹{r.high.toLocaleString("en-IN")}</td>
                    <td className="py-2 text-slate-300">₹{r.low.toLocaleString("en-IN")}</td>
                    <td className="py-2 font-bold text-slate-100">₹{r.close.toLocaleString("en-IN")}</td>
                    <td className="py-2 font-bold text-amber-400">₹{r.normalizedPriceG999.toFixed(2)}/g</td>
                    <td className="py-2 text-slate-300">{r.volume.toLocaleString()}</td>
                    <td className="py-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          r.qualityFlag === "clean"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : r.qualityFlag === "warning"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-rose-500/15 text-rose-300"
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

          {/* Pagination */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-400">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} records
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded bg-slate-900 border border-white/10 disabled:opacity-40 text-slate-300"
              >
                Previous
              </button>
              <span className="px-2 font-mono font-bold text-slate-200">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded bg-slate-900 border border-white/10 disabled:opacity-40 text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Tab 2: 12-Check Data Trust Score Breakdown */}
      {activeTab === "trust" && (
        <div className="space-y-4">
          <GlassCard variant="standard" padding="md" className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                  FEATURE 5 • TRANSPARENT DATA QUALITY VERIFICATION
                </span>
                <h3 className="text-base font-bold text-slate-100">Data Trust Score: {trustReport.overallScore}/100</h3>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                trustReport.overallScore >= 85
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
              }`}>
                {trustReport.recommendation}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{trustReport.summaryMessage}</p>

            <div className="space-y-2 pt-2">
              {trustReport.checks.map((chk) => (
                <div
                  key={chk.id}
                  className="rounded-xl glass-subtle p-3 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    {chk.status === "pass" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : chk.status === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-200">{chk.name}</div>
                      <div className="text-[11px] text-slate-400">{chk.explanation}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {chk.violationsCount} violations (-{chk.scoreImpact} pts)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab 3: Upload MCX CSV */}
      {activeTab === "upload" && (
        <GlassCard variant="standard" padding="md" className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                MODE A • REAL BHAVCOPY CSV INGESTION
              </span>
              <h3 className="text-base font-bold text-slate-100">Upload Historical MCX CSV File</h3>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* File Input */}
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-amber-500/40 transition-colors">
              <UploadCloud className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <div className="font-bold text-slate-200 mb-1">Click to browse or drop an MCX Bhavcopy CSV</div>
              <p className="text-[11px] text-slate-400">Expected columns: Symbol, Date, ExpiryDate, Open, High, Low, Close, Volume, OpenInterest</p>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="mt-3 text-xs text-slate-400" />
            </div>

            {/* Manual CSV Text Area */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Or Paste CSV Data Directly:</label>
              <textarea
                rows={6}
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder="Symbol,Date,ExpiryDate,Open,High,Low,Close,Volume,OpenInterest&#10;GOLDM,2024-11-01,2024-12-05,74200,74600,74100,74500,12000,18000"
                className="w-full rounded-xl bg-slate-950 border border-white/10 p-3 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {uploadMessage && (
              <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                {uploadMessage}
              </div>
            )}

            <button
              onClick={handleUploadSubmit}
              disabled={isUploading || !uploadText.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
            >
              {isUploading ? "Validating & Ingesting..." : "Process & Normalize CSV"}
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
