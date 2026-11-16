"use client";

import { type RefObject, useEffect, useState } from "react";

/**
 * True while the black notice bar covers the top of the screen (every shop page starts with it; admin and the sign-in
 * pages have none). Both the status-bar strip (`StatusBarFill`) and the browser bar colour (`ThemeColorSync`) follow it,
 * so the phone's top is black over the black bar and white once it has scrolled away. `strip` is the strip behind the
 * status bar: its height is the top inset, and the bar only covers the whole status area while it reaches below it.
 */
export function useBarCoversTop(pathname: string, strip?: RefObject<HTMLElement | null>) {
  const [covers, setCovers] = useState(false);
  useEffect(() => {
    const update = () => {
      const bar = document.querySelector("[data-top-notice-bar]");
      const inset = strip?.current?.getBoundingClientRect().height ?? 0;
      setCovers(bar ? bar.getBoundingClientRect().bottom > inset : false);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname, strip]);
  return covers;
}
