"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, DataStatus, Panel } from "@/components/ui";
import { Bitcoin, Coins, Gem, Landmark, RefreshCw, ShieldCheck, TrendingDown, TrendingUp, WalletCards } from "lucide-react";

type Category = "all" | "metals" | "deposits" | "funds" | "crypto";
type Status = "real" | "static";

type Asset = {
  id: string;
  name: string;
  category: "metals" | "crypto" | "funds";
  unit: string;
  price: number;
  secondaryValue: { value: number; currency: string } | null;
  change1d: number;
  change30d: number;
  history: number[];
  risk: "Rendah" | "Menengah" | "Tinggi";
  liquidity: string;
  dataStatus: Status;
  sourceUrl: string;
  asOf: string | null;
};

type Deposit = {
  id: string;
  name: string;
  value: number;
  unit: string;
  currency: string;
  risk: "Rendah";
  liquidity: string;
  dataStatus: Status;
  sourceUrl: string;
};

type ApiResponse = {
  asOf: string;
  usdIdr: number;
  lpsPeriod: string;
  assets: Asset[];
  deposits: Deposit[];
};

const tabs: { id: Category; label: string; icon: typeof Gem }[] = [
  { id: "all", label: "Semua", icon: WalletCards },
  { id: "metals", label: "Logam", icon: Gem },
  { id: "deposits", label: "Deposito", icon: Landmark },
  { id: "funds", label: "Reksa Dana ETF", icon: Coins },
  { id: "crypto", label: "Kripto", icon: Bitcoin }
];

function formatIdr(value: number) {
  if (!value) return "-";
  return `Rp ${value.toLocaleString("id-ID", { maximumFractionDigits: value < 100 ? 2 : 0 })}`;
}

function riskTone(risk: Asset["risk"] | Deposit["risk"]) {
  return risk === "Rendah" ? "positive" : risk === "Tinggi" ? "negative" : "neutral";
}

export default function AlternativeAssetsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Category>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/alternative-assets");
      if (!response.ok) throw new Error("Data pasar tidak tersedia");
      setData(await response.json());
    } catch {
      setError("Data lintas aset belum dapat dimuat. Coba perbarui beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const groups = useMemo(() => ({
    metals: data?.assets.filter((asset) => asset.category === "metals") ?? [],
    funds: data?.assets.filter((asset) => asset.category === "funds") ?? [],
    crypto: data?.assets.filter((asset) => asset.category === "crypto") ?? []
  }), [data]);

  const gold = groups.metals.find((asset) => asset.id === "gold");
  const bitcoin = groups.crypto.find((asset) => asset.id === "bitcoin");
  const idx30Fund = groups.funds.find((asset) => asset.id === "xiid");
  const bankDeposit = data?.deposits.find((deposit) => deposit.id === "lps-bank-idr");

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">Investasi Lain</h1>
          <p className="small-muted mt-1 leading-relaxed">Bandingkan logam mulia, deposito, reksa dana bursa, dan kripto dalam rupiah</p>
        </div>
        <button type="button" onClick={loadData} disabled={loading} title="Perbarui data" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-700 text-zinc-300 transition hover:bg-zinc-800 active:bg-zinc-800 disabled:opacity-50 sm:h-10 sm:rounded-md">
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid-auto">
        <SnapshotCard label="Emas" value={formatIdr(gold?.price ?? 0)} detail="per gram" change={gold?.change1d} status={gold?.dataStatus} />
        <SnapshotCard label="Bitcoin" value={formatIdr(bitcoin?.price ?? 0)} detail="per BTC" change={bitcoin?.change1d} status={bitcoin?.dataStatus} />
        <SnapshotCard label="ETF IDX30" value={formatIdr(idx30Fund?.price ?? 0)} detail="per unit" change={idx30Fund?.change1d} status={idx30Fund?.dataStatus} />
        <SnapshotCard label="Batas Bunga LPS" value={bankDeposit ? `${bankDeposit.value.toFixed(2)}%` : "-"} detail="bank umum, per tahun" status={bankDeposit?.dataStatus} />
      </div>

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="scrollbar-hidden flex gap-2 overflow-x-auto scroll-smooth pb-1 snap-x snap-mandatory sm:flex-wrap sm:overflow-visible">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setActiveTab(id)} className={`inline-flex shrink-0 snap-start items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-medium transition sm:rounded-md sm:py-2 ${activeTab === id ? "bg-sky-600 text-white shadow-sm" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:bg-zinc-700"}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
        </div>
      </div>

      {(activeTab === "all" || activeTab === "metals") && (
        <AssetSection title="Logam Mulia" subtitle="Harga indikatif dari kontrak berjangka global, dikonversi dengan kurs USD/IDR" assets={groups.metals} />
      )}

      {(activeTab === "all" || activeTab === "deposits") && (
        <section>
          <SectionHeading title="Deposito" subtitle={`Batas bunga penjaminan LPS · ${data?.lpsPeriod ?? "memuat periode"}`} />
          <div className="grid-auto mt-4">
            {(data?.deposits ?? []).map((deposit) => <DepositCard key={deposit.id} deposit={deposit} />)}
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-400" />
            <span>Batas LPS bukan penawaran bunga bank. Simpanan memenuhi syarat penjaminan bila bunga yang diterima tidak melampaui batas berlaku dan total simpanan maksimal Rp2 miliar per nasabah per bank.</span>
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "funds") && (
        <AssetSection title="Reksa Dana Bursa (ETF)" subtitle="Harga perdagangan unit reksa dana di Bursa Efek Indonesia" assets={groups.funds} />
      )}

      {(activeTab === "all" || activeTab === "crypto") && (
        <AssetSection title="Kripto" subtitle="Harga pasar global dalam USD yang dikonversi ke rupiah" assets={groups.crypto} />
      )}

      <Panel className="table-scroll-hint overflow-hidden">
        <div className="mb-4">
          <h2 className="text-base font-semibold sm:text-lg">Perbandingan Cepat</h2>
          <p className="small-muted mt-1 leading-relaxed">Karakter umum untuk membantu menyaring instrumen, bukan rekomendasi personal</p>
        </div>
        <div className="-mx-4 sm:mx-0">
          <div className="scrollbar-hidden overflow-x-auto px-4 sm:px-0">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-left text-zinc-400">
              <th className="pb-3 font-medium">Instrumen</th>
              <th className="pb-3 font-medium">Risiko</th>
              <th className="pb-3 font-medium">Likuiditas</th>
              <th className="pb-3 font-medium">Horizon Umum</th>
              <th className="pb-3 font-medium">Acuan Utama</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Deposito", "Rendah", "Sesuai tenor", "< 1 tahun", "Bunga bersih & batas LPS"],
              ["Emas", "Menengah", "Tinggi", "3+ tahun", "Harga global & USD/IDR"],
              ["Reksa Dana ETF Obligasi", "Menengah", "Bursa", "2-5 tahun", "Suku bunga & durasi"],
              ["Reksa Dana ETF Saham", "Tinggi", "Bursa", "5+ tahun", "Indeks acuan"],
              ["Kripto", "Tinggi", "24/7", "Spekulatif", "Volatilitas & likuiditas"]
            ].map((row) => (
              <tr key={row[0]} className="border-b border-zinc-800 last:border-0">
                {row.map((cell, index) => <td key={cell} className={`py-3 pr-4 ${index === 0 ? "font-medium text-white" : "text-zinc-300"}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </div>
      </Panel>

      <p className="text-xs leading-relaxed text-zinc-500">Pembaruan terakhir: {data?.asOf ? new Date(data.asOf).toLocaleString("id-ID") : "memuat"} · Kurs USD/IDR {data?.usdIdr ? formatIdr(data.usdIdr) : "-"}</p>
    </div>
  );
}

function SnapshotCard({ label, value, detail, change, status = "static" }: { label: string; value: string; detail: string; change?: number; status?: Status }) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <span className="small-muted">{label}</span>
        <DataStatus status={status} />
      </div>
      <div className="mt-3 text-xl font-semibold">{value}</div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="text-zinc-500">{detail}</span>
        {change !== undefined && <Change value={change} />}
      </div>
    </Panel>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="small-muted mt-1">{subtitle}</p>
    </div>
  );
}

function AssetSection({ title, subtitle, assets }: { title: string; subtitle: string; assets: Asset[] }) {
  return (
    <section>
      <SectionHeading title={title} subtitle={subtitle} />
      <div className="grid-auto mt-4">
        {assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
      </div>
    </section>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{asset.name}</h3>
          <p className="small-muted mt-1">{asset.unit}</p>
        </div>
        <DataStatus status={asset.dataStatus} />
      </div>
      <div className="mt-4 text-xl font-semibold">{formatIdr(asset.price)}</div>
      {asset.secondaryValue && <div className="mt-1 text-xs text-zinc-500">USD {asset.secondaryValue.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}</div>}
      <MiniSparkline values={asset.history} positive={asset.change30d >= 0} />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-3 text-xs">
          <span>1D <Change value={asset.change1d} /></span>
          <span>30D <Change value={asset.change30d} /></span>
        </div>
        <Badge tone={riskTone(asset.risk)}>Risiko {asset.risk}</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3 text-xs text-zinc-500">
        <span>Likuiditas {asset.liquidity}</span>
        <a href={asset.sourceUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300">Sumber</a>
      </div>
    </Panel>
  );
}

function DepositCard({ deposit }: { deposit: Deposit }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{deposit.name}</h3>
          <p className="small-muted mt-1">{deposit.currency}</p>
        </div>
        <DataStatus status={deposit.dataStatus} />
      </div>
      <div className="mt-4 text-2xl font-semibold">{deposit.value.toFixed(2)}%</div>
      <p className="small-muted mt-1">{deposit.unit}</p>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
        <Badge tone="positive">Risiko rendah</Badge>
        <a href={deposit.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:text-sky-300">Sumber</a>
      </div>
    </Panel>
  );
}

function Change({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${positive ? "text-green-400" : "text-red-400"}`}>
      {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {positive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function MiniSparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return <div className="mt-4 h-12 rounded bg-zinc-800/40" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 220;
    const y = 44 - ((value - min) / span) * 38;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 220 48" className="mt-4 h-12 w-full" role="img" aria-label="Grafik harga 30 hari">
      <polyline points={points} fill="none" stroke={positive ? "#22c55e" : "#ef4444"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
