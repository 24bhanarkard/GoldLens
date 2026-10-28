"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  LayoutDashboard,
  ShieldAlert,
  TrendingUp,
  FlaskConical,
  Database,
  FileText,
  Coins,
  X,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onNavigate: (view: string) => void;
  onSelectPair: (pair: { a: string; b: string }) => void;
  onResetDemo: () => void;
  onRunScan: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpen,
  onNavigate,
  onSelectPair,
  onResetDemo,
  onRunScan,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onOpen();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onOpen]);

  if (!isOpen) return null;

  const actions = [
    {
      title: "1. Overview — Summary & Relative Price Landscape",
      category: "Sections",
      icon: LayoutDashboard,
      action: () => onNavigate("overview"),
    },
    {
      title: "2. Signal Intelligence — Scan, Autopsy & Diagnostics",
      category: "Sections",
      icon: ShieldAlert,
      action: () => onNavigate("signal_intelligence"),
    },
    {
      title: "3. Market Analysis — Spreads, Historical Analogues & Replay",
      category: "Sections",
      icon: TrendingUp,
      action: () => onNavigate("market_analysis"),
    },
    {
      title: "4. Strategy Lab — Backtest, Stress Test & Honesty Scorecard",
      category: "Sections",
      icon: FlaskConical,
      action: () => onNavigate("strategy_lab"),
    },
    {
      title: "5. Data & Contracts — Data Forensics, CSV Upload & MCX Specs",
      category: "Sections",
      icon: Database,
      action: () => onNavigate("data_contracts"),
    },
    {
      title: "6. Reports & Methodology — Research Dossiers & Derivations",
      category: "Sections",
      icon: FileText,
      action: () => onNavigate("reports_methodology"),
    },
    {
      title: "Compare GOLDM / GOLDTEN (100g 995 vs 10g 999)",
      category: "Pairs",
      icon: Coins,
      action: () => onSelectPair({ a: "GOLDM", b: "GOLDTEN" }),
    },
    {
      title: "Compare GOLDM / GOLDGUINEA (100g 995 vs 8g 999)",
      category: "Pairs",
      icon: Coins,
      action: () => onSelectPair({ a: "GOLDM", b: "GOLDGUINEA" }),
    },
    {
      title: "Compare GOLDGUINEA / GOLDPETAL (8g vs 1g)",
      category: "Pairs",
      icon: Coins,
      action: () => onSelectPair({ a: "GOLDGUINEA", b: "GOLDPETAL" }),
    },
    {
      title: "Compare GOLDM / GOLDPETAL (Corrupted Print Forensics Case)",
      category: "Pairs",
      icon: Coins,
      action: () => onSelectPair({ a: "GOLDM", b: "GOLDPETAL" }),
    },
    {
      title: "Compare GOLD / GOLDM (1kg Institutional vs 100g Mini)",
      category: "Pairs",
      icon: Coins,
      action: () => onSelectPair({ a: "GOLD", b: "GOLDM" }),
    },
    {
      title: "Run Intelligence Scan Across All Pairs",
      category: "Actions",
      icon: Sparkles,
      action: () => {
        onRunScan();
        onNavigate("signal_intelligence");
      },
    },
    {
      title: "Reset Synthetic Demo Dataset",
      category: "Actions",
      icon: RefreshCw,
      action: () => onResetDemo(),
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick navigation command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl rounded-2xl glass-modal p-4">
        <div className="flex items-center gap-3 px-2 pb-3 border-b border-white/[0.08]">
          <Search className="h-4 w-4 text-[#E6BD58]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a section, contract pair, or action…"
            className="w-full bg-transparent text-sm text-[#F4F4F5] placeholder-[#A1A1AA] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command menu"
            className="rounded-lg p-1 text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#11151B]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto mt-2 space-y-1 pr-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#A1A1AA]">
              No matching sections or contract pairs.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-[#F4F4F5] hover:bg-[#11151B] border border-transparent hover:border-[#E6BD58]/30 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-[#A1A1AA] group-hover:text-[#E6BD58]" />
                    <span>{item.title}</span>
                  </div>
                  <span className="text-[10px] text-[#A1A1AA] font-mono">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
