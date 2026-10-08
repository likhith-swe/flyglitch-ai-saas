"use client";

import { useEffect, useMemo, useState } from "react";
import { RouteCard } from "./RouteCard";
import type { FlightRoute } from "@/lib/types";

type SortKey = "score" | "discount" | "price" | "seats";

export interface RadarFilters {
  origin: string;
  destination: string;
  nonstop: boolean;
  maxPrice: number;
}

export const FILTER_EVENT = "fg:filter-change";

function readFiltersFromUrl(): RadarFilters {
  if (typeof window === "undefined") {
    return { origin: "", destination: "", nonstop: false, maxPrice: 0 };
  }
  const sp = new URLSearchParams(window.location.search);
  return {
    origin: (sp.get("origin") ?? "").toUpperCase(),
    destination: (sp.get("destination") ?? "").toUpperCase(),
    nonstop: sp.get("nonstop") === "1",
    maxPrice: Number(sp.get("maxPrice")) || 0,
  };
}

/**
 * Filterable radar grid. Filters hydrate from the URL on mount and then
 * update via the `fg:filter-change` custom event fired by the hero search —
 * which keeps the full grid in the prerendered HTML for SEO.
 */
export function RouteGrid({ routes }: { routes: FlightRoute[] }) {
  const [glitchOnly, setGlitchOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [f, setF] = useState<RadarFilters>({ origin: "", destination: "", nonstop: false, maxPrice: 0 });

  useEffect(() => {
    setF(readFiltersFromUrl());
    const onFilter = (e: Event) => {
      const detail = (e as CustomEvent<RadarFilters>).detail;
      if (detail) setF(detail);
    };
    window.addEventListener(FILTER_EVENT, onFilter);
    return () => window.removeEventListener(FILTER_EVENT, onFilter);
  }, []);

  const origin = f.origin;
  const destination = f.destination;
  const nonstop = f.nonstop;
  const maxPrice = f.maxPrice;
  const hasBudget = Number.isFinite(maxPrice) && maxPrice > 0;

  const filtered = useMemo(() => {
    let out = [...routes];
    if (origin && origin !== "ANY") out = out.filter((r) => r.origin.code === origin);
    if (destination && destination !== "ANY") out = out.filter((r) => r.destination.code === destination);
    if (nonstop) out = out.filter((r) => r.stops === 0);
    if (hasBudget) out = out.filter((r) => r.currentPriceMinor / 100 <= maxPrice);
    if (glitchOnly) out = out.filter((r) => r.isGlitch);
    out.sort((a, b) => {
      switch (sort) {
        case "discount":
          return b.discountPercent - a.discountPercent;
        case "price": {
          const pa = a.currency === "INR" ? a.currentPriceMinor / 83 : a.currentPriceMinor;
          const pb = b.currency === "INR" ? b.currentPriceMinor / 83 : b.currentPriceMinor;
          return pa - pb;
        }
        case "seats":
          return a.seatsRemaining - b.seatsRemaining;
        default:
          return b.glitchScore - a.glitchScore;
      }
    });
    return out;
  }, [routes, origin, destination, nonstop, hasBudget, maxPrice, glitchOnly, sort]);

  const activeFilters = [
    origin && origin !== "ANY" ? `ORIGIN ${origin}` : null,
    destination && destination !== "ANY" ? `DEST ${destination}` : null,
    nonstop ? "NONSTOP" : null,
    hasBudget ? `≤ ₹${maxPrice.toLocaleString("en-IN")}` : null,
  ].filter(Boolean) as string[];

  return (
    <div id="radar" className="scroll-mt-24">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-emerald-300">
            {filtered.length} CONTACTS
          </span>
          {activeFilters.map((f) => (
            <span key={f} className="rounded border border-white/10 px-2 py-1 text-slate-400">
              {f}
            </span>
          ))}
          <label className="ml-1 flex cursor-pointer items-center gap-1.5 rounded border border-white/10 px-2 py-1 text-slate-300">
            <input
              type="checkbox"
              checked={glitchOnly}
              onChange={(e) => setGlitchOnly(e.target.checked)}
              className="accent-emerald-500"
            />
            ⚡ GLITCHES ONLY
          </label>
        </div>
        <label className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          SORT
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded border border-white/10 bg-[#0b0f16] px-2 py-1 text-slate-200 outline-none focus:border-emerald-400/50"
          >
            <option value="score">GLITCH SCORE</option>
            <option value="discount">DISCOUNT %</option>
            <option value="price">PRICE</option>
            <option value="seats">SEATS LEFT</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-[#0b0f16] p-12 text-center">
          <div className="font-mono text-sm text-slate-400">NO CONTACTS MATCH THIS SWEEP</div>
          <p className="mt-2 text-xs text-slate-500">
            Clear filters above, or set a watchlist and let the radar ping you when a fare cracks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <RouteCard key={r.id} route={r} />
          ))}
        </div>
      )}
    </div>
  );
}
