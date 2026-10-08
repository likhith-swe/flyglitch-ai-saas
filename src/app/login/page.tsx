import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Magic Link",
  description: "Passwordless sign-in to the FlyGlitch glitch radar. One link, fifteen minutes.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error === "expired" ? "expired" : sp.error === "callback" ? "callback" : null;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-xl border border-white/10 bg-[#0b0f16] p-8 shadow-[0_0_60px_rgba(16,185,129,0.08)]">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-2xl text-[#04120c]">
            ⚡
          </div>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-slate-100">
            Enter the glitch radar
          </h1>
          <p className="mt-1.5 font-mono text-[11px] tracking-wider text-slate-500">
            NO PASSWORDS · SINGLE-USE LINK · 15 MIN TTL
          </p>
        </div>

        {error === "expired" ? (
          <div className="mb-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2.5 font-mono text-xs text-amber-300">
            That link expired or was already used. Mint a fresh one below.
          </div>
        ) : null}
        {error === "callback" ? (
          <div className="mb-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2.5 font-mono text-xs text-amber-300">
            Sign-in callback incomplete. Try the magic link again.
          </div>
        ) : null}

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center font-mono text-[10px] leading-relaxed text-slate-600">
        By signing in you accept radar terms: fares decay fast, book responsibly, never spam
        airlines. Sessions are HMAC-signed HTTP-only cookies.
      </p>
    </main>
  );
}
