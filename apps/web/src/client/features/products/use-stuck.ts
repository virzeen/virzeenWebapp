"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True while a sticky element sits at its `top` (it has stuck), false where it isn't sticky (no `top`, e.g. below lg)
 * or still in its place. Read on scroll and resize, since the `top` itself can change (the shop's title bar moves up
 * when the site header slides away).
 */
export function useStuck(ref: RefObject<HTMLElement | null>) {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const top = Number.parseFloat(getComputedStyle(element).top);
      setStuck(Number.isFinite(top) && window.scrollY > 0 && element.getBoundingClientRect().top <= top + 1);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref]);
  return stuck;
}
