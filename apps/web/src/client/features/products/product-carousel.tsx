"use client";

import { Button } from "@virzeen/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ProductCard, type ProductCardData } from "./product-card";
import { rowEdges, type RowEdges } from "./product-carousel-scroll";

type ProductCarouselProps = {
  /** The h2 on the left. */
  title: string;
  /** A short line under the heading (the editor says where the cards come from). */
  description?: string | undefined;
  products: ProductCardData[];
  /** The cards open in a new tab, so the page they sit on stays open (the product editor). */
  newTab?: boolean;
};

/**
 * A row of product cards under a product page (specs/product-page-v2.md "Recommendations"): only whole cards, 2 per
 * view on phones (swipe), 3 from md, 4 from lg, snapping to a card. From md, round previous/next buttons sit on the
 * right of the heading, disabled at the ends and hidden when every card fits; each press moves one card. The row
 * takes focus, so arrow keys scroll it. Nothing when there are no products.
 */
export function ProductCarousel({ title, description, products, newTab = false }: ProductCarouselProps) {
  const headingId = useId();
  const rowRef = useRef<HTMLUListElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Both ends reached = everything fits: the buttons stay hidden until the row is measured.
  const [edges, setEdges] = useState<RowEdges>({ start: true, end: true });

  // Measured again when cards come or go (Preview and the editor load them later), since the row's own size stays.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const { start, end } = rowEdges(row);
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
  }, [products.length]);

  // ProductCard is one link to the product page; in the editor each opens in a new tab instead.
  useEffect(() => {
    if (!newTab) return;
    rowRef.current?.querySelectorAll("a[href]").forEach((link) => link.setAttribute("target", "_blank"));
  }, [newTab, products]);

  // One card per press. A card's width includes its gap, so the row lands on the next card's start (and the snap
  // tidies up any rounding).
  function scrollByCard(direction: 1 | -1) {
    const row = rowRef.current;
    const card = row?.firstElementChild;
    if (!row || !card) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollBy({
      left: direction * card.getBoundingClientRect().width,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  if (products.length === 0) return null;
  const fits = edges.start && edges.end;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id={headingId} className="font-display text-h2">
            {title}
          </h2>
          {description && <p className="text-small text-ink-muted">{description}</p>}
        </div>
        {!fits && (
          <div className="flex shrink-0 gap-2 max-md:hidden">
            <Button
              ref={previousRef}
              variant="secondary"
              size="icon"
              shape="pill"
              aria-label="Previous products"
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
              aria-label="Next products"
              disabled={edges.end}
              onClick={() => scrollByCard(1)}
            >
              <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden />
            </Button>
          </div>
        )}
      </div>
      {/*
        Each card carries its gap as right padding (the row's negative margin puts the last one in the page gutter),
        so 2, 3 or 4 whole cards fill the row exactly, with no half card at the edge. It scrolls sideways, so it
        takes keyboard focus (arrow keys scroll it).
      */}
      <ul
        ref={rowRef}
        tabIndex={0}
        aria-labelledby={headingId}
        className="-mr-4 flex snap-x snap-mandatory scrollbar-none overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus focus-visible:outline-solid"
      >
        {products.map((product) => (
          <li key={product.id} className="w-1/2 shrink-0 snap-start pr-4 md:w-1/3 lg:w-1/4">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
