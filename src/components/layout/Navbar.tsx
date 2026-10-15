"use client";

import React, { useState } from "react";
import {
  Compass,
  Search,
  Sparkles,
  Database,
  RefreshCw,
  Bell,
  Cpu,
  ShieldCheck,
  ChevronDown,
  Layers,
  HelpCircle,
} from "lucide-react";
import { GlassCard } from "../ui/GlassCard";

interface NavbarProps {
  activePair: { a: string; b: string };
  onPairChange: (pair: { a: string; b: string }) => void;
  lookbackWindow: number;
  onLookbackChange: (val: number) => void;
  isDemo: boolean;
  onResetDemo: () => void;
  onOpenCommandPalette: () => void;
  onRunScan: () => void;
  isScanning: boolean;
  dataTrustScore: number;
  onNavigate: (view: string) => void;
}

export const PAIR_OPTIONS = [
  { a: "GOLDM", b: "GOLDTEN", label: "GOLDM / GOLDTEN (100g 995 vs 10g 999)" },
  { a: "GOLDM", b: "GOLDGUINEA", label: "GOLDM / GOLDGUINEA (100g vs 8g)" },
  { a: "GOLDGUINEA", b: "GOLDPETAL", label: "GOLDGUINEA / GOLDPETAL (8g vs 1g)" },
  { a: "GOLDM", b: "GOLDPETAL", label: "GOLDM / GOLDPETAL (100g vs 1g)" },
  { a: "GOLD", b: "GOLDM", label: "GOLD / GOLDM (1kg 995 vs 100g 995)" },
];

export function Navbar({
  activePair,
  onPairChange,
  lookbackWindow,
  onLookbackChange,
  isDemo,
  onResetDemo,
  onOpenCommandPalette,
  onRunScan,
  isScanning,
  dataTrustScore,
  onNavigate,
}: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPairDropdown, setShowPairDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#07090e]/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => onNavigate("overview")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-900 p-0.5 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0c1017]">
                <Compass className="h-5 w-5 text-amber-400 transition-transform group-hover:rotate-45" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider gold-gradient-text">GOLDLENS</span>
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20">
                  v2.4 QUANT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                See the signal behind the spread.
              </p>
            </div>
          </div>

          {/* Dataset Status Badge */}
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-white/10">
            {isDemo ? (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300 border border-amber-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span>SYNTHETIC DEMO DATA</span>
                <button
                  onClick={onResetDemo}
                  title="Reset Demo Dataset"
                  className="ml-1 hover:text-white transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/20">
                <Database className="h-3 w-3" />
                <span>UPLOADED BHAVCOPY DATASET</span>
              </div>
            )}

            {/* Data Trust Pill */}
            <div
              onClick={() => onNavigate("data_explorer")}
              className="flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-200 border border-white/10 cursor-pointer hover:border-amber-500/30 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Trust: {dataTrustScore}/100</span>
            </div>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-3">
          {/* Active Contract Pair Switcher */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => setShowPairDropdown(!showPairDropdown)}
              className="flex items-center gap-2 rounded-xl bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-200 border border-white/10 hover:border-amber-500/30 transition-all"
            >
              <Layers className="h-3.5 w-3.5 text-amber-400" />
              <span>
                {activePair.a} <span className="text-amber-400">vs</span> {activePair.b}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showPairDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-elevated p-2 shadow-2xl z-50">
                <div className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                  Select Contract Pair
                </div>
                {PAIR_OPTIONS.map((opt) => (
                  <button
                    key={`${opt.a}_${opt.b}`}
                    onClick={() => {
                      onPairChange({ a: opt.a, b: opt.b });
                      setShowPairDropdown(false);
                    }}
                    className={`w-full text-left rounded-xl px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                      activePair.a === opt.a && activePair.b === opt.b
                        ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/20"
                        : "text-slate-300 hover:bg-slate-800/60"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {activePair.a === opt.a && activePair.b === opt.b && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lookback Window Selector */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[11px] text-slate-400 px-2 font-medium">Lookback:</span>
            {[20, 30, 60, 90].map((w) => (
              <button
                key={w}
                onClick={() => onLookbackChange(w)}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  lookbackWindow === w
                    ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {w}d
              </button>
            ))}
          </div>

          {/* Search / Command Palette Button */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 text-xs text-slate-400 border border-white/10 hover:border-amber-500/30 hover:text-slate-200 transition-all"
          >
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-block rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-white/5">
              ⌘K
            </kbd>
          </button>

          {/* Run Intelligence Scan CTA Button */}
          <button
            onClick={onRunScan}
            disabled={isScanning}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Sparkles className={`h-4 w-4 text-slate-950 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Scanning Engine..." : "Run Intelligence Scan"}</span>
          </button>

          {/* Notification Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-xl bg-slate-900/60 p-2 text-slate-400 border border-white/10 hover:border-amber-500/30 hover:text-slate-200 transition-all"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-[#07090e]"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-elevated p-3 shadow-2xl z-50">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-slate-200">Intelligence Alerts</span>
                  <span className="text-[10px] text-amber-400 font-medium">3 active</span>
                </div>
                <div className="mt-2 space-y-2">
                  <div
                    onClick={() => {
                      onNavigate("evidence_room");
                      setShowNotifications(false);
                    }}
                    className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs cursor-pointer hover:bg-emerald-500/15"
                  >
                    <div className="font-semibold text-emerald-300">Clean Convergence Detected</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      GOLDM vs GOLDTEN 2.65σ basis on 2024-09-18 survived all friction checks (+₹18.40/g net edge).
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      onNavigate("evidence_room");
                      setShowNotifications(false);
                    }}
                    className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs cursor-pointer hover:bg-rose-500/15"
                  >
                    <div className="font-semibold text-rose-300">Expiry Risk Triggered</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      GOLDM near expiry (3d DTE) disqualified by False Signal Detective on 2024-10-02.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
