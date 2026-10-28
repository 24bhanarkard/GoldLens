"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { FuturesCurveChart } from "../charts/FuturesCurveChart";
import { Coins, CheckCircle2, ShieldCheck, ArrowRight, HelpCircle } from "lucide-react";
import { DEFAULT_CONTRACT_REGISTRY, normalizePrice, ContractMetadata } from "@/lib/analytics/contracts";
import { DailyContractPoint } from "@/lib/analytics/spreads";

interface ContractExplorerViewProps {
  marketRecords: DailyContractPoint[];
}

export function ContractExplorerView({ marketRecords }: ContractExplorerViewProps) {
  const [selectedSymbol, setSelectedSymbol] = useState("GOLDM");
  const contractList = Object.values(DEFAULT_CONTRACT_REGISTRY);

  const selectedContract: ContractMetadata =
    DEFAULT_CONTRACT_REGISTRY[selectedSymbol] || DEFAULT_CONTRACT_REGISTRY["GOLDM"];
  const sampleNorm = normalizePrice(72500, selectedSymbol);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              DATA & METADATA REGISTRY
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <Coins className="h-5 w-5 text-amber-400" />
            <span>Contract Explorer & MCX Specifications</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configurable contract metadata, quotation bases, purity adjustments, and futures curve term structure.
          </p>
        </div>
      </div>

      {/* Contract Registry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {contractList.map((c) => {
          const isSelected = selectedSymbol === c.symbol;
          return (
            <GlassCard
              key={c.symbol}
              variant={isSelected ? "elevated" : "interactive"}
              padding="sm"
              onClick={() => setSelectedSymbol(c.symbol)}
              className={`border transition-all ${
                isSelected ? "border-amber-500/50 glass-gold-glow bg-amber-500/10" : "border-white/5 hover:border-amber-500/30"
              }`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <span className="font-bold text-sm text-slate-100">{c.symbol}</span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">{c.nominalQtyGrams}{c.qtyUnit}</span>
              </div>
              <div className="text-[11px] text-slate-300 mt-1 line-clamp-1">{c.description}</div>
              <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                <span>Basis: <strong className="text-slate-200">{c.quotationBasis}</strong></span>
                <span>Purity: <strong className="text-slate-200">{c.referencePurity}</strong></span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Detailed Specification & Normalization Breakdown */}
      <GlassCard variant="standard" padding="md" className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              SPECIFICATION DETAILS
            </span>
            <h3 className="text-base font-bold text-slate-100">
              {selectedContract.symbol} — {selectedContract.description}
            </h3>
          </div>
          <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>MCX Verified Circular ({selectedContract.lastVerifiedDate})</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl glass-subtle p-3 space-y-1">
            <span className="text-[10px] text-slate-400">Exchange & Instrument</span>
            <div className="font-bold text-slate-100 font-mono">{selectedContract.exchange} Futures</div>
            <span className="text-[10px] text-slate-500">Category: {selectedContract.category}</span>
          </div>

          <div className="rounded-xl glass-subtle p-3 space-y-1">
            <span className="text-[10px] text-slate-400">Nominal Lot Quantity</span>
            <div className="font-bold text-amber-300 font-mono">{selectedContract.nominalQtyGrams} grams ({selectedContract.lotSize} lot)</div>
            <span className="text-[10px] text-slate-500">Physical deliverable size</span>
          </div>

          <div className="rounded-xl glass-subtle p-3 space-y-1">
            <span className="text-[10px] text-slate-400">Quotation Convention</span>
            <div className="font-bold text-sky-400 font-mono">Per {selectedContract.quotationBasis}</div>
            <span className="text-[10px] text-slate-500">Multiplier: {selectedContract.quotationMultiplier}</span>
          </div>

          <div className="rounded-xl glass-subtle p-3 space-y-1">
            <span className="text-[10px] text-slate-400">Reference Purity Specification</span>
            <div className="font-bold text-emerald-400 font-mono">{selectedContract.referencePurity} / 1000 Fineness</div>
            <span className="text-[10px] text-slate-500">Fine gold multiplier: {(999 / selectedContract.referencePurity).toFixed(6)}</span>
          </div>
        </div>

        {/* Step-by-Step Normalization Breakdown */}
        <div className="rounded-xl bg-slate-950/70 p-4 border border-white/5 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-slate-200">How is {selectedContract.symbol} Normalized?</span>
            <span className="text-[10px] text-amber-400 font-mono">Sample Quoted Price: ₹72,500</span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
            {sampleNorm.steps.map((st, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-amber-400 shrink-0">➔</span>
                <span>{st}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[10px] text-slate-400 border-t border-white/5">
            Formula: <code className="text-amber-300 font-mono">{sampleNorm.formulaDescription}</code>
          </div>
        </div>
      </GlassCard>

      {/* Futures Term Structure Curve */}
      <GlassCard variant="standard" padding="md">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              VISUALIZATION E • FUTURES CURVE EXPLORER
            </span>
            <h3 className="text-sm font-bold text-slate-100">Cross-Contract Futures Term Structure</h3>
          </div>
        </div>

        <div className="pt-3">
          <FuturesCurveChart records={marketRecords} />
        </div>
      </GlassCard>
    </div>
  );
}
