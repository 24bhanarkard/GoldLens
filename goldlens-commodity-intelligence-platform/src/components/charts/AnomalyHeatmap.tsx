"use client";

import React from "react";
import { GlassCard } from "../ui/GlassCard";

interface HeatmapCell {
  pairKey: string;
  date: string;
  zScore: number | null;
  spreadAbs: number;
  isAnomaly: boolean;
  classification?: string;
}

interface AnomalyHeatmapProps {
  cells: HeatmapCell[];
  pairs: string[];
  dates: string[];
  onSelectCell?: (pairKey: string, date: string) => void;
  selectedPair?: string;
  selectedDate?: string;
}

export function AnomalyHeatmap({
  cells,
  pairs,
  dates,
  onSelectCell,
  selectedPair,
  selectedDate,
}: AnomalyHeatmapProps) {
  const getCellColor = (z: number | null, isAnomaly: boolean) => {
    if (z === null) return "bg-slate-900/40 border-white/5";
    const absZ = Math.abs(z);
    if (!isAnomaly && absZ < 1.0) return "bg-slate-800/40 border-white/5";
    if (absZ < 1.8) return "bg-amber-500/20 border-amber-500/30 text-amber-300";
    if (absZ < 2.5) return "bg-amber-500/40 border-amber-500/50 text-amber-200 font-bold shadow-sm";
    if (absZ < 3.2) return "bg-rose-500/50 border-rose-500/60 text-white font-bold shadow-md";
    return "bg-rose-600/80 border-rose-400 text-white font-extrabold shadow-lg";
  };

  const cellMap = new Map<string, HeatmapCell>();
  cells.forEach((c) => cellMap.set(`${c.pairKey}_${c.date}`, c));

  const displayDates = dates.slice(-25); // show last 25 sessions

  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="flex items-center justify-between text-xs pb-1">
        <span className="font-semibold text-slate-300">
          Relative Pricing Deviation Heatmap (|Z-Score| Rarity Matrix)
        </span>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-slate-800/60 border border-white/10" />
            <span>Normal (&lt;1.0σ)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-amber-500/30 border border-amber-500/40" />
            <span>Elevated (1.8σ)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-rose-500/70 border border-rose-400" />
            <span>Severe Anomaly (&gt;2.5σ)</span>
          </div>
        </div>
      </div>

      <div className="min-w-[700px] rounded-2xl glass-subtle p-3 border border-white/5">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left font-bold text-slate-400 pb-2 pr-3 w-36">Contract Pair</th>
              {displayDates.map((d) => {
                const parts = d.split("-");
                return (
                  <th key={d} className="font-mono text-[10px] text-slate-400 pb-2 text-center px-0.5">
                    {parts[1]}/{parts[2]}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="space-y-1">
            {pairs.map((pKey) => (
              <tr key={pKey} className="group">
                <td className="font-bold text-slate-300 py-1 pr-3 text-xs whitespace-nowrap">
                  {pKey}
                </td>
                {displayDates.map((d) => {
                  const cell = cellMap.get(`${pKey}_${d}`);
                  const z = cell?.zScore ?? null;
                  const isAnomaly = cell?.isAnomaly ?? false;
                  const isSelected = selectedPair === pKey && selectedDate === d;

                  return (
                    <td key={d} className="p-0.5 text-center">
                      <div
                        onClick={() => {
                          if (onSelectCell) onSelectCell(pKey, d);
                        }}
                        title={`${pKey} on ${d}: Z=${z !== null ? `${z.toFixed(2)}σ` : "N/A"}, Spread=₹${cell?.spreadAbs?.toFixed(2) || 0}/g`}
                        className={`h-7 w-full min-w-[24px] rounded flex items-center justify-center text-[10px] font-mono cursor-pointer transition-all border ${getCellColor(
                          z,
                          isAnomaly
                        )} ${
                          isSelected ? "ring-2 ring-amber-400 scale-110 z-10" : "hover:scale-110"
                        }`}
                      >
                        {z !== null && Math.abs(z) >= 1.5 ? Math.abs(z).toFixed(1) : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
