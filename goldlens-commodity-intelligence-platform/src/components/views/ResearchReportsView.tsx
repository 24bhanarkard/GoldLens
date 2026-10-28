"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import {
  FileText,
  Sparkles,
  Download,
  Printer,
  CheckCircle2,
  Calendar,
  Layers,
  Coins,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

interface ResearchReportsViewProps {
  contractA: string;
  contractB: string;
  onGenerateReport: (contractA: string, contractB: string) => Promise<any>;
}

export function ResearchReportsView({
  contractA,
  contractB,
  onGenerateReport,
}: ResearchReportsViewProps) {
  const [activeReport, setActiveReport] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await onGenerateReport(contractA, contractB);
      if (res.report) {
        setActiveReport(res.report);
      }
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    if (!activeReport) return;
    const blob = new Blob([JSON.stringify(activeReport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeReport.id}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              FEATURE 10 • INSTITUTIONAL DOSSIER EXPORT
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <FileText className="h-5 w-5 text-amber-400" />
            <span>One-Click Quantitative Research Report Generator</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Produce an executive quantitative research dossier summarizing normalization derivations, Data Trust integrity, transaction friction, and walk-forward backtests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeReport && (
            <>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Report</span>
              </button>
              <button
                onClick={handleDownloadJSON}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON</span>
              </button>
            </>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
            <span>{isGenerating ? "Compiling Dossier..." : `Generate Dossier (${contractA} vs ${contractB})`}</span>
          </button>
        </div>
      </div>

      {/* Report Document View */}
      {activeReport ? (
        <GlassCard variant="standard" padding="lg" className="space-y-6 print:bg-white print:text-black">
          {/* Dossier Header */}
          <div className="pb-4 border-b border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                DOCUMENT ID: {activeReport.id}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeReport.dataMode === "synthetic_demo" ? "SYNTHETIC DEMO EVALUATION" : "HISTORICAL BHAVCOPY DATASET"}
              </span>
            </div>

            <h1 className="text-xl font-extrabold text-slate-100">{activeReport.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono pt-1">
              <span>Pair: <strong className="text-slate-200">{activeReport.contractPair}</strong></span>
              <span>Period: <strong className="text-slate-200">{activeReport.analysisPeriod}</strong></span>
              <span>Verdict: <strong className="text-amber-400 font-bold">{activeReport.conclusion}</strong></span>
            </div>
          </div>

          {/* Key Metrics Dashboard in Report */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl glass-subtle p-3 space-y-1 border border-white/5">
              <span className="text-[10px] text-slate-400">Data Trust Score</span>
              <div className="font-mono text-base font-bold text-emerald-400">{activeReport.metrics?.trustScore}/100</div>
              <span className="text-[10px] text-slate-500">12 checks passed</span>
            </div>

            <div className="rounded-xl glass-subtle p-3 space-y-1 border border-white/5">
              <span className="text-[10px] text-slate-400">Anomalies Detected</span>
              <div className="font-mono text-base font-bold text-amber-300">{activeReport.metrics?.anomaliesCount} events</div>
              <span className="text-[10px] text-slate-500">|Z| ≥ 2.0σ threshold</span>
            </div>

            <div className="rounded-xl glass-subtle p-3 space-y-1 border border-white/5">
              <span className="text-[10px] text-slate-400">Backtest Net PnL</span>
              <div className="font-mono text-base font-bold text-emerald-400">
                ₹{activeReport.metrics?.netPnL?.toLocaleString("en-IN") || 0}
              </div>
              <span className="text-[10px] text-slate-500">Win Rate: {activeReport.metrics?.winRate}%</span>
            </div>

            <div className="rounded-xl glass-subtle p-3 space-y-1 border border-white/5">
              <span className="text-[10px] text-slate-400">Max Drawdown</span>
              <div className="font-mono text-base font-bold text-slate-200">{activeReport.metrics?.maxDrawdown}%</div>
              <span className="text-[10px] text-slate-500">Profit Factor: {activeReport.metrics?.profitFactor}x</span>
            </div>
          </div>

          {/* Structured Dossier Sections */}
          <div className="space-y-6 pt-2">
            {activeReport.sections.map((sec: any, idx: number) => (
              <div key={idx} className="space-y-2 border-b border-white/5 pb-4">
                <h3 className="font-bold text-sm text-amber-300">{sec.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{sec.content}</p>

                {sec.keyFindings && (
                  <div className="mt-2 space-y-1 rounded-xl bg-slate-950/60 p-3 text-xs">
                    <span className="font-bold text-slate-200 block text-[11px]">Primary Findings:</span>
                    {sec.keyFindings.map((kf: string, kidx: number) => (
                      <div key={kidx} className="flex items-start gap-2 text-slate-300">
                        <span className="text-amber-400 shrink-0">■</span>
                        <span>{kf}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Dossier Footer */}
          <div className="pt-2 text-[11px] text-slate-500 text-center font-mono">
            GOLDLENS QUANTITATIVE INTELLIGENCE PLATFORM • GENERATED VIA PLATFORM ENGINE
          </div>
        </GlassCard>
      ) : (
        <GlassCard variant="standard" padding="xl" className="text-center py-16 space-y-4">
          <FileText className="h-12 w-12 text-amber-400/60 mx-auto" />
          <h3 className="text-base font-bold text-slate-100">Ready to Compile Quantitative Dossier</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click the button above to synthesize all analytical calculations, Data Trust validation results, False Signal Detective findings, and walk-forward backtests for {contractA} vs {contractB} into an institutional research report.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md"
          >
            {isGenerating ? "Compiling..." : `Generate Report for ${contractA}/${contractB}`}
          </button>
        </GlassCard>
      )}
    </div>
  );
}
