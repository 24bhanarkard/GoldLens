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
    standard: "glass-standard rounded-xl",
    elevated: "glass-elevated rounded-2xl",
    interactive: "glass-interactive rounded-xl cursor-pointer",
    modal: "glass-modal rounded-2xl",
  }[variant];

  const accentBorderClass = {
    gold: "border-[#E6BD58]/35",
    emerald: "border-[#4ADE80]/30",
    rose: "border-[#F87171]/35",
    cyan: "border-[#76A9FA]/30",
    none: "",
  }[glow];

  const paddingClass = {
    none: "p-0",
    sm: "p-3.5 sm:p-4",
    md: "p-5 sm:p-6",
    lg: "p-6 sm:p-7",
    xl: "p-8 sm:p-10",
  }[padding];

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={twMerge(clsx(variantClass, accentBorderClass, paddingClass, "relative", className))}
    >
      {children}
    </div>
  );
}
