import { NextResponse } from "next/server";
import { STOCK_UNIVERSE } from "@/lib/indices";

export const dynamic = "force-dynamic";

type MonthlyPoint = { period: string; close: number };

async function fetchMonthly(symbol: string, years: number) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=${years}y`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000)
    }
  );
  if (!response.ok) throw new Error(`Yahoo chart failed: ${response.status}`);
  const result = (await response.json()).chart?.result?.[0];
  const timestamps = (result?.timestamp ?? []) as number[];
  const closes = (result?.indicators?.adjclose?.[0]?.adjclose ?? result?.indicators?.quote?.[0]?.close ?? []) as (number | null)[];
  return timestamps.flatMap((timestamp, index) => {
    const close = closes[index];
    return typeof close === "number" && close > 0
      ? [{ period: new Date(timestamp * 1000).toISOString().slice(0, 7), close }]
      : [];
  }) as MonthlyPoint[];
}

function returnMap(points: MonthlyPoint[]) {
  const result = new Map<string, number>();
  for (let index = 1; index < points.length; index += 1) {
    result.set(points[index].period, points[index].close / points[index - 1].close - 1);
  }
  return result;
}

function portfolioSeries(series: Map<string, number>[]) {
  const periods = [...new Set(series.flatMap((item) => [...item.keys()]))].sort();
  let value = 100;
  return periods.flatMap((period) => {
    const returns = series.flatMap((item) => item.has(period) ? [item.get(period)!] : []);
    if (!returns.length) return [];
    const monthlyReturn = returns.reduce((sum, item) => sum + item, 0) / returns.length;
    value *= 1 + monthlyReturn;
    return [{ period, value, monthlyReturn }];
  });
}

function calculateMetrics(series: { period: string; value: number; monthlyReturn: number }[]) {
  if (!series.length) return { totalReturn: 0, cagr: 0, volatility: 0, maxDrawdown: 0, positiveMonths: 0 };
  const totalReturn = series.at(-1)!.value - 100;
  const years = Math.max(series.length / 12, 1 / 12);
  const cagr = (Math.pow(series.at(-1)!.value / 100, 1 / years) - 1) * 100;
  const returns = series.map((point) => point.monthlyReturn);
  const average = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.length > 1 ? returns.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / (returns.length - 1) : 0;
  let peak = 100;
  let maxDrawdown = 0;
  series.forEach((point) => {
    peak = Math.max(peak, point.value);
    maxDrawdown = Math.min(maxDrawdown, point.value / peak - 1);
  });
  return {
    totalReturn: Number(totalReturn.toFixed(2)),
    cagr: Number(cagr.toFixed(2)),
    volatility: Number((Math.sqrt(variance) * Math.sqrt(12) * 100).toFixed(2)),
    maxDrawdown: Number((Math.abs(maxDrawdown) * 100).toFixed(2)),
    positiveMonths: Number(((returns.filter((value) => value > 0).length / returns.length) * 100).toFixed(1))
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const requested: string[] = Array.isArray(body.tickers) ? body.tickers.map((ticker: unknown) => String(ticker).toUpperCase()) : [];
  const allowed = new Set(STOCK_UNIVERSE.map((stock) => stock.ticker));
  const tickers = [...new Set(requested.filter((ticker: string) => allowed.has(ticker)))].slice(0, 30);
  const years = [1, 3, 5].includes(Number(body.years)) ? Number(body.years) : 3;
  if (!tickers.length) return NextResponse.json({ error: "Pilih sedikitnya satu saham." }, { status: 400 });

  const histories: { ticker: string; points: MonthlyPoint[] }[] = [];
  for (let index = 0; index < tickers.length; index += 6) {
    const batch = tickers.slice(index, index + 6);
    const results = await Promise.allSettled(batch.map(async (ticker) => ({ ticker, points: await fetchMonthly(`${ticker}.JK`, years) })));
    histories.push(...results.flatMap((result) => result.status === "fulfilled" && result.value.points.length >= 3 ? [result.value] : []));
  }
  const benchmarkPoints = await fetchMonthly("^JKSE", years);
  if (!histories.length || benchmarkPoints.length < 3) return NextResponse.json({ error: "Riwayat harga tidak mencukupi untuk backtest." }, { status: 503 });

  const portfolio = portfolioSeries(histories.map((history) => returnMap(history.points)));
  const benchmark = portfolioSeries([returnMap(benchmarkPoints)]);
  const benchmarkByPeriod = new Map(benchmark.map((point) => [point.period, point.value]));
  const chart = portfolio.map((point) => ({
    period: point.period,
    portfolio: Number(point.value.toFixed(2)),
    benchmark: Number((benchmarkByPeriod.get(point.period) ?? 100).toFixed(2))
  }));

  return NextResponse.json({
    source: "Yahoo Finance adjusted monthly prices",
    asOf: chart.at(-1)?.period ?? null,
    years,
    requestedCount: tickers.length,
    usedTickers: histories.map((history) => history.ticker),
    metrics: calculateMetrics(portfolio),
    benchmarkMetrics: calculateMetrics(benchmark),
    chart,
    methodology: "Portofolio berbobot sama dan direbalans bulanan dari saham yang lolos filter saat ini.",
    limitation: "Simulasi memakai hasil screener dan konstituen saat ini. Ada look-ahead dan survivorship bias karena fundamental historis point-in-time gratis belum tersedia; hasil bukan bukti kinerja strategi di masa depan."
  }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
