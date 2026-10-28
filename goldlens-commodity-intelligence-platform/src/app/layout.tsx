import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoldLens — Commodity Intelligence",
  description:
    "See the signal behind the spread. Compare MCX gold futures, investigate spread anomalies, audit source integrity, and test whether the evidence holds up.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080A0D] text-[#F4F4F5] antialiased selection:bg-[#E6BD58]/25 selection:text-[#F4F4F5]">
        {children}
      </body>
    </html>
  );
}
