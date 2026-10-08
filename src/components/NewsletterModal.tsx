"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { AIRPORTS } from "@/lib/types";

/** Weekly drop report signup modal. */
export function NewsletterModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [homeAirport, setHomeAirport] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, homeAirport: homeAirport || null }),
      });
      const data = (await res.json()) as { ok: boolean; alreadySubscribed?: boolean; error?: string };
      if (!data.ok) {
        setState("error");
        setMsg(data.error ?? "failed");
        return;
      }
      setState("done");
      setMsg(data.alreadySubscribed ? "You were already on the list — respect." : null);
    } catch {
      setState("error");
      setMsg("network error");
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="The Weekly Drop Report"
      subtitle="Every Friday: the 10 sharpest fare fractures of the week, one email, zero fluff."
    >
      {state === "done" ? (
        <div className="py-6 text-center">
          <div className="text-4xl">📬</div>
          <h3 className="mt-3 font-mono text-sm font-bold text-emerald-300">SUBSCRIBED</h3>
          <p className="mt-2 text-xs text-slate-400">
            {msg ?? "First report lands Friday 07:00 IST. Check your inbox to whitelist us."}
          </p>
          <button
            onClick={onClose}
            className="mt-5 rounded-lg bg-emerald-500 px-6 py-2.5 font-mono text-xs font-bold text-[#04120c] hover:bg-emerald-400"
          >
            DONE
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label>
            <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-slate-500">EMAIL</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@frequentflyer.in"
              className="w-full rounded-lg border border-white/10 bg-[#07090e] px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-emerald-400/60"
            />
          </label>
          <label>
            <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-slate-500">
              HOME AIRPORT (OPTIONAL)
            </span>
            <select
              value={homeAirport}
              onChange={(e) => setHomeAirport(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#07090e] px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-emerald-400/60"
            >
              <option value="">— skip —</option>
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.city}
                </option>
              ))}
            </select>
          </label>
          {state === "error" ? (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-300">
              FAILED: {msg}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={state === "busy"}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-mono text-sm font-bold text-[#04120c] transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {state === "busy" ? "SUBSCRIBING…" : "GET THE DROP REPORT →"}
          </button>
        </form>
      )}
    </Modal>
  );
}
