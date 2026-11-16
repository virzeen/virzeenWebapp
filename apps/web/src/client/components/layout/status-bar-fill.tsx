"use client";

import { cn } from "@virzeen/ui";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const [dark, setDark] = useState(false);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const bar = document.querySelector("[data-top-notice-bar]");
      const inset = strip.current?.getBoundingClientRect().height ?? 0; // the resolved top inset
      setDark(bar ? bar.getBoundingClientRect().bottom > inset : false);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);

  return (
    <div
      ref={strip}
      aria-hidden
      data-status-bar-fill
      className={cn("fixed inset-x-0 top-0 h-safe-top", dark ? "bg-ink" : "bg-canvas")}
    />
  );
}
