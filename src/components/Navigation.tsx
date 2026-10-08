"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useModals } from "./GlobalModals";
import { REGIONS } from "@/lib/types";

interface SessionInfo {
  authenticated: boolean;
  user: { email: string; isPro: boolean } | null;
}

export function Navigation() {
  const { openPricing } = useModals();
  const [session, setSession] = useState<SessionInfo>({ authenticated: false, user: null });
  const [routesOpen, setRoutesOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: SessionInfo) => alive && setSession(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07090e]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-lg text-[#04120c]">
            ⚡
          </span>
          <span className="font-mono text-sm font-extrabold tracking-[0.18em] text-slate-100">
            FLYGLITCH<span className="text-emerald-400"> AI</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 font-mono text-[11px] tracking-wider text-slate-400 md:flex">
          <Link href="/#radar" className="rounded px-3 py-2 transition hover:text-emerald-300">
            RADAR
          </Link>
          <div
            className="relative"
            onMouseEnter={() => setRoutesOpen(true)}
            onMouseLeave={() => setRoutesOpen(false)}
          >
            <button className="rounded px-3 py-2 transition hover:text-emerald-300">ROUTES ▾</button>
            {routesOpen ? (
              <div className="absolute left-0 top-full w-56 rounded-lg border border-white/10 bg-[#0b0f16] p-1.5 shadow-xl">
                {REGIONS.map((r) => (
                  <Link
                    key={r.id}
                    href={`/routes/${r.id}/60-percent-off`}
                    className="block rounded px-3 py-2 text-slate-300 transition hover:bg-emerald-500/10 hover:text-emerald-300"
                  >
                    {r.label}
                  </Link>
                ))}
                <Link
                  href="/routes/domestic-india/under-10000"
                  className="block rounded px-3 py-2 text-amber-300 transition hover:bg-amber-500/10"
                >
                  Under ₹10,000
                </Link>
              </div>
            ) : null}
          </div>
          <button
            onClick={openPricing}
            className="rounded px-3 py-2 transition hover:text-emerald-300"
          >
            CLUB PRO
          </button>
          <Link href="/#revenue-model" className="rounded px-3 py-2 transition hover:text-emerald-300">
            MODEL
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {session.authenticated && session.user ? (
            <>
              <Link
                href="/watchlists"
                className="hidden rounded border border-white/10 px-3 py-1.5 font-mono text-[11px] text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300 sm:block"
              >
                WATCHLISTS
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-[11px] text-emerald-300"
              >
                <span className="hidden max-w-[140px] truncate sm:inline">{session.user.email}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    session.user.isPro
                      ? "bg-emerald-400 text-[#04120c]"
                      : "bg-slate-700 text-slate-200"
                  }`}
                >
                  {session.user.isPro ? "PRO" : "FREE"}
                </span>
              </Link>
              <button
                onClick={signOut}
                className="rounded border border-white/10 px-2.5 py-1.5 font-mono text-[11px] text-slate-500 transition hover:text-rose-300"
              >
                OUT
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openPricing}
                className="hidden rounded border border-amber-400/40 px-3 py-1.5 font-mono text-[11px] text-amber-300 transition hover:bg-amber-500/10 sm:block"
              >
                GO PRO ₹499
              </button>
              <Link
                href="/login"
                className="rounded bg-emerald-500 px-4 py-1.5 font-mono text-[11px] font-bold text-[#04120c] transition hover:bg-emerald-400"
              >
                SIGN IN
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
