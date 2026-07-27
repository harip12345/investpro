import { ReactNode } from "react";
import { clsx } from "clsx";

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {subtitle ? <p className="small-muted">{subtitle}</p> : null}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("panel min-w-0 max-w-full p-5", className)}>{children}</div>;
}

export function DataStatus({ status, label = "Data" }: { status: "real" | "static"; label?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-[11px] font-medium", status === "real" ? "text-emerald-400" : "text-amber-400")}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", status === "real" ? "bg-emerald-400" : "bg-amber-400")} />
      {label} {status === "real" ? "real" : "statis"}
    </span>
  );
}

export function MetricCard({ label, value, change, dataStatus = "static" }: { label: string; value: string; change: number; dataStatus?: "real" | "static" }) {
  const positive = change >= 0;
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div className="small-muted">{label}</div>
        <DataStatus status={dataStatus} />
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className={clsx("mt-2 text-sm font-medium", positive ? "text-green-400" : "text-red-400")}>
        {positive ? "+" : ""}
        {change}% hari ini
      </div>
    </Panel>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "positive" | "negative" | "neutral" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        tone === "positive" && "bg-green-500/15 text-green-300",
        tone === "negative" && "bg-red-500/15 text-red-300",
        tone === "neutral" && "bg-sky-500/15 text-sky-300"
      )}
    >
      {children}
    </span>
  );
}
