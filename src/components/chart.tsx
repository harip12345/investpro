import { priceSeries } from "@/lib/data";

export function MiniChart() {
  const width = 100;
  const height = 36;
  const max = Math.max(...priceSeries);
  const min = Math.min(...priceSeries);
  const points = priceSeries
    .map((value, index) => {
      const x = (index / (priceSeries.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full">
      <polyline
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
