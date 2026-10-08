"use client";

import { useModals } from "./GlobalModals";

interface Props {
  modal: "pricing" | "newsletter" | "watchlist";
  label: string;
  className?: string;
}

/** Server-rendered sections use this bridge to open global modals. */
export function ModalCta({ modal, label, className }: Props) {
  const { openPricing, openNewsletter, openWatchlist } = useModals();
  const onClick =
    modal === "pricing" ? openPricing : modal === "newsletter" ? openNewsletter : () => openWatchlist(null);
  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}
