import { NextResponse } from "next/server";
import { getStockIndices, INDEX_PERIODS, STOCK_UNIVERSE } from "@/lib/indices";

export const dynamic = "force-dynamic";

type DataStatus = "real" | "static";

const knownMetrics: Record<string, { pe: number; pbv: number; marketCap: string; score: number }> = {
  BBCA: { pe: 24.1, pbv: 4.8, marketCap: "1218T", score: 88 },
  BMRI: { pe: 11.9, pbv: 2, marketCap: "600T", score: 86 },
  ASII: { pe: 7.6, pbv: 1, marketCap: "199T", score: 80 },
  TLKM: { pe: 12.8, pbv: 2.1, marketCap: "312T", score: 78 },
  ADRO: { pe: 5.2, pbv: 1.3, marketCap: "91T", score: 83 },
  BBRI: { pe: 12.5, pbv: 2.8, marketCap: "680T", score: 85 },
  BBNI: { pe: 10.2, pbv: 1.5, marketCap: "210T", score: 79 },
  UNVR: { pe: 28, pbv: 35, marketCap: "380T", score: 72 },
  ICBP: { pe: 14.8, pbv: 3.9, marketCap: "173T", score: 76 },
  UNTR: { pe: 7, pbv: 1.5, marketCap: "95T", score: 85 },
  EXCL: { pe: 22.5, pbv: 1.8, marketCap: "48T", score: 66 },
  PTBA: { pe: 4.8, pbv: 1.1, marketCap: "35T", score: 80 },
  PGAS: { pe: 13.5, pbv: 1.6, marketCap: "62T", score: 74 },
  AKRA: { pe: 11.8, pbv: 1.3, marketCap: "21T", score: 76 }
};

const stockMeta = STOCK_UNIVERSE.map((member) => ({
  ...member,
  symbol: `${member.ticker}.JK`,
  ...(knownMetrics[member.ticker] ?? { pe: 0, pbv: 0, marketCap: "-", score: 50 })
}));

const indexList = ["LQ45", "IDX30", "JII", "KOMPAS100", "BISNIS27", "SRI-KEHATI"];

const indexMeta = [
  { label: "IHSG", symbol: "^JKSE", fallbackValue: 6185.783, fallbackChange: -0.3 },
  { label: "LQ45", symbol: "^JKLQ45", fallbackValue: 612.558, fallbackChange: -0.86 },
  { label: "IDX30", symbol: null, fallbackValue: 352.77, fallbackChange: -0.98 },
  { label: "KOMPAS100", symbol: "KOMPAS100.JK", fallbackValue: 806.844, fallbackChange: 0 },
  { label: "JII", symbol: "^JKII", fallbackValue: 369.759, fallbackChange: 0 }
];

async function getChart(symbol: string) {
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new Error(`Yahoo chart failed for ${symbol}`);
  const data = await res.json();
  return data.chart?.result?.[0];
}

function toChange(price: number, previousClose: number) {
  if (!price || !previousClose) return 0;
  return Number((((price - previousClose) / previousClose) * 100).toFixed(2));
}

function toTrend(change: number) {
  if (change > 0.5) return "Bullish" as const;
  if (change < -0.5) return "Bearish" as const;
  return "Neutral" as const;
}

const fallbackPrices = Object.fromEntries(STOCK_UNIVERSE.map((member) => [member.ticker, member.fallbackPrice]));
const fallbackChanges: Record<string, number> = {
  BBCA: 0.82, BMRI: 0.8, ASII: -0.6, TLKM: -1.1, ADRO: 2.2,
  BBRI: 0.65, BBNI: -0.3, UNVR: -0.8, ICBP: 0.4, UNTR: 1.3,
  EXCL: -0.9, PTBA: 1.8, PGAS: -0.5, AKRA: 0.7
};

function stockPayload(stock: (typeof stockMeta)[number], price: number, change: number, dataStatus: DataStatus, name = stock.name) {
  return {
    ticker: stock.ticker,
    name,
    price,
    change,
    pe: stock.pe,
    pbv: stock.pbv,
    marketCap: stock.marketCap,
    score: stock.score,
    trend: toTrend(change),
    sector: stock.sector,
    indexWeight: stock.indexWeight,
    indices: getStockIndices(stock.ticker),
    dataStatus
  };
}

export async function GET() {
  try {
    const stockCharts = await Promise.allSettled(stockMeta.map((stock) => getChart(stock.symbol)));
    const indexCharts = await Promise.allSettled(indexMeta.map((index) => index.symbol ? getChart(index.symbol) : Promise.reject(new Error("No live symbol"))));

    const stocks = stockMeta.map((stock, index) => {
      const result = stockCharts[index];
      if (result.status === "rejected" || !result.value?.meta) {
        const change = fallbackChanges[stock.ticker] ?? 0;
        return stockPayload(stock, fallbackPrices[stock.ticker] ?? 0, change, "static");
      }
      const meta = result.value.meta;
      const price = meta.regularMarketPrice ?? fallbackPrices[stock.ticker] ?? 0;
      const previousClose = meta.chartPreviousClose ?? price;
      return stockPayload(stock, price, toChange(price, previousClose), "real", meta.longName ?? meta.shortName ?? stock.name);
    });

    const marketSummary = indexMeta.map((item, index) => {
      const result = indexCharts[index];
      if (result.status === "rejected" || !result.value?.meta) {
        return formatMarketItem(item.label, item.fallbackValue, item.fallbackChange, "static");
      }
      const meta = result.value.meta;
      const price = meta.regularMarketPrice ?? item.fallbackValue;
      const previousClose = meta.chartPreviousClose ?? price;
      return formatMarketItem(item.label, price, toChange(price, previousClose), "real");
    });

    return NextResponse.json(
      { source: "mixed", marketSummary, stocks, indexList, indexPeriods: INDEX_PERIODS },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        source: "static",
        marketSummary: getFallbackMarket(),
        stocks: getFallbackStocks(),
        indexList,
        indexPeriods: INDEX_PERIODS
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  }
}

function formatMarketItem(label: string, value: number, change: number, dataStatus: DataStatus) {
  return {
    label,
    value: value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 }),
    change,
    dataStatus
  };
}

function getFallbackMarket() {
  return indexMeta.map((item) => formatMarketItem(item.label, item.fallbackValue, item.fallbackChange, "static"));
}

function getFallbackStocks() {
  return stockMeta.map((stock) => {
    const change = fallbackChanges[stock.ticker] ?? 0;
    return stockPayload(stock, fallbackPrices[stock.ticker] ?? 0, change, "static");
  });
}
