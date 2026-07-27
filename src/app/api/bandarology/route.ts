import { NextResponse } from "next/server";
import { STOCK_UNIVERSE } from "@/lib/indices";

export const dynamic = "force-dynamic";

function round(value: number, digits = 2) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(digits));
}

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.toUpperCase() || "BBCA";
  if (!STOCK_UNIVERSE.some((stock) => stock.ticker === ticker)) {
    return NextResponse.json({ error: "Ticker not found" }, { status: 404 });
  }

  try {
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
      dataStatus: "real",
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
      methodology: "Proxy berbasis harga dan volume 20 hari: CMF, porsi volume pada hari naik, rasio volume 5/15 hari, dan momentum. Bukan broker summary atau identitas pelaku transaksi."
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  } catch (error) {
    console.error(`Bandarology error for ${ticker}:`, error);
    return NextResponse.json({
      source: "unavailable",
      dataStatus: "unavailable",
      ticker,
      asOf: null,
      score: 0,
      phase: "Tidak tersedia",
      signal: "Data harga-volume tidak tersedia",
      metrics: { cmf20: 0, buyPressure: 0, volumeRatio: 0, momentum20: 0 },
      methodology: "Analisis tidak dibuat tanpa data harga-volume yang memadai."
    });
  }
}
