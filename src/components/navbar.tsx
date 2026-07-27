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
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sky-600 text-white"
          : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
      )}
    >
      <Icon size={18} />
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
    <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <Activity size={24} className="text-sky-400" />
          <span>InvestPro</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {items.map((item) => <NavItem key={item.href} {...item} active={pathname === item.href} />)}
          <div className="ml-2 flex items-center gap-2 border-l border-zinc-800 pl-3">
            <NotificationCenter />
            <button type="button" onClick={toggleTheme} title={isLight ? "Gunakan tampilan gelap" : "Gunakan tampilan cerah"} aria-label={isLight ? "Gunakan tampilan gelap" : "Gunakan tampilan cerah"} className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-sky-300">
              {isLight ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="text-right">
              <div className="max-w-32 truncate text-xs font-medium text-white">{session.name}</div>
              <div className="text-[11px] text-zinc-500">{session.role === "guest" ? "Mode tamu" : "Akun lokal"}</div>
            </div>
            <button type="button" onClick={signOut} title="Keluar" aria-label="Keluar" className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-red-300">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} className="rounded-md p-2 text-zinc-300 hover:bg-zinc-800 md:hidden">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="mt-3 grid gap-1 border-t border-zinc-800 pt-3 md:hidden">
          {items.map((item) => <NavItem key={item.href} {...item} active={pathname === item.href} onClick={() => setOpen(false)} />)}
          <div className="mt-2 flex items-center justify-between border-t border-zinc-800 px-3 pt-3">
            <div>
              <div className="text-sm font-medium text-white">{session.name}</div>
              <div className="text-xs text-zinc-500">{session.role === "guest" ? "Mode tamu" : session.email}</div>
            </div>
            <div className="flex items-center gap-1">
              <NotificationCenter />
              <button type="button" onClick={toggleTheme} title={isLight ? "Gunakan tampilan gelap" : "Gunakan tampilan cerah"} aria-label={isLight ? "Gunakan tampilan gelap" : "Gunakan tampilan cerah"} className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-sky-300">
                {isLight ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button type="button" onClick={signOut} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 hover:bg-zinc-800">
                <LogOut size={17} /> Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
