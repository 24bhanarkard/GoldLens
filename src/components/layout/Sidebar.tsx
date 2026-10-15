"use client";

import React from "react";
import {
  LayoutDashboard,
  Sparkles,
  ShieldAlert,
  Coins,
  TrendingUp,
  Dna,
  FlaskConical,
  Sliders,
  History,
  FileSpreadsheet,
  FileText,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  anomaliesCount: number;
  dataTrustScore: number;
}

export const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, category: "Core Intelligence" },
  { id: "intelligence_scan", label: "Intelligence Scan", icon: Sparkles, category: "Core Intelligence", badge: "Live" },
  { id: "evidence_room", label: "Evidence Room", icon: ShieldAlert, category: "Core Intelligence", highlight: true },
  
  { id: "spread_analysis", label: "Spread Analysis", icon: TrendingUp, category: "Analytical Tools" },
  { id: "historical_patterns", label: "Historical Patterns (DNA)", icon: Dna, category: "Analytical Tools" },
  { id: "strategy_lab", label: "Strategy Lab", icon: FlaskConical, category: "Analytical Tools" },
  { id: "what_if", label: "What-If Simulator", icon: Sliders, category: "Analytical Tools" },
  { id: "market_replay", label: "Market Replay", icon: History, category: "Analytical Tools" },

  { id: "contracts", label: "Contract Explorer", icon: Coins, category: "Data & Validation" },
  { id: "data_explorer", label: "Data Explorer & CSV", icon: FileSpreadsheet, category: "Data & Validation" },
  { id: "research_reports", label: "Research Reports", icon: FileText, category: "Reporting & Theory" },
  { id: "methodology", label: "Methodology", icon: BookOpen, category: "Reporting & Theory" },
];

export function Sidebar({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  anomaliesCount,
  dataTrustScore,
}: SidebarProps) {
  const categories = Array.from(new Set(NAV_ITEMS.map((item) => item.category)));

  const handleNavClick = (viewId: string) => {
    onNavigate(viewId);
    if (isOpenMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-[#07090e]/95 backdrop-blur-2xl border-r border-white/5 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-64 flex flex-col justify-between ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {categories.map((cat) => (
            <div key={cat} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                {cat}
              </div>
              <div className="space-y-0.5 pt-1">
                {NAV_ITEMS.filter((item) => item.category === cat).map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`group w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 font-bold border border-amber-500/30 shadow-lg shadow-amber-500/10"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 transition-colors ${
                            isActive
                              ? "text-amber-400"
                              : "text-slate-500 group-hover:text-amber-400/80"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                          {item.badge}
                        </span>
                      )}

                      {item.id === "evidence_room" && anomaliesCount > 0 && (
                        <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                          {anomaliesCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Widget */}
        <div className="p-3 border-t border-white/5 bg-slate-950/40">
          <div className="rounded-xl glass-subtle p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Data Integrity</span>
              <span className="text-emerald-400 font-bold">{dataTrustScore}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${dataTrustScore}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>MCX Commodity Feed</span>
              <span className="text-amber-400">OK</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
