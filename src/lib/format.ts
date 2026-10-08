import type { Currency } from "./types";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Format minor units (paise/cents) as a display price, e.g. 849000 -> ₹8,490. */
export function formatMoney(minor: number, currency: Currency): string {
  const major = minor / 100;
  return currency === "INR" ? inr.format(major) : usd.format(major);
}

/** Compact variant for tickers / badges: ₹8.49k, $189. */
export function formatMoneyCompact(minor: number, currency: Currency): string {
  const major = minor / 100;
  if (currency === "INR") {
    if (major >= 100_000) return `₹${(major / 100_000).toFixed(1)}L`;
    if (major >= 1_000) return `₹${(major / 1_000).toFixed(major >= 10_000 ? 0 : 1)}k`;
    return `₹${Math.round(major)}`;
  }
  return `$${Math.round(major).toLocaleString("en-US")}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "00:00:00";
  const total = Math.floor(msLeft / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function timeAgo(iso: string | Date): string {
  const then = typeof iso === "string" ? new Date(iso) : iso;
  const secs = Math.max(1, Math.floor((Date.now() - then.getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatDayShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function percentOff(retailMinor: number, priceMinor: number): number {
  if (retailMinor <= 0) return 0;
  return Math.round(((retailMinor - priceMinor) / retailMinor) * 100);
}

export function initialsOf(email: string): string {
  const base = email.split("@")[0] || "u";
  return base.slice(0, 2).toUpperCase();
}
