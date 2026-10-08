import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <div className="font-mono text-[11px] tracking-[0.3em] text-amber-400">
        FLIGHT NOT FOUND · GATE CLOSED
      </div>
      <h1 className="mt-4 font-mono text-6xl font-extrabold text-slate-100">404</h1>
      <p className="mt-4 max-w-md text-sm text-slate-400">
        This route isn&apos;t on the radar. The fare may have been patched, or the link decayed.
        Sweep the live radar for current contacts.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-emerald-500 px-8 py-3 font-mono text-sm font-bold text-[#04120c] transition hover:bg-emerald-400"
      >
        ← BACK TO RADAR
      </Link>
    </main>
  );
}
