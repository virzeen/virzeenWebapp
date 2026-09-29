"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ImagesArray } from "../use-variant-options";
import { landingStyle, renamedStyle } from "./media-photos";

/**
 * Puts a finished upload where it was started (specs/product-editor-on-page.md "Gallery"). Uploads can finish after
 * the admin picked another style, moved or removed photos, or renamed or removed the style, so the photo is tied to
 * its style's name and appended at the end, never put at a remembered index. Renames seen since are followed; a
 * photo whose style was removed is dropped (its photos went with it). Returns `land(url, style)`, stable.
 */
export function useLandPhoto(styles: readonly string[], images: ImagesArray, commit: () => Promise<void>) {
  const latest = useRef({ styles, images, commit });
  const renames = useRef(new Map<string, string>());
  const seen = useRef(styles);

  useEffect(() => {
    latest.current = { styles, images, commit };
  });
  useEffect(() => {
    const renamed = renamedStyle(seen.current, styles);
    if (renamed) renames.current.set(renamed.from, renamed.to);
    seen.current = styles;
  }, [styles]);

  return useCallback((url: string, style: string) => {
    const now = latest.current;
    const color = landingStyle(style, renames.current, now.styles);
    if (color === null) return;
    now.images.append({ url, alt: "", color }, { shouldFocus: false });
    void now.commit();
  }, []);
}
