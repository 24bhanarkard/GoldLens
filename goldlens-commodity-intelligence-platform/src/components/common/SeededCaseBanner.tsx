"use client";

import React from "react";
import { GlassCard } from "../ui/GlassCard";
import { Sparkles, ArrowRight, ShieldCheck, AlertOctagon, DollarSign, Bug } from "lucide-react";
import { SEEDED_CASE_STUDIES, SeededCaseInfo } from "@/lib/analytics/syntheticData";

interface SeededCaseBannerProps {
  onSelectCase: (caseStudy: SeededCaseInfo) => void;
  selectedCaseId?: string;
}

export function SeededCaseBanner({ onSelectCase, selectedCaseId }: SeededCaseBannerProps) {
  const getIcon = (id: string) => {
    switch (id) {
      case "case_1_clean_convergence":
        return <ShieldCheck className="h-4 w-4 text-emerald-400" />;
      case "case_2_expiry_trap":
        return <AlertOctagon className="h-4 w-4 text-purple-400" />;
      case "case_3_friction_mirage":
        return <DollarSign className="h-4 w-4 text-rose-400" />;
      case "case_4_corrupted_tick":
        return <Bug className="h-4 w-4 text-amber-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-amber-400" />;
    }
  };

  const getBadgeColor = (classification: string) => {
    switch (classification) {
      case "WORTH_INVESTIGATING":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "EXPIRY_SENSITIVE":
        return "bg-purple-500/15 text-purple-300 border-purple-500/30";
      case "REJECTED_AFTER_COSTS":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      case "DATA_UNRELIABLE":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      default:
        return "bg-slate-700/30 text-slate-300 border-slate-700/30";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200">
            JUDGE DEMO SUITE — REPRODUCIBLE CASE STUDIES
          </span>
        </div>
        <span className="text-[11px] text-amber-400/90 hidden sm:inline">
          Click any case study to inspect in Evidence Room
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {SEEDED_CASE_STUDIES.map((c) => {
          const isSelected = selectedCaseId === c.id;
          return (
            <GlassCard
              key={c.id}
              variant={isSelected ? "elevated" : "interactive"}
              padding="sm"
              onClick={() => onSelectCase(c)}
              className={`border transition-all text-left ${
                isSelected
                  ? "border-amber-500/50 glass-gold-glow bg-amber-500/10"
                  : "border-white/5 hover:border-amber-500/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-200">
                  {getIcon(c.id)}
                  <span>{c.contractA} vs {c.contractB}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{c.date}</span>
              </div>

              <div className="mt-2 space-y-1">
                <div className="text-xs font-bold text-slate-100 line-clamp-1">{c.title}</div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                  {c.description}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(
                    c.expectedClassification
                  )}`}
                >
                  {c.expectedClassification}
                </span>

                <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Inspect</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
