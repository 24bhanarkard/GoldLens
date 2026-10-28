"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "../ui/GlassCard";
import {
  FileText,
  Sparkles,
  Download,
  Printer,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface ReportsMethodologyViewProps {
  contractA: string;
  contractB: string;
  initialSubTab?: "reports" | "methodology";
  onGenerateReport: (contractA: string, contractB: string) => Promise<any>;
}

export function ReportsMethodologyView({
  contractA,
  contractB,
  initialSubTab = "reports",
  onGenerateReport,
}: ReportsMethodologyViewProps) {
  const [subTab, setSubTab] = useState<"reports" | "methodology">(initialSubTab);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const [activeReport, setActiveReport] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string>("normalization");

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // Fetch saved reports on load if any exist
  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.reports) && d.reports.length > 0) {
          setReportHistory(d.reports);
          setActiveReport(d.reports[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await onGenerateReport(contractA, contractB);
      if (res?.report) {
        setActiveReport(res.report);
        setReportHistory((prev) => [
          res.report,
          ...prev.filter((r) => r.id !== res.report.id),
        ]);
      } else {
        setErrorMsg(res?.error || "Unable to compile dossier for this pair.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Report generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadHTML = () => {
    if (!activeReport) return;
    const sectionsHtml = (activeReport.sections || [])
      .map(
        (sec: any) => `
        <section style="margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #272d38;">
          <h2 style="color:#E6BD58;font-size:16px;margin:0 0 8px 0;">${sec.title}</h2>
          <p style="color:#E4E4E7;font-size:13px;line-height:1.6;margin:0 0 10px 0;">${sec.content}</p>
          ${
            sec.keyFindings
              ? `<ul style="margin:8px 0 0 18px;color:#A1A1AA;font-size:12px;line-height:1.6;">${sec.keyFindings
                  .map((k: string) => `<li>${k}</li>`)
                  .join("")}</ul>`
              : ""
          }
        </section>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${activeReport.title}</title>
</head>
<body style="background:#080A0D;color:#F4F4F5;font-family:system-ui,-apple-system,sans-serif;max-width:860px;margin:40px auto;padding:32px;">
  <div style="border-bottom:1px solid #272d38;padding-bottom:16px;margin-bottom:24px;">
    <div style="color:#E6BD58;font-size:11px;font-weight:700;letter-spacing:0.14em;">GOLDLENS • COMMODITY INTELLIGENCE RESEARCH DOSSIER</div>
    <h1 style="font-size:22px;margin:8px 0;">${activeReport.title}</h1>
    <div style="font-size:12px;color:#A1A1AA;">
      Pair: <strong>${activeReport.contractPair}</strong> &nbsp;|&nbsp;
      Period: <strong>${activeReport.analysisPeriod}</strong> &nbsp;|&nbsp;
      Data Mode: <strong>${activeReport.dataMode === "synthetic_demo" ? "SYNTHETIC DEMO DATA" : "UPLOADED CSV DATA"}</strong> &nbsp;|&nbsp;
      Verdict: <strong style="color:#E6BD58;">${activeReport.conclusion}</strong>
    </div>
  </div>
  ${sectionsHtml}
  <footer style="font-size:11px;color:#A1A1AA;">
    Disclaimer: GoldLens is a quantitative research and educational tool. Results are not financial advice or a forecast of live trading returns.
  </footer>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeReport.id}.html`;
    a.click();
  };

  const handleDownloadJSON = () => {
    if (!activeReport) return;
    const blob = new Blob([JSON.stringify(activeReport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeReport.id}.json`;
    a.click();
  };

  const methodologyItems = [
    {
      id: "normalization",
      num: "01",
      title: "MCX Quotation & Fineness Normalization (₹/g, 999 Standard)",
      body: (
        <div className="space-y-2.5 text-xs text-[#A1A1AA] leading-relaxed">
          <p>
            MCX gold futures quote in different weight denominators and underlying purities. GoldLens converts every contract quote into a common analytical benchmark of <strong className="text-[#F4F4F5]">₹ per 1 gram of 999-fineness gold</strong> while preserving the original exchange quote for trade sizing and cost calculations:
          </p>
          <div className="rounded-lg bg-[#080A0D] p-3 font-mono text-[11px] text-[#E6BD58] border border-white/[0.06] space-y-1">
            <div>PricePerGram_Raw = QuotedPrice ÷ QuotationGrams</div>
            <div>NormalizedPrice_999 (₹/g) = PricePerGram_Raw × (999 / ContractPurity)</div>
            <div className="text-[#76A9FA]">
              • GOLD (1kg, 995, ₹/10g) & GOLDM (100g, 995, ₹/10g): (Quote ÷ 10) × (999 / 995)
            </div>
            <div className="text-[#76A9FA]">
              • GOLDTEN (10g, 999, ₹/10g — MCX/TRD/714/2024, eff. Apr 1, 2025): (Quote ÷ 10) × 1.0
            </div>
            <div className="text-[#76A9FA]">
              • GOLDGUINEA (8g, 999, ₹/8g): (Quote ÷ 8) × 1.0 • GOLDPETAL (1g, 999, ₹/1g): Quote × 1.0
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "rolling",
      num: "02",
      title: "Prior-Window Rolling Z-Scores & Clean Baseline Isolation",
      body: (
        <div className="space-y-2 text-xs text-[#A1A1AA] leading-relaxed">
          <p>
            On trading date <code className="font-mono text-[#F4F4F5]">T</code>, rolling mean <code className="font-mono text-[#F4F4F5]">μ_T</code> and standard deviation <code className="font-mono text-[#F4F4F5]">σ_T</code> are computed strictly over the preceding <code className="font-mono text-[#F4F4F5]">W</code> clean sessions <code className="font-mono text-[#F4F4F5]">[T−W … T−1]</code>. Excluding observation <code className="font-mono text-[#F4F4F5]">T</code> itself prevents outlier self-attenuation and prevents single-session bad prints from distorting rolling volatility on subsequent days.
          </p>
        </div>
      ),
    },
    {
      id: "costs",
      num: "03",
      title: "Weight-Matched Hedge Ratios & 4-Leg MCX Transaction Costs",
      body: (
        <div className="space-y-2 text-xs text-[#A1A1AA] leading-relaxed">
          <p>
            Hedging contracts of unequal lot weights requires trading the least common multiple weight <code className="font-mono text-[#F4F4F5]">LCM(Lot_A, Lot_B)</code> (for example, 1 lot GOLDM [100g] against 10 lots GOLDTEN [10g], or 1 lot GOLDGUINEA [8g] against 8 lots GOLDPETAL [1g]). Every round-trip models 4 orders plus MCX turnover charges (~0.0021%), CTT (0.01% sell side), stamp duty (0.002% buy side), SEBI fees, 18% GST, and two-leg execution slippage.
          </p>
        </div>
      ),
    },
    {
      id: "honesty",
      num: "04",
      title: "Backtest Honesty Scorecard: Wilson 95% CI, Next-Open Fills & Sample Limits",
      body: (
        <div className="space-y-2 text-xs text-[#A1A1AA] leading-relaxed">
          <p>
            Signals detected on Session <code className="font-mono text-[#F4F4F5]">T</code> Close fill at Session <code className="font-mono text-[#F4F4F5]">T+1</code> Open. To prevent small-sample mirages (such as treating 1/1 win = 100% win rate as proof of a viable strategy), GoldLens computes exact <strong className="text-[#F4F4F5]">95% Wilson Score binomial confidence intervals</strong> (e.g., 1/1 win = [20.7%, 100.0%]) and exact <strong className="text-[#F4F4F5]">one-sided Student&apos;s t p-values</strong> (<code className="font-mono text-[#F4F4F5]">df = n − 1</code>), classifying small or statistically inconclusive runs honestly as <strong className="text-[#FBBF24]">INSUFFICIENT EVIDENCE</strong>.
          </p>
        </div>
      ),
    },
    {
      id: "limitations",
      num: "05",
      title: "What GoldLens Cannot Establish (Candid Limitations)",
      body: (
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#A1A1AA] leading-relaxed">
          <li>Daily Bhavcopy OHLC bars cannot reconstruct simultaneous two-leg intraday L2 bid-ask queues or execution legged-in risk.</li>
          <li>Different expiry dates within a month (5th of month for GOLD/GOLDM vs month-end for GOLDTEN/GOLDGUINEA/GOLDPETAL) embed short-term repo/carry rates.</li>
          <li>Synthetic demo data uses seeded scenarios for reproducible education and is never live market data.</li>
        </ul>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header + 2 Internal Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E6BD58]">
            Reproducible Evidence & Documentation
          </span>
          <h1 className="text-xl font-bold text-[#F4F4F5] mt-0.5">
            Reports & Methodology
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Generate downloadable decision reports from computed outputs or review every formula and limitation.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Reports and Methodology tabs"
          className="inline-flex items-center gap-1 bg-[#11151B] p-1 rounded-xl border border-white/[0.08] text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "reports"}
            onClick={() => setSubTab("reports")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors ${
              subTab === "reports"
                ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Research Reports</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === "methodology"}
            onClick={() => setSubTab("methodology")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors ${
              subTab === "methodology"
                ? "bg-[#171B22] text-[#E6BD58] border border-[#E6BD58]/35"
                : "text-[#A1A1AA] hover:text-[#F4F4F5]"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Methodology & Limitations</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: RESEARCH REPORTS */}
      {subTab === "reports" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {reportHistory.length > 1 && (
                <select
                  aria-label="Previously generated reports"
                  value={activeReport?.id || ""}
                  onChange={(e) => {
                    const found = reportHistory.find((r) => r.id === e.target.value);
                    if (found) setActiveReport(found);
                  }}
                  className="rounded-lg bg-[#11151B] border border-white/[0.1] px-3 py-2 text-xs text-[#F4F4F5]"
                >
                  {reportHistory.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.contractPair} — {r.conclusion} ({r.id.slice(-6)})
                    </option>
                  ))}
                </select>
              )}
              {errorMsg && <span className="text-xs text-[#F87171]">{errorMsg}</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeReport && (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadHTML}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#171B22] px-3 py-2 text-xs font-semibold text-[#F4F4F5] border border-white/[0.1]"
                  >
                    <Download className="h-3.5 w-3.5 text-[#76A9FA]" />
                    <span>Download HTML Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJSON}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#171B22] px-3 py-2 text-xs font-semibold text-[#F4F4F5] border border-white/[0.1]"
                  >
                    <Download className="h-3.5 w-3.5 text-[#E6BD58]" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#171B22] px-3 py-2 text-xs font-semibold text-[#F4F4F5] border border-white/[0.1]"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print / PDF</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="btn-gold-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs cursor-pointer"
              >
                <Sparkles className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                <span>
                  {isGenerating
                    ? "Compiling Report…"
                    : `Generate Report (${contractA}/${contractB})`}
                </span>
              </button>
            </div>
          </div>

          {activeReport ? (
            <GlassCard variant="standard" padding="lg" className="space-y-6">
              <div className="pb-4 border-b border-white/[0.08] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                  <span className="text-[#E6BD58]">{activeReport.id}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-sans font-semibold ${
                      activeReport.dataMode === "synthetic_demo"
                        ? "bg-[#FBBF24]/12 text-[#FBBF24] border border-[#FBBF24]/25"
                        : "bg-[#76A9FA]/12 text-[#76A9FA] border border-[#76A9FA]/30"
                    }`}
                  >
                    {activeReport.dataMode === "synthetic_demo"
                      ? "SYNTHETIC DEMO DATA"
                      : "UPLOADED CSV DATA"}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-[#F4F4F5]">{activeReport.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#A1A1AA] num-font">
                  <span>
                    Pair: <strong className="text-[#F4F4F5]">{activeReport.contractPair}</strong>
                  </span>
                  <span>
                    Period:{" "}
                    <strong className="text-[#F4F4F5]">{activeReport.analysisPeriod}</strong>
                  </span>
                  <span>
                    Conclusion:{" "}
                    <strong className="text-[#E6BD58]">{activeReport.conclusion}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs num-font">
                <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
                  <span className="text-[11px] text-[#A1A1AA] block">Data Trust Score</span>
                  <span className="text-lg font-bold text-[#4ADE80]">
                    {activeReport.metrics?.trustScore}/100
                  </span>
                </div>
                <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
                  <span className="text-[11px] text-[#A1A1AA] block">Executed / Blocked</span>
                  <span className="text-lg font-bold text-[#F4F4F5]">
                    {activeReport.metrics?.tradesCount} / {activeReport.metrics?.rejectedCount ?? 0}
                  </span>
                </div>
                <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
                  <span className="text-[11px] text-[#A1A1AA] block">Win Rate (95% Wilson CI)</span>
                  <span className="text-sm font-bold text-[#76A9FA] block mt-1">
                    {activeReport.metrics?.winRate !== null &&
                    activeReport.metrics?.winRate !== undefined
                      ? `${activeReport.metrics.winRate}% [${activeReport.metrics.wilsonLower ?? "—"}%, ${activeReport.metrics.wilsonUpper ?? "—"}%]`
                      : "Unavailable"}
                  </span>
                </div>
                <div className="rounded-xl bg-[#080A0D] p-3 border border-white/[0.06]">
                  <span className="text-[11px] text-[#A1A1AA] block">Net Simulated P&L</span>
                  <span
                    className={`text-lg font-bold ${
                      (activeReport.metrics?.netPnL ?? 0) > 0
                        ? "text-[#4ADE80]"
                        : "text-[#F87171]"
                    }`}
                  >
                    ₹{Number(activeReport.metrics?.netPnL || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                {(activeReport.sections || []).map((sec: any, idx: number) => (
                  <div
                    key={idx}
                    className="space-y-2 pb-4 border-b border-white/[0.06] last:border-none"
                  >
                    <h3 className="text-sm font-bold text-[#E6BD58]">{sec.title}</h3>
                    <p className="text-xs text-[#F4F4F5]/90 leading-relaxed">{sec.content}</p>
                    {sec.keyFindings && (
                      <ul className="rounded-xl bg-[#080A0D] p-3.5 border border-white/[0.06] space-y-1 text-xs text-[#A1A1AA]">
                        {sec.keyFindings.map((kf: string, kidx: number) => (
                          <li key={kidx}>• {kf}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          ) : (
            <GlassCard variant="standard" padding="xl" className="text-center py-14 space-y-3">
              <FileText className="h-9 w-9 text-[#E6BD58] mx-auto" />
              <h3 className="text-base font-bold text-[#F4F4F5]">
                Compile Evidence-Backed Research Report
              </h3>
              <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                Generates a complete dossier for <strong className="text-[#F4F4F5]">{contractA}/{contractB}</strong> using actual normalization steps, Data Forensics findings, 4-leg transaction costs, and the Backtest Honesty Scorecard.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="btn-gold-primary rounded-lg px-5 py-2 text-xs cursor-pointer"
              >
                {isGenerating ? "Compiling…" : `Generate ${contractA}/${contractB} Report`}
              </button>
            </GlassCard>
          )}
        </div>
      )}

      {/* SUB-TAB 2: METHODOLOGY & LIMITATIONS */}
      {subTab === "methodology" && (
        <div className="space-y-3.5">
          {methodologyItems.map((item) => {
            const isOpen = openAccordion === item.id;
            return (
              <GlassCard key={item.id} variant="standard" padding="md" className="space-y-3">
                <button
                  type="button"
                  onClick={() => setOpenAccordion(isOpen ? "" : item.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2.5 font-bold text-sm text-[#F4F4F5]">
                    <span className="font-mono text-[#E6BD58]">{item.num}.</span>
                    <span>{item.title}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-[#A1A1AA] shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[#A1A1AA] shrink-0" />
                  )}
                </button>
                {isOpen && <div className="pt-2 border-t border-white/[0.06]">{item.body}</div>}
              </GlassCard>
            );
          })}

          <GlassCard variant="subtle" padding="md" className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#E6BD58]">
              <ShieldAlert className="h-4 w-4" />
              <span>Research & Educational Disclaimer</span>
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              GoldLens is an analytical research tool. Outputs reflect mathematical transformations of the selected dataset under explicitly stated assumptions. Synthetic demo data is not real market data, and historical simulations never guarantee executable trading profits.
            </p>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
