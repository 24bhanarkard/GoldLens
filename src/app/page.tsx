"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/common/CommandPalette";
import { OverviewView } from "@/components/views/OverviewView";
import { IntelligenceScanView } from "@/components/views/IntelligenceScanView";
import { EvidenceRoomView } from "@/components/views/EvidenceRoomView";
import { SpreadAnalysisView } from "@/components/views/SpreadAnalysisView";
import { HistoricalPatternsView } from "@/components/views/HistoricalPatternsView";
import { StrategyLabView } from "@/components/views/StrategyLabView";
import { WhatIfSimulatorView } from "@/components/views/WhatIfSimulatorView";
import { MarketReplayView } from "@/components/views/MarketReplayView";
import { ContractExplorerView } from "@/components/views/ContractExplorerView";
import { DataExplorerView } from "@/components/views/DataExplorerView";
import { ResearchReportsView } from "@/components/views/ResearchReportsView";
import { MethodologyView } from "@/components/views/MethodologyView";
import { DailyContractPoint, AlignedSpreadPoint } from "@/lib/analytics/spreads";
import { SeededCaseInfo, SEEDED_CASE_STUDIES } from "@/lib/analytics/syntheticData";
import { BacktestParameters, BacktestResult } from "@/lib/analytics/backtester";
import { Menu, Loader2 } from "lucide-react";

export default function GoldLensApp() {
  const [currentView, setCurrentView] = useState("overview");
  const [activePair, setActivePair] = useState({ a: "GOLDM", b: "GOLDTEN" });
  const [lookbackWindow, setLookbackWindow] = useState(30);

  // App Data State
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [dataTrustScore, setDataTrustScore] = useState(96);
  const [marketRecords, setMarketRecords] = useState<DailyContractPoint[]>([]);
  const [alignedSpreads, setAlignedSpreads] = useState<AlignedSpreadPoint[]>([]);
  const [scannedSignals, setScannedSignals] = useState<any[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<any>(null);

  // Dialog & Sidebar states
  const [isOpenCommandPalette, setIsOpenCommandPalette] = useState(false);
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);

  // Load initial demo dataset & compute initial spreads
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Ensure demo dataset is loaded
      await fetch("/api/demo/load");

      // 2. Fetch market records
      const recRes = await fetch("/api/datasets/mcx_gold_demo_v1/records?limit=1000");
      const recData = await recRes.json();
      if (recData.records) {
        setMarketRecords(recData.records);
      }

      // 3. Fetch data trust quality score
      const qualRes = await fetch("/api/datasets/mcx_gold_demo_v1/quality");
      const qualData = await qualRes.json();
      if (qualData.dataTrustScore !== undefined) {
        setDataTrustScore(qualData.dataTrustScore);
      }

      // 4. Compute spreads for active pair
      const spreadRes = await fetch("/api/analytics/spread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractA: activePair.a,
          contractB: activePair.b,
          lookbackWindow,
        }),
      });
      const spreadData = await spreadRes.json();
      if (spreadData.alignedSpreads) {
        setAlignedSpreads(spreadData.alignedSpreads);
      }

      // 5. Run intelligence scan
      const scanRes = await fetch("/api/analytics/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookbackWindow }),
      });
      const scanData = await scanRes.json();
      if (scanData.signals) {
        setScannedSignals(scanData.signals);
        setSelectedSignal(scanData.signals[0] || null);
      }
    } catch (err) {
      console.error("Initialization error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activePair.a, activePair.b, lookbackWindow]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Recompute spreads when activePair or lookbackWindow changes
  const updateSpreads = useCallback(async (pair: { a: string; b: string }, lookback: number) => {
    try {
      const spreadRes = await fetch("/api/analytics/spread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractA: pair.a,
          contractB: pair.b,
          lookbackWindow: lookback,
        }),
      });
      const spreadData = await spreadRes.json();
      if (spreadData.alignedSpreads) {
        setAlignedSpreads(spreadData.alignedSpreads);
      }
    } catch (err) {
      console.error("Error updating spreads:", err);
    }
  }, []);

  const handlePairChange = (newPair: { a: string; b: string }) => {
    setActivePair(newPair);
    updateSpreads(newPair, lookbackWindow);
  };

  const handleLookbackChange = (newLookback: number) => {
    setLookbackWindow(newLookback);
    updateSpreads(activePair, newLookback);
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const scanRes = await fetch("/api/analytics/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookbackWindow }),
      });
      const scanData = await scanRes.json();
      if (scanData.signals) {
        setScannedSignals(scanData.signals);
        setSelectedSignal(scanData.signals[0] || null);
      }
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleResetDemo = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      setIsDemo(true);
      await fetchInitialData();
    } catch (err) {
      console.error("Reset demo error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadCSV = async (csvText: string, datasetName: string) => {
    const res = await fetch("/api/datasets/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText, datasetName }),
    });
    const data = await res.json();
    if (data.success) {
      setIsDemo(false);
      setDataTrustScore(data.dataTrustScore || 90);
      await fetchInitialData();
    }
    return data;
  };

  const handleSelectCaseStudy = (caseStudy: SeededCaseInfo) => {
    handlePairChange({ a: caseStudy.contractA, b: caseStudy.contractB });
    const matchedSig = scannedSignals.find(
      (s) => s.date === caseStudy.date && s.contractA === caseStudy.contractA && s.contractB === caseStudy.contractB
    );
    if (matchedSig) {
      setSelectedSignal(matchedSig);
    }
    setCurrentView("evidence_room");
  };

  const handleRunBacktestAPI = async (params: Partial<BacktestParameters>): Promise<BacktestResult> => {
    const res = await fetch("/api/backtest/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        contractA: activePair.a,
        contractB: activePair.b,
        lookbackWindow,
      }),
    });
    const data = await res.json();
    return data;
  };

  const handleGenerateReportAPI = async (contractA: string, contractB: string) => {
    const res = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractA,
        contractB,
        lookbackWindow,
      }),
    });
    return await res.json();
  };

  if (isLoading && marketRecords.length === 0) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center space-y-4">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 p-0.5 shadow-2xl shadow-amber-500/30">
          <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0c1017]">
            <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold gold-gradient-text tracking-wider">GOLDLENS WORKSTATION</h2>
          <p className="text-xs text-slate-400">Bootstrapping MCX quantitative engine & Bhavcopy pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] flex flex-col text-slate-100">
      {/* Top Navbar */}
      <Navbar
        activePair={activePair}
        onPairChange={handlePairChange}
        lookbackWindow={lookbackWindow}
        onLookbackChange={handleLookbackChange}
        isDemo={isDemo}
        onResetDemo={handleResetDemo}
        onOpenCommandPalette={() => setIsOpenCommandPalette(true)}
        onRunScan={handleRunScan}
        isScanning={isScanning}
        dataTrustScore={dataTrustScore}
        onNavigate={setCurrentView}
      />

      {/* Main Layout Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar / Mobile Drawer */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isOpenMobile={isOpenMobileSidebar}
          onCloseMobile={() => setIsOpenMobileSidebar(false)}
          anomaliesCount={scannedSignals.length}
          dataTrustScore={dataTrustScore}
        />

        {/* Content Canvas */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
          {/* Mobile menu trigger */}
          <div className="flex items-center justify-between pb-4 lg:hidden">
            <button
              onClick={() => setIsOpenMobileSidebar(true)}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs text-slate-300 border border-white/10"
            >
              <Menu className="h-4 w-4 text-amber-400" />
              <span>Menu</span>
            </button>
            <span className="text-xs font-bold text-amber-400 font-mono">
              {activePair.a} vs {activePair.b}
            </span>
          </div>

          {/* Dynamic Views */}
          {currentView === "overview" && (
            <OverviewView
              marketRecords={marketRecords}
              alignedSpreads={alignedSpreads}
              scannedSignals={scannedSignals}
              activePair={activePair}
              dataTrustScore={dataTrustScore}
              onNavigate={setCurrentView}
              onSelectCase={handleSelectCaseStudy}
              onSelectSignal={(sig) => {
                setSelectedSignal(sig);
                setCurrentView("evidence_room");
              }}
              onRunScan={handleRunScan}
              isScanning={isScanning}
            />
          )}

          {currentView === "intelligence_scan" && (
            <IntelligenceScanView
              scannedSignals={scannedSignals}
              onSelectSignal={(sig) => {
                setSelectedSignal(sig);
                setCurrentView("evidence_room");
              }}
              onNavigate={setCurrentView}
              onRunScan={handleRunScan}
              isScanning={isScanning}
              totalRecordsCount={marketRecords.length}
              dataTrustScore={dataTrustScore}
            />
          )}

          {currentView === "evidence_room" && (
            <EvidenceRoomView
              selectedSignal={selectedSignal}
              allSignals={scannedSignals}
              onSelectSignal={setSelectedSignal}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === "spread_analysis" && (
            <SpreadAnalysisView
              alignedSpreads={alignedSpreads}
              contractA={activePair.a}
              contractB={activePair.b}
              onSelectDate={(date) => {
                const matched = scannedSignals.find((s) => s.date === date);
                if (matched) setSelectedSignal(matched);
                setCurrentView("evidence_room");
              }}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === "historical_patterns" && (
            <HistoricalPatternsView
              alignedSpreads={alignedSpreads}
              contractA={activePair.a}
              contractB={activePair.b}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === "strategy_lab" && (
            <StrategyLabView
              alignedSpreads={alignedSpreads}
              contractA={activePair.a}
              contractB={activePair.b}
              onRunBacktest={handleRunBacktestAPI}
            />
          )}

          {currentView === "what_if" && (
            <WhatIfSimulatorView
              alignedSpreads={alignedSpreads}
              contractA={activePair.a}
              contractB={activePair.b}
            />
          )}

          {currentView === "market_replay" && (
            <MarketReplayView
              alignedSpreads={alignedSpreads}
              contractA={activePair.a}
              contractB={activePair.b}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === "contracts" && (
            <ContractExplorerView marketRecords={marketRecords} />
          )}

          {currentView === "data_explorer" && (
            <DataExplorerView
              marketRecords={marketRecords}
              dataTrustScore={dataTrustScore}
              isDemo={isDemo}
              onResetDemo={handleResetDemo}
              onUploadCSV={handleUploadCSV}
            />
          )}

          {currentView === "research_reports" && (
            <ResearchReportsView
              contractA={activePair.a}
              contractB={activePair.b}
              onGenerateReport={handleGenerateReportAPI}
            />
          )}

          {currentView === "methodology" && <MethodologyView />}
        </main>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isOpenCommandPalette}
        onClose={() => setIsOpenCommandPalette(false)}
        onNavigate={setCurrentView}
        onSelectPair={handlePairChange}
        onResetDemo={handleResetDemo}
        onRunScan={handleRunScan}
      />
    </div>
  );
}
