"use client";

import { useEffect, useMemo, useState } from "react";

interface ChartPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number | null;
  rsi14?: number | null;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bbUpper?: number | null;
  bbMiddle?: number | null;
  bbLower?: number | null;
  pattern?: string | null;
  patternDesc?: string;
}

interface ChartData {
  source: string;
  symbol: string;
  range: string;
  current: { price: number; change: number };
  history: ChartPoint[];
  meta: {
    currentPrice: number;
    highest: number;
    lowest: number;
    volume: number;
    latestPattern: string | null;
    latestPatternDesc: string;
  };
}

export function TechnicalChart({ symbol = "BBCA.JK" }: { symbol?: string }) {
  const [data, setData] = useState<ChartData | null>(null);
  const [range, setRange] = useState("6mo");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchChart() {
      try {
        const res = await fetch(`/api/chart?symbol=${symbol}&range=${range}`);
        if (!res.ok) throw new Error("Chart request failed");
        const json = await res.json();
        if (!Array.isArray(json.history)) throw new Error("Invalid chart response");
        setData(json);
      } catch {
        setData(null);
      }
    }
    fetchChart();
  }, [symbol, range]);

  const { min, max, points, smaPoints, bbUpperPoints, bbLowerPoints, width, lastClose, lastChange } = useMemo(() => {
    if (!data || data.history.length === 0) return { min: 0, max: 100, width: 100, points: "", smaPoints: "", bbUpperPoints: "", bbLowerPoints: "", lastClose: 0, lastChange: 0 };

    const prices = data.history.map((d) => d.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const rangeVal = max - min || 1;
    const chartWidth = 100;
    const chartHeight = 100;

    const pts = data.history.map((d, i) => {
      const x = data.history.length > 1 ? (i / (data.history.length - 1)) * chartWidth : chartWidth / 2;
      const y = chartHeight - ((d.close - min) / rangeVal) * chartHeight;
      return `${x},${y}`;
    }).join(" ");

    const sma = data.history.map((d, i) => ({ value: d.sma20, index: i })).filter((item): item is { value: number; index: number } => item.value !== null && item.value !== undefined);
    const smaPts = sma.map(({ value: val, index: i }) => {
      const x = data.history.length > 1 ? (i / (data.history.length - 1)) * chartWidth : chartWidth / 2;
      const y = chartHeight - ((val - min) / rangeVal) * chartHeight;
      return `${x},${y}`;
    }).join(" ");

    const upper = data.history.map((d, i) => ({ value: d.bbUpper, index: i })).filter((item): item is { value: number; index: number } => item.value !== null && item.value !== undefined);
    const upperPts = upper.map(({ value: val, index: i }) => {
      const x = data.history.length > 1 ? (i / (data.history.length - 1)) * chartWidth : chartWidth / 2;
      const y = chartHeight - ((val - min) / rangeVal) * chartHeight;
      return `${x},${y}`;
    }).join(" ");

    const lower = data.history.map((d, i) => ({ value: d.bbLower, index: i })).filter((item): item is { value: number; index: number } => item.value !== null && item.value !== undefined);
    const lowerPts = lower.map(({ value: val, index: i }) => {
      const x = data.history.length > 1 ? (i / (data.history.length - 1)) * chartWidth : chartWidth / 2;
      const y = chartHeight - ((val - min) / rangeVal) * chartHeight;
      return `${x},${y}`;
    }).join(" ");

    const last = data.history[data.history.length - 1];
    const prev = data.history[data.history.length - 2];
    const lastChange = prev ? Number((((last.close - prev.close) / prev.close) * 100).toFixed(2)) : 0;

    return { min, max, width: chartWidth, points: pts, smaPoints: smaPts, bbUpperPoints: upperPts, bbLowerPoints: lowerPts, lastClose: last.close, lastChange };
  }, [data]);

  const positive = lastChange >= 0;
  const hoveredData = hoveredIndex !== null ? data?.history[hoveredIndex] : null;

  const rangeOptions = ["1mo", "3mo", "6mo", "1y", "2y", "5y"];

  if (!data) return <div className="flex h-full items-center justify-center text-zinc-400">Loading chart...</div>;

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-semibold">{lastClose.toFixed(0)}</div>
            <div className={`${positive ? "text-green-400" : "text-red-400"} text-sm`}>{positive ? "+" : ""}{lastChange}%</div>
          </div>
          {hoveredData && (
            <div className="rounded bg-zinc-800 px-3 py-2 text-xs text-zinc-300">
              <div>Harga: {hoveredData.close.toFixed(0)}</div>
              <div className="text-zinc-500">Open: {hoveredData.open} | High: {hoveredData.high} | Low: {hoveredData.low}</div>
              {hoveredData.pattern && <div className="text-sky-400">Pola: {hoveredData.pattern}</div>}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {rangeOptions.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${range === r ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
            >
              {r.replace(/[0-9]/g, "") === "m" ? `${r.replace("mo", "M")}` : r.replace("y", "Y")}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-80 w-full rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
        <svg viewBox={`0 0 ${width} 100`} className="h-full w-full overflow-visible">
          {/* Volume bars */}
          {data.history.length > 0 && (() => {
            const maxVol = Math.max(...data.history.map((d) => d.volume));
            return data.history.map((d, i) => {
              const x = data.history.length > 1 ? (i / (data.history.length - 1)) * width : width / 2;
              const barWidth = (width / data.history.length) * 0.6;
              const heightPct = maxVol > 0 ? (d.volume / maxVol) * 15 : 0;
              const positiveVol = d.close > d.open;
              return (
                <rect
                  key={i}
                  x={x + (width / data.history.length) * 0.2}
                  y={100 - heightPct}
                  width={barWidth}
                  height={heightPct}
                  fill={positiveVol ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            });
          })()}

          {/* Bollinger Bands */}
          {bbUpperPoints && bbLowerPoints && (
            <>
              <polyline points={bbUpperPoints} fill="none" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.5" strokeDasharray="2,2" />
              <polyline points={bbLowerPoints} fill="none" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.5" strokeDasharray="2,2" />
            </>
          )}

          {/* SMA 20 */}
          {smaPoints && (
            <polyline points={smaPoints} fill="none" stroke="rgba(56, 189, 248, 0.8)" strokeWidth="0.8" />
          )}

          {/* Price line */}
          <polyline points={points} fill="none" stroke={positive ? "#22c55e" : "#ef4444"} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />

          {/* Current price line */}
          <line x1="0" y1={100 - ((lastClose - min) / (max - min || 1)) * 100} x2={width} y2={100 - ((lastClose - min) / (max - min || 1)) * 100} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" strokeDasharray="2,2" />

          {hoveredIndex !== null && hoveredData && (
            <line
              x1={data.history.length > 1 ? (hoveredIndex / (data.history.length - 1)) * width : width / 2}
              y1="0"
              x2={data.history.length > 1 ? (hoveredIndex / (data.history.length - 1)) * width : width / 2}
              y2="100"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="0.5"
            />
          )}
        </svg>
      </div>

      {hoveredData && hoveredData.pattern && (
        <div className="rounded bg-sky-500/10 px-3 py-2 text-sm text-sky-300">
          <strong>Pola Terdeteksi:</strong> {hoveredData.pattern} - {hoveredData.patternDesc}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 rounded-md border border-zinc-700 bg-zinc-800/40 p-4">
        <IndicatorBox label="RSI (14)" value={hoveredData?.rsi14?.toFixed?.(2) ?? data.history[data.history.length - 1]?.rsi14?.toFixed?.(2) ?? "-"} description="Oscillator momentum (overbought/oversold)" />
        <IndicatorBox label="MACD" value={hoveredData?.macd?.toFixed?.(2) ?? data.history[data.history.length - 1]?.macd?.toFixed?.(2) ?? "-"} description="Trend momentum indicator" />
        <IndicatorBox label="Volume" value={((hoveredData?.volume ?? data.meta.volume) || 0).toLocaleString()} description="Volume perdagangan hari ini" />
      </div>
    </div>
  );
}

function IndicatorBox({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="flex flex-col">
      <div className="small-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500">{description}</div>
    </div>
  );
}
