import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface NewsItem {
  title: string;
  source: string;
  date: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  url?: string;
  summary?: string;
}

interface Feed {
  source: string;
  url: string;
}

function googleFeed(source: string, domain: string) {
  const query = encodeURIComponent(`site:${domain} (saham OR IHSG OR emiten OR bursa)`);
  return { source, url: `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id` };
}

const rssFeeds: Feed[] = [
  { source: "Detik Finance", url: "https://rss.detik.com/index.php/finance" },
  { source: "CNBC Indonesia", url: "https://www.cnbcindonesia.com/market/rss" },
  { source: "Kontan", url: "https://www.kontan.co.id/rss/feed/market" },
  { source: "Bisnis Indonesia", url: "https://www.bisnis.com/rss/market" },
  { source: "Kompas Money", url: "https://money.kompas.com/rss" },
  { source: "CNA Indonesia", url: "https://www.cna.id/api/v1/rss-outbound-feed?_format=xml&category=3321" },
  googleFeed("IDX Channel", "idxchannel.com"),
  googleFeed("Investor Daily", "investor.id"),
  googleFeed("EmitenNews", "emitennews.com"),
  googleFeed("IDNFinancials", "idnfinancials.com"),
  googleFeed("Bloomberg Technoz", "bloombergtechnoz.com"),
  googleFeed("Pasardana", "pasardana.id"),
  googleFeed("Antara", "antaranews.com"),
  googleFeed("Katadata", "katadata.co.id")
];

function getSentiment(text: string): NewsItem["sentiment"] {
  const positive = ["naik", "menguat", "tumbuh", "laba", "dividen", "beli", "rekor", "optimistis", "melesat", "surplus", "ekspansi"];
  const negative = ["turun", "rugi", "jatuh", "jual", "lesu", "melemah", "beban", "defisit", "krisis", "anjlok", "koreksi"];
  const lower = text.toLowerCase();
  const positiveCount = positive.filter((word) => lower.includes(word)).length;
  const negativeCount = negative.filter((word) => lower.includes(word)).length;
  if (positiveCount > negativeCount) return "Positive";
  if (negativeCount > positiveCount) return "Negative";
  return "Neutral";
}

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string) {
  return block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "";
}

function relevant(text: string) {
  return /(saham|ihsg|bursa|emiten|investasi|rupiah|obligasi|pasar modal|bank indonesia|dividen|laba|ekonomi|keuangan)/i.test(text);
}

async function fetchRSSFeed(feed: Feed, force: boolean): Promise<NewsItem[]> {
  try {
    const response = await fetch(feed.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InvestPro/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml"
      },
      ...(force ? { cache: "no-store" as const } : { next: { revalidate: 600 } }),
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) return [];
    const xml = await response.text();
    const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
    return blocks.slice(0, 25).map((block) => {
      let title = decode(tag(block, "title"));
      if (title.endsWith(` - ${feed.source}`)) title = title.slice(0, -(feed.source.length + 3)).trim();
      const summary = decode(tag(block, "description"));
      const link = decode(tag(block, "link")) || block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] || "";
      const rawDate = decode(tag(block, "pubDate")) || decode(tag(block, "updated"));
      const parsedDate = rawDate ? new Date(rawDate) : new Date();
      const date = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString().slice(0, 10) : parsedDate.toISOString().slice(0, 10);
      return {
        title,
        source: feed.source,
        date,
        sentiment: getSentiment(`${title} ${summary}`),
        url: link.startsWith("http") ? link : undefined,
        summary: summary ? summary.slice(0, 240) : undefined
      } satisfies NewsItem;
    }).filter((item) => item.title.length >= 10 && relevant(`${item.title} ${item.summary ?? ""}`));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const results = await Promise.allSettled(rssFeeds.map((feed) => fetchRSSFeed(feed, force)));
  const successfulFeeds: string[] = [];
  const failedFeeds: string[] = [];
  const allNews: NewsItem[] = [];

  results.forEach((result, index) => {
    const feed = rssFeeds[index];
    if (result.status === "fulfilled" && result.value.length > 0) {
      successfulFeeds.push(feed.source);
      allNews.push(...result.value);
    } else {
      failedFeeds.push(feed.source);
    }
  });

  const seen = new Set<string>();
  const news = allNews.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 120);

  return NextResponse.json(
    {
      source: "rss-indonesia",
      cache: force ? "refreshed" : "10-minutes",
      successfulFeeds,
      failedFeeds,
      availableSources: rssFeeds.length,
      count: news.length,
      news
    },
    { headers: { "Cache-Control": force ? "no-store" : "public, s-maxage=600, stale-while-revalidate=3600" } }
  );
}
