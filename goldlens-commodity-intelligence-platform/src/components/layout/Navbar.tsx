"use client";

import React from "react";
import {
  Compass,
  Search,
  Sparkles,
  Database,
  RefreshCw,
  ShieldCheck,
  Menu,
} from "lucide-react";

interface NavbarProps {
  activePair: { a: string; b: string };
  onPairChange: (pair: { a: string; b: string }) => void;
  lookbackWindow: number;
  onLookbackChange: (val: number) => void;
  hasPendingChanges?: boolean;
  isDemo: boolean;
  datasetName?: string;
  onResetDemo: () => void;
  onOpenCommandPalette: () => void;
  onOpenMobileSidebar: () => void;
  onRunScan: () => void;
  isScanning: boolean;
  dataTrustScore: number;
  onNavigate: (view: string) => void;
}

export const PAIR_OPTIONS = [
  { a: "GOLDM", b: "GOLDTEN", label: "GOLDM / GOLDTEN (100g 995 vs 10g 999)" },
  { a: "GOLDM", b: "GOLDGUINEA", label: "GOLDM / GOLDGUINEA (100g 995 vs 8g 999)" },
  { a: "GOLDGUINEA", b: "GOLDPETAL", label: "GOLDGUINEA / GOLDPETAL (8g vs 1g)" },
  { a: "GOLDM", b: "GOLDPETAL", label: "GOLDM / GOLDPETAL (100g vs 1g)" },
  { a: "GOLD", b: "GOLDM", label: "GOLD / GOLDM (1kg 995 vs 100g 995)" },
];

export function Navbar({
  activePair,
  onPairChange,
  lookbackWindow,
  onLookbackChange,
  hasPendingChanges = false,
  isDemo,
  datasetName,
  onResetDemo,
  onOpenCommandPalette,
  onOpenMobileSidebar,
  onRunScan,
  isScanning,
  dataTrustScore,
  onNavigate,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.07] bg-[#080A0D]/95 backdrop-blur-md">
      <div className="flex h-15 items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left: Mobile Menu + Brand + Dataset Provenance */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="lg:hidden rounded-lg p-2 text-[#A1A1AA] hover:text-[#F4F4F5] bg-[#11151B] border border-white/[0.07]"
          >
            <Menu className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate("overview")}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#171B22] border border-[#E6BD58]/35">
              <Compass className="h-4 w-4 text-[#E6BD58]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-[#F4F4F5]">
                  GoldLens
                </span>
                <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E6BD58]">
                  COMMODITY INTELLIGENCE
                </span>
              </div>
            </div>
          </button>

          {/* Dataset Status Badge */}
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/[0.08]">
            {isDemo ? (
              <div className="flex items-center gap-1.5 rounded-full bg-[#FBBF24]/10 px-2.5 py-1 text-[11px] font-semibold text-[#FBBF24] border border-[#FBBF24]/25">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" />
                <span>SYNTHETIC DEMO DATA</span>
                <button
                  type="button"
                  onClick={onResetDemo}
                  title="Reset synthetic demo dataset"
                  aria-label="Reset synthetic demo dataset"
                  className="ml-1 text-[#FBBF24]/80 hover:text-[#F4F4F5] transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-[#76A9FA]/12 px-2.5 py-1 text-[11px] font-semibold text-[#76A9FA] border border-[#76A9FA]/30">
                <Database className="h-3 w-3" />
                <span className="max-w-[180px] truncate">
                  {datasetName || "UPLOADED DATA"}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate("data_contracts")}
              className="flex items-center gap-1.5 rounded-full bg-[#11151B] px-2.5 py-1 text-[11px] font-medium text-[#F4F4F5] border border-white/[0.08] hover:border-[#E6BD58]/35 transition-colors num-font"
            >
              <ShieldCheck
                className={`h-3.5 w-3.5 ${
                  dataTrustScore >= 85 ? "text-[#4ADE80]" : "text-[#FBBF24]"
                }`}
              />
              <span>Trust {dataTrustScore}/100</span>
            </button>
          </div>
        </div>

        {/* Right: Global Pair / Lookback Context, Search, Primary Gold CTA */}
        <div className="flex items-center gap-2.5">
          <div className="hidden xl:flex items-center gap-2">
            <label htmlFor="global-pair-select" className="sr-only">
              Active contract pair
            </label>
            <select
              id="global-pair-select"
              disabled={isScanning}
              value={`${activePair.a}_${activePair.b}`}
              onChange={(e) => {
                const [a, b] = e.target.value.split("_");
                onPairChange({ a, b });
              }}
              className="rounded-lg bg-[#11151B] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] border border-white/[0.09] hover:border-[#E6BD58]/40 transition-colors"
            >
              {PAIR_OPTIONS.map((opt) => (
                <option key={`${opt.a}_${opt.b}`} value={`${opt.a}_${opt.b}`}>
                  {opt.a} / {opt.b}
                </option>
              ))}
            </select>

            <div
              role="group"
              aria-label="Lookback period"
              className="flex items-center gap-0.5 bg-[#11151B] p-1 rounded-lg border border-white/[0.09] text-xs"
            >
              {[20, 30, 60, 90].map((w) => (
                <button
                  key={w}
                  type="button"
                  disabled={isScanning}
                  onClick={() => onLookbackChange(w)}
                  className={`rounded-md px-2 py-0.5 text-[11px] num-font transition-colors ${
                    lookbackWindow === w
                      ? "bg-[#171B22] text-[#E6BD58] font-semibold border border-[#E6BD58]/30"
                      : "text-[#A1A1AA] hover:text-[#F4F4F5]"
                  }`}
                >
                  {w}d
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label="Open command menu"
            className="flex items-center gap-2 rounded-lg bg-[#11151B] px-2.5 py-1.5 text-xs text-[#A1A1AA] border border-white/[0.09] hover:border-[#E6BD58]/35 hover:text-[#F4F4F5] transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Jump</span>
            <kbd className="hidden sm:inline rounded bg-[#171B22] px-1.5 py-0.5 text-[10px] font-mono text-[#A1A1AA] border border-white/[0.06]">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={onRunScan}
            disabled={isScanning}
            aria-busy={isScanning}
            title={
              hasPendingChanges
                ? "Selections or a validated upload are pending. Run the scan to apply them."
                : "Run the intelligence scan with the current applied data and settings."
            }
            className="btn-gold-primary flex h-9 w-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-0 text-xs cursor-pointer sm:w-[190px] sm:px-3.5"
          >
            <Sparkles className={`h-3.5 w-3.5 shrink-0 ${isScanning ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Run Intelligence Scan</span>
          </button>
        </div>
      </div>
    </header>
  );
}
