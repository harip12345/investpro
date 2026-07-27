"use client";

import { useState, useEffect, useCallback } from "react";
import { Panel, Badge } from "@/components/ui";
import { TrendingUp, TrendingDown, PlusCircle, Trash2, BellRing, Star, X } from "lucide-react";
import {
  AlertRule,
  AlertType,
  AppNotification,
  WatchlistItem,
  alertLabels,
  alertTargetSuffix,
  getAlertRules,
  getNotifications,
  getWatchlist,
  saveAlertRules,
  saveWatchlist,
  WATCHLIST_EVENT
} from "@/lib/watchlist";

interface StockQuote { ticker: string; name?: string; price: number; change: number; sector?: string }
interface Transaction { id: string; ticker: string; action: "buy" | "sell"; quantity: number; price: number; date: string }

const defaultPortfolio = [
  { ticker: "BBCA", allocation: 35, avgPrice: 9500, currentPrice: 9875 },
  { ticker: "BMRI", allocation: 25, avgPrice: 6100, currentPrice: 6425 },
  { ticker: "ASII", allocation: 20, avgPrice: 5050, currentPrice: 4920 },
  { ticker: "ADRO", allocation: 20, avgPrice: 2700, currentPrice: 2860 }
];

const defaultTransactions: Transaction[] = [
  { id: "1", ticker: "BBCA", action: "buy", quantity: 100, price: 9200, date: "2026-01-15" },
  { id: "2", ticker: "BBCA", action: "buy", quantity: 50, price: 9500, date: "2026-03-10" },
  { id: "3", ticker: "BMRI", action: "buy", quantity: 80, price: 5900, date: "2026-02-20" },
  { id: "4", ticker: "ASII", action: "buy", quantity: 60, price: 5100, date: "2026-01-25" },
  { id: "5", ticker: "ADRO", action: "buy", quantity: 100, price: 2600, date: "2026-04-05" }
];

export default function PortfolioPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);
  const [livePrices, setLivePrices] = useState<StockQuote[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [watchTicker, setWatchTicker] = useState("BBCA");
  const [alertForm, setAlertForm] = useState<{ ticker: string; type: AlertType; target: number }>({ ticker: "BBCA", type: "price_above", target: 10000 });
  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ticker: "BBCA", action: "buy" as "buy" | "sell", quantity: 0, price: 0 });

  useEffect(() => {
    try {
      const savedTransactions = localStorage.getItem("investpro-transactions");
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    } catch {}
    setWatchlist(getWatchlist());
    setAlerts(getAlertRules());
    setNotifications(getNotifications());
    setHydrated(true);
    fetch("/api/stocks").then((r) => {
      if (!r.ok) throw new Error("Price request failed");
      return r.json();
    }).then((d) => setLivePrices(d.stocks || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("investpro-transactions", JSON.stringify(transactions));
  }, [hydrated, transactions]);

  useEffect(() => {
    const refresh = () => {
      setWatchlist(getWatchlist());
      setAlerts(getAlertRules());
      setNotifications(getNotifications());
    };
    window.addEventListener(WATCHLIST_EVENT, refresh);
    return () => window.removeEventListener(WATCHLIST_EVENT, refresh);
  }, []);

  const getPrice = useCallback((ticker: string) => {
    return livePrices.find((p) => p.ticker === ticker)?.price ?? defaultPortfolio.find((p) => p.ticker === ticker)?.currentPrice ?? 0;
  }, [livePrices]);

  const addTransaction = () => {
    if (form.quantity <= 0 || form.price <= 0) return;
    if (form.action === "sell" && form.quantity > (holdings[form.ticker]?.qty ?? 0)) return;
    const tx: Transaction = { id: Date.now().toString(), ticker: form.ticker, action: form.action, quantity: form.quantity, price: form.price, date: new Date().toISOString().split("T")[0] };
    setTransactions([tx, ...transactions]);
    setShowAdd(false);
    setForm({ ticker: "BBCA", action: "buy", quantity: 0, price: 0 });
  };

  const deleteTransaction = (id: string) => setTransactions(transactions.filter((t) => t.id !== id));

  const addToWatchlist = (ticker: string) => {
    if (watchlist.some((item) => item.ticker === ticker)) return;
    const next = [...watchlist, { ticker, addedAt: new Date().toISOString() }];
    saveWatchlist(next);
    setWatchlist(next);
  };

  const removeFromWatchlist = (ticker: string) => {
    const next = watchlist.filter((item) => item.ticker !== ticker);
    saveWatchlist(next);
    setWatchlist(next);
  };

  const addAlert = () => {
    const requiresTarget = alertForm.type !== "news";
    if (requiresTarget && alertForm.target <= 0) return;
    const rule: AlertRule = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ticker: alertForm.ticker,
      type: alertForm.type,
      target: requiresTarget ? alertForm.target : undefined,
      enabled: true,
      createdAt: new Date().toISOString()
    };
    const next = [rule, ...alerts];
    saveAlertRules(next);
    setAlerts(next);
    addToWatchlist(alertForm.ticker);
  };

  const toggleAlert = (id: string) => {
    const next = alerts.map((alert) => alert.id === id ? { ...alert, enabled: !alert.enabled } : alert);
    saveAlertRules(next);
    setAlerts(next);
  };

  const deleteAlert = (id: string) => {
    const next = alerts.filter((alert) => alert.id !== id);
    saveAlertRules(next);
    setAlerts(next);
  };

  const holdings = [...transactions].sort((a, b) => a.date.localeCompare(b.date)).reduce<Record<string, { qty: number; totalCost: number }>>((acc, t) => {
    if (!acc[t.ticker]) acc[t.ticker] = { qty: 0, totalCost: 0 };
    if (t.action === "buy") { acc[t.ticker].qty += t.quantity; acc[t.ticker].totalCost += t.quantity * t.price; }
    else {
      const sold = Math.min(t.quantity, acc[t.ticker].qty);
      const averageCost = acc[t.ticker].qty > 0 ? acc[t.ticker].totalCost / acc[t.ticker].qty : 0;
      acc[t.ticker].qty -= sold;
      acc[t.ticker].totalCost -= sold * averageCost;
    }
    return acc;
  }, {});
  const activeHoldings = Object.entries(holdings).filter(([, holding]) => holding.qty > 0);
  const totalValue = activeHoldings.reduce((sum, [ticker, holding]) => sum + getPrice(ticker) * holding.qty, 0);
  const totalCost = activeHoldings.reduce((sum, [, holding]) => sum + holding.totalCost, 0);
  const totalGain = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio & Watchlist</h1>
          <p className="small-muted mt-1">Kelola investasi, catat transaksi, pantau P/L harian</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
          <PlusCircle size={16} /> Tambah Transaksi
        </button>
      </div>

      {showAdd && (
        <Panel className="grid gap-3 sm:grid-cols-5">
          <div>
            <label className="small-muted mb-1 block">Saham</label>
            <select value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-white outline-none">
              {(livePrices.length ? livePrices : defaultPortfolio).map((stock) => <option key={stock.ticker} value={stock.ticker}>{stock.ticker}</option>)}
            </select>
          </div>
          <div>
            <label className="small-muted mb-1 block">Aksi</label>
            <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as "buy" | "sell" })} className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-white outline-none">
              <option value="buy">Beli</option>
              <option value="sell">Jual</option>
            </select>
          </div>
          <div>
            <label className="small-muted mb-1 block">Jumlah</label>
            <input type="number" value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} placeholder="Lot / lembar" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-white outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="small-muted mb-1 block">Harga Beli/Jual</label>
            <input type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="Rp" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-white outline-none focus:border-sky-500" />
          </div>
          <div className="flex items-end">
            <button onClick={addTransaction} className="w-full rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-500">Simpan</button>
          </div>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Star size={18} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Watchlist</h2>
          </div>
          <Panel className="flex flex-col gap-4">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select value={watchTicker} onChange={(event) => setWatchTicker(event.target.value)} className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-sky-500">
                {livePrices.map((stock) => <option key={stock.ticker} value={stock.ticker}>{stock.ticker} - {stock.name}</option>)}
              </select>
              <button type="button" onClick={() => addToWatchlist(watchTicker)} className="flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500">
                <PlusCircle size={16} /> Tambah
              </button>
            </div>
            <div className="grid gap-2">
              {watchlist.map((item) => {
                const quote = livePrices.find((stock) => stock.ticker === item.ticker);
                return (
                  <div key={item.ticker} className="flex items-center justify-between gap-3 rounded-md border border-zinc-700 bg-zinc-800/30 p-3">
                    <div className="min-w-0">
                      <a href={`/analisis?ticker=${item.ticker}`} className="font-semibold text-white hover:text-sky-300">{item.ticker}</a>
                      <div className="truncate text-xs text-zinc-500">{quote?.name ?? "Saham BEI"}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">Rp {(quote?.price ?? 0).toLocaleString("id-ID")}</div>
                        <div className={`text-xs ${(quote?.change ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>{(quote?.change ?? 0) >= 0 ? "+" : ""}{(quote?.change ?? 0).toFixed(2)}%</div>
                      </div>
                      <button type="button" onClick={() => removeFromWatchlist(item.ticker)} title="Hapus dari watchlist" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400"><X size={15} /></button>
                    </div>
                  </div>
                );
              })}
              {watchlist.length === 0 && <div className="py-8 text-center text-sm text-zinc-500">Belum ada saham di watchlist.</div>}
            </div>
          </Panel>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <BellRing size={18} className="text-sky-400" />
            <h2 className="text-lg font-semibold text-white">Peringatan</h2>
          </div>
          <Panel className="flex flex-col gap-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_1fr_auto]">
              <select value={alertForm.ticker} onChange={(event) => setAlertForm({ ...alertForm, ticker: event.target.value })} className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-white outline-none focus:border-sky-500">
                {livePrices.map((stock) => <option key={stock.ticker} value={stock.ticker}>{stock.ticker}</option>)}
              </select>
              <select value={alertForm.type} onChange={(event) => {
                const type = event.target.value as AlertType;
                const defaultsByType: Record<AlertType, number> = { price_above: 10000, price_below: 9000, roe_above: 15, pe_below: 12, volume_spike: 1.5, bandarology: 60, news: 0 };
                setAlertForm({ ...alertForm, type, target: defaultsByType[type] });
              }} className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-white outline-none focus:border-sky-500">
                {(Object.keys(alertLabels) as AlertType[]).map((type) => <option key={type} value={type}>{alertLabels[type]}</option>)}
              </select>
              {alertForm.type === "news" ? (
                <div className="flex items-center rounded-md border border-zinc-700 px-3 text-xs text-zinc-500">Otomatis</div>
              ) : (
                <input type="number" step={alertForm.type === "volume_spike" ? "0.1" : "1"} value={alertForm.target || ""} onChange={(event) => setAlertForm({ ...alertForm, target: Number(event.target.value) })} aria-label="Nilai target" placeholder="Target" className="min-w-0 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-white outline-none focus:border-sky-500" />
              )}
              <button type="button" onClick={addAlert} title="Tambah peringatan" className="flex items-center justify-center gap-2 rounded-md bg-green-600 px-3 py-2 text-white hover:bg-green-500"><PlusCircle size={17} /><span className="sm:hidden">Buat Peringatan</span></button>
            </div>
            <div className="grid gap-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{alert.ticker} <span className="font-normal text-zinc-400">{alertLabels[alert.type]}</span></div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {alert.target !== undefined ? `${alertTargetSuffix(alert.type) === "Rp" ? "Rp " : ""}${alert.target.toLocaleString("id-ID")}${alertTargetSuffix(alert.type) === "Rp" ? "" : alertTargetSuffix(alert.type)}` : "Setiap berita baru"}
                      {alert.lastTriggeredAt && ` · Terpicu ${new Date(alert.lastTriggeredAt).toLocaleString("id-ID")}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => toggleAlert(alert.id)} title={alert.enabled ? "Nonaktifkan" : "Aktifkan"} className={`relative h-6 w-11 rounded-full transition ${alert.enabled ? "bg-green-500" : "bg-zinc-700"}`}>
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${alert.enabled ? "left-6" : "left-1"}`} />
                    </button>
                    <button type="button" onClick={() => deleteAlert(alert.id)} title="Hapus peringatan" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && <div className="py-6 text-center text-sm text-zinc-500">Belum ada aturan peringatan.</div>}
            </div>
            {notifications.length > 0 && (
              <div className="border-t border-zinc-700 pt-3">
                <div className="mb-2 text-xs font-semibold uppercase text-zinc-500">Terakhir Terpicu</div>
                {notifications.slice(0, 3).map((item) => <div key={item.id} className="mb-2 text-xs text-zinc-400"><span className="font-medium text-zinc-200">{item.title}:</span> {item.message}</div>)}
              </div>
            )}
          </Panel>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="text-center">
          <div className="small-muted">Total Nilai</div>
          <div className="mt-2 text-2xl font-bold text-white">Rp {totalValue.toLocaleString("id-ID")}</div>
        </Panel>
        <Panel className="text-center">
          <div className="small-muted">Total Gain/Loss</div>
          <div className={`mt-2 text-2xl font-bold ${totalGain >= 0 ? "text-green-400" : "text-red-400"}`}>{totalGain >= 0 ? "+" : ""}{totalGain.toFixed(2)}%</div>
        </Panel>
        <Panel className="text-center">
          <div className="small-muted">Jumlah Saham</div>
          <div className="mt-2 text-2xl font-bold text-white">{activeHoldings.length}</div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Holdings Aktif</h2>
          <Panel className="flex flex-col gap-3">
            {activeHoldings.map(([ticker, h]) => {
              const price = getPrice(ticker);
              const avgCost = h.totalCost / h.qty;
              const pnl = ((price - avgCost) / avgCost) * 100;
              return (
                <div key={ticker} className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-800/40 p-3">
                  <div>
                    <div className="font-semibold text-white">{ticker}</div>
                    <div className="small-muted text-xs">{h.qty} lembar @ Rp {avgCost.toLocaleString("id-ID")}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">Rp {price.toLocaleString("id-ID")}</div>
                    <div className={`flex items-center gap-1 text-sm ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
            {activeHoldings.length === 0 && <div className="py-6 text-center text-zinc-400">Belum ada transaksi</div>}
          </Panel>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Riwayat Transaksi</h2>
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[300px] text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-left text-zinc-400">
                  <th className="pb-3 pr-3 font-medium">Tanggal</th>
                  <th className="pb-3 pr-3 font-medium">Saham</th>
                  <th className="pb-3 pr-3 font-medium">Aksi</th>
                  <th className="pb-3 pr-3 font-medium text-right">Qty</th>
                  <th className="pb-3 pr-3 font-medium text-right">Harga</th>
                  <th className="pb-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-800 last:border-0">
                    <td className="py-3 pr-3 text-zinc-400">{t.date}</td>
                    <td className="py-3 pr-3 font-medium text-white">{t.ticker}</td>
                    <td className="py-3 pr-3"><Badge tone={t.action === "buy" ? "positive" : "negative"}>{t.action === "buy" ? "Beli" : "Jual"}</Badge></td>
                    <td className="py-3 pr-3 text-right">{t.quantity}</td>
                    <td className="py-3 pr-3 text-right">Rp {t.price.toLocaleString("id-ID")}</td>
                    <td className="py-3 pr-3 font-medium">Rp {(t.quantity * t.price).toLocaleString("id-ID")}</td>
                    <td className="py-3"><button onClick={() => deleteTransaction(t.id)} className="text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && <div className="py-6 text-center text-zinc-400">Belum ada riwayat</div>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
