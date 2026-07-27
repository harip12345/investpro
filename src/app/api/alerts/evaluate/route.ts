import { NextResponse } from "next/server";
import { GET as getFundamental } from "@/app/api/fundamentals/route";
import { GET as getBandarology } from "@/app/api/bandarology/route";
import { GET as getNews } from "@/app/api/news/route";
import { STOCK_UNIVERSE } from "@/lib/indices";

export const dynamic = "force-dynamic";

type IncomingRule = {
  id: string;
  ticker: string;
  type: "price_above" | "price_below" | "roe_above" | "pe_below" | "volume_spike" | "bandarology" | "news";
  target?: number;
  enabled?: boolean;
  lastTriggeredAt?: string;
};

function allowedTicker(ticker: string) {
  return STOCK_UNIVERSE.some((stock) => stock.ticker === ticker);
}

async function fetchCurrentPrice(ticker: string) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.JK?interval=1d&range=5d`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) return 0;
  const result = (await response.json()).chart?.result?.[0];
  return Number(result?.meta?.regularMarketPrice ?? result?.indicators?.quote?.[0]?.close?.at(-1) ?? 0);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({ rules: [] }));
  const rules: IncomingRule[] = (Array.isArray(body.rules) ? body.rules : [])
    .slice(0, 30)
    .filter((rule: IncomingRule) => rule?.id && rule?.ticker && rule.enabled !== false)
    .map((rule: IncomingRule) => ({ ...rule, ticker: rule.ticker.toUpperCase() }))
    .filter((rule: IncomingRule) => allowedTicker(rule.ticker));
  if (!rules.length) return NextResponse.json({ evaluatedAt: new Date().toISOString(), triggers: [] });

  const recentRules: IncomingRule[] = rules.filter((rule: IncomingRule) => {
    if (!rule.lastTriggeredAt) return true;
    return Date.now() - new Date(rule.lastTriggeredAt).getTime() >= 6 * 60 * 60 * 1000;
  });
  if (!recentRules.length) return NextResponse.json({ evaluatedAt: new Date().toISOString(), triggers: [] });

  const priceTickers = [...new Set(recentRules.filter((rule: IncomingRule) => rule.type.startsWith("price_")).map((rule: IncomingRule) => rule.ticker))];
  const fundamentalTickers = [...new Set(recentRules.filter((rule: IncomingRule) => rule.type === "roe_above" || rule.type === "pe_below").map((rule: IncomingRule) => rule.ticker))];
  const bandarTickers = [...new Set(recentRules.filter((rule: IncomingRule) => rule.type === "volume_spike" || rule.type === "bandarology").map((rule: IncomingRule) => rule.ticker))];
  const needsNews = recentRules.some((rule: IncomingRule) => rule.type === "news");

  const [priceEntries, fundamentalEntries, bandarEntries, newsResponse] = await Promise.all([
    Promise.all(priceTickers.map(async (ticker) => [ticker, await fetchCurrentPrice(ticker)] as const)),
    Promise.all(fundamentalTickers.map(async (ticker) => {
      const response = await getFundamental(new Request(`http://internal/api/fundamentals?ticker=${ticker}`));
      return [ticker, await response.json()] as const;
    })),
    Promise.all(bandarTickers.map(async (ticker) => {
      const response = await getBandarology(new Request(`http://internal/api/bandarology?ticker=${ticker}`));
      return [ticker, await response.json()] as const;
    })),
    needsNews ? getNews(new Request("http://internal/api/news")) : null
  ]);

  const prices = new Map(priceEntries);
  const fundamentals = new Map(fundamentalEntries);
  const bandarology = new Map(bandarEntries);
  const newsData = newsResponse ? await newsResponse.json() : { news: [] };
  const triggers: { ruleId: string; ticker: string; title: string; message: string; value?: number }[] = [];

  recentRules.forEach((rule: IncomingRule) => {
    const target = Number(rule.target ?? 0);
    const member = STOCK_UNIVERSE.find((stock) => stock.ticker === rule.ticker);
    if (rule.type === "price_above" || rule.type === "price_below") {
      const price = Number(prices.get(rule.ticker) ?? 0);
      const met = rule.type === "price_above" ? price >= target : price <= target;
      if (price && target && met) triggers.push({
        ruleId: rule.id, ticker: rule.ticker, title: `Peringatan harga ${rule.ticker}`,
        message: `Harga Rp ${price.toLocaleString("id-ID")} sudah ${rule.type === "price_above" ? "di atas" : "di bawah"} target Rp ${target.toLocaleString("id-ID")}.`,
        value: price
      });
    }
    if (rule.type === "roe_above") {
      const value = Number((fundamentals.get(rule.ticker) as any)?.ratios?.roe ?? 0);
      if (value >= target) triggers.push({ ruleId: rule.id, ticker: rule.ticker, title: `ROE ${rule.ticker} melewati target`, message: `ROE terbaru ${value.toFixed(2)}%, di atas target ${target.toFixed(2)}%.`, value });
    }
    if (rule.type === "pe_below") {
      const value = Number((fundamentals.get(rule.ticker) as any)?.ratios?.pe ?? 0);
      if (value > 0 && value <= target) triggers.push({ ruleId: rule.id, ticker: rule.ticker, title: `Valuasi ${rule.ticker} masuk target`, message: `P/E terbaru ${value.toFixed(2)}x, di bawah target ${target.toFixed(2)}x.`, value });
    }
    if (rule.type === "volume_spike") {
      const value = Number((bandarology.get(rule.ticker) as any)?.metrics?.volumeRatio ?? 0);
      const threshold = target || 1.5;
      if (value >= threshold) triggers.push({ ruleId: rule.id, ticker: rule.ticker, title: `Volume abnormal ${rule.ticker}`, message: `Rasio volume 5/15 hari mencapai ${value.toFixed(2)}x.`, value });
    }
    if (rule.type === "bandarology") {
      const data = bandarology.get(rule.ticker) as any;
      const threshold = target || 60;
      if (data?.dataStatus === "real" && Number(data.score) >= threshold) triggers.push({ ruleId: rule.id, ticker: rule.ticker, title: `Sinyal Bandarologi ${rule.ticker}`, message: `${data.phase}: ${data.signal} (skor ${data.score}).`, value: data.score });
    }
    if (rule.type === "news") {
      const terms = [rule.ticker.toLowerCase(), ...(member?.name.toLowerCase().split(/\s+/).filter((word) => word.length > 4).slice(0, 2) ?? [])];
      const item = (newsData.news ?? []).find((news: { title?: string; summary?: string }) => terms.some((term) => `${news.title ?? ""} ${news.summary ?? ""}`.toLowerCase().includes(term)));
      if (item) triggers.push({ ruleId: rule.id, ticker: rule.ticker, title: `Berita baru ${rule.ticker}`, message: item.title });
    }
  });

  return NextResponse.json({ evaluatedAt: new Date().toISOString(), triggers });
}
