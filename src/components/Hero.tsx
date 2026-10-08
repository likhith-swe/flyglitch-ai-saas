"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AIRPORTS } from "@/lib/types";
import { formatMoneyCompact } from "@/lib/format";
import type { FlightRoute } from "@/lib/types";

interface HeroProps {
  routes: FlightRoute[];
}

/** Hero search console: origin, destination, max budget, non-stop toggle. */
export function Hero({ routes }: HeroProps) {
  const router = useRouter();
  const [origin, setOrigin] = useState("ANY");
  const [destination, setDestination] = useState("ANY");
  const [maxPrice, setMaxPrice] = useState("");
  const [nonstop, setNonstop] = useState(false);

  const confirmed = routes.filter((r) => r.isGlitch).length;
  const avgDiscount =
    routes.length > 0
      ? Math.round(routes.reduce((acc, r) => acc + r.discountPercent, 0) / routes.length)
      : 0;
  const cheapest = routes.reduce<FlightRoute | null>(
    (best, r) =>
      r.currency === "INR" && (!best || r.currentPriceMinor < best.currentPriceMinor) ? r : best,
    null
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (origin !== "ANY") params.set("origin", origin);
    if (destination !== "ANY") params.set("destination", destination);
    if (maxPrice && Number(maxPrice) > 0) params.set("maxPrice", maxPrice);
    if (nonstop) params.set("nonstop", "1");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    window.dispatchEvent(
      new CustomEvent("fg:filter-change", {
        detail: {
          origin: origin === "ANY" ? "" : origin,
          destination: destination === "ANY" ? "" : destination,
          nonstop,
          maxPrice: maxPrice && Number(maxPrice) > 0 ? Number(maxPrice) : 0,
        },
      })
    );
    setTimeout(() => {
      document.getElementById("radar")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 text-center sm:pt-20">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 font-mono text-[11px] tracking-[0.22em] text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          LIVE · SABRE / AMADEUS CACHE SWEEP EVERY 5 MIN
        </div>
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-100 sm:text-6xl">
          Catch airline pricing{" "}
          <span className="text-emerald-400">glitches</span> before the algorithm patches them
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
          FlyGlitch AI scans fare buckets for currency-conversion errors, fuel-surcharge dumps and
          OTA cache lag — then scores every anomaly 0–100 and pings your WhatsApp or Telegram in
          zero seconds.
        </p>

        <form
          onSubmit={submit}
          className="mx-auto mt-9 flex max-w-4xl flex-col gap-2 rounded-xl border border-white/10 bg-[#0b0f16]/90 p-3 text-left shadow-[0_0_60px_rgba(16,185,129,0.07)] backdrop-blur md:flex-row md:items-end"
        >
          <label className="flex-1">
            <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-slate-500">ORIGIN</span>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#07090e] px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-emerald-400/60"
            >
              <option value="ANY">ANY HUB</option>
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.city}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-slate-500">DESTINATION</span>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#07090e] px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-emerald-400/60"
            >
              <option value="ANY">ANYWHERE</option>
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.city}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-slate-500">MAX BUDGET (₹)</span>
            <input
              type="number"
              min={500}
              step={500}
              placeholder="e.g. 10000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#07090e] px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-emerald-400/60"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#07090e] px-3 py-2.5">
            <input
              type="checkbox"
              checked={nonstop}
              onChange={(e) => setNonstop(e.target.checked)}
              className="accent-emerald-500"
            />
            <span className="font-mono text-xs text-slate-300">NON-STOP</span>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-6 py-2.5 font-mono text-sm font-bold text-[#04120c] transition hover:bg-emerald-400"
          >
            SCAN RADAR ⚡
          </button>
        </form>

        <dl className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "ROUTES TRACKED", v: String(routes.length) },
            { k: "CONFIRMED GLITCHES", v: String(confirmed) },
            { k: "AVG DISCOUNT", v: `${avgDiscount}%` },
            {
              k: "CHEAPEST LIVE FARE",
              v: cheapest ? formatMoneyCompact(cheapest.currentPriceMinor, "INR") : "—",
            },
          ].map((s) => (
            <div key={s.k} className="rounded-lg border border-white/8 bg-[#0b0f16] px-3 py-3">
              <dt className="font-mono text-[9px] tracking-[0.2em] text-slate-500">{s.k}</dt>
              <dd className="mt-1 font-mono text-xl font-bold text-emerald-300">{s.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
