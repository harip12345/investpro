import { NextResponse } from "next/server";
import { arjumHealth } from "@/lib/arjum";
import { getUsage, isIndexAlphaConfigured } from "@/lib/indexalpha";

export const dynamic = "force-dynamic";

// GET /api/sources/health — status ketiga sumber data eksternal.
// Dipakai untuk diagnosis cepat bila Arjum/IndexAlpha/Yahoo bermasalah.
export async function GET() {
  const [arjum, indexAlphaUsage] = await Promise.all([
    arjumHealth(),
    isIndexAlphaConfigured() ? getUsage() : Promise.resolve(null)
  ]);

  let yahooOk = false;
  let yahooLatencyMs = 0;
  try {
    const started = Date.now();
    const response = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/BBCA.JK?interval=1d&range=5d", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000)
    });
    yahooOk = response.ok;
    yahooLatencyMs = Date.now() - started;
  } catch {
    yahooOk = false;
  }

  return NextResponse.json({
    asOf: new Date().toISOString(),
    sources: {
      yahoo: { ok: yahooOk, latencyMs: yahooLatencyMs, role: "Harga, fundamental TTM, proxy bandarologi" },
      arjum: { ok: arjum.ok, latencyMs: arjum.latencyMs, role: "OHLCV fallback, broker summary gratis" },
      indexAlpha: {
        configured: isIndexAlphaConfigured(),
        ok: indexAlphaUsage !== null,
        remaining: indexAlphaUsage?.remaining ?? null,
        limit: indexAlphaUsage?.limit ?? null,
        role: "Broker summary real + foreign flow (butuh INDEXALPHA_API_KEY)"
      }
    }
  }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
}
