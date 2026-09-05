// Client untuk IDX Edge PRO (stock.arjum.com) — REST API saham IDX gratis, tanpa API key.
// Endpoint (sesuai dokumentasi resmi):
//   GET /api/health, /api/search?q=, /api/screener/latest,
//   GET /api/analysis/{CODE}, /api/broker-summary/{CODE},
//   GET /api/broker-accumulation/{CODE}, /api/history/{CODE}, /api/seasonal/{CODE}
// Semua fungsi mengembalikan null bila sumber tidak dapat dihubungi —
// caller WAJIB punya fallback (Yahoo) agar aplikasi tetap jalan.

const ARJUM_BASE = process.env.ARJUM_BASE_URL ?? "https://stock.arjum.com";

export interface ArjumOhlcv {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ArjumBrokerRow {
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

function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value.replace(/[^0-9.\-]/g, "")) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

async function getJson(path: string, timeoutMs = 8000): Promise<any | null> {
  try {
    const response = await fetch(`${ARJUM_BASE}${path}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json", Referer: "https://stock.arjum.com/" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function unwrapList(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const key of ["data", "result", "items", "rows", "history", "prices"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function pick(obj: any, keys: string[]): any {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  }
  return undefined;
}

export async function arjumHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const started = Date.now();
  const payload = await getJson("/api/health", 6000);
  return { ok: payload !== null, latencyMs: Date.now() - started };
}

export async function getArjumHistory(ticker: string): Promise<ArjumOhlcv[] | null> {
  const code = ticker.toUpperCase().replace(/\.JK$/, "");
  const payload = await getJson(`/api/history/${encodeURIComponent(code)}`, 9000);
  const rows = unwrapList(payload);
  if (!rows.length) return null;
  const points: ArjumOhlcv[] = [];
  for (const row of rows) {
    const date = str(pick(row, ["date", "tanggal", "time", "datetime", "t"]));
    const close = num(pick(row, ["close", "penutupan", "c", "price", "harga"]));
    if (!close) continue;
    const timestamp = Number(pick(row, ["timestamp", "ts", "time"])) || (date ? Math.floor(new Date(date).getTime() / 1000) : 0);
    points.push({
      date,
      timestamp,
      open: num(pick(row, ["open", "pembuka", "o"])) || close,
      high: num(pick(row, ["high", "tertinggi", "h"])) || close,
      low: num(pick(row, ["low", "terendah", "l"])) || close,
      close,
      volume: num(pick(row, ["volume", "vol", "v"]))
    });
  }
  points.sort((a, b) => a.timestamp - b.timestamp);
  return points.length >= 20 ? points : null;
}

export async function getArjumBrokerSummary(ticker: string): Promise<{ rows: ArjumBrokerRow[]; asOf: string | null } | null> {
  const code = ticker.toUpperCase().replace(/\.JK$/, "");
  const payload = await getJson(`/api/broker-summary/${encodeURIComponent(code)}`, 9000);
  const rows = unwrapList(payload);
  if (!rows.length) return null;
  const parsed: ArjumBrokerRow[] = rows.map((row) => {
    const broker = str(pick(row, ["broker", "code", "kode", "broker_code", "brokerCode"])).toUpperCase();
    const buyVolume = num(pick(row, ["buy_volume", "buyVolume", "buy_vol", "beli_volume"]));
    const sellVolume = num(pick(row, ["sell_volume", "sellVolume", "sell_vol", "jual_volume"]));
    const buyValue = num(pick(row, ["buy_value", "buyValue", "buy_val", "beli_value"]));
    const sellValue = num(pick(row, ["sell_value", "sellValue", "sell_val", "jual_value"]));
    return {
      broker,
      buyVolume,
      sellVolume,
      buyValue,
      sellValue,
      buyFreq: num(pick(row, ["buy_freq", "buyFreq", "buy_frequency"])),
      sellFreq: num(pick(row, ["sell_freq", "sellFreq", "sell_frequency"])),
      netVolume: buyVolume - sellVolume,
      netValue: buyValue - sellValue
    };
  }).filter((row) => row.broker && (row.buyValue || row.sellValue || row.buyVolume || row.sellVolume));
  if (!parsed.length) return null;
  const rawAsOf = str(pick(payload, ["asOf", "as_of", "date", "tanggal"]));
  return { rows: parsed, asOf: rawAsOf || null };
}

export async function getArjumBrokerAccumulation(ticker: string): Promise<{ date: string; netValue: number }[] | null> {
  const code = ticker.toUpperCase().replace(/\.JK$/, "");
  const payload = await getJson(`/api/broker-accumulation/${encodeURIComponent(code)}`, 9000);
  const rows = unwrapList(payload);
  if (!rows.length) return null;
  const series = rows
    .map((row) => ({
      date: str(pick(row, ["date", "tanggal", "time"])),
      netValue: num(pick(row, ["net_value", "netValue", "netflow", "net_flow", "accumulation", "akumulasi"]))
    }))
    .filter((point) => point.date);
  return series.length >= 5 ? series : null;
}
