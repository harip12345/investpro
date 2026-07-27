import { MetricCard, Panel, Badge, DataStatus } from "@/components/ui";
import { LiveChart } from "@/components/live-chart";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { GET as getStocksResponse } from "@/app/api/stocks/route";
import { GET as getFundamentalsResponse } from "@/app/api/fundamentals/route";
import Link from "next/link";

interface Stock { ticker: string; name: string; price: number; change: number; pe: number; pbv: number; marketCap: string; score: number; trend: "Bullish" | "Neutral" | "Bearish"; roe?: number; der?: number; dividendYield?: number; sector: string; indexWeight?: number; indices?: string[]; dataStatus?: "real" | "static" }
interface MarketItem { label: string; value: string; change: number; dataStatus?: "real" | "static" }
interface FundamentalSummary { ticker: string; sector: string; ratios: { roe: number; der: number; dividendYield: number } }
interface StocksResponse { stocks?: Stock[]; marketSummary?: MarketItem[] }

const supportedFundamentals = new Set(["BBCA", "BMRI", "BBRI", "BBNI", "ASII", "UNVR", "ICBP", "UNTR", "EXCL", "PTBA", "PGAS", "AKRA", "TLKM", "ADRO"]);

async function getData() {
  try {
    const stockResponse = await getStocksResponse();
    const data = await stockResponse.json() as StocksResponse;
    const tickers = data.stocks?.map((stock) => stock.ticker).filter((ticker) => supportedFundamentals.has(ticker)) ?? [];
    const fundamentals = await Promise.all(tickers.map(async (ticker) => {
      const response = await getFundamentalsResponse(new Request(`http://internal/api/fundamentals?ticker=${encodeURIComponent(ticker)}`));
      return response.ok ? await response.json() as FundamentalSummary : null;
    }));
    const summaries = new Map(fundamentals.filter((item): item is FundamentalSummary => item !== null).map((item) => [item.ticker, item]));
    return {
      stocks: data.stocks?.map((s) => {
        const extra = summaries.get(s.ticker);
        return { ...s, roe: extra?.ratios.roe, der: extra?.ratios.der, dividendYield: extra?.ratios.dividendYield, sector: extra?.sector || s.sector || "N/A" };
      }) || [],
      marketSummary: data.marketSummary || []
    };
  } catch { return null; }
}

export default async function Dashboard() {
  const data = await getData();
  const stocks = data?.stocks ?? [
    { ticker: "BBCA", name: "Bank Central Asia", price: 6175, change: 0.82, pe: 24.1, pbv: 4.8, marketCap: "1218T", score: 88, trend: "Bullish", roe: 19.7, der: 4.1, dividendYield: 2.1, sector: "Financial", indices: ["LQ45", "IDX30", "KOMPAS100", "SRI-KEHATI"] },
    { ticker: "BMRI", name: "Bank Mandiri", price: 6425, change: 0.8, pe: 11.9, pbv: 2.0, marketCap: "600T", score: 86, trend: "Bullish", roe: 21.3, der: 5.4, dividendYield: 4.7, sector: "Financial", indices: ["LQ45", "IDX30", "KOMPAS100"] },
    { ticker: "ASII", name: "Astra International", price: 4920, change: -0.6, pe: 7.6, pbv: 1.0, marketCap: "199T", score: 80, trend: "Neutral", roe: 13.8, der: 0.9, dividendYield: 6.3, sector: "Consumer", indices: ["LQ45", "IDX30", "KOMPAS100"] },
    { ticker: "TLKM", name: "Telkom Indonesia", price: 3150, change: -1.1, pe: 12.8, pbv: 2.1, marketCap: "312T", score: 78, trend: "Neutral", roe: 16.4, der: 0.3, dividendYield: 5.5, sector: "Communication", indices: ["LQ45", "IDX30", "KOMPAS100"] },
    { ticker: "ADRO", name: "Alamtri Resources", price: 2860, change: 2.2, pe: 5.2, pbv: 1.3, marketCap: "91T", score: 83, trend: "Bullish", roe: 24.9, der: 0.5, dividendYield: 8.6, sector: "Energy", indices: ["LQ45", "IDX30", "KOMPAS100"] }
  ];
  const marketSummary = data?.marketSummary ?? [{ label: "IHSG", value: "7.245,18", change: 0.72 }, { label: "LQ45", value: "926,44", change: 0.55 }];
  const topStocks = [...stocks].sort((a, b) => (b.indexWeight ?? 0) - (a.indexWeight ?? 0)).slice(0, 10);

  const sectorHeat = stocks.reduce<Record<string, { total: number; count: number }>>((acc, s) => {
    if (!acc[s.sector]) acc[s.sector] = { total: 0, count: 0 };
    acc[s.sector].total += s.change;
    acc[s.sector].count += 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Ringkasan Pasar</h1>
        <p className="small-muted mt-1">Pantau pergerakan indeks dan sektor utama Indonesia</p>
      </div>

      <div className="grid-auto">
        {marketSummary.map((item) => <MetricCard key={item.label} label={item.label} value={item.value} change={item.change} dataStatus={item.dataStatus} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Saham Teratas</h2>
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-left text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Saham</th>
                  <th className="pb-3 pr-4 font-medium text-right">Harga</th>
                  <th className="pb-3 pr-4 font-medium text-right">Perubahan</th>
                  <th className="pb-3 pr-4 font-medium text-right">P/E</th>
                  <th className="pb-3 pr-4 font-medium text-center">Skor</th>
                  <th className="pb-3 pr-4 font-medium text-center">Tren</th>
                  <th className="pb-3 font-medium">Grafik</th>
                </tr>
              </thead>
              <tbody>
                {topStocks.map((s) => (
                  <tr key={s.ticker} className="border-b border-zinc-800 last:border-0">
                    <td className="py-3 pr-4">
                      <Link href={`/analisis?ticker=${s.ticker}`} className="group inline-block">
                        <div className="font-semibold text-white group-hover:text-sky-300">{s.ticker}</div>
                        <div className="small-muted group-hover:text-sky-300">{s.name}</div>
                      </Link>
                      <div className="mt-1"><DataStatus status={s.dataStatus ?? "static"} label="Harga" /></div>
                      {s.indices && s.indices.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.indices.slice(0, 2).map((idx) => (
                            <span key={idx} className="rounded bg-zinc-700/50 px-1.5 py-0.5 text-[10px] text-zinc-400">{idx}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium">Rp {s.price.toLocaleString("id-ID")}</td>
                    <td className="py-3 pr-4 text-right">
                      <span className={s.change >= 0 ? "text-green-400" : "text-red-400"}>{s.change >= 0 ? "+" : ""}{s.change}%</span>
                    </td>
                    <td className="py-3 pr-4 text-right">{s.pe > 0 ? s.pe.toFixed(1) : "-"}</td>
                    <td className="py-3 pr-4 text-center"><Badge tone={s.score >= 80 ? "positive" : s.score >= 60 ? "neutral" : "negative"}>{s.score}</Badge></td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`inline-flex items-center gap-1 font-medium ${s.trend === "Bullish" ? "text-green-400" : s.trend === "Bearish" ? "text-red-400" : "text-zinc-400"}`}>
                        {s.trend === "Bullish" ? <TrendingUp size={14} /> : s.trend === "Bearish" ? <TrendingDown size={14} /> : <Minus size={14} />}{s.trend}
                      </span>
                    </td>
                    <td className="py-3"><div className="h-16 w-32"><LiveChart symbol={`${s.ticker}.JK`} range="1mo" /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Heatmap Sektor</h2>
          <Panel className="flex flex-col gap-3">
            {Object.entries(sectorHeat).map(([sector, vals]) => {
              const avgChange = vals.total / vals.count;
              return (
                <Link key={sector} href={`/screener?sector=${encodeURIComponent(sector)}`} className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-800/40 px-3 py-2 transition hover:border-sky-500 hover:bg-zinc-800">
                  <span className="text-sm font-medium text-white">{sector}</span>
                  <span className={`text-sm font-semibold ${avgChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}%
                  </span>
                </Link>
              );
            })}
            <div className="mt-1 small-muted">Rata-rata perubahan per sektor</div>
          </Panel>

          <h2 className="text-xl font-semibold">Screening Cepat</h2>
          <Panel className="flex flex-col gap-3">
            <QuickFilter href="/screener?preset=roe15" label="ROE &gt; 15%" stocks={stocks.filter((s) => (s.roe ?? 0) >= 15)} />
            <QuickFilter href="/screener?preset=pe12" label="P/E &lt; 12" stocks={stocks.filter((s) => s.pe > 0 && s.pe < 12)} />
            <QuickFilter href="/screener?preset=dividend4" label="Dividend &gt; 4%" stocks={stocks.filter((s) => (s.dividendYield ?? 0) >= 4)} />
            <QuickFilter href="/screener?preset=der1" label="DER &lt; 1" stocks={stocks.filter((s) => (s.der ?? 99) < 1)} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function QuickFilter({ href, label, stocks: list }: { href: string; label: string; stocks: Stock[] }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-md border border-transparent p-2 transition hover:border-sky-500/40 hover:bg-sky-500/10">
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">{list.length}</span>
      </div>
      <div className="flex gap-1">
        {list.slice(0, 3).map((s) => (
          <span key={s.ticker} className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-white">{s.ticker}</span>
        ))}
      </div>
    </Link>
  );
}
