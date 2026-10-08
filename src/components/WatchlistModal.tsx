"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "./Modal";
import { AIRPORTS, type NotifyChannel } from "@/lib/types";
import type { FlightRoute } from "@/lib/types";

interface Props {
  route: FlightRoute | null;
  onClose: () => void;
}

/** Watchlist creation — price tripwire and/or discount tripwire per corridor. */
export function WatchlistModal({ route, onClose }: Props) {
  const [origin, setOrigin] = useState(route?.origin.code ?? "BLR");
  const [destination, setDestination] = useState(route?.destination.code ?? "ANY");
  const [maxPrice, setMaxPrice] = useState(
    route ? String(Math.ceil(route.currentPriceMinor / 100 / 100) * 100) : ""
  );
  const [minDiscount, setMinDiscount] = useState(route ? String(Math.max(40, Math.floor(route.discountPercent - 5))) : "55");
  const [channel, setChannel] = useState<NotifyChannel>("email");
  const [address, setAddress] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "auth" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    setMsg(null);
    try {
      const res = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          originCode: origin,
          destinationCode: destination === "ANY" ? null : destination,
          maxPrice: maxPrice ? Number(maxPrice) : null,
          minDiscountPercent: minDiscount ? Number(minDiscount) : null,
          notifyChannel: channel,
          destinationAddress: address || null,
        }),
      });
      if (res.status === 401) {
        setState("auth");
        return;
      }
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setState("error");
        setMsg(data.error ?? "failed");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setMsg("network error");
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Set a glitch tripwire"
      subtitle="The cron sweep re-checks every 5 minutes and pings the second your conditions hit."
    >
      {state === "done" ? (
        <div className="py-6 text-center">
          <div className="text-4xl">⚡</div>
          <h3 className="mt-3 font-mono text-sm font-bold text-emerald-300">TRIPWIRE ARMED</h3>
          <p className="mt-2 text-xs text-slate-400">
            Watching {origin} → {destination === "ANY" ? "anywhere" : destination}. Alerts fire on
            the first matching sweep.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link
              href="/watchlists"
              className="rounded-lg border border-white/10 px-4 py-2 font-mono text-xs text-slate-300 hover:border-emerald-400/40"
            >
              MANAGE WATCHLISTS
            </Link>
            <button
              onClick={onClose}
              className="rounded-lg bg-emerald-500 px-4 py-2 font-mono text-xs font-bold text-[#04120c] hover:bg-emerald-400"
            >
              DONE
            </button>
          </div>
        </div>
      ) : state === "auth" ? (
        <div className="py-6 text-center">
          <div className="text-4xl">🔒</div>
          <h3 className="mt-3 font-mono text-sm font-bold text-amber-300">SIGN-IN REQUIRED</h3>
          <p className="mt-2 text-xs text-slate-400">
            Watchlists are tied to your account. Magic-link sign-in takes 10 seconds.
          </p>
          <Link
            href="/login?next=/watchlists"
            className="mt-5 inline-block rounded-lg bg-emerald-500 px-6 py-2.5 font-mono text-xs font-bold text-[#04120c] hover:bg-emerald-400"
          >
            SIGN IN →
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-slate-500">ORIGIN</span>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#07090e] px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-emerald-400/60"
              >
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-slate-500">DESTINATION</span>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#07090e] px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-emerald-400/60"
              >
                <option value="ANY">ANY</option>
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-slate-500">
                MAX PRICE (₹)
              </span>
              <input
                type="number"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="price tripwire"
                className="w-full rounded-lg border border-white/10 bg-[#07090e] px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-emerald-400/60"
              />
            </label>
            <label>
              <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-slate-500">
                MIN DISCOUNT (%)
              </span>
              <input
                type="number"
                min={20}
                max={95}
                value={minDiscount}
                onChange={(e) => setMinDiscount(e.target.value)}
                placeholder="discount tripwire"
                className="w-full rounded-lg border border-white/10 bg-[#07090e] px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-emerald-400/60"
              />
            </label>
          </div>

          <div>
            <span className="mb-1.5 block font-mono text-[10px] tracking-[0.2em] text-slate-500">
              ALERT CHANNEL
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "email", label: "EMAIL", note: "30-min batch on free" },
                  { id: "telegram", label: "TELEGRAM", note: "0s · Club Pro" },
                  { id: "whatsapp", label: "WHATSAPP", note: "0s · Club Pro" },
                ] as Array<{ id: NotifyChannel; label: string; note: string }>
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={`rounded-lg border px-2 py-2 text-left font-mono text-[10px] transition ${
                    channel === c.id
                      ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 text-slate-400 hover:border-white/25"
                  }`}
                >
                  <div className="font-bold">{c.label}</div>
                  <div className="mt-0.5 text-[9px] text-slate-500">{c.note}</div>
                </button>
              ))}
            </div>
          </div>

          <label>
            <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-slate-500">
              TRIP NOTE (OPTIONAL)
            </span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Diwali trip, flexible ±3 days"
              className="w-full rounded-lg border border-white/10 bg-[#07090e] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-400/60"
            />
          </label>

          {state === "error" ? (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-300">
              FAILED: {msg ?? "unknown"} — set a max price or min discount and retry.
            </div>
          ) : null}

          <button
            type="submit"
            disabled={state === "busy"}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-mono text-sm font-bold text-[#04120c] transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {state === "busy" ? "ARMING…" : "ARM TRIPWIRE ⚡"}
          </button>
        </form>
      )}
    </Modal>
  );
}
