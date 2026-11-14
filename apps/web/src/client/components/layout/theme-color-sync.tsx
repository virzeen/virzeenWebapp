"use client";

import { colors } from "@virzeen/ui/tokens";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useScrolled } from "./use-scrolled";

/**
 * Keeps the browser's own bar colour (`theme-color`: Safari, Chrome on Android, the installed app's top strip where the
 * phone honours it) the same as what is at the top of the page: black over the home page's dark hero until it is
 * scrolled, white everywhere else (owner 2026-11-13: the top part must be black over black and white over white).
 * The page itself is drawn under the iPhone status bar (viewport-fit=cover, the header's `pt-safe`).
 */
export function ThemeColorSync() {
  const overHero = usePathname() === "/";
  const scrolled = useScrolled();
  const color = overHero && !scrolled ? colors.ink : colors.canvas;
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", color);
  }, [color]);
  return null;
}
