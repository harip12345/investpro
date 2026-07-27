import { NextResponse } from "next/server";
import { GET as getFundamental } from "@/app/api/fundamentals/route";
import { STOCK_UNIVERSE } from "@/lib/indices";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = [];
  const batchSize = 8;

  for (let index = 0; index < STOCK_UNIVERSE.length; index += batchSize) {
    const batch = STOCK_UNIVERSE.slice(index, index + batchSize);
    const results = await Promise.all(batch.map(async (stock) => {
      const response = await getFundamental(new Request(`http://internal/api/fundamentals?ticker=${stock.ticker}`));
      return response.json();
    }));
    items.push(...results);
  }

  return NextResponse.json(
    { source: "yahoo-fundamentals-timeseries", count: items.length, items },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
