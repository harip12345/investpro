import { NextResponse } from "next/server";
import { STOCK_UNIVERSE } from "@/lib/indices";

export const dynamic = "force-dynamic";

type PricePoint = { timestamp: number; close: number };

async function fetchDailyChart(symbol: string) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(7000)
    }
  );
  if (!response.ok) throw new Error(`Yahoo chart failed: ${response.status}`);
  const result = (await response.json()).chart?.result?.[0];
  const timestamps = (result?.timestamp ?? []) as number[];
  const closes = (result?.indicators?.quote?.[0]?.close ?? []) as (number | null)[];
  return timestamps.flatMap((timestamp, index) => {
    const close = closes[index];
    return typeof close === "number" && Number.isFinite(close) ? [{ timestamp, close }] : [];
  }) as PricePoint[];
}

function dailyReturns(points: PricePoint[]) {
  const output = new Map<number, number>();
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1].close;
    const current = points[index].close;
    if (previous > 0) output.set(points[index].timestamp, current / previous - 1);
  }
  return output;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function variance(values: number[]) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / (values.length - 1);
}

function covariance(left: number[], right: number[]) {
  if (left.length < 2 || left.length !== right.length) return 0;
  const leftMean = mean(left);
  const rightMean = mean(right);
  return left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0) / (left.length - 1);
}

function maxDrawdown(points: PricePoint[]) {
  let peak = 0;
  let worst = 0;
  const series = points.map((point) => {
    peak = Math.max(peak, point.close);
    const drawdown = peak ? (point.close / peak - 1) * 100 : 0;
    worst = Math.min(worst, drawdown);
    return { date: new Date(point.timestamp * 1000).toISOString().slice(0, 10), value: Number(drawdown.toFixed(2)) };
  });
  return { value: Math.abs(worst), series };
}

function percentile(values: number[], probability: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function round(value: number, digits = 2) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(digits));
}

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.toUpperCase() || "BBCA";
  if (!STOCK_UNIVERSE.some((stock) => stock.ticker === ticker)) {
    return NextResponse.json({ error: "Ticker not found" }, { status: 404 });
  }

  try {
    const [stockPoints, marketPoints] = await Promise.all([
      fetchDailyChart(`${ticker}.JK`),
      fetchDailyChart("^JKSE")
    ]);
    if (stockPoints.length < 30 || marketPoints.length < 30) throw new Error("Insufficient price history");

    const stockReturnMap = dailyReturns(stockPoints);
    const marketReturnMap = dailyReturns(marketPoints);
    const sharedDates = [...stockReturnMap.keys()].filter((timestamp) => marketReturnMap.has(timestamp));
    const stockReturns = sharedDates.map((timestamp) => stockReturnMap.get(timestamp)!);
    const marketReturns = sharedDates.map((timestamp) => marketReturnMap.get(timestamp)!);
    const stockVariance = variance(stockReturns);
    const marketVariance = variance(marketReturns);
    const stockStd = Math.sqrt(stockVariance);
    const marketStd = Math.sqrt(marketVariance);
    const sharedCovariance = covariance(stockReturns, marketReturns);
    const drawdown = maxDrawdown(stockPoints);
    const startPrice = stockPoints[0].close;
    const endPrice = stockPoints.at(-1)!.close;
    const annualReturn = startPrice > 0 ? (endPrice / startPrice - 1) * 100 : 0;
    const volatility = stockStd * Math.sqrt(252) * 100;
    const beta = marketVariance ? sharedCovariance / marketVariance : 0;
    const correlation = stockStd && marketStd ? sharedCovariance / (stockStd * marketStd) : 0;
    const var95 = Math.max(0, -percentile(stockReturns, 0.05) * 100);
    const riskScore = Math.min(100, volatility * 1.5 + drawdown.value + var95 * 3);
    const riskLevel = riskScore >= 70 ? "Tinggi" : riskScore >= 42 ? "Sedang" : "Rendah";

    return NextResponse.json({
      ticker,
      dataStatus: "real",
      source: "Yahoo Finance chart",
      asOf: new Date(stockPoints.at(-1)!.timestamp * 1000).toISOString(),
      period: "1 tahun, data harian",
      metrics: {
        annualReturn: round(annualReturn),
        volatility: round(volatility),
        maxDrawdown: round(drawdown.value),
        beta: round(beta),
        var95: round(var95),
        correlation: round(correlation, 3),
        riskLevel
      },
      priceHistory: stockPoints.filter((_, index) => index % 5 === 0 || index === stockPoints.length - 1).map((point) => ({
        date: new Date(point.timestamp * 1000).toISOString().slice(0, 10),
        value: round(point.close)
      })),
      drawdownHistory: drawdown.series.filter((_, index) => index % 5 === 0 || index === drawdown.series.length - 1),
      methodology: {
        volatility: "Simpangan baku return harian yang disetahunkan dengan 252 hari bursa.",
        beta: "Kovarians return saham dan IHSG dibagi varians IHSG.",
        var95: "Historical VaR 95% satu hari; estimasi kerugian yang hanya dilampaui pada sekitar 5% hari.",
        correlation: "Korelasi Pearson return harian saham terhadap IHSG."
      }
    }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch (error) {
    console.error(`Risk analysis error for ${ticker}:`, error);
    return NextResponse.json({
      ticker,
      dataStatus: "unavailable",
      source: "Yahoo Finance chart",
      asOf: null,
      metrics: { annualReturn: 0, volatility: 0, maxDrawdown: 0, beta: 0, var95: 0, correlation: 0, riskLevel: "Tidak tersedia" },
      priceHistory: [],
      drawdownHistory: [],
      methodology: null
    }, { headers: { "Cache-Control": "public, s-maxage=300" } });
  }
}
