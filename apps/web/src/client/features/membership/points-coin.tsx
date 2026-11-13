"use client";

import { CoinStack } from "@virzeen/ui";
import { useState } from "react";
import { LogoMark } from "@/client/components/layout/logo-mark";

/**
 * The silver Virzeen coin on the points card (owner 2026-11-13): hover plays the spin, jump and pile; a tap (phones)
 * plays it and holds it, a second tap puts the coin back.
 */
export function PointsCoin() {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      aria-label={active ? "Put the coin back" : "Stack the coins"}
      aria-pressed={active}
      onClick={() => setActive((value) => !value)}
      className="cursor-pointer rounded-xl"
    >
      <CoinStack mark={<LogoMark className="h-auto w-full" />} active={active} />
    </button>
  );
}
