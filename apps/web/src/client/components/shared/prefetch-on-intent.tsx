"use client";

import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Owner request 2026-10-01: opening a product must feel instant. <Link> prefetches only the loading skeleton of a
// page that reads the database; this fetches the whole page as soon as a finger touches a link or the pointer
// rests on it (100-300 ms before the click lands), so the page is usually ready when the tap ends. Only the pages
// people open from lists: products, the shop and its categories, collections and portfolio stories.
const PAGES = /^\/(product|shop|collections|portfolio)(\/|$)/;

/** "full": the page's data too, not just its skeleton (Next's internal enum, a string at runtime). */
const FULL = "full" as unknown as PrefetchKind;
/** pointerover fires again for every child the pointer crosses: ask once per link per half minute. */
const AGAIN_AFTER_MS = 30_000;

/** One listener for the whole site, so product cards and links need nothing of their own. */
export function PrefetchOnIntent() {
  const router = useRouter();

  useEffect(() => {
    const asked = new Map<string, number>();

    function prefetch(event: Event) {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || !PAGES.test(url.pathname)) return;
      const href = `${url.pathname}${url.search}`;
      if (href === `${window.location.pathname}${window.location.search}`) return;
      if (Date.now() - (asked.get(href) ?? 0) < AGAIN_AFTER_MS) return;
      asked.set(href, Date.now());
      router.prefetch(href, { kind: FULL });
    }

    // Mouse: resting on a link. Touch: the finger going down, before the tap is decided.
    document.addEventListener("pointerover", prefetch, { passive: true });
    document.addEventListener("touchstart", prefetch, { passive: true });
    return () => {
      document.removeEventListener("pointerover", prefetch);
      document.removeEventListener("touchstart", prefetch);
    };
  }, [router]);

  return null;
}
