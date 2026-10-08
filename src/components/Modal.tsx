"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

/** Base modal shell: backdrop blur, ESC-to-close, scroll lock, terminal chrome. */
export function Modal({ title, subtitle, onClose, children, wide }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-[#07090e]/85 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[88vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0b0f16] shadow-[0_0_60px_rgba(16,185,129,0.12)]`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/8 bg-[#0b0f16]/95 px-6 py-4 backdrop-blur">
          <div>
            <div className="font-mono text-xs tracking-[0.25em] text-emerald-400/80">
              FLYGLITCH TERMINAL
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-100">{title}</h2>
            {subtitle ? <div className="mt-0.5 text-xs text-slate-400">{subtitle}</div> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-xs text-slate-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
            aria-label="Close"
          >
            ESC ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
