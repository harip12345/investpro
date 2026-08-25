"use client";

import { useState, useEffect } from "react";
import { Panel, Badge, DataStatus } from "@/components/ui";
import {
  getStockIndices,
  IDX30_PERIOD,
  JII_PERIOD,
  KOMPAS100_PERIOD,
  SRI_KEHATI_PERIOD,
  STOCK_UNIVERSE
} from "@/lib/indices";
import { LQ45_PERIOD } from "@/lib/lq45";
import Link from "next/link";
import { AlertTriangle, Play } from "lucide-react";

interface Stock {
  ticker: string; name: string; price?: number; pe?: number; pbv?: number; roe?: number;
  der?: number; dividendYield?: number; marketCap: string; score: number;
  grossMargin?: number; netMargin?: number; eps?: number; epsGrowth?: number;
  indices?: string[]; dataStatus?: "real" | "static"; sector?: string;
  fundamentalStatus?: "real" | "static"; asOf?: string | null;
  unavailableMetrics?: string[];
  dataQuality?: { percentage: number; reportDate: string | null; source: string };
}

interface BacktestResult {
  source: string;
  asOf: string | null;
  years: number;
  requestedCount: number;
  usedTickers: string[];
  metrics: { totalReturn: number; cagr: number; volatility: number; maxDrawdown: number; positiveMonths: number };
  benchmarkMetrics: { totalReturn: number; cagr: number; volatility: number; maxDrawdown: number; positiveMonths: number };
  chart: { period: string; portfolio: number; benchmark: number }[];
  methodology: string;
  limitation: string;
}

const knownDefaults: Stock[] = [
  { ticker: "BBCA", name: "Bank Central Asia", pe: 24.1, pbv: 4.8, roe: 19.7, der: 4.1, dividendYield: 2.1, marketCap: "1218T", score: 88, grossMargin: 48.2, netMargin: 45.2, eps: 412, epsGrowth: 12.4, indices: ["LQ45", "IDX30", "KOMPAS100", "SRI-KEHATI"] },
  { ticker: "BMRI", name: "Bank Mandiri", pe: 11.9, pbv: 2.0, roe: 21.3, der: 5.4, dividendYield: 4.7, marketCap: "600T", score: 86, grossMargin: 44.8, netMargin: 42.8, eps: 538, epsGrowth: 15.6, indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "ASII", name: "Astra International", pe: 7.6, pbv: 1.0, roe: 13.8, der: 0.9, dividendYield: 6.3, marketCap: "199T", score: 80, grossMargin: 16.5, netMargin: 9.7, eps: 648, epsGrowth: -5.8, indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "TLKM", name: "Telkom Indonesia", pe: 12.8, pbv: 2.1, roe: 16.4, der: 0.3, dividendYield: 5.5, marketCap: "312T", score: 78, grossMargin: 38.4, netMargin: 16.8, eps: 318, epsGrowth: 3.6, indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "ADRO", name: "Alamtri Resources", pe: 5.2, pbv: 1.3, roe: 24.9, der: 0.5, dividendYield: 8.6, marketCap: "91T", score: 83, grossMargin: 42.8, netMargin: 28.4, eps: 550, epsGrowth: -38.8, indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "BBRI", name: "Bank Rakyat Indonesia", pe: 12.5, pbv: 2.8, roe: 20.1, der: 5.2, dividendYield: 3.2, marketCap: "680T", score: 85, grossMargin: 41.0, netMargin: 38.0, eps: 389, epsGrowth: 10.2, indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "BBNI", name: "Bank Negara Indonesia", pe: 10.2, pbv: 1.5, roe: 15.8, der: 4.8, dividendYield: 4.5, marketCap: "210T", score: 79, grossMargin: 39.5, netMargin: 35.2, eps: 443, epsGrowth: 8.4, indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "UNVR", name: "Unilever Indonesia", pe: 28.0, pbv: 35.0, roe: 22.0, der: 0.1, dividendYield: 1.8, marketCap: "380T", score: 72, grossMargin: 42.0, netMargin: 18.5, eps: 93, epsGrowth: -2.1, indices: ["LQ45", "IDX30", "KOMPAS100", "SRI-KEHATI"] },
  { ticker: "ICBP", name: "Indofood CBP", pe: 14.8, pbv: 3.9, roe: 18.5, der: 0.4, dividendYield: 2.0, marketCap: "173T", score: 76, grossMargin: 36.0, netMargin: 12.0, eps: 722, epsGrowth: 5.0, indices: ["LQ45", "KOMPAS100"] },
  { ticker: "GGRM", name: "Gudang Garam", pe: 8.5, pbv: 1.2, roe: 14.3, der: 0.6, dividendYield: 7.2, marketCap: "70T", score: 74, grossMargin: 14.8, netMargin: 8.5, eps: 2329, epsGrowth: -4.2, indices: ["LQ45", "KOMPAS100"] },
  { ticker: "HMSP", name: "HM Sampoerna", pe: 12.1, pbv: 3.4, roe: 16.2, der: 0.2, dividendYield: 6.5, marketCap: "150T", score: 71, grossMargin: 38.0, netMargin: 13.0, eps: 60, epsGrowth: 2.8, indices: ["LQ45", "KOMPAS100"] },
  { ticker: "UNTR", name: "United Tractors", pe: 7.0, pbv: 1.5, roe: 22.5, der: 0.3, dividendYield: 5.8, marketCap: "95T", score: 85, grossMargin: 24.0, netMargin: 18.0, eps: 2785, epsGrowth: 22.0, indices: ["LQ45", "KOMPAS100"] },
  { ticker: "EXCL", name: "XL Axiata", pe: 22.5, pbv: 1.8, roe: 8.2, der: 0.8, dividendYield: 1.2, marketCap: "48T", score: 66, grossMargin: 48.0, netMargin: 6.0, eps: 93, epsGrowth: 15.0, indices: ["LQ45"] },
  { ticker: "JSMR", name: "Jasa Marga", pe: 15.2, pbv: 2.0, roe: 12.5, der: 1.2, dividendYield: 3.0, marketCap: "55T", score: 73, grossMargin: 52.0, netMargin: 22.0, eps: 316, epsGrowth: 8.0, indices: ["LQ45", "KOMPAS100"] },
  { ticker: "PTBA", name: "Bukit Asam", pe: 4.8, pbv: 1.1, roe: 18.2, der: 0.2, dividendYield: 9.0, marketCap: "35T", score: 80, grossMargin: 38.0, netMargin: 32.0, eps: 583, epsGrowth: -25.0, indices: ["LQ45", "KOMPAS100"] },
  { ticker: "PGAS", name: "Perusahaan Gas Negara", pe: 13.5, pbv: 1.6, roe: 11.8, der: 0.5, dividendYield: 3.5, marketCap: "62T", score: 74, grossMargin: 28.0, netMargin: 10.5, eps: 215, epsGrowth: 6.0, indices: ["LQ45", "KOMPAS100"] },
  { ticker: "INDY", name: "Indika Energy", pe: 6.5, pbv: 0.8, roe: 12.5, der: 0.4, dividendYield: 5.0, marketCap: "18T", score: 77, grossMargin: 30.0, netMargin: 22.0, eps: 415, epsGrowth: -18.0, indices: ["KOMPAS100"] },
  { ticker: "AKRA", name: "AKR Corporindo", pe: 11.8, pbv: 1.3, roe: 11.5, der: 0.3, dividendYield: 3.2, marketCap: "21T", score: 76, grossMargin: 12.0, netMargin: 7.0, eps: 114, epsGrowth: 12.0, indices: ["KOMPAS100"] }
];

const defaults: Stock[] = STOCK_UNIVERSE.map((member) => {
  const known = knownDefaults.find((stock) => stock.ticker === member.ticker);
  return {
    ticker: member.ticker,
    name: member.name,
    price: member.fallbackPrice,
    pe: 0,
    pbv: 0,
    marketCap: "-",
    score: 50,
    ...known,
    indices: getStockIndices(member.ticker),
    dataStatus: "static"
  };
});

const indexOptions = ["Semua", "LQ45", "IDX30", "JII", "KOMPAS100", "SRI-KEHATI"];

const defaultFilters = {
  minPE: 0, maxPE: 50, minROE: 0, maxDER: 10,
  minDivYield: 0, maxDivYield: 20, minMargin: 0, minEpsGrowth: -100
};
const fundamentalCacheVersion = 3;

const presetFilters: Record<string, { label: string; values: Partial<typeof defaultFilters> }> = {
  roe15: { label: "ROE > 15%", values: { minROE: 15 } },
  pe12: { label: "P/E < 12", values: { maxPE: 12 } },
  dividend4: { label: "Dividend > 4%", values: { minDivYield: 4 } },
  der1: { label: "DER < 1", values: { maxDER: 1 } }
};

export default function ScreenerPage() {
  const [stocks, setStocks] = useState<Stock[]>(defaults);
  const [selectedIndex, setSelectedIndex] = useState("Semua");
  const [selectedSector, setSelectedSector] = useState("");
  const [activePreset, setActivePreset] = useState("");
  const [loadingFundamentals, setLoadingFundamentals] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [backtestYears, setBacktestYears] = useState(3);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestError, setBacktestError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("preset") ?? "";
    setSelectedSector(params.get("sector") ?? "");
    if (presetFilters[preset]) {
      setActivePreset(preset);
      setFilters({ ...defaultFilters, ...presetFilters[preset].values });
    }
    async function fetchStocks() {
      try {
        const res = await fetch("/api/stocks");
        if (!res.ok) throw new Error("Stock request failed");
        const data = await res.json();
        if (data.stocks?.length > 0) {
          const pricedStocks = data.stocks.map((s: Stock) => ({ ...defaults.find((d) => d.ticker === s.ticker), ...s }));
          setStocks(pricedStocks);
          setLoadingFundamentals(true);
          const cachedRaw = sessionStorage.getItem("investpro-screener-fundamentals");
          const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
          let fundamentals = cached
            && cached.version === fundamentalCacheVersion
            && cached.universeCount === STOCK_UNIVERSE.length
            && Date.now() - cached.savedAt < 3600000
            ? cached.items
            : null;
          if (!fundamentals) {
            const fundamentalResponse = await fetch("/api/fundamentals/batch");
            if (fundamentalResponse.ok) {
              const fundamentalData = await fundamentalResponse.json();
              fundamentals = fundamentalData.items;
              sessionStorage.setItem("investpro-screener-fundamentals", JSON.stringify({
                savedAt: Date.now(),
                version: fundamentalCacheVersion,
                universeCount: STOCK_UNIVERSE.length,
                items: fundamentals
              }));
            }
          }
          if (fundamentals) {
            const byTicker = new Map(fundamentals.map((item: any) => [item.ticker, item]));
            setStocks((current) => current.map((stock) => {
              const detail: any = byTicker.get(stock.ticker);
              if (!detail) return stock;
              return {
                ...stock,
                pe: detail.ratios?.pe ?? 0,
                pbv: detail.ratios?.pbv ?? 0,
                roe: detail.ratios?.roe ?? 0,
                der: detail.ratios?.der ?? 0,
                dividendYield: detail.ratios?.dividendYield ?? 0,
                grossMargin: detail.ratios?.grossMargin ?? 0,
                netMargin: detail.ratios?.netMargin ?? 0,
                eps: detail.financials?.eps ?? 0,
                epsGrowth: detail.financials?.epsGrowth ?? 0,
                marketCap: detail.marketCap ?? stock.marketCap,
                fundamentalStatus: detail.dataStatus?.fundamentals ?? "static",
                unavailableMetrics: detail.unavailableMetrics ?? [],
                asOf: detail.asOf,
                dataQuality: detail.dataQuality
              };
            }));
          }
          setLoadingFundamentals(false);
        }
      } catch { setLoadingFundamentals(false); }
    }
    fetchStocks();
  }, []);

  const filtered = stocks.filter((s) => {
    const matchIndex = selectedIndex === "Semua" || (s.indices ?? []).includes(selectedIndex);
    const matchSector = !selectedSector || s.sector === selectedSector;
    const hasPE = (s.pe ?? 0) > 0;
    const matchPE = filters.minPE === 0 && filters.maxPE === 50
      ? true
      : hasPE && (s.pe ?? 0) >= filters.minPE && (s.pe ?? 0) <= filters.maxPE;
    const matchROE = filters.minROE === 0 || (s.roe !== undefined && s.roe >= filters.minROE);
    const matchDER = filters.maxDER === 10 || (s.der !== undefined && s.der <= filters.maxDER);
    const matchDividend = filters.minDivYield === 0 && filters.maxDivYield === 20
      ? true
      : s.dividendYield !== undefined && s.dividendYield >= filters.minDivYield && s.dividendYield <= filters.maxDivYield;
    const matchMargin = filters.minMargin === 0 || (s.netMargin !== undefined && s.netMargin >= filters.minMargin);
    const matchGrowth = filters.minEpsGrowth === -100 || (s.epsGrowth !== undefined && s.epsGrowth >= filters.minEpsGrowth);
    return (
      matchIndex &&
      matchSector &&
      matchPE &&
      matchROE &&
      matchDER &&
      matchDividend &&
      matchMargin &&
      matchGrowth
    );
  });
  const sectors = Array.from(new Set(stocks.map((stock) => stock.sector).filter((sector): sector is string => Boolean(sector)))).sort();

  const runBacktest = async () => {
    if (!filtered.length || loadingFundamentals) return;
    setBacktestLoading(true);
    setBacktestError("");
    try {
      const response = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: filtered.slice(0, 30).map((stock) => stock.ticker), years: backtestYears })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Backtest gagal dijalankan.");
      setBacktest(data);
    } catch (error) {
      setBacktestError(error instanceof Error ? error.message : "Backtest gagal dijalankan.");
    } finally {
      setBacktestLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-xl font-bold leading-tight sm:text-2xl">Stock Screener</h1>
        <p className="small-muted mt-1 leading-relaxed">{stocks.length} saham unik dari KOMPAS100, SRI-KEHATI, LQ45, IDX30, dan JII, dengan filter 8 parameter fundamental</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">LQ45: {LQ45_PERIOD} · IDX30: {IDX30_PERIOD} · JII: {JII_PERIOD}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">KOMPAS100: {KOMPAS100_PERIOD} · SRI-KEHATI: {SRI_KEHATI_PERIOD}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">Harga diperbarui per menit; rasio fundamental berasal dari laporan terbaru dan dicache selama satu jam.</p>
      </div>

      <Panel>
        {activePreset && presetFilters[activePreset] && (
          <div className="mb-4 flex items-center justify-between rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm">
            <span>Screening cepat: <strong>{presetFilters[activePreset].label}</strong></span>
            <button type="button" onClick={() => {
              setActivePreset("");
              setFilters(defaultFilters);
              const params = new URLSearchParams(window.location.search);
              params.delete("preset");
              window.history.replaceState({}, "", params.size ? `/screener?${params}` : "/screener");
            }} className="text-green-300 hover:text-green-200">Hapus preset</button>
          </div>
        )}
        {selectedSector && (
          <div className="mb-4 flex items-center justify-between rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm">
            <span>Filter sektor: <strong>{selectedSector}</strong></span>
            <button type="button" onClick={() => {
              setSelectedSector("");
              const params = new URLSearchParams(window.location.search);
              params.delete("sector");
              window.history.replaceState({}, "", params.size ? `/screener?${params}` : "/screener");
            }} className="text-sky-300 hover:text-sky-200">Hapus filter</button>
          </div>
        )}
        <div className="mb-4 max-w-sm">
          <label htmlFor="sector-filter" className="small-muted mb-1 block">Sektor</label>
          <select id="sector-filter" value={selectedSector} onChange={(event) => {
            const sector = event.target.value;
            setSelectedSector(sector);
            const params = new URLSearchParams(window.location.search);
            if (sector) params.set("sector", sector); else params.delete("sector");
            window.history.replaceState({}, "", params.size ? `/screener?${params}` : "/screener");
          }} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white outline-none focus:border-sky-500">
            <option value="">Semua sektor</option>
            {sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
          </select>
        </div>
        <div className="-mx-4 mb-4 px-4 sm:mx-0 sm:px-0">
          <div className="scrollbar-hidden flex gap-2 overflow-x-auto scroll-smooth pb-1 snap-x snap-mandatory sm:flex-wrap sm:overflow-visible">
          {indexOptions.map((idx) => {
            const count = idx === "Semua" ? stocks.length : stocks.filter((s) => (s.indices ?? []).includes(idx)).length;
            return (
              <button key={idx} onClick={() => setSelectedIndex(idx)} className={`flex shrink-0 snap-start items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-medium transition sm:rounded-md sm:py-2 ${selectedIndex === idx ? "bg-sky-600 text-white shadow-sm" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 active:bg-zinc-700"}`}>
                {idx} <span className="text-xs opacity-60">({count})</span>
              </button>
            );
          })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterInput label="P/E Range" min={filters.minPE} max={filters.maxPE} onMin={(v) => setFilters((f) => ({ ...f, minPE: v }))} onMax={(v) => setFilters((f) => ({ ...f, maxPE: v }))} />
          <FilterInput label="ROE Min (%)" value={filters.minROE} onChange={(v) => setFilters((f) => ({ ...f, minROE: v }))} />
          <FilterInput label="DER Max" value={filters.maxDER} onChange={(v) => setFilters((f) => ({ ...f, maxDER: v }))} />
          <FilterInput label="Div Yield Min (%)" value={filters.minDivYield} onChange={(v) => setFilters((f) => ({ ...f, minDivYield: v }))} />
          <FilterInput label="Div Yield Max (%)" value={filters.maxDivYield} onChange={(v) => setFilters((f) => ({ ...f, maxDivYield: v }))} />
          <FilterInput label="Net Margin Min (%)" value={filters.minMargin} onChange={(v) => setFilters((f) => ({ ...f, minMargin: v }))} />
          <FilterInput label="EPS Growth Min (%)" value={filters.minEpsGrowth} onChange={(v) => setFilters((f) => ({ ...f, minEpsGrowth: v }))} />
          <div className="flex items-end pb-1">
            <button onClick={() => {
              setFilters(defaultFilters);
              setActivePreset("");
              const params = new URLSearchParams(window.location.search);
              params.delete("preset");
              window.history.replaceState({}, "", params.size ? `/screener?${params}` : "/screener");
            }} className="min-h-[44px] rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 active:bg-zinc-600 sm:rounded-md sm:py-2">Reset</button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-zinc-700 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-zinc-500">Backtest memakai maksimum 30 saham teratas dari hasil filter saat ini.</p>
          <div className="flex items-center gap-2">
            <select value={backtestYears} onChange={(event) => setBacktestYears(Number(event.target.value))} aria-label="Periode backtest" className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white sm:min-h-0 sm:rounded-md">
              <option value={1}>1 tahun</option>
              <option value={3}>3 tahun</option>
              <option value={5}>5 tahun</option>
            </select>
            <button type="button" onClick={runBacktest} disabled={backtestLoading || loadingFundamentals || filtered.length === 0} className="flex min-h-[44px] items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:rounded-md sm:py-2">
              <Play size={15} /> {backtestLoading ? "Menghitung..." : "Jalankan Backtest"}
            </button>
          </div>
        </div>
      </Panel>

      {backtestError && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{backtestError}</div>}
      {backtest && <BacktestPanel data={backtest} />}

      <Panel className="overflow-hidden">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
          <span>Menampilkan {filtered.length} dari {stocks.length} saham{selectedIndex !== "Semua" ? ` di indeks ${selectedIndex}` : ""}</span>
          <span className="hidden sm:inline">{loadingFundamentals ? "Memuat rasio fundamental real..." : "Fundamental dicache 1 jam"}</span>
        </div>
        <div className="table-scroll-hint -mx-4 hidden sm:block sm:mx-0">
          <div className="scrollbar-hidden -mx-4 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[1320px] text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-left text-zinc-400">
              <th className="pb-3 pr-3 font-medium">Saham</th>
              <th className="pb-3 pr-3 font-medium">Indeks</th>
              <th className="pb-3 pr-3 font-medium text-right">Harga</th>
              <th className="pb-3 pr-3 font-medium text-right">P/E</th>
              <th className="pb-3 pr-3 font-medium text-right">P/BV</th>
              <th className="pb-3 pr-3 font-medium text-right">ROE</th>
              <th className="pb-3 pr-3 font-medium text-right">DER</th>
              <th className="pb-3 pr-3 font-medium text-right">Div Yield</th>
              <th className="pb-3 pr-3 font-medium text-right">Gross Margin</th>
              <th className="pb-3 pr-3 font-medium text-right">Net Margin</th>
              <th className="pb-3 pr-3 font-medium text-right">EPS</th>
              <th className="pb-3 pr-3 font-medium text-right">EPS Growth</th>
              <th className="pb-3 pr-3 font-medium text-center">Kelengkapan</th>
              <th className="pb-3 font-medium text-center">Skor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.ticker} className="border-b border-zinc-800 last:border-0">
                <td className="py-3 pr-3">
                  <Link href={`/analisis?ticker=${s.ticker}`} className="group inline-block">
                    <div className="font-semibold text-white group-hover:text-sky-300">{s.ticker}</div>
                    <div className="small-muted group-hover:text-sky-300">{s.name}</div>
                  </Link>
                  {s.fundamentalStatus && <div className="mt-1"><DataStatus status={s.fundamentalStatus} label="Fundamental" /></div>}
                </td>
                <td className="py-3 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {(s.indices ?? []).slice(0, 3).map((idx) => (
                      <span key={idx} className="rounded bg-zinc-700/50 px-1.5 py-0.5 text-[10px] text-zinc-400">{idx}</span>
                    ))}
                  </div>
                </td>
                <td className="py-3 pr-3 text-right">
                  <div className="font-medium">Rp {(s.price ?? 0).toLocaleString("id-ID")}</div>
                  <DataStatus status={s.dataStatus ?? "static"} label="Harga" />
                </td>
                <td className="py-3 pr-3 text-right">{formatMetric(s.pe, 1, "", s.unavailableMetrics?.includes("pe"))}</td>
                <td className="py-3 pr-3 text-right">{formatMetric(s.pbv, 2, "", s.unavailableMetrics?.includes("pbv"))}</td>
                <td className="py-3 pr-3 text-right text-green-400">{formatMetric(s.roe, 1, "%", s.unavailableMetrics?.includes("roe"))}</td>
                <td className="py-3 pr-3 text-right">{formatMetric(s.der, 2, "", s.unavailableMetrics?.includes("der"))}</td>
                <td className="py-3 pr-3 text-right text-sky-400">{formatMetric(s.dividendYield, 2, "%")}</td>
                <td className="py-3 pr-3 text-right">{formatMetric(s.grossMargin, 1, "%", s.unavailableMetrics?.includes("grossMargin"))}</td>
                <td className="py-3 pr-3 text-right">{formatMetric(s.netMargin, 1, "%", s.unavailableMetrics?.includes("netMargin"))}</td>
                <td className="py-3 pr-3 text-right">{formatMetric(s.eps, 2, "", s.unavailableMetrics?.includes("eps"))}</td>
                <td className={`py-3 pr-3 text-right ${s.epsGrowth === undefined ? "text-zinc-500" : s.epsGrowth >= 0 ? "text-green-400" : "text-red-400"}`}>{formatMetric(s.epsGrowth, 1, "%")}</td>
                <td className="py-3 pr-3 text-center">
                  {s.dataQuality ? (
                    <div title={`${s.dataQuality.source} · Laporan ${s.dataQuality.reportDate ?? "tidak diketahui"}`}>
                      <div className={`font-semibold ${s.dataQuality.percentage >= 80 ? "text-green-400" : s.dataQuality.percentage >= 60 ? "text-amber-400" : "text-red-400"}`}>{s.dataQuality.percentage}%</div>
                      <div className="text-[10px] text-zinc-500">{s.dataQuality.reportDate ?? "-"}</div>
                    </div>
                  ) : "-"}
                </td>
                <td className="py-3 text-center"><Badge tone={s.score >= 80 ? "positive" : s.score >= 60 ? "neutral" : "negative"}>{s.score}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </div>
        {/* Mobile cards - visible only on small screens */}
        <div className="mt-4 grid gap-3 sm:hidden">
          {filtered.slice(0, 30).map((s) => (
            <Link key={`m-${s.ticker}`} href={`/analisis?ticker=${s.ticker}`} className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-3 active:bg-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{s.ticker}</span>
                    <Badge tone={s.score >= 80 ? "positive" : s.score >= 60 ? "neutral" : "negative"}>{s.score}</Badge>
                  </div>
                  <div className="truncate text-xs text-zinc-400">{s.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(s.indices ?? []).slice(0, 2).map((idx) => <span key={idx} className="rounded bg-zinc-700/60 px-1.5 py-0.5 text-[10px] text-zinc-400">{idx}</span>)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-white">Rp {(s.price ?? 0).toLocaleString("id-ID")}</div>
                  <div className="text-[11px] text-zinc-500">{s.dataQuality ? `${s.dataQuality.percentage}% lengkap` : ""}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-zinc-900/60 px-1 py-2">
                  <div className="text-[10px] text-zinc-500">P/E</div>
                  <div className="text-xs font-medium text-white">{formatMetric(s.pe, 1, "", s.unavailableMetrics?.includes("pe"))}</div>
                </div>
                <div className="rounded-lg bg-zinc-900/60 px-1 py-2">
                  <div className="text-[10px] text-zinc-500">ROE</div>
                  <div className="text-xs font-medium text-green-400">{formatMetric(s.roe, 1, "%", s.unavailableMetrics?.includes("roe"))}</div>
                </div>
                <div className="rounded-lg bg-zinc-900/60 px-1 py-2">
                  <div className="text-[10px] text-zinc-500">DER</div>
                  <div className="text-xs font-medium text-white">{formatMetric(s.der, 2, "", s.unavailableMetrics?.includes("der"))}</div>
                </div>
                <div className="rounded-lg bg-zinc-900/60 px-1 py-2">
                  <div className="text-[10px] text-zinc-500">Div</div>
                  <div className="text-xs font-medium text-sky-400">{formatMetric(s.dividendYield, 1, "%")}</div>
                </div>
              </div>
            </Link>
          ))}
          {filtered.length > 30 && <div className="py-2 text-center text-xs text-zinc-500">Menampilkan 30 dari {filtered.length} — gunakan filter untuk mempersempit</div>}
        </div>
        {filtered.length === 0 && <div className="py-8 text-center text-zinc-400">Tidak ada saham yang cocok</div>}
      </Panel>
    </div>
  );
}

function BacktestPanel({ data }: { data: BacktestResult }) {
  const values = data.chart.flatMap((point) => [point.portfolio, point.benchmark]);
  const min = Math.min(...values, 90);
  const max = Math.max(...values, 110);
  const span = max - min || 1;
  const pointsFor = (key: "portfolio" | "benchmark") => data.chart.map((point, index) => {
    const x = data.chart.length === 1 ? 360 : 30 + (index / (data.chart.length - 1)) * 660;
    const y = 190 - ((point[key] - min) / span) * 150;
    return `${x},${y}`;
  }).join(" ");
  const metrics = [
    { label: "Total Return", portfolio: data.metrics.totalReturn, benchmark: data.benchmarkMetrics.totalReturn, suffix: "%" },
    { label: "CAGR", portfolio: data.metrics.cagr, benchmark: data.benchmarkMetrics.cagr, suffix: "%" },
    { label: "Volatilitas", portfolio: data.metrics.volatility, benchmark: data.benchmarkMetrics.volatility, suffix: "%" },
    { label: "Max Drawdown", portfolio: data.metrics.maxDrawdown, benchmark: data.benchmarkMetrics.maxDrawdown, suffix: "%" },
    { label: "Bulan Positif", portfolio: data.metrics.positiveMonths, benchmark: data.benchmarkMetrics.positiveMonths, suffix: "%" }
  ];
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Hasil Backtest {data.years} Tahun</h2>
          <p className="small-muted mt-1">{data.usedTickers.length} saham, bobot sama, rebalans bulanan &middot; sumber {data.source}</p>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-300"><span className="h-2 w-4 rounded bg-sky-400" /> Screener</span>
          <span className="flex items-center gap-1.5 text-zinc-300"><span className="h-2 w-4 rounded bg-amber-400" /> IHSG</span>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => {
          const lowerIsBetter = metric.label === "Volatilitas" || metric.label === "Max Drawdown";
          const beats = lowerIsBetter ? metric.portfolio < metric.benchmark : metric.portfolio > metric.benchmark;
          return (
            <div key={metric.label} className="rounded-md border border-zinc-700 bg-zinc-800/30 p-3">
              <div className="text-xs text-zinc-500">{metric.label}</div>
              <div className={`mt-1 text-lg font-semibold ${beats ? "text-green-400" : "text-white"}`}>{metric.portfolio >= 0 && metric.label === "Total Return" ? "+" : ""}{metric.portfolio.toFixed(2)}{metric.suffix}</div>
              <div className="mt-1 text-[11px] text-zinc-500">IHSG {metric.benchmark.toFixed(2)}{metric.suffix}</div>
            </div>
          );
        })}
      </div>
      <svg viewBox="0 0 720 225" className="mt-5 h-[225px] w-full" role="img" aria-label="Grafik hasil backtest dibanding IHSG">
        <line x1="30" y1="40" x2="690" y2="40" stroke="#3f3f46" />
        <line x1="30" y1="115" x2="690" y2="115" stroke="#3f3f46" />
        <line x1="30" y1="190" x2="690" y2="190" stroke="#3f3f46" />
        <polyline points={pointsFor("portfolio")} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" />
        <polyline points={pointsFor("benchmark")} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinejoin="round" />
        <text x="30" y="215" fill="#71717a" fontSize="11">{data.chart[0]?.period}</text>
        <text x="690" y="215" textAnchor="end" fill="#71717a" fontSize="11">{data.chart.at(-1)?.period}</text>
      </svg>
      <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div><strong>Catatan metodologi:</strong> {data.methodology} {data.limitation}</div>
      </div>
    </Panel>
  );
}

function formatMetric(value: number | undefined, digits: number, suffix = "", unavailable = false) {
  return value === undefined || unavailable ? "-" : `${value.toFixed(digits)}${suffix}`;
}

function FilterInput({ label, value, onChange, min, max, onMin, onMax }: { label: string; value?: number; onChange?: (v: number) => void; min?: number; max?: number; onMin?: (v: number) => void; onMax?: (v: number) => void }) {
  return (
    <div>
      <label className="small-muted mb-1 block text-xs sm:text-[13px]">{label}</label>
      {onChange ? (
        <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(Number(e.target.value))} className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 sm:min-h-0 sm:rounded-md sm:py-2" />
      ) : (
        <div className="flex gap-2">
          <input type="number" inputMode="decimal" value={min} onChange={(e) => onMin?.(Number(e.target.value))} placeholder="Min" className="min-h-[44px] w-1/2 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 sm:min-h-0 sm:rounded-md sm:py-2" />
          <input type="number" inputMode="decimal" value={max} onChange={(e) => onMax?.(Number(e.target.value))} placeholder="Max" className="min-h-[44px] w-1/2 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 sm:min-h-0 sm:rounded-md sm:py-2" />
        </div>
      )}
    </div>
  );
}
