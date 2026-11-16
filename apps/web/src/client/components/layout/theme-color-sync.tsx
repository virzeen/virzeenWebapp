"use client";

import { colors } from "@virzeen/ui/tokens";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useBarCoversTop } from "./use-bar-covers-top";

/**
 * Keeps the browser's own bar colour (`theme-color`: Safari, Chrome on Android, the installed Android app's status bar,
 * the installed app's top strip where the phone honours it) the same as what is at the top of the page: black while the
 * black notice bar covers it (every shop page, over the dark home hero too), white everywhere else (owner 2026-11-13:
 * the top part must be black over black and white over white). iOS 26+ ignores it and follows `StatusBarFill`.
 * The page itself is drawn under the iPhone status bar (viewport-fit=cover).
 */
export function ThemeColorSync() {
  const barCovers = useBarCoversTop(usePathname());
  const color = barCovers ? colors.ink : colors.canvas;
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", color);
  }, [color]);
  return null;
}
