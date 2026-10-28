"use client";

import React from "react";
import {
  LayoutDashboard,
  ShieldAlert,
  TrendingUp,
  FlaskConical,
  Database,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  anomaliesCount: number;
  forensicFlagsCount: number;
  dataTrustScore: number;
}

export const SIX_SECTION_NAV = [
  {
    id: "overview",
    label: "Overview",
    subtitle: "Summary & price landscape",
    icon: LayoutDashboard,
  },
  {
    id: "signal_intelligence",
    label: "Signal Intelligence",
    subtitle: "Scan, Autopsy & diagnostics",
    icon: ShieldAlert,
  },
  {
    id: "market_analysis",
    label: "Market Analysis",
    subtitle: "Spreads, analogues & replay",
    icon: TrendingUp,
  },
  {
    id: "strategy_lab",
    label: "Strategy Lab",
    subtitle: "Backtest, Stress Test & honesty",
    icon: FlaskConical,
  },
  {
    id: "data_contracts",
    label: "Data & Contracts",
    subtitle: "Forensics, CSV & MCX specs",
    icon: Database,
  },
  {
    id: "reports_methodology",
    label: "Reports & Methodology",
    subtitle: "Dossiers, formulas & limits",
    icon: FileText,
  },
];

export function Sidebar({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
  anomaliesCount,
  forensicFlagsCount,
  dataTrustScore,
}: SidebarProps) {
  const handleSelect = (viewId: string) => {
    onNavigate(viewId);
    if (isOpenMobile) onCloseMobile();
  };

  const trustColor =
    dataTrustScore >= 85
      ? "text-[#4ADE80]"
      : dataTrustScore >= 65
      ? "text-[#FBBF24]"
      : "text-[#F87171]";

  const barColor =
    dataTrustScore >= 85
      ? "bg-[#4ADE80]"
      : dataTrustScore >= 65
      ? "bg-[#FBBF24]"
      : "bg-[#F87171]";

  return (
    <>
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        aria-label="Primary Navigation"
        className={`fixed inset-y-0 left-0 z-50 transform bg-[#080A0D] border-r border-white/[0.07] transition-all duration-200 lg:static lg:translate-x-0 flex flex-col justify-between shrink-0 ${
          isCollapsed ? "lg:w-[72px] w-64" : "w-64"
        } ${isOpenMobile ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-white/[0.06]">
            {!isCollapsed && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A1A1AA]">
                Workstation
              </span>
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex items-center justify-center rounded-lg p-1.5 text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#171B22] transition-colors mx-auto lg:mx-0"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className="space-y-1.5">
            {SIX_SECTION_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  title={isCollapsed ? `${item.label} — ${item.subtitle}` : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`group w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-[#171B22] text-[#F4F4F5] border border-[#E6BD58]/35"
                      : "text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#11151B] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive
                          ? "text-[#E6BD58]"
                          : "text-[#A1A1AA] group-hover:text-[#E6BD58]"
                      }`}
                    />
                    {!isCollapsed && (
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{item.label}</div>
                        <div className="text-[10px] text-[#A1A1AA]/80 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isCollapsed && item.id === "signal_intelligence" && anomaliesCount > 0 && (
                    <span className="ml-2 shrink-0 rounded-md bg-[#E6BD58]/15 px-1.5 py-0.5 text-[10px] font-semibold num-font text-[#E6BD58] border border-[#E6BD58]/25">
                      {anomaliesCount}
                    </span>
                  )}

                  {!isCollapsed && item.id === "data_contracts" && forensicFlagsCount > 0 && (
                    <span className="ml-2 shrink-0 rounded-md bg-[#F87171]/12 px-1.5 py-0.5 text-[10px] font-semibold num-font text-[#F87171] border border-[#F87171]/30">
                      {forensicFlagsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Data Integrity Status */}
        <div className="p-3 border-t border-white/[0.07]">
          {!isCollapsed ? (
            <button
              type="button"
              onClick={() => handleSelect("data_contracts")}
              className="w-full text-left rounded-xl bg-[#11151B] hover:bg-[#171B22] border border-white/[0.07] p-3 space-y-2 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#A1A1AA] font-medium">Data Trust Score</span>
                <span className={`font-bold num-font ${trustColor}`}>{dataTrustScore}/100</span>
              </div>
              <div className="w-full bg-[#080A0D] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`${barColor} h-full rounded-full transition-all duration-300`}
                  style={{ width: `${dataTrustScore}%` }}
                />
              </div>
              <div className="text-[10px] text-[#A1A1AA] flex items-center justify-between">
                <span>
                  {forensicFlagsCount > 0
                    ? `${forensicFlagsCount} forensic flag(s)`
                    : "All rows clean"}
                </span>
                <span className="text-[#76A9FA] font-medium">Inspect →</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSelect("data_contracts")}
              title={`Data Trust Score: ${dataTrustScore}/100`}
              className="w-full rounded-xl bg-[#11151B] border border-white/[0.07] py-2 text-center text-[11px] font-bold num-font text-[#4ADE80]"
            >
              {dataTrustScore}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
