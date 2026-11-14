"use client";

import { type RefObject, useEffect } from "react";

/**
 * Lets the mouse wheel and the trackpad scroll the page while the pointer is over a sideways row (the product,
 * favourites and benefits carousels).
 *
 * Why: a row that scrolls sideways takes the whole wheel tick when the tick has any sideways part, however small
 * (a tilted wheel, a trackpad's drift), and the browser then never passes the vertical part on to the page. The
 * page stopped while the pointer was over a card photo and moved again over white space (owner, 2026-11-14).
 *
 * What it does: a tick that is mostly vertical is taken over here and scrolls the page, eased over a few frames so
 * it stays smooth; a tick that is mostly sideways, and any zoom or shift-scroll, is left to the row. With reduced
 * motion the page jumps by the amount instead of easing. `rowKey` changes when the row appears later (a carousel
 * that had no cards at first), so the listener is attached then.
 */
export function useVerticalWheel(ref: RefObject<HTMLElement | null>, rowKey: unknown = null) {
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    let target = 0;
    let frame = 0;

    const ease = () => {
      const remaining = target - window.scrollY;
      if (Math.abs(remaining) < 0.5) {
        window.scrollTo(0, target);
        frame = 0;
        return;
      }
      window.scrollTo(0, window.scrollY + remaining * 0.2);
      frame = requestAnimationFrame(ease);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      // deltaMode 1 counts lines, 2 pages; 0 is pixels.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = event.deltaY * unit;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.scrollBy(0, delta);
        return;
      }
      const furthest = document.documentElement.scrollHeight - window.innerHeight;
      target = Math.max(0, Math.min(furthest, (frame ? target : window.scrollY) + delta));
      if (!frame) frame = requestAnimationFrame(ease);
    };

    // Not passive: it has to cancel the browser's own handling of the tick.
    row.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      row.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(frame);
    };
  }, [ref, rowKey]);
}
