"use client";

import { useEffect, useState } from "react";

/** True once the page has scrolled down from the very top (the home page header then gets its background). */
export function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return scrolled;
}

/**
 * True while the page scrolls down past the header (`offset`, its height); scrolling up or reaching the top makes it
 * false. Small moves (under 8px) are ignored, so a shaky trackpad doesn't flicker it, and so is a move that comes
 * with a page of a new height: the browser keeping the view in place after the page changed (Show Filters makes the
 * cards smaller, Load more adds some), not the reader scrolling.
 */
export function useScrollingDown(offset = 64) {
  const [down, setDown] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let height = document.documentElement.scrollHeight;
    const update = () => {
      const y = window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;
      if (y <= offset) {
        setDown(false);
        last = y;
        height = pageHeight;
        return;
      }
      if (pageHeight !== height) {
        height = pageHeight;
        last = y;
        return;
      }
      if (Math.abs(y - last) < 8) return;
      setDown(y > last);
      last = y;
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [offset]);
  return down;
}
