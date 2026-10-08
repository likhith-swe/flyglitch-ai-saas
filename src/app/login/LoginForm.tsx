"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

type Phase = "idle" | "sending" | "sent" | "preview" | "error";

/** Magic-link request form. Shows the inline verify URL when Resend is absent. */
export function LoginForm() {
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhase("sending");
    setError(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        delivery?: string;
        verifyUrl?: string;
        error?: string;
        retryAfterSec?: number;
      };
      if (!data.ok) {
        setPhase("error");
        setError(
          data.error === "rate_limited"
            ? `Rate limited — retry in ${data.retryAfterSec ?? 60}s`
            : data.error === "invalid_email"
              ? "That email doesn't parse. Check it and retry."
              : "Something broke — retry."
        );
        return;
      }
      if (data.delivery === "preview_link" && data.verifyUrl) {
        setVerifyUrl(data.verifyUrl);
        setPhase("preview");
      } else {
        setPhase("sent");
      }
    } catch {
      setPhase("error");
      setError("Network error — retry.");
    }
  };

  return (
    <div>
      {phase === "sent" ? (
        <div className="py-4 text-center">
          <div className="text-3xl">📬</div>
          <h2 className="mt-3 font-mono text-sm font-bold text-emerald-300">LINK DISPATCHED</h2>
          <p className="mt-2 text-xs text-slate-400">
            Check <span className="text-slate-200">{email}</span>. The link self-destructs in 15
            minutes and works exactly once.
          </p>
        </div>
      ) : phase === "preview" && verifyUrl ? (
        <div className="py-2 text-center">
          <div className="text-3xl">🧪</div>
          <h2 className="mt-3 font-mono text-sm font-bold text-emerald-300">
            RESEND NOT PROVISIONED — INSTANT PREVIEW LINK
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            No email API key detected, so here is your single-use token directly.
          </p>
          <a
            href={verifyUrl}
            className="mt-4 block rounded-lg bg-emerald-500 px-4 py-3 font-mono text-xs font-bold text-[#04120c] transition hover:bg-emerald-400"
          >
            VERIFY &amp; SIGN IN →
          </a>
          <p className="mt-3 break-all font-mono text-[9px] text-slate-600">{verifyUrl}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label>
            <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-slate-500">
              EMAIL
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@frequentflyer.in"
              className="w-full rounded-lg border border-white/10 bg-[#07090e] px-3 py-3 font-mono text-sm text-slate-200 outline-none focus:border-emerald-400/60"
            />
          </label>
          {phase === "error" && error ? (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-300">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={phase === "sending"}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-mono text-sm font-bold text-[#04120c] transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {phase === "sending" ? "MINTING LINK…" : "SEND MAGIC LINK ⚡"}
          </button>
          <p className="text-center font-mono text-[10px] text-slate-600">
            Continuing to {next}
          </p>
        </form>
      )}
    </div>
  );
}
