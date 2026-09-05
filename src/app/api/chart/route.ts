import { NextResponse } from "next/server";
import { getArjumHistory } from "@/lib/arjum";

export const dynamic = "force-dynamic";

interface ChartPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number | null;
  rsi14?: number | null;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bbUpper?: number | null;
  bbMiddle?: number | null;
  bbLower?: number | null;
  pattern?: string | null;
  patternDesc?: string;
}

function calculateSMA(data: ChartPoint[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
    result.push(sum / period);
  }
  return result;
}

function calculateRSI(data: ChartPoint[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = Array(data.length).fill(null);
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        result[i] = avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - (100 / (1 + avgGain / avgLoss));
      }
      continue;
    }

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function calculateMACD(data: ChartPoint[]): { macd: number; signal: number; histogram: number }[] {
  if (data.length === 0) return [];
  const prices = data.map((d) => d.close);
  const ema = (values: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const result: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push(values[i] * k + result[i - 1] * (1 - k));
    }
    return result;
  };
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  return macdLine.map((macd, i) => ({
    macd,
    signal: signalLine[i],
    histogram: macd - signalLine[i]
  }));
}

function calculateBollingerBands(data: ChartPoint[], period: number = 20, multiplier: number = 2): { upper: number | null; middle: number | null; lower: number | null }[] {
  const result: { upper: number | null; middle: number | null; lower: number | null }[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ upper: null, middle: null, lower: null });
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const sma = slice.reduce((acc, d) => acc + d.close, 0) / period;
    const variance = slice.reduce((acc, d) => acc + Math.pow(d.close - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    result.push({
      upper: sma + stdDev * multiplier,
      middle: sma,
      lower: sma - stdDev * multiplier
    });
  }
  return result;
}

function detectCandlePatterns(data: ChartPoint[]): { hasPattern: string | null; description: string }[] {
  const result: { hasPattern: string | null; description: string }[] = [];
  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const prev = i > 0 ? data[i - 1] : null;
    const prevBody = prev ? Math.abs(prev.close - prev.open) : 0;
    const currentBody = Math.abs(current.close - current.open);
    const wickUpper = current.high - Math.max(current.open, current.close);
    const wickLower = Math.min(current.open, current.close) - current.low;
    const isBullish = current.close > current.open;
    const isDoji = currentBody < (current.high - current.low) * 0.1;

    let pattern = null;
    let desc = "";

    if (isDoji && wickLower > currentBody * 2 && isBullish) {
      pattern = "Hammer";
      desc = "Candlehammer - potensi reversal bullish";
    } else if (isDoji && wickUpper > currentBody * 2 && !isBullish) {
      pattern = "Shooting Star";
      desc = "Bintang jatuh - potensi reversal bearish";
    } else if (prev && isBullish && currentBody > prevBody && current.close > prev.open && current.open <= prev.close) {
      pattern = "Bullish Engulfing";
      desc = "Pola engulfing bullish kuat";
    } else if (prev && !isBullish && currentBody > prevBody && current.close < prev.open && current.open >= prev.close) {
      pattern = "Bearish Engulfing";
      desc = "Pola engulfing bearish kuat";
    } else if (isBullish && currentBody > prevBody * 2) {
      pattern = "Strong Bullish";
      desc = "Tren bullish sangat kuat hari ini";
    } else if (!isBullish && currentBody > prevBody * 2) {
      pattern = "Strong Bearish";
      desc = "Tren bearish sangat kuat hari ini";
    }

    result.push({ hasPattern: pattern, description: desc });
  }
  return result;
}

function addIndicators(points: ChartPoint[]): ChartPoint[] {
  const sma20 = calculateSMA(points, 20);
  const rsi14 = calculateRSI(points, 14);
  const macd = calculateMACD(points);
  const bb = calculateBollingerBands(points, 20);
  const patterns = detectCandlePatterns(points);

  return points.map((point, i) => ({
    ...point,
    sma20: sma20[i] ?? null,
    rsi14: rsi14[i] ?? null,
    macd: macd[i]?.macd ?? 0,
    macdSignal: macd[i]?.signal ?? 0,
    macdHistogram: macd[i]?.histogram ?? 0,
    bbUpper: bb[i]?.upper ?? null,
    bbMiddle: bb[i]?.middle ?? null,
    bbLower: bb[i]?.lower ?? null,
    pattern: patterns[i]?.hasPattern ?? null,
    patternDesc: patterns[i]?.description ?? ""
  }));
}

async function getChartHistory(symbol: string, range: string = "6mo", interval: string = "1d"): Promise<ChartPoint[] | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store"
    });

    if (!res.ok) return null;

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp;
    const indicators = result.indicators?.quote?.[0];

    if (!timestamps || !indicators) return null;

    const points: ChartPoint[] = timestamps.map((ts: number, i: number) => ({
      timestamp: ts,
      open: indicators.open?.[i] ?? 0,
      high: indicators.high?.[i] ?? 0,
      low: indicators.low?.[i] ?? 0,
      close: indicators.close?.[i] ?? 0,
      volume: indicators.volume?.[i] ?? 0
    }));

    return addIndicators(points.filter((point) => point.close > 0));
  } catch {
    return null;
  }
}

async function getArjumChartHistory(symbol: string, range: string): Promise<ChartPoint[] | null> {
  try {
    const ticker = symbol.replace(/\.JK$/, "");
    const points = await getArjumHistory(ticker);
    if (!points) return null;
    const n = (() => {
      if (range === "1mo") return 21;
      if (range === "3mo") return 63;
      if (range === "6mo") return 126;
      if (range === "1y") return 252;
      if (range === "2y") return 504;
      if (range === "5y") return 1260;
      return 100;
    })();
    const mapped: ChartPoint[] = points.slice(-n).map((point) => ({
      timestamp: point.timestamp,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume
    }));
    const filtered = mapped.filter((point) => point.close > 0);
    if (filtered.length < 20) return null;
    return addIndicators(filtered);
  } catch {
    return null;
  }
}

function getFallbackHistory(symbol: string, range: string): ChartPoint[] | null {
  const n = (() => {
    if (range === "1mo") return 21;
    if (range === "3mo") return 63;
    if (range === "6mo") return 126;
    if (range === "1y") return 252;
    if (range === "2y") return 504;
    if (range === "5y") return 1260;
    return 100;
  })();

  const symbols: Record<string, number> = {
    "BBCA.JK": 6175, "BMRI.JK": 6425, "ASII.JK": 4920, "TLKM.JK": 3150, "ADRO.JK": 2860,
    "^JKSE": 7245, "QQQ": 490
  };
  const basePrice = symbols[symbol] ?? 5000;
  const volatility = basePrice * 0.015;
  const points: ChartPoint[] = [];
  let price = basePrice * 0.92;

  for (let i = 0; i < n; i++) {
    const change = (Math.random() - 0.48) * volatility;
    price += change;
    const open = price;
    const close = price + (Math.random() - 0.5) * volatility * 0.3;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;
    const ts = Math.floor(Date.now() / 1000) - (n - i) * 86400;
    points.push({ timestamp: ts, open, high, low, close, volume: Math.floor(Math.random() * 50000000) + 5000000 });
  }
  return addIndicators(points);
}

const rangeMap: Record<string, { value: string; label: string; labelId: string }> = {
  "1mo": { value: "1mo", label: "1 Bulan", labelId: "1M" },
  "3mo": { value: "3mo", label: "3 Bulan", labelId: "3M" },
  "6mo": { value: "6mo", label: "6 Bulan", labelId: "6M" },
  "1y": { value: "1y", label: "1 Tahun", labelId: "1Y" },
  "2y": { value: "2y", label: "2 Tahun", labelId: "2Y" },
  "5y": { value: "5y", label: "5 Tahun", labelId: "5Y" }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BBCA.JK";
  const range = searchParams.get("range") || "6mo";
  if (!/^(?:[A-Z0-9.-]{1,15}|\^[A-Z0-9.-]{1,14})$/.test(symbol) || !rangeMap[range]) {
    return NextResponse.json({ error: "Invalid chart parameters" }, { status: 400 });
  }

  let history = await getChartHistory(symbol, range);
  let source = "yahoo-chart";

  if (!history) {
    const arjumHistory = await getArjumChartHistory(symbol, range);
    if (arjumHistory) {
      history = arjumHistory;
      source = "arjum-history";
    }
  }

  if (!history) {
    const result = getFallbackHistory(symbol, range);
    if (result) {
      history = result;
      source = "fallback";
    }
  }

  if (!history) {
    return NextResponse.json({ error: "Chart not available", source: "fallback" }, { status: 503 });
  }

  const current = history[history.length - 1];
  const previous = history[history.length - 2];

  return NextResponse.json({
    source,
    symbol,
    range: rangeMap[range]?.label || range,
    current: {
      price: current?.close ?? 0,
      change: current && previous?.close ? Number((((current.close - previous.close) / previous.close) * 100).toFixed(2)) : 0
    },
    history: history.slice(-60),
    meta: {
      currentPrice: current?.close ?? 0,
      highest: Math.max(...history.map((h) => h.high)),
      lowest: Math.min(...history.map((h) => h.low)),
      volume: current?.volume ?? 0,
      latestPattern: current?.pattern || null,
      latestPatternDesc: current?.patternDesc || ""
    }
  });
}
