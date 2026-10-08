"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/format";

interface CountdownProps {
  /** Epoch ms when the airline is expected to correct the fare. */
  deadline: number;
  className?: string;
}

/** Live correction-window countdown, rendered as terminal-style mono. */
export function Countdown({ deadline, className }: CountdownProps) {
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMsLeft(deadline - Date.now());
    tick();
    const t = setInterval(tick, 1_000);
    return () => clearInterval(t);
  }, [deadline]);

  if (msLeft === null) {
    return <span className={`font-mono ${className ?? ""}`}>{"\u2013\u2013:\u2013\u2013:\u2013\u2013"}</span>;
  }
  const expired = msLeft <= 0;
  const tone = expired ? "text-rose-400" : msLeft < 3_600_000 ? "text-amber-400" : "text-emerald-300";
  return (
    <span className={`font-mono tabular-nums ${tone} ${className ?? ""}`}>
      {expired ? "PATCHED" : formatCountdown(msLeft)}
    </span>
  );
}
