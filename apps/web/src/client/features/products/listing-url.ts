import { usePathname, useRouter, useSearchParams } from "next/navigation";

// The shop listing's filters and sort live in the URL (patterns.md §5), so results are shareable and server-rendered.

/** Sort choices, Nike's wording (owner 2026-11-08). "newest" is the default and leaves the URL. */
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-desc", label: "Price: High-Low" },
  { value: "price-asc", label: "Price: Low-High" },
] as const;

export const FILTER_KEYS = ["size", "color", "inStock"] as const;

/** The current listing URL, a link with some params changed, and navigation to it (the page stays where it is). */
export function useListingUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  /** `changes`: a value sets the param, null removes it. "Load more"'s cursor always goes. */
  function hrefWith(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    next.delete("cursor");
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function navigate(changes: Record<string, string | null>) {
    const href = hrefWith(changes);
    const current = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    if (href !== current) router.push(href, { scroll: false });
  }

  return { params, hrefWith, navigate };
}
