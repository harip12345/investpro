import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type MarketDefinition = {
  id: string;
  symbol: string;
  name: string;
  category: "metals" | "crypto" | "funds";
  unit: string;
  risk: "Rendah" | "Menengah" | "Tinggi";
  liquidity: string;
  sourceUrl: string;
};

const marketDefinitions: MarketDefinition[] = [
  { id: "gold", symbol: "GC=F", name: "Emas", category: "metals", unit: "per gram", risk: "Menengah", liquidity: "Tinggi", sourceUrl: "https://finance.yahoo.com/quote/GC=F/" },
  { id: "silver", symbol: "SI=F", name: "Perak", category: "metals", unit: "per gram", risk: "Menengah", liquidity: "Menengah", sourceUrl: "https://finance.yahoo.com/quote/SI=F/" },
  { id: "bitcoin", symbol: "BTC-USD", name: "Bitcoin", category: "crypto", unit: "per BTC", risk: "Tinggi", liquidity: "Tinggi", sourceUrl: "https://finance.yahoo.com/quote/BTC-USD/" },
  { id: "ethereum", symbol: "ETH-USD", name: "Ethereum", category: "crypto", unit: "per ETH", risk: "Tinggi", liquidity: "Tinggi", sourceUrl: "https://finance.yahoo.com/quote/ETH-USD/" },
  { id: "solana", symbol: "SOL-USD", name: "Solana", category: "crypto", unit: "per SOL", risk: "Tinggi", liquidity: "Tinggi", sourceUrl: "https://finance.yahoo.com/quote/SOL-USD/" },
  { id: "xiid", symbol: "XIID.JK", name: "Premier ETF IDX30", category: "funds", unit: "per unit", risk: "Tinggi", liquidity: "Bursa", sourceUrl: "https://finance.yahoo.com/quote/XIID.JK/" },
  { id: "xisr", symbol: "XISR.JK", name: "Premier ETF SRI-KEHATI", category: "funds", unit: "per unit", risk: "Tinggi", liquidity: "Bursa", sourceUrl: "https://finance.yahoo.com/quote/XISR.JK/" },
  { id: "abfii", symbol: "R-ABFII.JK", name: "ABF Indonesia Bond Index Fund", category: "funds", unit: "per unit", risk: "Menengah", liquidity: "Bursa", sourceUrl: "https://finance.yahoo.com/quote/R-ABFII.JK/" },
  { id: "rlq45", symbol: "R-LQ45X.JK", name: "Premier ETF LQ45", category: "funds", unit: "per unit", risk: "Tinggi", liquidity: "Bursa", sourceUrl: "https://finance.yahoo.com/quote/R-LQ45X.JK/" }
];

async function fetchChart(symbol: string, range = "1mo") {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(7000)
    }
  );
  if (!response.ok) throw new Error(`Yahoo chart failed for ${symbol}: ${response.status}`);
  const data = await response.json();
  const result = data.chart?.result?.[0];
  if (!result?.meta) throw new Error(`Yahoo chart returned no data for ${symbol}`);
  return result;
}

function percentChange(current: number, previous: number) {
  return previous ? Number((((current - previous) / previous) * 100).toFixed(2)) : 0;
}

function chartCloses(chart: any) {
  return ((chart.indicators?.quote?.[0]?.close ?? []) as Array<number | null>)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

async function fetchLpsRates() {
  const sourceUrl = "https://apps.lps.go.id/BankPesertaLPSRate";
  const response = await fetch("https://apps.lps.go.id/LPSRate/Today", {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`LPS rate failed: ${response.status}`);
  const rows = await response.json() as Array<{
    description: string;
    startDate: string;
    endDate: string;
    rateUmum: number;
    rateBpr: number;
    rateValas: number;
  }>;
  const now = Date.now();
  const current = rows.find((row) => now >= new Date(row.startDate).getTime() && now <= new Date(row.endDate).getTime())
    ?? rows[0];
  if (!current) throw new Error("LPS rate returned no current period");

  return {
    period: current.description,
    bankIdr: current.rateUmum,
    bankFx: current.rateValas,
    bprIdr: current.rateBpr,
    bankStatus: "real" as const,
    bprStatus: "real" as const,
    bankUrl: sourceUrl,
    bprUrl: sourceUrl
  };
}

export async function GET() {
  const chartResults = await Promise.allSettled([
    fetchChart("USDIDR=X"),
    ...marketDefinitions.map((asset) => fetchChart(asset.symbol))
  ]);
  const fxResult = chartResults[0];
  const usdIdr = fxResult.status === "fulfilled" ? fxResult.value.meta.regularMarketPrice ?? 1 : 1;

  const assets = marketDefinitions.map((definition, index) => {
    const result = chartResults[index + 1];
    if (result.status === "rejected") {
      return { ...definition, price: 0, secondaryValue: null, change1d: 0, change30d: 0, history: [], dataStatus: "static" as const, asOf: null };
    }

    const chart = result.value;
    const rawPrice = chart.meta.regularMarketPrice ?? 0;
    const closes = chartCloses(chart);
    const firstClose = closes[0] ?? rawPrice;
    const previousClose = closes.at(-2) ?? chart.meta.chartPreviousClose ?? rawPrice;
    const ounceDivisor = definition.category === "metals" ? 31.1034768 : 1;
    const needsConversion = definition.category === "crypto" || definition.category === "metals";
    const multiplier = needsConversion ? usdIdr / ounceDivisor : 1;
    const history = closes.slice(-24).map((value) => Number((value * multiplier).toFixed(2)));

    return {
      ...definition,
      price: Number((rawPrice * multiplier).toFixed(2)),
      secondaryValue: needsConversion ? { value: rawPrice, currency: "USD" } : null,
      change1d: percentChange(rawPrice, previousClose),
      change30d: percentChange(rawPrice, firstClose),
      history,
      dataStatus: "real" as const,
      asOf: chart.meta.regularMarketTime ? new Date(chart.meta.regularMarketTime * 1000).toISOString() : null
    };
  });

  let lps;
  try {
    lps = await fetchLpsRates();
  } catch {
    lps = {
      period: "1 Juli - 30 September 2026",
      bankIdr: 3.75,
      bankFx: 2,
      bprIdr: 6.25,
      bankStatus: "static" as const,
      bprStatus: "static" as const,
      bankUrl: "https://apps.lps.go.id/BankPesertaLPSRate",
      bprUrl: "https://apps.lps.go.id/BankPesertaLPSRate"
    };
  }

  const deposits = [
    { id: "lps-bank-idr", name: "Batas Penjaminan Bank Umum", value: lps.bankIdr, unit: "% per tahun", currency: "IDR", risk: "Rendah", liquidity: "Sesuai tenor", dataStatus: lps.bankStatus, sourceUrl: lps.bankUrl },
    { id: "lps-bpr-idr", name: "Batas Penjaminan BPR", value: lps.bprIdr, unit: "% per tahun", currency: "IDR", risk: "Rendah", liquidity: "Sesuai tenor", dataStatus: lps.bprStatus, sourceUrl: lps.bprUrl },
    { id: "lps-bank-fx", name: "Batas Penjaminan Bank Umum", value: lps.bankFx, unit: "% per tahun", currency: "Valas", risk: "Rendah", liquidity: "Sesuai tenor", dataStatus: lps.bankStatus, sourceUrl: lps.bankUrl }
  ];

  return NextResponse.json({
    source: "mixed-live",
    asOf: new Date().toISOString(),
    usdIdr,
    lpsPeriod: lps.period,
    assets,
    deposits
  }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" } });
}
