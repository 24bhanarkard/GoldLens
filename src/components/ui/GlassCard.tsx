import React, { ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "subtle" | "standard" | "elevated" | "interactive" | "modal";
  glow?: "gold" | "emerald" | "rose" | "cyan" | "none";
  onClick?: () => void;
  padding?: "none" | "sm" | "md" | "lg" | "xl";
}

export function GlassCard({
  children,
  className,
  variant = "standard",
  glow = "none",
  onClick,
  padding = "md",
}: GlassCardProps) {
  const variantClass = {
    subtle: "glass-subtle rounded-xl",
    standard: "glass-standard rounded-2xl",
    elevated: "glass-elevated rounded-2xl",
    interactive: "glass-interactive rounded-2xl cursor-pointer",
    modal: "glass-elevated rounded-3xl",
  }[variant];

  const glowClass = {
    gold: "glass-gold-glow border-amber-500/30",
    emerald: "glass-emerald-glow border-emerald-500/30",
    rose: "glass-rose-glow border-rose-500/30",
    cyan: "border-sky-500/30 shadow-[0_0_25px_-5px_rgba(56,189,248,0.25)]",
    none: "",
  }[glow];

  const paddingClass = {
    none: "p-0",
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
    xl: "p-8 sm:p-10",
  }[padding];

  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          variantClass,
          glowClass,
          paddingClass,
          "relative overflow-hidden transition-all duration-200",
          className
        )
      )}
    >
      {children}
    </div>
  );
}
