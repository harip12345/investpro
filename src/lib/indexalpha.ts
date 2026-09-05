// Client untuk Index Alpha (api.indexalpha.id) — broker summary & foreign flow real IDX.
// Auth: Bearer API key dari env INDEXALPHA_API_KEY (daftar gratis di indexalpha.id,
// paket gratis 5 request/hari — semua panggilan di-cache agresif di route pemanggil).
// Endpoint (sesuai dokumentasi resmi):
//   GET /stocks/broker-summary?ticker=BBCA&from=YYYY-MM-DD&to=YYYY-MM-DD&investor=all
//   POST /stocks/broker-summary/batch (maks 50 ticker)
//   GET /foreign-flow | POST /foreign-flow/batch
//   GET /usage | GET /news
// Tanpa key: isIndexAlphaConfigured() false dan semua fungsi null (fallback ke sumber lain).

const INDEXALPHA_BASE = process.env.INDEXALPHA_BASE_URL ?? "https://api.indexalpha.id";

export function isIndexAlphaConfigured(): boolean {
  return Boolean(process.env.INDEXALPHA_API_KEY);
}

export interface IndexAlphaBrokerRow {
  broker: string;
  buyVolume: number;
  sellVolume: number;
  buyValue: number;
  sellValue: number;
  buyFreq: number;
  sellFreq: number;
  netVolume: number;
  netValue: number;
}

export interface IndexAlphaForeignFlow {
  ticker: string;
  buyValue: number;
  sellValue: number;
  netValue: number;
}

function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value.replace(/[^0-9.\-]/g, "")) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function authorizedFetch(path: string, init?: RequestInit, timeoutMs = 9000): Promise<any | null> {
  const apiKey = process.env.INDEXALPHA_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch(`${INDEXALPHA_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "Mozilla/5.0",
        ...(init?.headers ?? {})
      },
      // Kuota gratis kecil — cache sehari penuh di level fetch Next.js
      next: { revalidate: 43200 },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) {
      console.error(`IndexAlpha ${path} failed: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`IndexAlpha ${path} error:`, error);
    return null;
  }
}

function toBrokerRow(item: any): IndexAlphaBrokerRow {
  const buyVolume = num(item.buy_volume ?? item.buyVolume);
  const sellVolume = num(item.sell_volume ?? item.sellVolume);
  const buyValue = num(item.buy_value ?? item.buyValue);
  const sellValue = num(item.sell_value ?? item.sellValue);
  return {
    broker: String(item.code ?? item.broker ?? "").toUpperCase(),
    buyVolume,
    sellVolume,
    buyValue,
    sellValue,
    buyFreq: num(item.buy_freq ?? item.buyFreq),
    sellFreq: num(item.sell_freq ?? item.sellFreq),
    netVolume: buyVolume - sellVolume,
    netValue: buyValue - sellValue
  };
}

function unwrapData(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

export function lastNDaysRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export async function getBrokerSummary(
  ticker: string,
  days = 5
): Promise<{ rows: IndexAlphaBrokerRow[]; from: string; to: string } | null> {
  const code = ticker.toUpperCase().replace(/\.JK$/, "");
  const { from, to } = lastNDaysRange(days);
  const payload = await authorizedFetch(
    `/stocks/broker-summary?ticker=${encodeURIComponent(code)}&from=${from}&to=${to}&investor=all`
  );
  const rows = unwrapData(payload).map(toBrokerRow).filter((row) => row.broker);
  if (!rows.length) return null;
  // Agregasi per broker bila API mengembalikan baris harian
  const byBroker = new Map<string, IndexAlphaBrokerRow>();
  for (const row of rows) {
    const existing = byBroker.get(row.broker);
    if (!existing) {
      byBroker.set(row.broker, { ...row });
    } else {
      existing.buyVolume += row.buyVolume;
      existing.sellVolume += row.sellVolume;
      existing.buyValue += row.buyValue;
      existing.sellValue += row.sellValue;
      existing.buyFreq += row.buyFreq;
      existing.sellFreq += row.sellFreq;
      existing.netVolume += row.netVolume;
      existing.netValue += row.netValue;
    }
  }
  return { rows: [...byBroker.values()], from, to };
}

export async function getForeignFlow(
  ticker: string,
  days = 5
): Promise<{ flow: IndexAlphaForeignFlow; from: string; to: string } | null> {
  const code = ticker.toUpperCase().replace(/\.JK$/, "");
  const { from, to } = lastNDaysRange(days);
  const payload = await authorizedFetch(
    `/foreign-flow?ticker=${encodeURIComponent(code)}&from=${from}&to=${to}`
  );
  const rows = unwrapData(payload);
  const item = rows.find((row) => String(row.ticker ?? row.code ?? "").toUpperCase() === code) ?? rows[0];
  if (!item) return null;
  const buyValue = num(item.buy ?? item.buy_value ?? item.buyValue ?? item.foreign_buy);
  const sellValue = num(item.sell ?? item.sell_value ?? item.sellValue ?? item.foreign_sell);
  const netValue = num(item.net ?? item.net_value ?? item.netValue ?? item.foreign_net ?? (buyValue - sellValue));
  return { flow: { ticker: code, buyValue, sellValue, netValue }, from, to };
}

export async function getUsage(): Promise<{ remaining: number | null; limit: number | null; raw: any } | null> {
  const payload = await authorizedFetch("/usage", undefined, 6000);
  if (!payload) return null;
  const data = payload?.data ?? payload;
  return {
    remaining: data?.remaining ?? data?.remaining_calls ?? data?.quota_remaining ?? null,
    limit: data?.limit ?? data?.monthly_limit ?? data?.quota ?? null,
    raw: payload
  };
}
