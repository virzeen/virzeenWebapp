"use client";

import { Button } from "@virzeen/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import type { ProductFeatureView } from "./product-details-data";

type Edges = { start: boolean; end: boolean };

/**
 * "Features that perform" (specs/product-page.md): a row of picture cards, 1 per view with the next one peeking on
 * phones (swipe), 2 from md, 3 from lg. From md, previous/next buttons sit above on the right, disabled at the ends
 * and hidden when every card fits. "Skip features" lets keyboard users jump past the row.
 */
export function ProductFeatures({ features }: { features: ProductFeatureView[] }) {
  const rowRef = useRef<HTMLUListElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Both ends reached = everything fits: the buttons stay hidden until the row is measured.
  const [edges, setEdges] = useState<Edges>({ start: true, end: true });

  // Measured again when cards come or go (the admin preview follows the editor), since the row's own size stays.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const start = row.scrollLeft <= 1;
      const end = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
      // A focused button that is about to be switched off (or hidden) would drop focus to the page: it moves to the
      // other button first, or to the row when every card fits.
      const focused = document.activeElement;
      if ((end && focused === nextRef.current) || (start && focused === previousRef.current)) {
        const other = focused === nextRef.current ? previousRef.current : nextRef.current;
        (start && end ? row : other)?.focus();
      }
      setEdges((was) => (was.start === start && was.end === end ? was : { start, end }));
    };
    // ResizeObserver calls back once when it starts watching, which gives the first measurement.
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    row.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      row.removeEventListener("scroll", measure);
    };
  }, [features.length]);

  function scrollByCard(direction: 1 | -1) {
    const row = rowRef.current;
    const card = row?.firstElementChild as HTMLElement | null | undefined;
    if (!row || !card) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollBy({ left: direction * card.offsetWidth, behavior: reduceMotion ? "auto" : "smooth" });
  }

  const fits = edges.start && edges.end;

  return (
    <section aria-labelledby="features-heading" className="flex flex-col gap-6 pt-16 lg:pt-24">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <h2 id="features-heading" className="font-display text-h2">
          Features that perform
        </h2>
        {!fits && (
          <div className="flex gap-2 max-md:hidden">
            <Button
              ref={previousRef}
              variant="secondary"
              size="icon"
              shape="pill"
              aria-label="Previous feature"
              disabled={edges.start}
              onClick={() => scrollByCard(-1)}
            >
              <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden />
            </Button>
            <Button
              ref={nextRef}
              variant="secondary"
              size="icon"
              shape="pill"
              aria-label="Next feature"
              disabled={edges.end}
              onClick={() => scrollByCard(1)}
            >
              <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden />
            </Button>
          </div>
        )}
      </div>
      <a
        href="#features-end"
        className="sr-only rounded-sm bg-ink text-canvas focus:not-sr-only focus:self-start focus:px-4 focus:py-3"
      >
        Skip features
      </a>
      <div>
        {/*
          Each card carries its gap as right padding (the row's negative margin hides the last one), so 2 or 3 cards
          fill the row exactly. The row scrolls sideways, so it takes keyboard focus (arrow keys scroll it).
        */}
        <ul
          ref={rowRef}
          tabIndex={0}
          aria-labelledby="features-heading"
          className="-mr-4 flex snap-x snap-mandatory scrollbar-none overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus focus-visible:outline-solid"
        >
          {features.map((feature) => (
            <li key={feature.id} className="w-10/12 shrink-0 snap-start pr-4 md:w-1/2 lg:w-1/3">
              <article className="flex flex-col gap-4">
                <CloudImage
                  src={feature.imageUrl || null}
                  alt={feature.imageAlt}
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 85vw"
                  className="rounded-md"
                />
                <div className="flex flex-col gap-2 pr-6">
                  <h3 className="text-h3">{feature.title}</h3>
                  <p className="whitespace-pre-line text-ink-muted">{feature.body}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
        {/* Where "Skip features" lands: the next Tab goes on past the row. */}
        <span id="features-end" />
      </div>
    </section>
  );
}
