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
 *
 * Two rules keep it from fighting the browser (owner, 2026-11-15: the page "goes up and down like a spring" when a
 * scroll that started above "New and Featured" carries on over its cards):
 * - A tick the browser won't let us cancel (`cancelable` false: the gesture began outside the row, so the browser is
 *   already scrolling the page with it) is left alone; taking it as well scrolled the page twice.
 * - The easing moves the page by the distance still to go, never towards a fixed position, so whatever else scrolls
 *   the page at the same time adds to it instead of being pulled back.
 */
export function useVerticalWheel(ref: RefObject<HTMLElement | null>, rowKey: unknown = null) {
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    let pending = 0;
    let frame = 0;

    const ease = () => {
      // A fifth of what is left each frame, at least a pixel, so it ends.
      const step =
        Math.abs(pending) <= 1 ? pending : Math.sign(pending) * Math.max(1, Math.abs(pending) * 0.2);
      const before = window.scrollY;
      window.scrollBy(0, step);
      pending -= step;
      // The top or bottom of the page: nothing more to move.
      if (window.scrollY === before) pending = 0;
      frame = pending === 0 ? 0 : requestAnimationFrame(ease);
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.cancelable || event.ctrlKey || event.shiftKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      // deltaMode 1 counts lines, 2 pages; 0 is pixels.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = event.deltaY * unit;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.scrollBy(0, delta);
        return;
      }
      // A new tick the other way drops what is left of the old one, like the browser's own scrolling.
      pending = Math.sign(pending) === -Math.sign(delta) ? delta : pending + delta;
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
