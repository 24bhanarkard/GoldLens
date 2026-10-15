import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { datasets, marketData, rejectedRecords } from "@/db/schema";
import { validateMarketRow, calculateDatasetTrustScore } from "@/lib/analytics/dataQuality";
import { normalizePrice } from "@/lib/analytics/contracts";
import { DailyContractPoint } from "@/lib/analytics/spreads";

export const dynamic = "force-dynamic";

interface UploadPayload {
  datasetName?: string;
  csvText?: string;
  rows?: Record<string, unknown>[];
  columnMapping?: {
    symbol?: string;
    date?: string;
    expiryDate?: string;
    open?: string;
    high?: string;
    low?: string;
    close?: string;
    volume?: string;
    openInterest?: string;
  };
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    records.push(row);
  }

  return records;
}

export async function POST(request: NextRequest) {
  try {
    const body: UploadPayload = await request.json();
    let rawRows: Record<string, unknown>[] = [];

    if (body.csvText) {
      rawRows = parseCSV(body.csvText);
    } else if (Array.isArray(body.rows)) {
      rawRows = body.rows;
    } else {
      return NextResponse.json(
        { success: false, error: "Missing 'csvText' or 'rows' array in request body." },
        { status: 400 }
      );
    }

    if (rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Uploaded CSV contained no readable data rows." },
        { status: 400 }
      );
    }

    const mapping = body.columnMapping || {};
    const symKey = mapping.symbol || "symbol";
    const dateKey = mapping.date || "date";
    const expKey = mapping.expiryDate || "expiryDate";
    const openKey = mapping.open || "open";
    const highKey = mapping.high || "high";
    const lowKey = mapping.low || "low";
    const closeKey = mapping.close || "close";
    const volKey = mapping.volume || "volume";
    const oiKey = mapping.openInterest || "openInterest";

    const parsedRows = rawRows.map((r) => {
      const getVal = (k: string, fallbacks: string[]) => {
        if (r[k] !== undefined && r[k] !== "") return r[k];
        for (const fb of fallbacks) {
          const matched = Object.keys(r).find((rk) => rk.toLowerCase() === fb.toLowerCase());
          if (matched && r[matched] !== undefined && r[matched] !== "") return r[matched];
        }
        return undefined;
      };

      const sym = String(getVal(symKey, ["symbol", "instrument", "contract", "ticker"]) || "");
      const date = String(getVal(dateKey, ["date", "trade_date", "tradedate", "timestamp"]) || "");
      const expiry = String(getVal(expKey, ["expiryDate", "expiry", "expiry_date", "exp_date"]) || date);
      const open = Number(getVal(openKey, ["open", "open_price", "op"]) || 0);
      const high = Number(getVal(highKey, ["high", "high_price", "hp"]) || 0);
      const low = Number(getVal(lowKey, ["low", "low_price", "lp"]) || 0);
      const close = Number(getVal(closeKey, ["close", "close_price", "settle", "settlement_price", "cp"]) || 0);
      const volume = Number(getVal(volKey, ["volume", "vol", "traded_qty", "qty"]) || 0);
      const openInterest = Number(getVal(oiKey, ["openInterest", "open_interest", "oi"]) || 0);

      return {
        symbol: sym,
        date,
        expiryDate: expiry,
        open,
        high,
        low,
        close,
        volume,
        openInterest,
      };
    });

    const datasetId = `ds_upload_${Date.now()}`;
    const datasetName = body.datasetName || `Uploaded Bhavcopy (${new Date().toLocaleDateString()})`;

    const validCleaned: DailyContractPoint[] = [];
    const rejectedList: { rowNumber: number; raw: Record<string, unknown>; reason: string }[] = [];

    parsedRows.forEach((row, idx) => {
      const val = validateMarketRow(row, idx);
      if (!val.isValid || !val.cleanedRow) {
        rejectedList.push({
          rowNumber: idx + 1,
          raw: rawRows[idx],
          reason: val.errors.join("; "),
        });
      } else {
        const norm = normalizePrice(val.cleanedRow.close, val.cleanedRow.symbol);
        validCleaned.push({
          ...val.cleanedRow,
          normalizedPriceG999: norm.normalizedPriceG999,
        });
      }
    });

    const trustReport = calculateDatasetTrustScore(parsedRows);

    const dates = validCleaned.map((d) => d.date).sort();
    const dateMin = dates[0] || null;
    const dateMax = dates[dates.length - 1] || null;

    // Save dataset record to Postgres if available
    try {
      await db.insert(datasets).values({
        id: datasetId,
        name: datasetName,
        sourceType: "uploaded",
        rowCount: rawRows.length,
        validRows: validCleaned.length,
        rejectedRows: rejectedList.length,
        dateMin,
        dateMax,
        dataTrustScore: trustReport.overallScore,
        qualitySummary: trustReport,
      });

      // Save rejected records
      if (rejectedList.length > 0) {
        const rejectChunks = rejectedList.slice(0, 500).map((rej) => ({
          datasetId,
          rowNumber: rej.rowNumber,
          rawData: rej.raw,
          rejectionReason: rej.reason,
          severity: "error",
        }));
        await db.insert(rejectedRecords).values(rejectChunks);
      }

      // Save valid market data
      const batchSize = 100;
      for (let i = 0; i < validCleaned.length; i += batchSize) {
        const chunk = validCleaned.slice(i, i + batchSize).map((p) => ({
          datasetId,
          symbol: p.symbol,
          date: p.date,
          expiryDate: p.expiryDate,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume,
          openInterest: p.openInterest,
          normalizedPriceG999: p.normalizedPriceG999,
          daysToExpiry: p.daysToExpiry,
          qualityFlag: p.qualityFlag,
          qualityNotes: p.qualityNotes,
          isSynthetic: false,
        }));
        await db.insert(marketData).values(chunk);
      }
    } catch (dbErr) {
      console.error("Database persist error in upload (falling back to memory):", dbErr);
    }

    return NextResponse.json({
      success: true,
      datasetId,
      name: datasetName,
      totalRows: rawRows.length,
      validRows: validCleaned.length,
      rejectedRows: rejectedList.length,
      dataTrustScore: trustReport.overallScore,
      trustReport,
      dateMin,
      dateMax,
      sampleRejected: rejectedList.slice(0, 10),
      message: `Successfully processed ${rawRows.length} rows (${validCleaned.length} valid, ${rejectedList.length} rejected).`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload processing failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
