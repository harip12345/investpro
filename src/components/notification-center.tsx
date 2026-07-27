"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import {
  AppNotification,
  AlertRule,
  getAlertRules,
  getNotifications,
  saveAlertRules,
  saveNotifications,
  WATCHLIST_EVENT
} from "@/lib/watchlist";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const evaluating = useRef(false);

  useEffect(() => {
    const refresh = () => {
      setRules(getAlertRules());
      setNotifications(getNotifications());
    };
    refresh();
    window.addEventListener(WATCHLIST_EVENT, refresh);
    return () => window.removeEventListener(WATCHLIST_EVENT, refresh);
  }, []);

  useEffect(() => {
    async function evaluate() {
      const activeRules = getAlertRules().filter((rule) => rule.enabled);
      if (!activeRules.length || evaluating.current) return;
      evaluating.current = true;
      try {
        const response = await fetch("/api/alerts/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules: activeRules })
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!data.triggers?.length) return;
        const now = data.evaluatedAt ?? new Date().toISOString();
        const existing = getNotifications();
        const additions: AppNotification[] = data.triggers
          .filter((trigger: any) => !existing.some((item) => item.ruleId === trigger.ruleId && item.message === trigger.message))
          .map((trigger: any) => ({
            id: `${trigger.ruleId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ruleId: trigger.ruleId,
            ticker: trigger.ticker,
            title: trigger.title,
            message: trigger.message,
            createdAt: now,
            read: false
          }));
        if (additions.length) saveNotifications([...additions, ...existing]);
        const triggeredIds = new Set(data.triggers.map((trigger: any) => trigger.ruleId));
        saveAlertRules(getAlertRules().map((rule) => triggeredIds.has(rule.id) ? { ...rule, lastTriggeredAt: now } : rule));
      } catch {
        // Alert evaluation is best-effort and should never interrupt navigation.
      } finally {
        evaluating.current = false;
      }
    }
    evaluate();
    const timer = window.setInterval(evaluate, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [rules.length]);

  const unread = notifications.filter((item) => !item.read).length;
  const markAllRead = () => {
    const next = notifications.map((item) => ({ ...item, read: true }));
    saveNotifications(next);
    setNotifications(next);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Buka notifikasi"
        aria-expanded={open}
        title="Notifikasi"
        className="relative rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-sky-300"
      >
        <Bell size={18} />
        {unread > 0 && <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] font-bold leading-4 text-white">{Math.min(unread, 99)}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Notifikasi</div>
              <div className="text-[11px] text-zinc-500">{rules.filter((rule) => rule.enabled).length} peringatan aktif</div>
            </div>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} title="Tandai semua dibaca" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-green-300">
                <CheckCheck size={17} />
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 12).map((item) => (
              <Link key={item.id} href={`/analisis?ticker=${item.ticker}`} onClick={() => setOpen(false)} className={`block border-b border-zinc-800 px-4 py-3 transition hover:bg-zinc-900 ${item.read ? "" : "bg-sky-500/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-semibold text-zinc-100">{item.title}</div>
                  {!item.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-400" />}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{item.message}</p>
                <div className="mt-1 text-[10px] text-zinc-600">{new Date(item.createdAt).toLocaleString("id-ID")}</div>
              </Link>
            ))}
            {notifications.length === 0 && <div className="px-4 py-8 text-center text-xs text-zinc-500">Belum ada peringatan yang terpicu.</div>}
          </div>
          <Link href="/portfolio" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 border-t border-zinc-800 px-4 py-3 text-xs font-medium text-sky-300 hover:bg-zinc-900">
            Kelola watchlist dan peringatan <ExternalLink size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
