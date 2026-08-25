"use client";

import { useState, useEffect } from "react";
import { Panel, Badge } from "@/components/ui";
import { Newspaper, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";

interface NewsItem { title: string; source: string; date: string; sentiment: "Positive" | "Neutral" | "Negative"; url?: string; summary?: string }

export default function BeritaPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "Positive" | "Neutral" | "Negative">("all");
  const [source, setSource] = useState("fallback");
  const [feeds, setFeeds] = useState<string[]>([]);

  const [availableSources, setAvailableSources] = useState(14);

  const fetchNews = async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(force ? `/api/news?refresh=1&t=${Date.now()}` : "/api/news");
      if (!res.ok) throw new Error("News request failed");
      const data = await res.json();
      setNews(data.news ?? []);
      setSource(data.source || "rss-indonesia");
      setFeeds(data.successfulFeeds || []);
      setAvailableSources(data.availableSources ?? 14);
    } catch {
      setNews([]);
      setSource("tidak tersedia");
    }
    setLoading(false);
  };

  useEffect(() => { fetchNews(false); }, []);

  const filtered = filter === "all" ? news : news.filter((n) => n.sentiment === filter);

  const sentimentCounts = news.reduce<Record<string, number>>((acc, n) => { acc[n.sentiment] = (acc[n.sentiment] || 0) + 1; return acc; }, {});
  const sentimentScore = Math.round(((sentimentCounts["Positive"] ?? 0) / Math.max(news.length, 1)) * 100);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">Berita & Sentimen</h1>
          <p className="small-muted mt-1 leading-relaxed">Berita pasar dari media Indonesia, dicache 10 menit</p>
        </div>
        <button onClick={() => fetchNews(true)} disabled={loading} className="flex min-h-[44px] items-center justify-center gap-2 self-start rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 sm:min-h-0 sm:self-auto sm:rounded-md sm:py-2">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <Panel className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="hidden text-sm text-zinc-400 sm:inline">Filter:</span>
        <div className="scrollbar-hidden -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 sm:contents">
        {(["all", "Positive", "Neutral", "Negative"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition sm:rounded-md sm:py-1 ${filter === f ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 active:bg-zinc-700"}`}>
            {f === "all" ? "Semua" : f} ({f === "all" ? news.length : sentimentCounts[f] ?? 0})
          </button>
        ))}
        </div>
        <span className="text-xs text-zinc-500 sm:ml-auto">Source: {source}</span>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {filtered.map((item, i) => (
            <Panel key={i} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-white hover:text-sky-400">{item.title}</a>
                  ) : (
                    <h3 className="font-medium text-white">{item.title}</h3>
                  )}
                  {item.summary && <p className="mt-1 text-sm text-zinc-400">{item.summary}</p>}
                </div>
                <Badge tone={item.sentiment === "Positive" ? "positive" : item.sentiment === "Negative" ? "negative" : "neutral"}>{item.sentiment}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><Newspaper size={12} /> {item.source}</span>
                <span>{item.date}</span>
              </div>
            </Panel>
          ))}
          {loading && <Panel className="py-8 text-center text-zinc-400">Memuat berita Indonesia...</Panel>}
          {!loading && filtered.length === 0 && <Panel className="py-8 text-center text-zinc-400">Tidak ada berita untuk filter ini</Panel>}
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-white">Sentimen Pasar</h2>
          <Panel className="flex flex-col gap-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${sentimentScore >= 60 ? "text-green-400" : sentimentScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>{sentimentScore}</div>
              <div className="small-muted mt-1">Sentiment Score (0-100)</div>
              <div className={`mt-2 text-sm font-medium ${sentimentScore >= 60 ? "text-green-400" : sentimentScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                {sentimentScore >= 70 ? "Bullish" : sentimentScore >= 50 ? "Neutral" : sentimentScore >= 30 ? "Cautious" : "Bearish"}
              </div>
            </div>
            <div className="border-t border-zinc-700 pt-4 flex flex-col gap-2">
              <SentimentBar label="Positive" count={sentimentCounts["Positive"] ?? 0} total={news.length} color="bg-green-400" />
              <SentimentBar label="Neutral" count={sentimentCounts["Neutral"] ?? 0} total={news.length} color="bg-yellow-400" />
              <SentimentBar label="Negative" count={sentimentCounts["Negative"] ?? 0} total={news.length} color="bg-red-400" />
            </div>
          </Panel>

          <Panel className="flex flex-col gap-3">
            <h3 className="font-semibold text-white text-sm">Sumber RSS Feed</h3>
            <div className="flex flex-col gap-2 text-sm">
              {feeds.length > 0 ? feeds.map((src) => (
                <div key={src} className="flex items-center justify-between">
                  <span className="text-zinc-400">{src}</span>
                  <span className="text-xs text-green-400">OK</span>
                </div>
              )) : <div className="text-zinc-500">Menggunakan data fallback</div>}
            </div>
            <div className="mt-2 border-t border-zinc-700 pt-2">
              <h4 className="mb-1 text-xs font-medium text-zinc-500">Tersedia: {availableSources} sumber Indonesia</h4>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function SentimentBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="text-white">{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-700">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
