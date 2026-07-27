"use client";

import { useEffect, useMemo, useState } from "react";

interface ChartPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function LiveChart({ symbol = "BBCA.JK", range = "6mo" }: { symbol?: string; range?: string }) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChart() {
      try {
        const res = await fetch(`/api/chart?symbol=${symbol}&range=${range}`);
        if (!res.ok) throw new Error("Chart request failed");
        const json = await res.json();
        setData(json.history ?? []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchChart();
  }, [symbol, range]);

  const { min, max, width, points, lastClose, lastChange } = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 100, width: 100, points: "", lastClose: 0, lastChange: 0 };

    const prices = data.map((d) => d.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const rangeVal = max - min || 1;

    const chartWidth = 100;
    const chartHeight = 100;

    const pts = data.map((d, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2;
      const y = chartHeight - ((d.close - min) / rangeVal) * chartHeight;
      return `${x},${y}`;
    }).join(" ");

    const lastClose = data[data.length - 1]?.close ?? 0;
    const prevClose = data[data.length - 2]?.close ?? lastClose;
    const lastChange = prevClose ? Number((((lastClose - prevClose) / prevClose) * 100).toFixed(2)) : 0;

    return { min, max, width: chartWidth, points: pts, lastClose, lastChange };
  }, [data]);

  const positive = lastChange >= 0;

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-2 right-4 text-right">
        <div className="text-2xl font-semibold">{lastClose.toFixed(0)}</div>
        <div className={`${positive ? "text-green-400" : "text-red-400"} text-sm`}>{positive ? "+" : ""}{lastChange}%</div>
      </div>

      {loading && <div className="absolute inset-0 flex items-center justify-center text-zinc-400">Loading chart...</div>}

      {!loading && data.length > 0 && (
        <svg viewBox={`0 0 ${width} 100`} className="h-full w-full">
          <polyline
            fill="none"
            stroke={positive ? "#22c55e" : "#ef4444"}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
        </svg>
      )}
    </div>
  );
}
