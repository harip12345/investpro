"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, BarChart3, Table, FolderOpen, Newspaper, Activity, Bot, LogOut, Menu, X, Moon, Sun, WalletCards } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/components/auth-shell";
import { NotificationCenter } from "@/components/notification-center";

export function NavItem({ icon: Icon, label, href, active = false, onClick }: { icon: LucideIcon; label: string; href: string; active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors sm:rounded-md sm:min-h-0 sm:py-2",
        active
          ? "bg-sky-600 text-white"
          : "text-zinc-300 hover:bg-zinc-800/60 hover:text-white active:bg-zinc-800"
      )}
    >
      <Icon size={18} className="shrink-0" />
      {label}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const { session, signOut } = useAuth();
  useEffect(() => {
    setIsLight(document.documentElement.dataset.theme === "light");
  }, []);
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  function toggleTheme() {
    const next = isLight ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("investpro-theme", next);
    setIsLight(!isLight);
  }
  const items = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: BarChart3, label: "Analisis", href: "/analisis" },
    { icon: Table, label: "Screener", href: "/screener" },
    { icon: WalletCards, label: "Aset Lain", href: "/aset-lain" },
    { icon: FolderOpen, label: "Portfolio", href: "/portfolio" },
    { icon: Newspaper, label: "Berita", href: "/berita" },
    { icon: Bot, label: "AI Asisten", href: "/ai" }
  ];
  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-h-[44px] items-center gap-2 font-bold text-white sm:min-h-0">
            <Activity size={22} className="shrink-0 text-sky-400 sm:size-[24px]" />
            <span className="text-[15px] sm:text-base">InvestPro</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {items.map((item) => <NavItem key={item.href} {...item} active={pathname === item.href} />)}
            <div className="ml-2 flex items-center gap-2 border-l border-zinc-800 pl-3">
              <NotificationCenter />
              <button type="button" onClick={toggleTheme} title={isLight ? "Gunakan tampilan gelap" : "Gunakan tampilan cerah"} aria-label={isLight ? "Gunakan tampilan gelap" : "Gunakan tampilan cerah"} className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-sky-300">
                {isLight ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <div className="hidden text-right lg:block">
                <div className="max-w-32 truncate text-xs font-medium text-white">{session.name}</div>
                <div className="text-[11px] text-zinc-500">{session.role === "guest" ? "Mode tamu" : "Akun lokal"}</div>
              </div>
              <button type="button" onClick={signOut} title="Keluar" aria-label="Keluar" className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-red-300">
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:hidden">
            <NotificationCenter />
            <button type="button" onClick={toggleTheme} aria-label={isLight ? "Gunakan tampilan gelap" : "Gunakan tampilan cerah"} className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-sky-300">
              {isLight ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-200 hover:bg-zinc-800 active:bg-zinc-800">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>
      {open && (
        <div className="fixed inset-0 z-30 md:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />
          <div className="absolute inset-x-0 top-[60px] max-h-[calc(100dvh-60px)] overflow-y-auto border-b border-zinc-800 bg-zinc-950 px-4 pb-6 pt-3 shadow-2xl sm:px-6">
            <div className="grid gap-1.5">
              {items.map((item) => <NavItem key={item.href} {...item} active={pathname === item.href} onClick={() => setOpen(false)} />)}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{session.name}</div>
                <div className="truncate text-xs text-zinc-500">{session.role === "guest" ? "Mode tamu" : session.email}</div>
              </div>
              <button type="button" onClick={() => { setOpen(false); signOut(); }} className="flex shrink-0 items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/15 active:bg-red-500/20">
                <LogOut size={16} /> Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
