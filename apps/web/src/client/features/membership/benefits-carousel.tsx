"use client";

import { Button } from "@virzeen/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { rowEdges, type RowEdges } from "../products/product-carousel-scroll";

type BenefitsCarouselProps = {
  /** The h2 on the left. */
  title: string;
  /** A link on the right, before the previous/next buttons. */
  action?: React.ReactNode;
  /** One card each, with a stable id for its key. */
  items: { id: string; node: React.ReactNode }[];
};

/**
 * The member's benefits as a sideways row on the profile (owner 2026-11-13): perk cards and the guide's benefit
 * groups, 1 card and a peek of the next on phones (swipe), 2 from 768px, 3 from 960px, snapping to a card. Like
 * `ProductCarousel`: from md, round previous/next buttons sit on the right of the heading, disabled at the ends and
 * hidden when every card fits; the row takes focus, so arrow keys scroll it.
 */
export function BenefitsCarousel({ title, action, items }: BenefitsCarouselProps) {
  const headingId = useId();
  const rowRef = useRef<HTMLUListElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Both ends reached = everything fits: the buttons stay hidden until the row is measured.
  const [edges, setEdges] = useState<RowEdges>({ start: true, end: true });

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const { start, end } = rowEdges(row);
      // A focused button that is about to be switched off would drop focus to the page: move it first.
      const focused = document.activeElement;
      if ((end && focused === nextRef.current) || (start && focused === previousRef.current)) {
        const other = focused === nextRef.current ? previousRef.current : nextRef.current;
        (start && end ? row : other)?.focus();
      }
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
  const fits = edges.start && edges.end;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6" data-testid="benefits-carousel">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <h2 id={headingId} className="font-display text-h2">
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-4">
          {action}
          {!fits && (
            <div className="flex gap-2 max-md:hidden">
              <Button
                ref={previousRef}
                variant="secondary"
                size="icon"
                shape="pill"
                aria-label="Previous benefits"
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
                aria-label="Next benefits"
                disabled={edges.end}
                onClick={() => scrollByCard(1)}
              >
                <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden />
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Phones run to the screen's edges like the product rows (`max-md:mx-grid-bleed`, the gutter pulled back and given back as padding). */}
      <ul
        ref={rowRef}
        tabIndex={0}
        aria-labelledby={headingId}
        className="flex snap-x snap-mandatory scrollbar-none gap-x-4 overflow-x-auto overscroll-x-contain max-md:mx-grid-bleed max-md:scroll-px-gutter max-md:px-gutter"
      >
        {items.map((item) => (
          <li key={item.id} className="flex w-perk-slide shrink-0 snap-start *:w-full">
            {item.node}
          </li>
        ))}
      </ul>
    </section>
  );
}
