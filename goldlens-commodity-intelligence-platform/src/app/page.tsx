"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/common/CommandPalette";
import { OverviewView } from "@/components/views/OverviewView";
import { SignalIntelligenceView } from "@/components/views/SignalIntelligenceView";
import { MarketAnalysisView } from "@/components/views/MarketAnalysisView";
import { StrategyLabConsolidatedView } from "@/components/views/StrategyLabConsolidatedView";
import { DataContractsView } from "@/components/views/DataContractsView";
import { ReportsMethodologyView } from "@/components/views/ReportsMethodologyView";
import { DailyContractPoint, AlignedSpreadPoint } from "@/lib/analytics/spreads";
import { SeededCaseInfo } from "@/lib/analytics/syntheticData";
import { BacktestParameters, BacktestResult } from "@/lib/analytics/backtester";
import { Compass, Loader2 } from "lucide-react";

const DEFAULT_DEMO_ID = "mcx_gold_demo_v2";

interface PendingDataset {
  id: string;
  name: string;
  records: DailyContractPoint[];
  rejectedRows: any[];
  dataTrustScore: number;
  forensicFlagsCount: number;
  suggestedPair: { a: string; b: string } | null;
}

export default function GoldLensApp() {
  const [currentView, setCurrentView] = useState("overview");
  const [marketSubTab, setMarketSubTab] = useState<"spread" | "analogues" | "replay">("spread");
  const [strategySubTab, setStrategySubTab] = useState<"backtest" | "stress" | "robustness">(
    "backtest"
  );
  const [dataSubTab, setDataSubTab] = useState<"forensics" | "explorer" | "contracts">(
    "forensics"
  );
  const [reportsSubTab, setReportsSubTab] = useState<"reports" | "methodology">("reports");

  const [activeDatasetId, setActiveDatasetId] = useState(DEFAULT_DEMO_ID);
  const [datasetName, setDatasetName] = useState("MCX Gold Futures Synthetic Demo (May–Dec 2025)");
  // Applied values drive charts and metrics; draft values change only the selectors until Run Scan.
  const [activePair, setActivePair] = useState({ a: "GOLDM", b: "GOLDTEN" });
  const [draftPair, setDraftPair] = useState({ a: "GOLDM", b: "GOLDTEN" });
  const [lookbackWindow, setLookbackWindow] = useState(30);
  const [draftLookbackWindow, setDraftLookbackWindow] = useState(30);
  const [pendingDataset, setPendingDataset] = useState<PendingDataset | null>(null);

  // Core Application Data State
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(true);
  const [dataTrustScore, setDataTrustScore] = useState(90);
  const [forensicFlagsCount, setForensicFlagsCount] = useState(0);
  const [highlightedForensicRowId, setHighlightedForensicRowId] = useState<string | null>(null);

  const [marketRecords, setMarketRecords] = useState<DailyContractPoint[]>([]);
  const [rejectedRows, setRejectedRows] = useState<any[]>([]);
  const [alignedSpreads, setAlignedSpreads] = useState<AlignedSpreadPoint[]>([]);
  const [scannedSignals, setScannedSignals] = useState<any[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<any>(null);

  // Navigation Shell State
  const [isOpenCommandPalette, setIsOpenCommandPalette] = useState(false);
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Unified route resolver supporting the 6 consolidated sections AND preserving legacy route IDs
  const navigateToSection = useCallback((routeId: string) => {
    switch (routeId) {
      case "overview":
        setCurrentView("overview");
        break;
      case "signal_intelligence":
      case "intelligence_scan":
      case "evidence_room":
        setCurrentView("signal_intelligence");
        break;
      case "market_analysis":
      case "spread_analysis":
        setMarketSubTab("spread");
        setCurrentView("market_analysis");
        break;
      case "historical_patterns":
        setMarketSubTab("analogues");
        setCurrentView("market_analysis");
        break;
      case "market_replay":
        setMarketSubTab("replay");
        setCurrentView("market_analysis");
        break;
      case "strategy_lab":
        setStrategySubTab("backtest");
        setCurrentView("strategy_lab");
        break;
      case "what_if":
      case "stress_test":
        setStrategySubTab("stress");
        setCurrentView("strategy_lab");
        break;
      case "robustness":
        setStrategySubTab("robustness");
        setCurrentView("strategy_lab");
        break;
      case "data_contracts":
      case "data_forensics":
        setDataSubTab("forensics");
        setCurrentView("data_contracts");
        break;
      case "data_explorer":
        setDataSubTab("explorer");
        setCurrentView("data_contracts");
        break;
      case "contracts":
        setDataSubTab("contracts");
        setCurrentView("data_contracts");
        break;
      case "reports_methodology":
      case "research_reports":
        setReportsSubTab("reports");
        setCurrentView("reports_methodology");
        break;
      case "methodology":
        setReportsSubTab("methodology");
        setCurrentView("reports_methodology");
        break;
      default:
        setCurrentView("overview");
    }

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${routeId}`);
    }
  }, []);

  // Honor initial URL hash deep-link on page load / refresh
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const h = window.location.hash.replace(/^#/, "").trim();
      if (h) navigateToSection(h);
    }
  }, [navigateToSection]);

  const loadDatasetAnalytics = useCallback(
    async (
      dsId: string,
      pair: { a: string; b: string },
      lookback: number,
      ensureDemoBootstrapped = false
    ) => {
      try {
        setScanError(null);
        if (ensureDemoBootstrapped) {
          await fetch("/api/demo/load");
        }

        const [recRes, qualRes, spreadRes, scanRes] = await Promise.all([
          fetch(`/api/datasets/${dsId}/records?limit=5000`),
          fetch(`/api/datasets/${dsId}/quality`),
          fetch("/api/analytics/spread", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              datasetId: dsId,
              contractA: pair.a,
              contractB: pair.b,
              lookbackWindow: lookback,
            }),
          }),
          fetch("/api/analytics/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              datasetId: dsId,
              lookbackWindow: lookback,
            }),
          }),
        ]);

        const [recData, qualData, spreadData, scanData] = await Promise.all([
          recRes.json(),
          qualRes.json(),
          spreadRes.json(),
          scanRes.json(),
        ]);

        if (Array.isArray(recData.records)) {
          setMarketRecords(recData.records);
        }

        if (qualData.dataTrustScore !== undefined) {
          setDataTrustScore(qualData.dataTrustScore);
          setForensicFlagsCount(qualData.trustReport?.forensicIssues?.length || 0);
        }

        if (Array.isArray(spreadData.alignedSpreads)) {
          setAlignedSpreads(spreadData.alignedSpreads);
        } else {
          setAlignedSpreads([]);
          if (spreadData.error) setScanError(spreadData.error);
        }

        if (Array.isArray(scanData.signals)) {
          setScannedSignals(scanData.signals);
          const bestForPair =
            scanData.signals.find(
              (s: any) => s.contractA === pair.a && s.contractB === pair.b && s.isSeeded
            ) ||
            scanData.signals.find(
              (s: any) => s.contractA === pair.a && s.contractB === pair.b
            ) ||
            scanData.signals[0] ||
            null;
          setSelectedSignal((prev: any) => prev || bestForPair);
        }
      } catch (err: unknown) {
        setScanError(
          err instanceof Error ? err.message : "Failed to load analytical dataset."
        );
      }
    },
    []
  );

  // Initial application bootstrap
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      await loadDatasetAnalytics(DEFAULT_DEMO_ID, { a: "GOLDM", b: "GOLDTEN" }, 30, true);
      if (mounted) setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadDatasetAnalytics]);

  const handlePairChange = (newPair: { a: string; b: string }) => {
    setDraftPair(newPair);
    setScanError(null);
  };

  const handleLookbackChange = (newLookback: number) => {
    setDraftLookbackWindow(newLookback);
    setScanError(null);
  };

  const handleRunScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanError(null);

    const staged = pendingDataset;
    const datasetId = staged?.id || activeDatasetId;
    const availableSymbols = new Set(
      (staged?.records || marketRecords).map((record) => record.symbol)
    );
    const pairIsAvailable =
      availableSymbols.has(draftPair.a) && availableSymbols.has(draftPair.b);
    const nextPair =
      staged && !pairIsAvailable && staged.suggestedPair
        ? staged.suggestedPair
        : draftPair;
    const nextLookback = draftLookbackWindow;

    try {
      const requestRecords = staged?.records;
      const sharedRequest = {
        datasetId,
        contractA: nextPair.a,
        contractB: nextPair.b,
        lookbackWindow: nextLookback,
        ...(requestRecords ? { records: requestRecords } : {}),
      };

      const [spreadRes, scanRes] = await Promise.all([
        fetch("/api/analytics/spread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sharedRequest),
        }),
        fetch("/api/analytics/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datasetId,
            contractA: nextPair.a,
            contractB: nextPair.b,
            lookbackWindow: nextLookback,
            ...(requestRecords ? { records: requestRecords } : {}),
          }),
        }),
      ]);

      const [spreadData, scanData] = await Promise.all([spreadRes.json(), scanRes.json()]);

      if (!spreadRes.ok || spreadData.success === false) {
        throw new Error(spreadData.error || "Spread analysis failed; previous results were kept.");
      }
      if (!scanRes.ok || scanData.success === false) {
        throw new Error(scanData.error || "Intelligence scan failed; previous results were kept.");
      }

      // Commit all new dataset, pair, lookback, chart, trust, and signal state together only on success.
      if (staged) {
        setActiveDatasetId(staged.id);
        setDatasetName(staged.name);
        setIsDemo(false);
        setMarketRecords(staged.records);
        setRejectedRows(staged.rejectedRows);
        setDataTrustScore(staged.dataTrustScore);
        setForensicFlagsCount(staged.forensicFlagsCount);
        setPendingDataset(null);
      }

      setActivePair(nextPair);
      setDraftPair(nextPair);
      setLookbackWindow(nextLookback);
      setDraftLookbackWindow(nextLookback);
      setAlignedSpreads(Array.isArray(spreadData.alignedSpreads) ? spreadData.alignedSpreads : []);

      const nextSignals = Array.isArray(scanData.signals) ? scanData.signals : [];
      setScannedSignals(nextSignals);
      const match =
        nextSignals.find(
          (signal: any) =>
            signal.contractA === nextPair.a &&
            signal.contractB === nextPair.b &&
            signal.isSeeded
        ) ||
        nextSignals.find(
          (signal: any) =>
            signal.contractA === nextPair.a && signal.contractB === nextPair.b
        ) ||
        nextSignals[0] ||
        null;
      setSelectedSignal(match);
    } catch (err: unknown) {
      setScanError(
        err instanceof Error ? err.message : "Scan failed. Previous analysis remains visible."
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleResetDemo = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      setPendingDataset(null);
      setIsDemo(true);
      setActiveDatasetId(DEFAULT_DEMO_ID);
      setDatasetName("MCX Gold Futures Synthetic Demo (May–Dec 2025)");
      setRejectedRows([]);
      setSelectedSignal(null);
      const resetPair = { a: "GOLDM", b: "GOLDTEN" };
      setActivePair(resetPair);
      setDraftPair(resetPair);
      setDraftLookbackWindow(lookbackWindow);
      await loadDatasetAnalytics(DEFAULT_DEMO_ID, resetPair, lookbackWindow, false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadCSV = async (csvText: string, name: string) => {
    const res = await fetch("/api/datasets/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText, datasetName: name }),
    });
    const data = await res.json();

    // Stage successful uploads in the UI. The applied home-page data, trust score,
    // charts, and metrics remain untouched until the user explicitly runs a scan.
    if (data.success && data.datasetId && Array.isArray(data.records)) {
      const symbols = Array.from(new Set(data.records.map((record: any) => record.symbol))) as string[];
      const suggestedPair =
        symbols.length >= 2 ? { a: symbols[0], b: symbols[1] } : null;

      setPendingDataset({
        id: data.datasetId,
        name: data.name || name,
        records: data.records,
        rejectedRows: data.rejectedList || [],
        dataTrustScore: data.dataTrustScore ?? 0,
        forensicFlagsCount: data.trustReport?.forensicIssues?.length || 0,
        suggestedPair,
      });
      if (suggestedPair) setDraftPair(suggestedPair);
      setScanError(null);
      return { ...data, staged: true };
    }

    return data;
  };

  const handleSelectCaseStudy = (caseStudy: SeededCaseInfo) => {
    // Case-study selection changes only the pending pair. Results stay frozen until Run Scan.
    const pair = { a: caseStudy.contractA, b: caseStudy.contractB };
    setDraftPair(pair);
    const matchedSig = scannedSignals.find(
      (signal) =>
        signal.date === caseStudy.date &&
        signal.contractA === caseStudy.contractA &&
        signal.contractB === caseStudy.contractB
    );
    if (matchedSig) {
      setSelectedSignal(matchedSig);
    }
  };

  const handleRunBacktestAPI = async (
    params: Partial<BacktestParameters>
  ): Promise<BacktestResult> => {
    const res = await fetch("/api/backtest/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        datasetId: activeDatasetId,
        contractA: activePair.a,
        contractB: activePair.b,
        lookbackWindow,
        brokeragePerOrderINR: params.costs?.brokeragePerOrderINR ?? 20,
        slippagePerGramINR: params.costs?.slippagePerGramINR ?? 1.25,
      }),
    });
    return await res.json();
  };

  const handleGenerateReportAPI = async (contractA: string, contractB: string) => {
    const res = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        datasetId: activeDatasetId,
        contractA,
        contractB,
        lookbackWindow,
      }),
    });
    return await res.json();
  };

  const hasPendingAnalysis = Boolean(
    pendingDataset ||
      draftPair.a !== activePair.a ||
      draftPair.b !== activePair.b ||
      draftLookbackWindow !== lookbackWindow
  );

  if (isLoading && marketRecords.length === 0) {
    return (
      <div className="min-h-screen bg-[#080A0D] flex flex-col items-center justify-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#171B22] border border-[#E6BD58]/35">
          <Loader2 className="h-6 w-6 text-[#E6BD58] animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Compass className="h-4 w-4 text-[#E6BD58]" />
            <span className="text-base font-bold text-[#F4F4F5]">GoldLens</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E6BD58]">
              COMMODITY INTELLIGENCE
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Initializing MCX contract specifications, normalization & forensic audit…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080A0D] flex flex-col text-[#F4F4F5]">
      <Navbar
        activePair={draftPair}
        onPairChange={handlePairChange}
        lookbackWindow={draftLookbackWindow}
        onLookbackChange={handleLookbackChange}
        hasPendingChanges={hasPendingAnalysis}
        isDemo={isDemo}
        datasetName={datasetName}
        onResetDemo={handleResetDemo}
        onOpenCommandPalette={() => setIsOpenCommandPalette(true)}
        onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
        onRunScan={handleRunScan}
        isScanning={isScanning}
        dataTrustScore={dataTrustScore}
        onNavigate={navigateToSection}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          currentView={currentView}
          onNavigate={navigateToSection}
          isOpenMobile={isOpenMobileSidebar}
          onCloseMobile={() => setIsOpenMobileSidebar(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          anomaliesCount={scannedSignals.length}
          forensicFlagsCount={forensicFlagsCount + rejectedRows.length}
          dataTrustScore={dataTrustScore}
        />

        <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto w-full">
            {/* 1. OVERVIEW */}
            {currentView === "overview" && (
              <OverviewView
                marketRecords={marketRecords}
                alignedSpreads={alignedSpreads}
                scannedSignals={scannedSignals}
                activePair={activePair}
                selectedPair={draftPair}
                onPairChange={handlePairChange}
                lookbackWindow={lookbackWindow}
                selectedLookbackWindow={draftLookbackWindow}
                onLookbackChange={handleLookbackChange}
                hasPendingAnalysis={hasPendingAnalysis}
                pendingDatasetName={pendingDataset?.name}
                isDemo={isDemo}
                datasetName={datasetName}
                dataTrustScore={dataTrustScore}
                forensicFlagsCount={forensicFlagsCount}
                scanError={scanError}
                onNavigate={navigateToSection}
                onSelectCase={handleSelectCaseStudy}
                onSelectSignalForAutopsy={(sig) => {
                  setSelectedSignal(sig);
                  navigateToSection("signal_intelligence");
                }}
                onSelectSignalForStressTest={(sig) => {
                  setSelectedSignal(sig);
                  navigateToSection("stress_test");
                }}
                onRunScan={handleRunScan}
                isScanning={isScanning}
              />
            )}

            {/* 2. SIGNAL INTELLIGENCE (Scan + Evidence Room + 10-Point Autopsy + Inline Forensics) */}
            {currentView === "signal_intelligence" && (
              <SignalIntelligenceView
                scannedSignals={scannedSignals}
                selectedSignal={selectedSignal}
                onSelectSignal={setSelectedSignal}
                onRunScan={handleRunScan}
                isScanning={isScanning}
                totalRecordsCount={marketRecords.length}
                dataTrustScore={dataTrustScore}
                onStressTestSignal={(sig) => {
                  setSelectedSignal(sig);
                  navigateToSection("stress_test");
                }}
                onInspectSourceRowInForensics={(rowId) => {
                  setHighlightedForensicRowId(rowId);
                  navigateToSection("data_forensics");
                }}
              />
            )}

            {/* 3. MARKET ANALYSIS (Spread & Statistics + Historical Analogues + Market Replay) */}
            {currentView === "market_analysis" && (
              <MarketAnalysisView
                marketRecords={marketRecords}
                alignedSpreads={alignedSpreads}
                scannedSignals={scannedSignals}
                contractA={activePair.a}
                contractB={activePair.b}
                initialSubTab={marketSubTab}
                onSelectSignalDate={(date, pairOverride) => {
                  const targetA = pairOverride?.a || activePair.a;
                  const targetB = pairOverride?.b || activePair.b;
                  const matched =
                    scannedSignals.find(
                      (s) =>
                        s.date === date &&
                        s.contractA === targetA &&
                        s.contractB === targetB
                    ) || scannedSignals.find((s) => s.date === date);
                  if (matched) {
                    setSelectedSignal(matched);
                    navigateToSection("signal_intelligence");
                  }
                }}
                onNavigate={navigateToSection}
              />
            )}

            {/* 4. STRATEGY LAB (Backtest + Honesty Scorecard + Stress Test + Robustness) */}
            {currentView === "strategy_lab" && (
              <StrategyLabConsolidatedView
                alignedSpreads={alignedSpreads}
                scannedSignals={scannedSignals}
                selectedSignal={selectedSignal}
                contractA={activePair.a}
                contractB={activePair.b}
                initialSubTab={strategySubTab}
                onRunBacktestAPI={handleRunBacktestAPI}
              />
            )}

            {/* 5. DATA & CONTRACTS (Data Forensics + Data Explorer & CSV + Contract Specs) */}
            {currentView === "data_contracts" && (
              <DataContractsView
                marketRecords={marketRecords}
                rejectedRows={rejectedRows}
                dataTrustScore={dataTrustScore}
                isDemo={isDemo}
                datasetName={datasetName}
                highlightedRowId={highlightedForensicRowId}
                initialSubTab={dataSubTab}
                onResetDemo={handleResetDemo}
                onUploadCSV={handleUploadCSV}
              />
            )}

            {/* 6. REPORTS & METHODOLOGY (Research Reports + Methodology & Limitations) */}
            {currentView === "reports_methodology" && (
              <ReportsMethodologyView
                contractA={activePair.a}
                contractB={activePair.b}
                initialSubTab={reportsSubTab}
                onGenerateReport={handleGenerateReportAPI}
              />
            )}
          </div>
        </main>
      </div>

      <CommandPalette
        isOpen={isOpenCommandPalette}
        onOpen={() => setIsOpenCommandPalette(true)}
        onClose={() => setIsOpenCommandPalette(false)}
        onNavigate={navigateToSection}
        onSelectPair={handlePairChange}
        onResetDemo={handleResetDemo}
        onRunScan={handleRunScan}
      />
    </div>
  );
}
