"use client";

import React, { useState, useEffect } from "react";
import { Search, Compass, Sparkles, ShieldAlert, Coins, TrendingUp, Dna, FlaskConical, Sliders, History, FileSpreadsheet, FileText, BookOpen, X, RefreshCw } from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onSelectPair: (pair: { a: string; b: string }) => void;
  onResetDemo: () => void;
  onRunScan: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onSelectPair,
  onResetDemo,
  onRunScan,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent toggle
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { title: "Overview Dashboard", category: "Navigation", icon: Compass, action: () => onNavigate("overview") },
    { title: "Intelligence Scan Engine", category: "Navigation", icon: Sparkles, action: () => onNavigate("intelligence_scan") },
    { title: "Evidence Room & Autopsy", category: "Navigation", icon: ShieldAlert, action: () => onNavigate("evidence_room") },
    { title: "Spread Analysis & Distributions", category: "Navigation", icon: TrendingUp, action: () => onNavigate("spread_analysis") },
    { title: "Historical Patterns (Spread DNA)", category: "Navigation", icon: Dna, action: () => onNavigate("historical_patterns") },
    { title: "Strategy Lab & Backtester", category: "Navigation", icon: FlaskConical, action: () => onNavigate("strategy_lab") },
    { title: "What-If Simulator", category: "Navigation", icon: Sliders, action: () => onNavigate("what_if") },
    { title: "Market Replay Scrubber", category: "Navigation", icon: History, action: () => onNavigate("market_replay") },
    { title: "Contract Metadata Registry", category: "Navigation", icon: Coins, action: () => onNavigate("contracts") },
    { title: "Data Explorer & CSV Upload", category: "Navigation", icon: FileSpreadsheet, action: () => onNavigate("data_explorer") },
    { title: "Research Reports Archive", category: "Navigation", icon: FileText, action: () => onNavigate("research_reports") },
    { title: "Methodology & Formulations", category: "Navigation", icon: BookOpen, action: () => onNavigate("methodology") },

    // Pairs
    { title: "Switch Pair: GOLDM vs GOLDTEN (100g vs 10g)", category: "Pair Switching", icon: Coins, action: () => onSelectPair({ a: "GOLDM", b: "GOLDTEN" }) },
    { title: "Switch Pair: GOLDM vs GOLDGUINEA (100g vs 8g)", category: "Pair Switching", icon: Coins, action: () => onSelectPair({ a: "GOLDM", b: "GOLDGUINEA" }) },
    { title: "Switch Pair: GOLDGUINEA vs GOLDPETAL (8g vs 1g)", category: "Pair Switching", icon: Coins, action: () => onSelectPair({ a: "GOLDGUINEA", b: "GOLDPETAL" }) },
    { title: "Switch Pair: GOLD vs GOLDM (1kg vs 100g)", category: "Pair Switching", icon: Coins, action: () => onSelectPair({ a: "GOLD", b: "GOLDM" }) },

    // Quick Actions
    { title: "Run Full Intelligence Scan Now", category: "Quick Actions", icon: Sparkles, action: () => { onRunScan(); onNavigate("intelligence_scan"); } },
    { title: "Reset Synthetic Demo Dataset", category: "Quick Actions", icon: RefreshCw, action: () => onResetDemo() },
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-3xl glass-modal p-4 shadow-2xl border border-amber-500/20 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-3 pb-3 border-b border-white/10">
          <Search className="h-5 w-5 text-amber-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, page name, or contract pair..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto mt-2 space-y-1 pr-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands or destinations found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs text-slate-300 hover:bg-amber-500/10 hover:text-amber-200 hover:border-amber-500/20 border border-transparent transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-slate-400 group-hover:text-amber-400" />
                    <span>{item.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono group-hover:text-amber-400/80">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between pt-3 px-3 border-t border-white/5 text-[10px] text-slate-500">
          <span>Navigate with mouse or arrow keys</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
