"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, Badge, DataStatus } from "@/components/ui";
import { TechnicalChart } from "@/components/technical-chart";
import { TrendingUp, TrendingDown, Minus, Shield, Users, BarChart3, Target, Building2, Activity, Info, AlertTriangle, Database, CalendarClock, ShieldAlert, Star } from "lucide-react";
import { getWatchlist, saveWatchlist } from "@/lib/watchlist";

const mainTabs = ["Fundamental", "Teknikal", "Bandarologi", "Duel Saham"] as const;
const subTabs = ["Ringkasan", "Rasio Keuangan", "Riwayat Laporan", "Industri", "Risiko", "DCF & Analis", "ESG"] as const;

type Trend = "Bullish" | "Neutral" | "Bearish";

interface Stock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  score: number;
  recommendation: string;
  trend: Trend;
  ratios: {
    pe: number; pbv: number; roe: number; der: number; dividendYield: number;
    grossMargin: number; netMargin: number; ebitdaMargin: number; evEbitda: number;
  };
  financials: {
    revenue: number; netIncome: number; grossProfit: number; ebitda: number;
    ebit: number; freeCashFlow: number; eps: number; epsGrowth: number;
    revenueGrowth: number; bookValue: number;
  };
  dcf: { fairPrice: number; upside: number };
  analysts: { count: number; buy: number; hold: number; sell: number; targetPrice: number; consensus: string };
  peers: { ticker: string; name: string; pe: number; pbv: number; roe: number; der: number; marketCap: string; dataStatus?: "real" | "static" }[];
  esg: { total: number; environmental: number; social: number; governance: number; risk: string };
  sector: string; industry: string; marketCap: string;
  dupont: { netMargin: number; assetTurnover: number; equityMultiplier: number; roeEstimate: number };
  earningsTrend: { year: number; value: number }[];
  annualHistory: FinancialHistoryPoint[];
  quarterlyHistory: FinancialHistoryPoint[];
  dataQuality?: {
    percentage: number; available: number; applicable: number; total: number;
    reportDate: string | null; source: string;
    missing: { key: string; label: string; reason: string }[];
  };
  warnings?: { code: string; severity: "warning" | "danger"; title: string; detail: string }[];
  unavailableMetrics?: string[];
  dataStatus?: { price: "real" | "static"; fundamentals: "real" | "static"; dcf: "derived"; analysts: "unavailable"; esg: "unavailable" };
  asOf?: string | null;
}

interface FinancialHistoryPoint {
  period: string;
  revenue: number;
  netIncome: number;
  freeCashFlow: number;
  debt: number;
  equity: number;
  eps: number;
}

interface Bandarology {
  dataStatus: "real" | "unavailable";
  score: number;
  phase: string;
  signal: string;
  asOf: string | null;
  metrics: { cmf20: number; buyPressure: number; volumeRatio: number; momentum20: number };
  methodology: string;
}

interface RiskData {
  dataStatus: "real" | "unavailable";
  source: string;
  asOf: string | null;
  period?: string;
  metrics: {
    annualReturn: number; volatility: number; maxDrawdown: number;
    beta: number; var95: number; correlation: number; riskLevel: string;
  };
  priceHistory: { date: string; value: number }[];
  drawdownHistory: { date: string; value: number }[];
  methodology: null | Record<string, string>;
}

const defaultStock: Stock = {
  ticker: "BBCA", name: "Memuat data saham", price: 0, change: 0, score: 0, recommendation: "Memuat", trend: "Neutral",
  ratios: { pe: 0, pbv: 0, roe: 0, der: 0, dividendYield: 0, grossMargin: 0, netMargin: 0, ebitdaMargin: 0, evEbitda: 0 },
  financials: { revenue: 0, netIncome: 0, grossProfit: 0, ebitda: 0, ebit: 0, freeCashFlow: 0, eps: 0, epsGrowth: 0, revenueGrowth: 0, bookValue: 0 },
  dcf: { fairPrice: 0, upside: 0 },
  analysts: { count: 0, buy: 0, hold: 0, sell: 0, targetPrice: 0, consensus: "Tidak tersedia" },
  peers: [],
  esg: { total: 0, environmental: 0, social: 0, governance: 0, risk: "Tidak tersedia" },
  sector: "N/A", industry: "N/A", marketCap: "-",
  dupont: { netMargin: 0, assetTurnover: 0, equityMultiplier: 0, roeEstimate: 0 },
  earningsTrend: [],
  annualHistory: [],
  quarterlyHistory: [],
  dataStatus: { price: "static", fundamentals: "static", dcf: "derived", analysts: "unavailable", esg: "unavailable" }
};

function stockShell(quote: any): Stock {
  return {
    ticker: quote.ticker,
    name: quote.name,
    price: quote.price ?? 0,
    change: quote.change ?? 0,
    score: 0,
    recommendation: "Memuat",
    trend: quote.trend ?? "Neutral",
    ratios: { pe: 0, pbv: 0, roe: 0, der: 0, dividendYield: 0, grossMargin: 0, netMargin: 0, ebitdaMargin: 0, evEbitda: 0 },
    financials: { revenue: 0, netIncome: 0, grossProfit: 0, ebitda: 0, ebit: 0, freeCashFlow: 0, eps: 0, epsGrowth: 0, revenueGrowth: 0, bookValue: 0 },
    dcf: { fairPrice: 0, upside: 0 },
    analysts: { count: 0, buy: 0, hold: 0, sell: 0, targetPrice: 0, consensus: "Tidak tersedia" },
    peers: [],
    esg: { total: 0, environmental: 0, social: 0, governance: 0, risk: "Tidak tersedia" },
    sector: quote.sector ?? "N/A",
    industry: quote.sector ?? "N/A",
    marketCap: quote.marketCap ?? "-",
    dupont: { netMargin: 0, assetTurnover: 0, equityMultiplier: 0, roeEstimate: 0 },
    earningsTrend: [],
    annualHistory: [],
    quarterlyHistory: [],
    dataStatus: {
      price: quote.dataStatus ?? "static",
      fundamentals: "static",
      dcf: "derived",
      analysts: "unavailable",
      esg: "unavailable"
    }
  };
}

async function hydrateIndustryPeers(fundData: any) {
  const peerTickers = (fundData.peers ?? []).map((peer: { ticker: string }) => peer.ticker);
  const peerResults = await Promise.allSettled(peerTickers.map(async (ticker: string) => {
    const response = await fetch(`/api/fundamentals?ticker=${encodeURIComponent(ticker)}`);
    if (!response.ok) throw new Error(`Peer fundamentals failed for ${ticker}`);
    const detail = await response.json();
    return {
      ticker: detail.ticker,
      name: detail.name,
      pe: detail.ratios?.pe ?? 0,
      pbv: detail.ratios?.pbv ?? 0,
      roe: detail.ratios?.roe ?? 0,
      der: detail.ratios?.der ?? 0,
      marketCap: detail.marketCap ?? "-",
      dataStatus: detail.dataStatus?.fundamentals ?? "static"
    };
  }));

  const peers = peerResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  return [
    {
      ticker: fundData.ticker,
      name: fundData.name,
      pe: fundData.ratios?.pe ?? 0,
      pbv: fundData.ratios?.pbv ?? 0,
      roe: fundData.ratios?.roe ?? 0,
      der: fundData.ratios?.der ?? 0,
      marketCap: fundData.marketCap ?? "-",
      dataStatus: fundData.dataStatus?.fundamentals ?? "static"
    },
    ...peers
  ];
}

export default function AnalisisPage() {
  const [activeTab, setActiveTab] = useState<typeof mainTabs[number]>("Fundamental");
  const [subTab, setSubTab] = useState<typeof subTabs[number]>("Ringkasan");
  const [stocks, setStocks] = useState<Stock[]>([defaultStock]);
  const [selectedTicker, setSelectedTicker] = useState("BBCA");
  const [compareTicker, setCompareTicker] = useState("BMRI");
  const [bandarology, setBandarology] = useState<Bandarology | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);

  useEffect(() => {
    async function fetchStocks() {
      try {
        const requested = new URLSearchParams(window.location.search).get("ticker")?.toUpperCase();
        const priceRes = await fetch("/api/stocks");
        if (!priceRes.ok) throw new Error("Price request failed");
        const priceData = await priceRes.json();
        const results = (priceData.stocks ?? []).map((quote: any) => stockShell(quote));
        setStocks(results);
        setSelectedTicker(results.some((stock: Stock) => stock.ticker === requested) ? requested! : results[0]?.ticker ?? "BBCA");
        setCompareTicker(results.find((stock: Stock) => stock.ticker !== requested)?.ticker ?? "BMRI");
      } catch {
        setStocks([defaultStock]);
      }
    }
    fetchStocks();
  }, []);

  useEffect(() => {
    if (!selectedTicker || stocks.length <= 1) return;
    window.history.replaceState({}, "", `/analisis?ticker=${selectedTicker}`);
    let cancelled = false;
    async function fetchSelected() {
      try {
        const [fundResponse, bandarResponse, riskResponse] = await Promise.all([
          fetch(`/api/fundamentals?ticker=${encodeURIComponent(selectedTicker)}`),
          fetch(`/api/bandarology?ticker=${encodeURIComponent(selectedTicker)}`),
          fetch(`/api/risk?ticker=${encodeURIComponent(selectedTicker)}`)
        ]);
        const fundData = await fundResponse.json();
        const bandarData = await bandarResponse.json();
        const currentRisk = await riskResponse.json();
        fundData.peers = await hydrateIndustryPeers(fundData);
        if (cancelled) return;
        setStocks((current) => current.map((stock) => {
          if (stock.ticker !== selectedTicker) return stock;
          const score = calcScore(fundData.ratios, fundData.unavailableMetrics);
          return {
            ...stock,
            ...fundData,
            price: stock.price,
            change: stock.change,
            trend: stock.trend,
            score,
            recommendation: score >= 80 ? "Menarik" : score >= 65 ? "Pantau" : "Hindari"
          };
        }));
        setBandarology(bandarData);
        setRiskData(currentRisk);
      } catch {
        if (!cancelled) {
          setBandarology(null);
          setRiskData(null);
        }
      }
    }
    fetchSelected();
    return () => { cancelled = true; };
  }, [selectedTicker, stocks.length]);

  useEffect(() => {
    if (activeTab !== "Duel Saham" || !compareTicker || compareTicker === selectedTicker) return;
    let cancelled = false;
    async function fetchComparison() {
      try {
        const response = await fetch(`/api/fundamentals?ticker=${encodeURIComponent(compareTicker)}`);
        const detail = await response.json();
        if (cancelled) return;
        setStocks((current) => current.map((stock) => {
          if (stock.ticker !== compareTicker) return stock;
          const score = calcScore(detail.ratios, detail.unavailableMetrics);
          return {
            ...stock,
            ...detail,
            price: stock.price,
            change: stock.change,
            trend: stock.trend,
            score,
            recommendation: score >= 80 ? "Menarik" : score >= 65 ? "Pantau" : "Hindari"
          };
        }));
      } catch {}
    }
    fetchComparison();
    return () => { cancelled = true; };
  }, [activeTab, compareTicker, selectedTicker]);

  const selectedStock = useMemo(() => stocks.find((s) => s.ticker === selectedTicker) ?? stocks[0], [stocks, selectedTicker]);
  const compareStock = useMemo(() => stocks.find((s) => s.ticker === compareTicker) ?? stocks[1] ?? stocks[0], [stocks, compareTicker]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Analisis Saham</h1>
        <p className="small-muted mt-1">Fundamental real, teknikal, DCF turunan, dan proxy Bandarologi berbasis harga-volume</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {mainTabs.map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSubTab("Ringkasan"); }} className={`rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === tab ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{tab}</button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2 flex flex-col gap-6">
          <Panel>
            <Header stock={selectedStock} />
            <SourceStrip stock={selectedStock} />
            {activeTab === "Fundamental" && (
              <>
                <div className="mb-4 flex gap-2 flex-wrap">
                  {subTabs.map((st) => (
                    <button key={st} onClick={() => setSubTab(st)} className={`rounded px-3 py-1 text-xs font-medium transition ${subTab === st ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>{st}</button>
                  ))}
                </div>
                {subTab === "Ringkasan" && <RingkasanView stock={selectedStock} />}
                {subTab === "Rasio Keuangan" && <RasioKeuangan stock={selectedStock} />}
                {subTab === "Riwayat Laporan" && <FinancialHistoryView stock={selectedStock} />}
                {subTab === "Industri" && <IndustriView stock={selectedStock} />}
                {subTab === "Risiko" && <RiskView data={riskData} />}
                {subTab === "DCF & Analis" && <DcfView stock={selectedStock} />}
                {subTab === "ESG" && <EsgView stock={selectedStock} />}
              </>
            )}
            {activeTab === "Teknikal" && <TechnicalChart symbol={`${selectedStock.ticker}.JK`} />}
            {activeTab === "Bandarologi" && <BandarologyView data={bandarology} />}
            {activeTab === "Duel Saham" && <CompareView left={selectedStock} right={compareStock} />}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel className="flex flex-col gap-4">
            <div>
              <label className="small-muted mb-2 block">Pilih Saham Utama</label>
              <select value={selectedTicker} onChange={(e) => setSelectedTicker(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white outline-none focus:border-sky-500">
                {stocks.map((s) => <option key={s.ticker} value={s.ticker}>{s.ticker} - {s.name}</option>)}
              </select>
            </div>
            {activeTab === "Duel Saham" && (
              <div>
                <label className="small-muted mb-2 block">Bandingkan Dengan</label>
                <select value={compareTicker} onChange={(e) => setCompareTicker(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white outline-none focus:border-sky-500">
                  {stocks.map((s) => <option key={s.ticker} value={s.ticker}>{s.ticker} - {s.name}</option>)}
                </select>
              </div>
            )}
            <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
              <div className="small-muted">Kesimpulan Cepat</div>
              <div className="mt-2 text-xl font-semibold text-white">{selectedStock.recommendation}</div>
              <p className="small-muted mt-2">Skor {selectedStock.score}/100 berdasarkan valuasi, profitabilitas, utang, dan dividen.</p>
            </div>
            <AIInsight stock={selectedStock} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function scoreBreakdown(r: Stock["ratios"], unavailableMetrics: string[] = []) {
  const unavailable = new Set(unavailableMetrics);
  const items: { label: string; points: number; detail: string }[] = [];
  const add = (label: string, points: number, detail: string) => items.push({ label, points, detail });

  if (unavailable.has("pe") || r.pe <= 0) add("Valuasi P/E", 0, "Tidak dinilai karena P/E tidak bermakna atau tidak tersedia.");
  else if (r.pe <= 10) add("Valuasi P/E", 18, `P/E ${r.pe.toFixed(1)}x sangat rendah.`);
  else if (r.pe <= 15) add("Valuasi P/E", 12, `P/E ${r.pe.toFixed(1)}x relatif menarik.`);
  else if (r.pe <= 25) add("Valuasi P/E", 5, `P/E ${r.pe.toFixed(1)}x masih moderat.`);
  else add("Valuasi P/E", -8, `P/E ${r.pe.toFixed(1)}x tergolong premium.`);

  if (unavailable.has("pbv") || r.pbv <= 0) add("Valuasi P/BV", 0, "Tidak dinilai karena P/BV tidak bermakna atau tidak tersedia.");
  else if (r.pbv <= 1.5) add("Valuasi P/BV", 16, `P/BV ${r.pbv.toFixed(2)}x rendah.`);
  else if (r.pbv <= 3) add("Valuasi P/BV", 8, `P/BV ${r.pbv.toFixed(2)}x moderat.`);
  else add("Valuasi P/BV", -6, `P/BV ${r.pbv.toFixed(2)}x tinggi.`);

  if (unavailable.has("roe")) add("Profitabilitas", 0, "ROE tidak dinilai karena ekuitas tidak memadai.");
  else if (r.roe >= 20) add("Profitabilitas", 16, `ROE ${r.roe.toFixed(1)}% sangat kuat.`);
  else if (r.roe >= 15) add("Profitabilitas", 10, `ROE ${r.roe.toFixed(1)}% kuat.`);
  else if (r.roe >= 10) add("Profitabilitas", 4, `ROE ${r.roe.toFixed(1)}% cukup.`);
  else add("Profitabilitas", -8, `ROE ${r.roe.toFixed(1)}% masih rendah.`);

  if (unavailable.has("der")) add("Leverage", 0, "DER tidak dinilai karena ekuitas tidak memadai.");
  else if (r.der <= 1) add("Leverage", 10, `DER ${r.der.toFixed(2)}x terjaga.`);
  else if (r.der <= 3) add("Leverage", 4, `DER ${r.der.toFixed(2)}x perlu dipantau.`);
  else add("Leverage", -6, `DER ${r.der.toFixed(2)}x tinggi.`);

  if (r.dividendYield >= 5) add("Dividen", 8, `Yield ${r.dividendYield.toFixed(1)}% menarik.`);
  else if (r.dividendYield >= 2) add("Dividen", 4, `Yield ${r.dividendYield.toFixed(1)}% memberi kontribusi.`);
  else add("Dividen", 0, "Yield di bawah 2% atau emiten tidak membagikan dividen.");

  return {
    score: Math.max(0, Math.min(100, 50 + items.reduce((sum, item) => sum + item.points, 0))),
    items
  };
}

function calcScore(r: Stock["ratios"], unavailableMetrics: string[] = []) {
  return scoreBreakdown(r, unavailableMetrics).score;
}

function SourceStrip({ stock }: { stock: Stock }) {
  const status = stock.dataStatus;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-zinc-700 bg-zinc-800/40 px-3 py-2">
      <DataStatus status={status?.price ?? "static"} label="Harga" />
      <DataStatus status={status?.fundamentals ?? "static"} label="Fundamental" />
      <span className="text-[11px] font-medium text-sky-400">DCF hasil perhitungan</span>
      <span className="text-[11px] font-medium text-zinc-500">Analis & ESG tidak tersedia</span>
      {stock.asOf && <span className="ml-auto text-[11px] text-zinc-500">Laporan: {stock.asOf}</span>}
    </div>
  );
}

function BandarologyView({ data }: { data: Bandarology | null }) {
  if (!data) return <div className="py-12 text-center text-sm text-zinc-400">Memuat analisis harga-volume...</div>;
  if (data.dataStatus === "unavailable") {
    return <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">Data harga-volume belum memadai untuk analisis Bandarologi.</div>;
  }
  const tone = data.score >= 60 ? "text-green-400" : data.score <= 40 ? "text-red-400" : "text-amber-400";
  const metrics = [
    { label: "CMF 20 hari", value: data.metrics.cmf20.toFixed(3), desc: "Aliran dana berbobot volume" },
    { label: "Tekanan beli", value: `${data.metrics.buyPressure.toFixed(1)}%`, desc: "Porsi volume pada hari naik" },
    { label: "Rasio volume", value: `${data.metrics.volumeRatio.toFixed(2)}x`, desc: "Rata-rata 5 hari vs 15 hari" },
    { label: "Momentum 20 hari", value: `${data.metrics.momentum20 >= 0 ? "+" : ""}${data.metrics.momentum20.toFixed(2)}%`, desc: "Perubahan harga penutupan" }
  ];
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4 text-center">
          <Activity className="mx-auto text-sky-400" size={22} />
          <div className={`mt-2 text-4xl font-bold ${tone}`}>{data.score}</div>
          <div className="small-muted">Skor 0-100</div>
          <div className={`mt-2 font-semibold ${tone}`}>{data.phase}</div>
        </div>
        <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
          <div className="flex items-center gap-2">
            <DataStatus status="real" />
            {data.asOf && <span className="text-xs text-zinc-500">{new Date(data.asOf).toLocaleDateString("id-ID")}</span>}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{data.signal}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{data.methodology}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => <MetricBox key={metric.label} label={metric.label} value={metric.value} desc={metric.desc} />)}
      </div>
      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
        <Info size={16} className="mt-0.5 shrink-0" />
        Ini adalah proxy kuantitatif, bukan broker summary. Ia tidak mengidentifikasi bandar, broker, atau beneficial owner dan tidak boleh dipakai sebagai sinyal beli/jual tunggal.
      </div>
    </div>
  );
}

function Header({ stock }: { stock: Stock }) {
  const [watched, setWatched] = useState(false);
  useEffect(() => setWatched(getWatchlist().some((item) => item.ticker === stock.ticker)), [stock.ticker]);
  const toggleWatchlist = () => {
    const current = getWatchlist();
    const next = current.some((item) => item.ticker === stock.ticker)
      ? current.filter((item) => item.ticker !== stock.ticker)
      : [...current, { ticker: stock.ticker, addedAt: new Date().toISOString() }];
    saveWatchlist(next);
    setWatched(!watched);
  };
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-zinc-700 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">{stock.ticker}</h2>
          <Badge tone={stock.score >= 80 ? "positive" : stock.score >= 65 ? "neutral" : "negative"}>{stock.recommendation}</Badge>
          <span className="text-xs text-zinc-500">{stock.sector} &middot; {stock.industry}</span>
        </div>
        <p className="small-muted mt-1">{stock.name}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={toggleWatchlist} title={watched ? "Hapus dari watchlist" : "Tambah ke watchlist"} aria-label={watched ? "Hapus dari watchlist" : "Tambah ke watchlist"} className={`rounded-md border p-2 transition ${watched ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-zinc-700 text-zinc-400 hover:text-amber-300"}`}>
          <Star size={18} fill={watched ? "currentColor" : "none"} />
        </button>
        <div className="text-left sm:text-right">
          <div className="text-2xl font-semibold">Rp {stock.price.toLocaleString("id-ID")}</div>
          <div className={stock.change >= 0 ? "text-green-400" : "text-red-400"}>{stock.change >= 0 ? "+" : ""}{stock.change}%</div>
        </div>
      </div>
    </div>
  );
}

function RingkasanView({ stock }: { stock: Stock }) {
  return (
    <div className="flex flex-col gap-6">
      <DataQualitySummary stock={stock} />
      {(stock.warnings?.length ?? 0) > 0 && (
        <div className="grid gap-2">
          {stock.warnings?.map((warning) => (
            <div key={warning.code} className={`flex items-start gap-3 rounded-md border p-3 ${warning.severity === "danger" ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold">{warning.title}</div>
                <p className="mt-0.5 text-xs leading-relaxed opacity-80">{warning.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricBox label="P/E" value={stock.ratios.pe} desc="Price to Earnings" />
        <MetricBox label="P/BV" value={stock.ratios.pbv} desc="Price to Book Value" />
        <MetricBox label="ROE" value={`${stock.ratios.roe.toFixed(2)}%`} desc="Return on Equity" tone="positive" />
        <MetricBox label="DER" value={stock.ratios.der.toFixed(2)} desc="Debt to Equity" />
        <MetricBox label="Dividend Yield" value={`${stock.ratios.dividendYield.toFixed(2)}%`} desc="Imbal hasil" />
        <MetricBox label="Market Cap" value={`Rp${stock.marketCap}`} desc="Kapitalisasi pasar" />
        <MetricBox label="EPS" value={`Rp${stock.financials.eps}`} desc="Laba per saham" />
        <MetricBox label="EPS Growth" value={`${stock.financials.epsGrowth.toFixed(2)}%`} desc="Pertumbuhan laba" tone={stock.financials.epsGrowth >= 0 ? "positive" : "negative"} />
      </div>
      <ScoreExplanation stock={stock} />
      <DuPontCard stock={stock} />
      <EarningsTrendChart stock={stock} />
    </div>
  );
}

function DataQualitySummary({ stock }: { stock: Stock }) {
  const quality = stock.dataQuality;
  if (!quality) {
    return <div className="rounded-md border border-zinc-700 p-4 text-sm text-zinc-400">Metadata kelengkapan sedang dimuat.</div>;
  }
  const tone = quality.percentage >= 80 ? "bg-green-400" : quality.percentage >= 60 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-800/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Database size={20} className="mt-0.5 text-sky-400" />
          <div>
            <h3 className="font-semibold text-white">Kelengkapan Fundamental</h3>
            <p className="mt-1 text-xs text-zinc-400">{quality.available} dari {quality.applicable} metrik relevan terisi</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{quality.percentage}%</div>
          <div className="text-[11px] text-zinc-500">Sumber: {quality.source}</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-700">
        <div className={`h-full ${tone}`} style={{ width: `${quality.percentage}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5"><CalendarClock size={13} /> Laporan {quality.reportDate ?? "belum diketahui"}</span>
        <span>{quality.total - quality.applicable} metrik tidak relevan dikecualikan dari skor</span>
      </div>
      {quality.missing.length > 0 && (
        <details className="mt-3 border-t border-zinc-700 pt-3">
          <summary className="cursor-pointer text-xs font-medium text-sky-300">Lihat alasan {quality.missing.length} metrik kosong atau tidak relevan</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {quality.missing.map((metric) => (
              <div key={metric.key} className="text-xs">
                <span className="font-medium text-zinc-200">{metric.label}</span>
                <span className="ml-1 text-zinc-500">{metric.reason}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ScoreExplanation({ stock }: { stock: Stock }) {
  const breakdown = scoreBreakdown(stock.ratios, stock.unavailableMetrics);
  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-800/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Mengapa Skor {breakdown.score}?</h3>
          <p className="small-muted mt-1">Titik awal 50, lalu disesuaikan oleh valuasi, profitabilitas, leverage, dan dividen.</p>
        </div>
        <BarChart3 size={20} className="shrink-0 text-sky-400" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {breakdown.items.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-2">
            <div>
              <div className="text-sm font-medium text-zinc-200">{item.label}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{item.detail}</div>
            </div>
            <span className={`shrink-0 text-sm font-semibold ${item.points > 0 ? "text-green-400" : item.points < 0 ? "text-red-400" : "text-zinc-500"}`}>
              {item.points > 0 ? "+" : ""}{item.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RasioKeuangan({ stock }: { stock: Stock }) {
  const unavailable = new Set(stock.unavailableMetrics ?? []);
  const ratio = (key: string, value: number, suffix = "") => unavailable.has(key) ? "-" : `${value.toFixed(2)}${suffix}`;
  const money = (key: string, value: number) => unavailable.has(key) ? "-" : `Rp ${value.toLocaleString("id-ID")}B`;
  const rows = [
    { cat: "Profitabilitas", items: [
      { label: "Gross Margin", value: ratio("grossMargin", stock.ratios.grossMargin, "%") },
      { label: "Net Margin", value: ratio("netMargin", stock.ratios.netMargin, "%") },
      { label: "EBITDA Margin", value: ratio("ebitdaMargin", stock.ratios.ebitdaMargin, "%") },
      { label: "ROE", value: ratio("roe", stock.ratios.roe, "%") }
    ]},
    { cat: "Valuasi", items: [
      { label: "P/E", value: ratio("pe", stock.ratios.pe) },
      { label: "P/BV", value: ratio("pbv", stock.ratios.pbv) },
      { label: "EV/EBITDA", value: ratio("evEbitda", stock.ratios.evEbitda) },
      { label: "Dividend Yield", value: ratio("dividendYield", stock.ratios.dividendYield, "%") }
    ]},
    { cat: "Keuangan", items: [
      { label: "Revenue", value: money("revenue", stock.financials.revenue) },
      { label: "Net Income", value: money("netIncome", stock.financials.netIncome) },
      { label: "EBITDA", value: money("ebitda", stock.financials.ebitda) },
      { label: "Free Cash Flow", value: money("freeCashFlow", stock.financials.freeCashFlow) }
    ]},
    { cat: "EPS", items: [
      { label: "EPS", value: unavailable.has("eps") ? "-" : `Rp ${stock.financials.eps}` },
      { label: "EPS Growth", value: ratio("epsGrowth", stock.financials.epsGrowth, "%"), tone: stock.financials.epsGrowth >= 0 ? "positive" : "negative" },
      { label: "Revenue Growth", value: ratio("revenueGrowth", stock.financials.revenueGrowth, "%") },
      { label: "DER", value: ratio("der", stock.ratios.der) }
    ]}
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {rows.map((section) => (
        <div key={section.cat} className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
          <h3 className="mb-3 font-semibold text-white">{section.cat}</h3>
          <table className="w-full text-sm">
            <tbody>
              {section.items.map((item) => (
                <tr key={item.label} className="border-b border-zinc-800 last:border-0">
                  <td className="py-2 text-zinc-400">{item.label}</td>
                  <td className={`py-2 text-right font-medium ${(item as any).tone === "positive" ? "text-green-400" : (item as any).tone === "negative" ? "text-red-400" : "text-white"}`}>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function FinancialHistoryView({ stock }: { stock: Stock }) {
  const [period, setPeriod] = useState<"annual" | "quarterly">("annual");
  const history = period === "annual" ? stock.annualHistory : stock.quarterlyHistory;
  const charts = [
    { key: "revenue" as const, label: "Pendapatan", color: "#38bdf8" },
    { key: "netIncome" as const, label: "Laba Bersih", color: "#4ade80" },
    { key: "freeCashFlow" as const, label: "Free Cash Flow", color: "#f59e0b" },
    { key: "debt" as const, label: "Total Utang", color: "#f87171" }
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Riwayat Laporan Keuangan</h3>
          <p className="small-muted mt-1">Nilai dalam miliar rupiah; periode berasal dari laporan yang dipublikasikan sumber.</p>
        </div>
        <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 p-1">
          <button onClick={() => setPeriod("annual")} className={`rounded px-3 py-1.5 text-xs font-medium ${period === "annual" ? "bg-sky-600 text-white" : "text-zinc-400"}`}>Tahunan</button>
          <button onClick={() => setPeriod("quarterly")} className={`rounded px-3 py-1.5 text-xs font-medium ${period === "quarterly" ? "bg-sky-600 text-white" : "text-zinc-400"}`}>Kuartalan</button>
        </div>
      </div>
      {history.length === 0 ? (
        <div className="rounded-md border border-zinc-700 py-12 text-center text-sm text-zinc-400">Riwayat {period === "annual" ? "tahunan" : "kuartalan"} belum tersedia dari sumber.</div>
      ) : (
        <>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {charts.map((chart) => (
              <HistoryChart key={chart.key} title={chart.label} data={history.map((entry) => ({ date: entry.period, value: entry[chart.key] }))} color={chart.color} />
            ))}
          </div>
          <div className="min-w-0 max-w-full overflow-x-auto rounded-md border border-zinc-700">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-zinc-800/60 text-zinc-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Periode</th>
                  <th className="px-3 py-2 text-right font-medium">Pendapatan</th>
                  <th className="px-3 py-2 text-right font-medium">Laba</th>
                  <th className="px-3 py-2 text-right font-medium">FCF</th>
                  <th className="px-3 py-2 text-right font-medium">Utang</th>
                  <th className="px-3 py-2 text-right font-medium">Ekuitas</th>
                  <th className="px-3 py-2 text-right font-medium">EPS</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((entry) => (
                  <tr key={entry.period} className="border-t border-zinc-800">
                    <td className="px-3 py-2 font-medium text-white">{entry.period}</td>
                    <td className="px-3 py-2 text-right">{entry.revenue ? entry.revenue.toLocaleString("id-ID") : "-"}</td>
                    <td className={`px-3 py-2 text-right ${entry.netIncome < 0 ? "text-red-400" : ""}`}>{entry.netIncome ? entry.netIncome.toLocaleString("id-ID") : "-"}</td>
                    <td className={`px-3 py-2 text-right ${entry.freeCashFlow < 0 ? "text-red-400" : ""}`}>{entry.freeCashFlow ? entry.freeCashFlow.toLocaleString("id-ID") : "-"}</td>
                    <td className="px-3 py-2 text-right">{entry.debt ? entry.debt.toLocaleString("id-ID") : "-"}</td>
                    <td className={`px-3 py-2 text-right ${entry.equity < 0 ? "text-red-400" : ""}`}>{entry.equity ? entry.equity.toLocaleString("id-ID") : "-"}</td>
                    <td className="px-3 py-2 text-right">{entry.eps ? entry.eps.toLocaleString("id-ID") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function HistoryChart({ title, data, color, valueSuffix = " B" }: { title: string; data: { date: string; value: number }[]; color: string; valueSuffix?: string }) {
  const populated = data.some((point) => point.value !== 0);
  if (!populated) {
    return (
      <div className="rounded-md border border-zinc-700 bg-zinc-800/30 p-4">
        <div className="text-sm font-medium text-zinc-200">{title}</div>
        <div className="flex h-36 items-center justify-center text-xs text-zinc-500">Data belum tersedia</div>
      </div>
    );
  }
  const values = data.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const points = data.map((point, index) => {
    const x = data.length === 1 ? 240 : 24 + (index / (data.length - 1)) * 432;
    const y = 132 - ((point.value - min) / span) * 104;
    return `${x},${y}`;
  }).join(" ");
  const latest = data.at(-1)?.value ?? 0;
  return (
    <div className="min-w-0 rounded-md border border-zinc-700 bg-zinc-800/30 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-medium text-zinc-200">{title}</div>
        <div className={`text-sm font-semibold ${latest < 0 ? "text-red-400" : "text-white"}`}>{latest.toLocaleString("id-ID")}{valueSuffix}</div>
      </div>
      <svg viewBox="0 0 480 160" className="mt-2 h-36 w-full" role="img" aria-label={`Grafik ${title}`}>
        <line x1="24" y1="28" x2="456" y2="28" stroke="#3f3f46" strokeWidth="1" />
        <line x1="24" y1="80" x2="456" y2="80" stroke="#3f3f46" strokeWidth="1" />
        <line x1="24" y1="132" x2="456" y2="132" stroke="#3f3f46" strokeWidth="1" />
        {min < 0 && max > 0 && <line x1="24" y1={132 - ((0 - min) / span) * 104} x2="456" y2={132 - ((0 - min) / span) * 104} stroke="#71717a" strokeDasharray="4 4" />}
        <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((point, index) => {
          const [x, y] = points.split(" ")[index].split(",");
          return <circle key={point.date} cx={x} cy={y} r="3.5" fill={color} />;
        })}
        <text x="24" y="154" fill="#71717a" fontSize="10">{data[0]?.date.slice(0, 7)}</text>
        <text x="456" y="154" textAnchor="end" fill="#71717a" fontSize="10">{data.at(-1)?.date.slice(0, 7)}</text>
      </svg>
    </div>
  );
}

function RiskView({ data }: { data: RiskData | null }) {
  if (!data) return <div className="py-12 text-center text-sm text-zinc-400">Memuat analisis risiko...</div>;
  if (data.dataStatus === "unavailable") {
    return <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">Riwayat harga belum cukup untuk menghitung risiko.</div>;
  }
  const metrics = [
    { label: "Volatilitas", value: `${data.metrics.volatility.toFixed(2)}%`, desc: "Tahunan, return harian" },
    { label: "Max Drawdown", value: `-${data.metrics.maxDrawdown.toFixed(2)}%`, desc: "Penurunan dari puncak" },
    { label: "Beta vs IHSG", value: data.metrics.beta.toFixed(2), desc: data.metrics.beta > 1 ? "Lebih sensitif dari IHSG" : "Lebih defensif dari IHSG" },
    { label: "VaR 95%", value: `${data.metrics.var95.toFixed(2)}%`, desc: "Estimasi risiko 1 hari" },
    { label: "Korelasi IHSG", value: data.metrics.correlation.toFixed(3), desc: "Korelasi return harian" },
    { label: "Return 1 Tahun", value: `${data.metrics.annualReturn >= 0 ? "+" : ""}${data.metrics.annualReturn.toFixed(2)}%`, desc: "Belum termasuk dividen" }
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert size={22} className="text-sky-400" />
          <div>
            <h3 className="font-semibold text-white">Profil Risiko: {data.metrics.riskLevel}</h3>
            <p className="small-muted mt-1">{data.period} &middot; {data.source}</p>
          </div>
        </div>
        <DataStatus status="real" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {metrics.map((metric) => <MetricBox key={metric.label} {...metric} tone={metric.label === "Max Drawdown" || metric.label === "VaR 95%" ? "negative" : "neutral"} />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <HistoryChart title="Harga 1 Tahun" data={data.priceHistory} color="#38bdf8" valueSuffix="" />
        <HistoryChart title="Drawdown" data={data.drawdownHistory} color="#f87171" valueSuffix="%" />
      </div>
      <div className="rounded-md border border-zinc-700 bg-zinc-800/30 p-4">
        <h4 className="text-sm font-semibold text-white">Metodologi</h4>
        <div className="mt-2 grid gap-2 text-xs leading-relaxed text-zinc-400 sm:grid-cols-2">
          {data.methodology && Object.values(data.methodology).map((description) => <p key={description}>{description}</p>)}
        </div>
      </div>
    </div>
  );
}

function DcfView({ stock }: { stock: Stock }) {
  const upside = stock.dcf.upside;
  const totalAnalysts = stock.analysts.buy + stock.analysts.hold + stock.analysts.sell;
  const buyPct = totalAnalysts > 0 ? Math.round((stock.analysts.buy / totalAnalysts) * 100) : 0;
  const holdPct = totalAnalysts > 0 ? Math.round((stock.analysts.hold / totalAnalysts) * 100) : 0;
  const sellPct = totalAnalysts > 0 ? Math.round((stock.analysts.sell / totalAnalysts) * 100) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={18} className="text-sky-400" />
          <h3 className="font-semibold text-white">Proyeksi Harga (DCF)</h3>
        </div>
        <div className="flex items-end justify-between border-b border-zinc-700 pb-4">
          <div>
            <div className="small-muted">Fair Value Estimate</div>
            <div className="mt-1 text-2xl font-bold text-white">Rp {stock.dcf.fairPrice.toLocaleString()}</div>
          </div>
          <div className={`text-xl font-semibold ${upside >= 0 ? "text-green-400" : "text-red-400"}`}>
            {upside >= 0 ? "+" : ""}{upside}%
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 text-sm">
          <div className="flex justify-between"><span className="text-zinc-400">Harga Saat Ini</span><span>Rp {stock.price.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Target Harga Analis</span><span>Rp {stock.analysts.targetPrice.toLocaleString()}</span></div>
        </div>
      </div>

      <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-sky-400" />
          <h3 className="font-semibold text-white">Rating Analyst</h3>
        </div>
        {stock.analysts.count === 0 ? (
          <div className="rounded-md border border-zinc-700 bg-zinc-900/40 p-4 text-sm text-zinc-400">
            Konsensus dan target analis tidak tersedia dari sumber data yang terhubung. Angka tidak akan diisi dengan estimasi palsu.
          </div>
        ) : <>
        <div className="flex items-end gap-6">
          <div>
            <div className="text-3xl font-bold text-white">{stock.analysts.count}</div>
            <div className="small-muted">Analysts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-400">{stock.analysts.consensus}</div>
            <div className="small-muted">Konsensus</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="flex-1 rounded bg-green-500/20 p-2 text-center">
            <div className="text-lg font-semibold text-green-400">{stock.analysts.buy}</div>
            <div className="small-muted text-xs">Buy ({buyPct}%)</div>
          </div>
          <div className="flex-1 rounded bg-yellow-500/20 p-2 text-center">
            <div className="text-lg font-semibold text-yellow-400">{stock.analysts.hold}</div>
            <div className="small-muted text-xs">Hold ({holdPct}%)</div>
          </div>
          <div className="flex-1 rounded bg-red-500/20 p-2 text-center">
            <div className="text-lg font-semibold text-red-400">{stock.analysts.sell}</div>
            <div className="small-muted text-xs">Sell ({sellPct}%)</div>
          </div>
        </div>
        </>}
      </div>
    </div>
  );
}

function IndustriView({ stock }: { stock: Stock }) {
  const comparisonPeers = stock.peers.filter((peer) => peer.ticker !== stock.ticker);
  const formatRatio = (value: number, digits = 1, suffix = "") => value ? `${value.toFixed(digits)}${suffix}` : "-";
  const peerMedian = (metric: "pe" | "pbv" | "roe" | "der") => {
    const values = comparisonPeers.map((peer) => peer[metric]).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
    if (!values.length) return null;
    const middle = Math.floor(values.length / 2);
    return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={18} className="text-sky-400" />
          <h3 className="font-semibold text-white">Perbandingan Industri: {stock.industry}</h3>
        </div>
        <div className="flex items-center gap-4 text-sm mb-4">
          <span className="text-zinc-400">Sektor: {stock.sector}</span>
          <span className="text-zinc-400">Kapitalisasi: Rp{stock.marketCap}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="pb-3 pr-4 font-medium">Perusahaan</th>
                <th className="pb-3 pr-4 font-medium text-right">P/E</th>
                <th className="pb-3 pr-4 font-medium text-right">P/BV</th>
                <th className="pb-3 pr-4 font-medium text-right">ROE</th>
                <th className="pb-3 pr-4 font-medium text-right">DER</th>
                <th className="pb-3 font-medium text-right">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {stock.peers.map((peer) => {
                const isSelected = peer.ticker === stock.ticker;
                return (
                  <tr key={peer.ticker} className={`border-b border-zinc-800 last:border-0 ${isSelected ? "bg-sky-500/10" : ""}`}>
                    <td className="py-3 pr-4">
                      <span className="font-medium text-white">{peer.ticker}</span>
                      <span className="small-muted ml-2">{peer.name}</span>
                      <span className="ml-2"><DataStatus status={peer.dataStatus ?? "static"} label="Fundamental" /></span>
                    </td>
                    <td className="py-3 pr-4 text-right">{formatRatio(peer.pe)}</td>
                    <td className="py-3 pr-4 text-right">{formatRatio(peer.pbv, 2)}</td>
                    <td className="py-3 pr-4 text-right text-green-400">{formatRatio(peer.roe, 1, "%")}</td>
                    <td className="py-3 pr-4 text-right">{formatRatio(peer.der, 2)}</td>
                    <td className="py-3 text-right">Rp{peer.marketCap}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
        <h3 className="mb-3 font-semibold text-white">Perbandingan Metrik</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {["P/E", "P/BV", "ROE", "DER"].map((metric) => {
            const val = metric === "P/E" ? stock.ratios.pe : metric === "P/BV" ? stock.ratios.pbv : metric === "ROE" ? stock.ratios.roe : stock.ratios.der;
            const key = metric === "P/E" ? "pe" : metric === "P/BV" ? "pbv" : metric === "ROE" ? "roe" : "der";
            const peerval = peerMedian(key);
            const better = peerval === null ? null : metric === "ROE" ? val >= peerval : val <= peerval;
            return (
              <div key={metric} className="rounded border border-zinc-700 bg-zinc-900/40 p-3 text-center">
                <div className="small-muted">{metric}</div>
                <div className="mt-1 font-semibold text-white">{formatRatio(val, metric === "P/BV" || metric === "DER" ? 2 : 1, metric === "ROE" ? "%" : "")}</div>
                <div className={`mt-1 text-xs ${better === null ? "text-zinc-500" : better ? "text-green-400" : "text-red-400"}`}>
                  {peerval === null ? "Median sektor belum tersedia" : `vs median ${peerval.toFixed(metric === "P/BV" || metric === "DER" ? 2 : 1)} - ${val >= peerval ? "di atas median" : "di bawah median"}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EsgView({ stock }: { stock: Stock }) {
  if (stock.esg.total === 0) {
    return (
      <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-5">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-zinc-400" />
          <h3 className="font-semibold text-white">ESG belum tersedia</h3>
        </div>
        <p className="mt-2 text-sm text-zinc-400">Sumber yang terhubung belum menyediakan skor ESG terverifikasi untuk saham ini, sehingga aplikasi tidak menampilkan skor perkiraan.</p>
      </div>
    );
  }
  const items = [
    { label: "Environmental", value: stock.esg.environmental },
    { label: "Social", value: stock.esg.social },
    { label: "Governance", value: stock.esg.governance }
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-sky-400" />
          <h3 className="font-semibold text-white">ESG Score</h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className={`text-4xl font-bold ${stock.esg.total >= 70 ? "text-green-400" : stock.esg.total >= 50 ? "text-yellow-400" : "text-red-400"}`}>{stock.esg.total}</div>
            <div className="small-muted">Total ESG</div>
            <Badge tone={stock.esg.risk === "Low" ? "positive" : stock.esg.risk === "Medium" ? "neutral" : "negative"}>{stock.esg.risk} Risk</Badge>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-300">{item.label}</span>
                  <span className="font-medium text-white">{item.value}/100</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-700">
                  <div className="h-2 rounded-full bg-sky-400" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
        <h3 className="mb-3 font-semibold text-white">Apa itu ESG?</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          ESG (Environmental, Social, Governance) mengukur seberapa baik perusahaan mengelola risiko lingkungan,
          tanggung jawab sosial, dan tata kelola perusahaan.
        </p>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-400">Skor 70+</span><span className="text-green-400">Low Risk - Praktik ESG kuat</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Skor 50-69</span><span className="text-yellow-400">Medium Risk - Perlu perbaikan</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Skor &lt;50</span><span className="text-red-400">High Risk - Risiko signifikan</span></div>
        </div>
      </div>
    </div>
  );
}

function DuPontCard({ stock }: { stock: Stock }) {
  const items = [
    { label: "Net Margin", value: stock.dupont.netMargin, suffix: "%", max: 50 },
    { label: "Asset Turnover", value: stock.dupont.assetTurnover, suffix: "x", max: 1.5 },
    { label: "Equity Multiplier", value: stock.dupont.equityMultiplier, suffix: "x", max: 6 },
    { label: "ROE Estimate", value: stock.dupont.roeEstimate, suffix: "%", max: 30 }
  ];
  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
      <h3 className="font-semibold text-white">DuPont Analysis</h3>
      <p className="small-muted mt-1">ROE = Net Margin × Asset Turnover × Equity Multiplier</p>
      <div className="mt-4 flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-zinc-300">{item.label}</span>
              <span className="font-medium text-white">{item.value.toFixed(2)}{item.suffix}</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-700">
              <div className="h-2 rounded-full bg-sky-400" style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EarningsTrendChart({ stock }: { stock: Stock }) {
  const max = Math.max(...stock.earningsTrend.map((e) => e.value), 1);
  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
      <h3 className="font-semibold text-white">Tren Laba Bersih</h3>
      <p className="small-muted mt-1">Riwayat laba tahunan dalam triliun rupiah</p>
      <div className="mt-4 flex h-32 items-end gap-3">
        {stock.earningsTrend.map((item) => (
          <div key={item.year} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full rounded-t-md bg-green-400/80" style={{ height: `${Math.max(8, (item.value / max) * 90)}px` }} />
            <div className="text-xs text-zinc-400">{item.year}</div>
            <div className="text-xs font-medium text-white">{item.value}T</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareView({ left, right }: { left: Stock; right: Stock }) {
  const rows = [
    { label: "Skor", left: left.score, right: right.score, higherBetter: true },
    { label: "P/E", left: left.ratios.pe, right: right.ratios.pe, higherBetter: false },
    { label: "P/BV", left: left.ratios.pbv, right: right.ratios.pbv, higherBetter: false },
    { label: "ROE", left: left.ratios.roe, right: right.ratios.roe, higherBetter: true, suffix: "%" },
    { label: "DER", left: left.ratios.der, right: right.ratios.der, higherBetter: false },
    { label: "Div Yield", left: left.ratios.dividendYield, right: right.ratios.dividendYield, higherBetter: true, suffix: "%" },
    { label: "EPS", left: left.financials.eps, right: right.financials.eps, higherBetter: true, prefix: "Rp" },
    { label: "EPS Growth", left: left.financials.epsGrowth, right: right.financials.epsGrowth, higherBetter: true, suffix: "%" },
    { label: "Analyst Target", left: left.analysts.targetPrice, right: right.analysts.targetPrice, higherBetter: true, prefix: "Rp" }
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[500px] text-sm">
        <thead>
          <tr className="border-b border-zinc-700 text-left text-zinc-400">
            <th className="pb-3 pr-4 font-medium">Metrik</th>
            <th className="pb-3 pr-4 font-medium text-right">{left.ticker}</th>
            <th className="pb-3 font-medium text-right">{right.ticker}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const leftWins = row.higherBetter ? row.left >= row.right : row.left <= row.right;
            const rightWins = row.higherBetter ? row.right >= row.left : row.right <= row.left;
            return (
              <tr key={row.label} className="border-b border-zinc-800 last:border-0">
                <td className="py-3 pr-4 text-zinc-300">{row.label}</td>
                <td className={`py-3 pr-4 text-right font-medium ${leftWins ? "text-green-400" : "text-white"}`}>{row.prefix ?? ""}{Number(row.left).toFixed(2)}{row.suffix ?? ""}</td>
                <td className={`py-3 text-right font-medium ${rightWins ? "text-green-400" : "text-white"}`}>{row.prefix ?? ""}{Number(row.right).toFixed(2)}{row.suffix ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AIInsight({ stock }: { stock: Stock }) {
  const strengths = [
    stock.ratios.roe >= 15 ? "ROE kuat, bisnis menghasilkan laba dari modal dengan baik" : null,
    stock.ratios.pe > 0 && stock.ratios.pe <= 15 ? "P/E relatif rendah" : null,
    stock.ratios.pbv > 0 && stock.ratios.pbv <= 2 ? "P/BV rasional" : null,
    stock.ratios.dividendYield >= 4 ? "Dividend yield menarik" : null,
    stock.ratios.der <= 1 ? "Struktur utang sehat" : null
  ].filter(Boolean);
  const risks = [
    stock.ratios.pe > 25 ? "P/E tinggi, harga premium" : null,
    stock.ratios.pbv > 4 ? "P/BV tinggi, overvalued" : null,
    stock.ratios.der > 3 ? "DER tinggi, leverage besar" : null,
    stock.ratios.roe < 10 ? "ROE rendah, efisiensi kurang" : null
  ].filter(Boolean);

  const action = stock.score >= 80
    ? "Cocok untuk watchlist utama. Strategi aman: beli bertahap saat koreksi."
    : stock.score >= 65
      ? "Layak pantau. Tunggu harga support atau laporan keuangan berikutnya."
      : "Observasi dulu. Prioritaskan saham dengan ROE lebih tinggi dan valuasi lebih wajar.";

  return (
    <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-4">
      <div className="small-muted">AI Insight</div>
      <div className="mt-2 font-semibold text-white">{stock.ticker}: {action}</div>
      <div className="mt-4 flex flex-col gap-3 text-sm">
        {strengths.length > 0 && (
          <div>
            <div className="mb-1 font-medium text-green-300">Kekuatan</div>
            <ul className="list-disc space-y-1 pl-5 text-zinc-300">{strengths.map((s) => <li key={String(s)}>{s}</li>)}</ul>
          </div>
        )}
        {risks.length > 0 && (
          <div>
            <div className="mb-1 font-medium text-red-300">Risiko</div>
            <ul className="list-disc space-y-1 pl-5 text-zinc-300">{risks.map((r) => <li key={String(r)}>{r}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value, desc, tone = "neutral" }: { label: string; value: string | number; desc: string; tone?: "positive" | "negative" | "neutral" }) {
  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-3">
      <div className="small-muted">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${tone === "positive" ? "text-green-400" : tone === "negative" ? "text-red-400" : "text-white"}`}>{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{desc}</div>
    </div>
  );
}
