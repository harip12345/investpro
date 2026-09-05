import { NextResponse } from "next/server";
import { STOCK_UNIVERSE } from "@/lib/indices";
import { getArjumBrokerSummary, type ArjumBrokerRow } from "@/lib/arjum";
import { getBrokerSummary, getForeignFlow, isIndexAlphaConfigured } from "@/lib/indexalpha";

export const dynamic = "force-dynamic";

function round(value: number, digits = 2) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(digits));
}

function toTriliun(value: number) {
  return round(value / 1e12, 2);
}

interface NormalizedBroker {
  broker: string;
  buyValue: number;
  sellValue: number;
  netValue: number;
  buyVolume: number;
  sellVolume: number;
}

interface RealBrokerResult {
  buyers: NormalizedBroker[];
  sellers: NormalizedBroker[];
  totalBuyValue: number;
  totalSellValue: number;
  netValue: number;
  brokerCount: number;
  foreignNetValue: number | null;
  periodFrom: string | null;
  periodTo: string | null;
  asOf: string | null;
}

function summarizeBrokers(rows: NormalizedBroker[]): Omit<RealBrokerResult, "foreignNetValue" | "periodFrom" | "periodTo" | "asOf"> {
  const totalBuyValue = rows.reduce((sum, row) => sum + row.buyValue, 0);
  const totalSellValue = rows.reduce((sum, row) => sum + row.sellValue, 0);
  const ranked = [...rows].sort((a, b) => b.netValue - a.netValue);
  return {
    buyers: ranked.filter((row) => row.netValue > 0).slice(0, 5),
    sellers: ranked.filter((row) => row.netValue < 0).slice(-5).reverse(),
    totalBuyValue,
    totalSellValue,
    netValue: totalBuyValue - totalSellValue,
    brokerCount: rows.length
  };
}

function scoreFromReal(summary: RealBrokerResult) {
  const total = summary.totalBuyValue + summary.totalSellValue;
  const netRatio = total ? summary.netValue / total : 0;
  const foreignTilt = summary.foreignNetValue != null && total ? summary.foreignNetValue / total : 0;
  let score = 50 + Math.max(-20, Math.min(20, netRatio * 120));
  score += Math.max(-10, Math.min(10, foreignTilt * 200));
  score = Math.round(Math.max(0, Math.min(100, score)));
  const buyPressure = total ? (summary.totalBuyValue / total) * 100 : 50;
  const phase = score >= 65 ? "Akumulasi" : score <= 35 ? "Distribusi" : score >= 55 ? "Markup" : score <= 45 ? "Markdown" : "Netral";
  const signal = score >= 60
    ? `Akumulasi broker terdeteksi (net buy Rp${toTriliun(summary.netValue)} T)`
    : score <= 40
      ? `Distribusi broker terdeteksi (net sell Rp${toTriliun(Math.abs(summary.netValue))} T)`
      : "Belum ada dominasi akumulasi/distribusi yang kuat";
  return { score, phase, signal, netRatio: round(netRatio, 3), buyPressure: round(buyPressure, 1), foreignTiltPct: round(foreignTilt * 100, 2) };
}

async function tryIndexAlpha(ticker: string): Promise<{ summary: RealBrokerResult; source: "indexalpha" } | null> {
  if (!isIndexAlphaConfigured()) return null;
  const [broker, foreign] = await Promise.all([getBrokerSummary(ticker, 5), getForeignFlow(ticker, 5)]);
  if (!broker) return null;
  const normalized: NormalizedBroker[] = broker.rows.map((row) => ({
    broker: row.broker,
    buyValue: row.buyValue,
    sellValue: row.sellValue,
    netValue: row.netValue,
    buyVolume: row.buyVolume,
    sellVolume: row.sellVolume
  }));
  const base = summarizeBrokers(normalized);
  return {
    summary: {
      ...base,
      foreignNetValue: foreign?.flow.netValue ?? null,
      periodFrom: broker.from,
      periodTo: broker.to,
      asOf: broker.to
    },
    source: "indexalpha"
  };
}

async function tryArjum(ticker: string): Promise<{ summary: RealBrokerResult; source: "arjum" } | null> {
  const broker = await getArjumBrokerSummary(ticker);
  if (!broker) return null;
  const normalized: NormalizedBroker[] = (broker.rows as ArjumBrokerRow[]).map((row) => ({
    broker: row.broker,
    buyValue: row.buyValue,
    sellValue: row.sellValue,
    netValue: row.netValue,
    buyVolume: row.buyVolume,
    sellVolume: row.sellVolume
  }));
  const base = summarizeBrokers(normalized);
  return {
    summary: { ...base, foreignNetValue: null, periodFrom: null, periodTo: null, asOf: broker.asOf },
    source: "arjum"
  };
}

function realResponse(ticker: string, summary: RealBrokerResult, source: "indexalpha" | "arjum") {
  const scoring = scoreFromReal(summary);
  const methodology = source === "indexalpha"
    ? `Broker summary real Index Alpha ${summary.periodFrom ?? ""} s/d ${summary.periodTo ?? ""} (${summary.brokerCount} broker) plus aliran dana asing. Skor dari rasio net buy/sell dan tilt foreign flow — bukan proxy harga-volume.`
    : `Broker summary IDX Edge PRO (${summary.brokerCount} broker). Skor dari rasio net buy/sell antar broker — bukan proxy harga-volume.`;
  return NextResponse.json({
    source,
    sourceLabel: source === "indexalpha" ? "Index Alpha (broker real)" : "IDX Edge PRO (broker real)",
    dataStatus: "real",
    isRealBrokerData: true,
    ticker,
    asOf: summary.asOf ? new Date(`${summary.asOf}T15:00:00+07:00`).toISOString() : new Date().toISOString(),
    score: scoring.score,
    phase: scoring.phase,
    signal: scoring.signal,
    metrics: {
      cmf20: scoring.netRatio,
      buyPressure: scoring.buyPressure,
      volumeRatio: 1,
      momentum20: scoring.foreignTiltPct
    },
    brokerSummary: {
      totalBuyValueT: toTriliun(summary.totalBuyValue),
      totalSellValueT: toTriliun(summary.totalSellValue),
      netValueT: toTriliun(summary.netValue),
      brokerCount: summary.brokerCount,
      periodFrom: summary.periodFrom,
      periodTo: summary.periodTo
    },
    brokers: {
      buyers: summary.buyers.map((row) => ({ broker: row.broker, netValueT: toTriliun(row.netValue), buyValueT: toTriliun(row.buyValue), sellValueT: toTriliun(row.sellValue) })),
      sellers: summary.sellers.map((row) => ({ broker: row.broker, netValueT: toTriliun(row.netValue), buyValueT: toTriliun(row.buyValue), sellValueT: toTriliun(row.sellValue) }))
    },
    foreignFlow: summary.foreignNetValue == null ? null : {
      netValueT: toTriliun(summary.foreignNetValue),
      direction: summary.foreignNetValue >= 0 ? "inflow" : "outflow",
      periodFrom: summary.periodFrom,
      periodTo: summary.periodTo
    },
    methodology
  }, { headers: { "Cache-Control": source === "indexalpha" ? "public, s-maxage=43200, stale-while-revalidate=86400" : "public, s-maxage=3600, stale-while-revalidate=7200" } });
}

async function yahooProxyResponse(ticker: string) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.JK?interval=1d&range=3mo`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error(`Yahoo chart failed: ${response.status}`);
  const data = await response.json();
  const result = data.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const rows = (result?.timestamp ?? []).map((timestamp: number, index: number) => ({
    timestamp,
    open: quote?.open?.[index] as number | null,
    high: quote?.high?.[index] as number | null,
    low: quote?.low?.[index] as number | null,
    close: quote?.close?.[index] as number | null,
    volume: quote?.volume?.[index] as number | null
  })).filter((row: { close: number | null; volume: number | null }) => row.close && row.volume);

  if (rows.length < 21) throw new Error("Insufficient market history");
  const window = rows.slice(-20);
  let moneyFlowVolume = 0;
  let totalVolume = 0;
  let upVolume = 0;
  let downVolume = 0;
  window.forEach((row: typeof window[number], index: number) => {
    const range = (row.high ?? 0) - (row.low ?? 0);
    const multiplier = range ? (((row.close ?? 0) - (row.low ?? 0)) - ((row.high ?? 0) - (row.close ?? 0))) / range : 0;
    const volume = row.volume ?? 0;
    moneyFlowVolume += multiplier * volume;
    totalVolume += volume;
    const previousClose = index ? window[index - 1].close ?? row.close ?? 0 : row.open ?? row.close ?? 0;
    if ((row.close ?? 0) >= previousClose) upVolume += volume;
    else downVolume += volume;
  });

  const cmf = totalVolume ? moneyFlowVolume / totalVolume : 0;
  const upVolumeShare = totalVolume ? upVolume / totalVolume : 0.5;
  const recentVolume = window.slice(-5).reduce((sum: number, row: typeof window[number]) => sum + (row.volume ?? 0), 0) / 5;
  const baseVolume = window.slice(0, 15).reduce((sum: number, row: typeof window[number]) => sum + (row.volume ?? 0), 0) / 15;
  const volumeRatio = baseVolume ? recentVolume / baseVolume : 1;
  const firstClose = window[0].close ?? 0;
  const lastClose = window.at(-1)?.close ?? 0;
  const momentum = firstClose ? ((lastClose - firstClose) / firstClose) * 100 : 0;
  const buyPressure = totalVolume ? upVolume / Math.max(1, upVolume + downVolume) : 0.5;

  let score = 50;
  score += Math.max(-18, Math.min(18, cmf * 90));
  score += (upVolumeShare - 0.5) * 40;
  score += Math.max(-10, Math.min(10, momentum));
  if (volumeRatio > 1.2) score += momentum >= 0 ? 8 : -8;
  score = Math.round(Math.max(0, Math.min(100, score)));

  const phase = score >= 68 && momentum >= 0 ? "Markup"
    : score >= 60 ? "Akumulasi"
      : score <= 32 && momentum <= 0 ? "Markdown"
        : score <= 40 ? "Distribusi"
          : "Netral";

  return NextResponse.json({
    source: "yahoo-price-volume",
    sourceLabel: "Yahoo (proxy harga-volume)",
    dataStatus: "real",
    isRealBrokerData: false,
    ticker,
    asOf: new Date((window.at(-1)?.timestamp ?? 0) * 1000).toISOString(),
    score,
    phase,
    signal: score >= 60 ? "Tekanan beli lebih dominan" : score <= 40 ? "Tekanan jual lebih dominan" : "Belum ada dominasi kuat",
    metrics: {
      cmf20: round(cmf, 3),
      buyPressure: round(buyPressure * 100),
      volumeRatio: round(volumeRatio),
      momentum20: round(momentum)
    },
    brokerSummary: null,
    brokers: null,
    foreignFlow: null,
    methodology: "Proxy berbasis harga dan volume 20 hari: CMF, porsi volume pada hari naik, rasio volume 5/15 hari, dan momentum. Bukan broker summary atau identitas pelaku transaksi. Hubungkan INDEXALPHA_API_KEY untuk data broker real."
  }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.toUpperCase() || "BBCA";
  if (!STOCK_UNIVERSE.some((stock) => stock.ticker === ticker)) {
    return NextResponse.json({ error: "Ticker not found" }, { status: 404 });
  }

  // 1. Broker summary real — Index Alpha (butuh INDEXALPHA_API_KEY)
  try {
    const real = await tryIndexAlpha(ticker);
    if (real) return realResponse(ticker, real.summary, real.source);
  } catch (error) {
    console.error(`Bandarology IndexAlpha failed for ${ticker}:`, error);
  }

  // 2. Broker summary IDX Edge PRO (gratis, tanpa key)
  try {
    const arjum = await tryArjum(ticker);
    if (arjum) return realResponse(ticker, arjum.summary, arjum.source);
  } catch (error) {
    console.error(`Bandarology Arjum failed for ${ticker}:`, error);
  }

  // 3. Proxy harga-volume Yahoo (selalu tersedia sebagai cadangan)
  try {
    return await yahooProxyResponse(ticker);
  } catch (error) {
    console.error(`Bandarology error for ${ticker}:`, error);
    return NextResponse.json({
      source: "unavailable",
      sourceLabel: "Tidak tersedia",
      dataStatus: "unavailable",
      isRealBrokerData: false,
      ticker,
      asOf: null,
      score: 0,
      phase: "Tidak tersedia",
      signal: "Data harga-volume tidak tersedia",
      metrics: { cmf20: 0, buyPressure: 0, volumeRatio: 0, momentum20: 0 },
      brokerSummary: null,
      brokers: null,
      foreignFlow: null,
      methodology: "Analisis tidak dibuat tanpa data harga-volume yang memadai."
    });
  }
}
