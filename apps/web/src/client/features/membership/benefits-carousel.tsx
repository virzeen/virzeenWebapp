"use client";

import { Button } from "@virzeen/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useVerticalWheel } from "@/client/lib/use-vertical-wheel";
import { rowEdges, type RowEdges } from "../products/product-carousel-scroll";

type BenefitsCarouselProps = {
  /** The h2 on the left. */
  title: string;
  /** A link on the right of the title (the benefit pages leave it out, like Nike's). */
  action?: React.ReactNode;
  /** One card each, with a stable id for its key. */
  items: { id: string; node: React.ReactNode }[];
};

/**
 * The member's benefits as a sideways row (specs/member-area-nike-layout.md), like Nike's "Member Benefits": the title
 * alone over the row, whole cards with part of the next one showing (so it reads as scrolling), and a round arrow
 * sitting on the row's edge: next at the right end, previous once the row has moved. Phones swipe (no arrows). The row
 * takes focus, so arrow keys scroll it.
 */
export function BenefitsCarousel({ title, action, items }: BenefitsCarouselProps) {
  const headingId = useId();
  const rowRef = useRef<HTMLUListElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  useVerticalWheel(rowRef);
  // Both ends reached = everything fits: no arrows until the row is measured.
  const [edges, setEdges] = useState<RowEdges>({ start: true, end: true });

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const { start, end } = rowEdges(row);
      // A focused arrow that is about to be hidden would drop focus to the page: move it to the row first.
      const focused = document.activeElement;
      if ((end && focused === nextRef.current) || (start && focused === previousRef.current)) row.focus();
      setEdges((was) => (was.start === start && was.end === end ? was : { start, end }));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    row.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      row.removeEventListener("scroll", measure);
    };
  }, [items.length]);

  // One card per press: from a card's start to the next one's.
  function scrollByCard(direction: 1 | -1) {
    const row = rowRef.current;
    const card = row?.firstElementChild;
    if (!row || !card) return;
    const next = card.nextElementSibling;
    const step = next
      ? next.getBoundingClientRect().left - card.getBoundingClientRect().left
      : card.getBoundingClientRect().width;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollBy({ left: direction * step, behavior: reduceMotion ? "auto" : "smooth" });
  }

  if (items.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6" data-testid="benefits-carousel">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <h2 id={headingId} className="font-display text-h2">
          {title}
        </h2>
        {action}
      </div>
      <div className="relative">
        {/* Phones run to the screen's edges like the product rows (`max-md:mx-grid-bleed`, the gutter pulled back and given back as padding). */}
        <ul
          ref={rowRef}
          tabIndex={0}
          aria-labelledby={headingId}
          className="flex snap-x snap-mandatory scrollbar-none gap-x-3 overflow-x-auto overflow-y-hidden max-md:mx-grid-bleed max-md:scroll-px-gutter max-md:px-gutter"
        >
          {items.map((item) => (
            <li key={item.id} className="flex w-perk-slide shrink-0 snap-start *:w-full">
              {item.node}
            </li>
          ))}
        </ul>
        {!edges.start && (
          <Button
            ref={previousRef}
            variant="ghost"
            size="icon"
            shape="pill"
            aria-label="Previous benefits"
            onClick={() => scrollByCard(-1)}
            className="absolute top-1/3 left-3 bg-canvas shadow-sm max-md:hidden"
          >
            <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden />
          </Button>
        )}
        {!edges.end && (
          <Button
            ref={nextRef}
            variant="ghost"
            size="icon"
            shape="pill"
            aria-label="Next benefits"
            onClick={() => scrollByCard(1)}
            className="absolute top-1/3 right-3 bg-canvas shadow-sm max-md:hidden"
          >
            <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden />
          </Button>
        )}
      </div>
    </section>
  );
}
