"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The collections row on phones (owner 2026-11-16), under the title: one row that scrolls sideways, like Nike's,
 * running to the screen's edges (the gutter is pulled back and put back as padding), with no scrollbar. The current
 * collection (`aria-current="page"`) is scrolled to the middle when the page opens, so it is never off-screen.
 */
export function ListingPhoneRow({ children }: { children: React.ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const element = row.current;
    const current = element?.querySelector('[aria-current="page"]');
    if (!element || !(current instanceof HTMLElement)) return;
    element.scrollLeft = current.offsetLeft - (element.clientWidth - current.offsetWidth) / 2;
  }, [pathname]);

  return (
    <div
      ref={row}
      className="relative -mx-gutter flex scrollbar-none items-center overflow-x-auto overflow-y-hidden px-gutter"
    >
      {children}
    </div>
  );
}
