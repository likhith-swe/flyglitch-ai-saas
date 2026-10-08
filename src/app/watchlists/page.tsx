"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AIRPORTS, type NotifyChannel, type Watchlist } from "@/lib/types";
import { formatMoney, timeAgo } from "@/lib/format";

/** Tripwire console: list, arm and disarm watchlists. */
export default function WatchlistsPage() {
  const [authed, setAuthed] = useState<boolean | "loading">("loading");
  const [items, setItems] = useState<Watchlist[]>([]);
  const [origin, setOrigin] = useState("BLR");
  const [destination, setDestination] = useState("ANY");
  const [maxPrice, setMaxPrice] = useState("");
  const [minDiscount, setMinDiscount] = useState("55");
  const [channel, setChannel] = useState<NotifyChannel>("email");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/watchlists")
      .then((r) => {
        if (r.status === 401) {
          setAuthed(false);
          return { watchlists: [] as Watchlist[] };
        }
        setAuthed(true);
        return r.json();
      })
      .then((d: { watchlists?: Watchlist[] }) => setItems(d.watchlists ?? []))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { authenticated: boolean }) => {
        if (d.authenticated) load();
        else setAuthed(false);
      })
      .catch(() => setAuthed(false));
  }, [load]);

  const arm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
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
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setMsg(`FAILED: ${data.error}`);
      } else {
        setMsg(null);
        load();
      }
    } catch {
      setMsg("NETWORK ERROR");
    } finally {
      setBusy(false);
    }
  };

  const disarm = async (id: string) => {
    await fetch(`/api/watchlists/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((w) => w.id !== id));
  };

  if (authed === "loading") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4">
        <span className="animate-pulse font-mono text-xs tracking-[0.3em] text-slate-500">LOADING…</span>
      </main>
    );
  }

  if (authed === false) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-4 text-xl font-extrabold text-slate-100">Tripwires need an account</h1>
        <p className="mt-2 text-xs text-slate-400">
          Magic-link sign-in takes 10 seconds. Your alerts persist across devices.
        </p>
        <Link
          href="/login?next=/watchlists"
          className="mt-6 rounded-lg bg-emerald-500 px-8 py-3 font-mono text-xs font-bold text-[#04120c] hover:bg-emerald-400"
        >
          SIGN IN →
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="font-mono text-[10px] tracking-[0.3em] text-emerald-400">TRIPWIRE CONSOLE</div>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-100">Watchlists</h1>
      <p className="mt-1 text-xs text-slate-500">
        The cron sweep re-checks all 30 corridors every 5 minutes and fires the moment conditions hit.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-[#0b0f16] p-10 text-center font-mono text-xs text-slate-500">
              NO TRIPWIRES ARMED — use the console on the right.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0b0f16] px-5 py-4"
                >
                  <div className="font-mono text-sm">
                    <span className="font-extrabold text-slate-100">
                      {w.originCode} → {w.destinationCode ?? "ANYWHERE"}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-400">
                      {w.maxPriceMinor !== null ? (
                        <span className="rounded border border-emerald-400/30 px-1.5 py-0.5 text-emerald-300">
                          ≤ {formatMoney(w.maxPriceMinor, "INR")}
                        </span>
                      ) : null}
                      {w.minDiscountPercent !== null ? (
                        <span className="rounded border border-amber-400/30 px-1.5 py-0.5 text-amber-300">
                          ≥ {Math.round(w.minDiscountPercent)}% OFF
                        </span>
                      ) : null}
                      <span className="rounded border border-white/10 px-1.5 py-0.5">
                        {w.notifyChannel.toUpperCase()}
                      </span>
                      <span className="text-slate-600">armed {timeAgo(w.createdAt)}</span>
                      {w.lastNotifiedAt ? (
                        <span className="text-emerald-400">pinged {timeAgo(w.lastNotifiedAt)}</span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    onClick={() => disarm(w.id)}
                    className="rounded-lg border border-rose-400/30 px-3 py-1.5 font-mono text-[10px] text-rose-300 transition hover:bg-rose-500/10"
                  >
                    DISARM ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-xl border border-white/8 bg-[#0b0f16] p-5">
          <h2 className="font-mono text-xs font-bold tracking-[0.2em] text-slate-300">ARM NEW TRIPWIRE</h2>
          <form onSubmit={arm} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1 block font-mono text-[9px] tracking-[0.2em] text-slate-500">ORIGIN</span>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#07090e] px-2.5 py-2 font-mono text-xs text-slate-200 outline-none focus:border-emerald-400/60"
                >
                  {AIRPORTS.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block font-mono text-[9px] tracking-[0.2em] text-slate-500">DEST</span>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#07090e] px-2.5 py-2 font-mono text-xs text-slate-200 outline-none focus:border-emerald-400/60"
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
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1 block font-mono text-[9px] tracking-[0.2em] text-slate-500">
                  MAX ₹
                </span>
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="10000"
                  className="w-full rounded-lg border border-white/10 bg-[#07090e] px-2.5 py-2 font-mono text-xs text-slate-200 outline-none focus:border-emerald-400/60"
                />
              </label>
              <label>
                <span className="mb-1 block font-mono text-[9px] tracking-[0.2em] text-slate-500">
                  MIN %OFF
                </span>
                <input
                  type="number"
                  min={20}
                  max={95}
                  value={minDiscount}
                  onChange={(e) => setMinDiscount(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#07090e] px-2.5 py-2 font-mono text-xs text-slate-200 outline-none focus:border-emerald-400/60"
                />
              </label>
            </div>
            <div>
              <span className="mb-1 block font-mono text-[9px] tracking-[0.2em] text-slate-500">CHANNEL</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["email", "telegram", "whatsapp"] as NotifyChannel[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChannel(c)}
                    className={`rounded-lg border px-2 py-2 font-mono text-[9px] font-bold transition ${
                      channel === c
                        ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 text-slate-400 hover:border-white/25"
                    }`}
                  >
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {msg ? (
              <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 font-mono text-[10px] text-rose-300">
                {msg}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-mono text-xs font-bold text-[#04120c] transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy ? "ARMING…" : "ARM TRIPWIRE ⚡"}
            </button>
            <p className="font-mono text-[9px] leading-relaxed text-slate-600">
              Telegram &amp; WhatsApp deliver in 0s on Club Pro. Email batches every 30 minutes on
              the free tier.
            </p>
          </form>
        </aside>
      </div>
    </main>
  );
}
