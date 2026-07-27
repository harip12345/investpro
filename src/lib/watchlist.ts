export type AlertType =
  | "price_above"
  | "price_below"
  | "roe_above"
  | "pe_below"
  | "volume_spike"
  | "bandarology"
  | "news";

export interface WatchlistItem {
  ticker: string;
  addedAt: string;
}

export interface AlertRule {
  id: string;
  ticker: string;
  type: AlertType;
  target?: number;
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}

export interface AppNotification {
  id: string;
  ruleId: string;
  ticker: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const WATCHLIST_KEY = "investpro-watchlist";
const ALERTS_KEY = "investpro-alert-rules";
const NOTIFICATIONS_KEY = "investpro-notifications";
export const WATCHLIST_EVENT = "investpro-watchlist-updated";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT));
}

export function getWatchlist() {
  return read<WatchlistItem[]>(WATCHLIST_KEY, []);
}

export function saveWatchlist(items: WatchlistItem[]) {
  write(WATCHLIST_KEY, items);
}

export function getAlertRules() {
  return read<AlertRule[]>(ALERTS_KEY, []);
}

export function saveAlertRules(items: AlertRule[]) {
  write(ALERTS_KEY, items);
}

export function getNotifications() {
  return read<AppNotification[]>(NOTIFICATIONS_KEY, []);
}

export function saveNotifications(items: AppNotification[]) {
  write(NOTIFICATIONS_KEY, items.slice(0, 100));
}

export const alertLabels: Record<AlertType, string> = {
  price_above: "Harga naik di atas",
  price_below: "Harga turun di bawah",
  roe_above: "ROE di atas",
  pe_below: "P/E di bawah",
  volume_spike: "Volume abnormal",
  bandarology: "Sinyal Bandarologi",
  news: "Berita baru"
};

export function alertTargetSuffix(type: AlertType) {
  if (type === "price_above" || type === "price_below") return "Rp";
  if (type === "roe_above") return "%";
  if (type === "pe_below" || type === "volume_spike") return "x";
  return "";
}
