"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "./Modal";

interface CheckoutResponse {
  ok: boolean;
  mode?: string;
  checkoutUrl?: string;
  activateUrl?: string;
  notes?: string[];
  error?: string;
}

const FREE_ROWS = [
  "Full radar — 30 verified routes",
  "Email alerts (30-minute batch)",
  "3 active watchlists",
  "60-day price history",
];
const PRO_ROWS = [
  "0-second WhatsApp / Telegram pings",
  "Unlimited custom tripwires",
  "Priority sweep queue (≤60s)",
  "Fuel-dump & POS-error early access",
];

/** Club Pro checkout — Razorpay INR, Stripe USD or instant sandbox activation. */
export function PricingModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState<"INR" | "USD" | null>(null);
  const [needAuth, setNeedAuth] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const activate = async (currency: "INR" | "USD") => {
    setBusy(currency);
    setNotes([]);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      if (res.status === 401) {
        setNeedAuth(true);
        return;
      }
      const data = (await res.json()) as CheckoutResponse;
      setNotes(data.notes ?? []);
      if (data.activateUrl) {
        setMessage("No payment rails detected — activating Club Pro in sandbox mode…");
        window.location.href = data.activateUrl;
        return;
      }
      if (data.checkoutUrl) {
        setMessage("Opening secure checkout — your PRO badge activates via webhook.");
        window.open(data.checkoutUrl, "_blank", "noopener");
        return;
      }
      setMessage(`Checkout prepared via ${data.mode ?? "provider"} — check provider dashboard.`);
    } catch {
      setMessage("Checkout failed — retry or refresh.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Free vs Club Pro"
      subtitle="Transparent pricing · Razorpay ₹499/mo · Stripe $9/mo · sandbox fallback always works"
    >
      {needAuth ? (
        <div className="py-6 text-center">
          <div className="text-4xl">🔒</div>
          <h3 className="mt-3 font-mono text-sm font-bold text-amber-300">SIGN IN TO UPGRADE</h3>
          <p className="mt-2 text-xs text-slate-400">Billing is linked to your profile.</p>
          <Link
            href="/login?next=/dashboard"
            className="mt-5 inline-block rounded-lg bg-emerald-500 px-6 py-2.5 font-mono text-xs font-bold text-[#04120c] hover:bg-emerald-400"
          >
            SIGN IN →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 p-4">
            <div className="font-mono text-[10px] tracking-[0.25em] text-slate-500">FREE</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-100">₹0</div>
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              {FREE_ROWS.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-slate-600">▪</span> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-xl border border-emerald-400/50 bg-emerald-500/5 p-4">
            <div className="absolute -top-2.5 right-3 rounded bg-emerald-500 px-2 py-0.5 font-mono text-[9px] font-bold text-[#04120c]">
              0-SECOND ALERTS
            </div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-emerald-400">CLUB PRO</div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-300">
              ₹499<span className="text-sm text-slate-400">/mo</span>{" "}
              <span className="text-sm text-slate-500">· $9/mo global</span>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              {PRO_ROWS.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-emerald-400">⚡</span> {f}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => activate("INR")}
            disabled={busy !== null}
            className="rounded-lg bg-emerald-500 px-4 py-3 font-mono text-sm font-bold text-[#04120c] transition hover:bg-emerald-400 disabled:opacity-50 sm:col-span-1"
          >
            {busy === "INR" ? "ROUTING…" : "ACTIVATE · ₹499 RAZORPAY"}
          </button>
          <button
            onClick={() => activate("USD")}
            disabled={busy !== null}
            className="rounded-lg border border-emerald-400/50 px-4 py-3 font-mono text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-50"
          >
            {busy === "USD" ? "ROUTING…" : "ACTIVATE · $9 STRIPE"}
          </button>

          {message ? (
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 font-mono text-xs text-emerald-300 sm:col-span-2">
              {message}
            </div>
          ) : null}
          {notes.length > 0 ? (
            <ul className="space-y-1 font-mono text-[10px] text-slate-500 sm:col-span-2">
              {notes.map((n, i) => (
                <li key={i}>· {n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
