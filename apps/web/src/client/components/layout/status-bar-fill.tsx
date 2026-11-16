"use client";

import { cn } from "@virzeen/ui";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useBarCoversTop } from "./use-bar-covers-top";

/**
 * The strip behind the iPhone status bar (owner 2026-11-16: "no need the gradient in the upper"). With the page drawn
 * under the status bar, iOS 26 and later fades the top of the screen with its own blur unless a `position: fixed`
 * element with a solid background sits within 4px of the top, at least 6px high and 80% wide: then the status bar takes
 * that colour and stays solid. This is that element: as tall as the top inset (`h-safe-top`, so 0 on computers and
 * Android, where it is invisible). Its colour is what the page shows there: black while the notice bar covers the top,
 * white once it has scrolled away. It is rendered before the page and has no z-index, so the notice bar, the header and
 * every overlay paint over it; only plain page content (the hero photo) slides under it.
 */
export function StatusBarFill() {
  const pathname = usePathname();
  const strip = useRef<HTMLDivElement>(null);
  const dark = useBarCoversTop(pathname, strip);

  return (
    <div
      ref={strip}
      aria-hidden
      data-status-bar-fill
      className={cn("fixed inset-x-0 top-0 h-safe-top", dark ? "bg-ink" : "bg-canvas")}
    />
  );
}
