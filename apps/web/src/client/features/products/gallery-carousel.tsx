"use client";

import { cn } from "@virzeen/ui";
import { useEffect, useRef } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";

export type GalleryImage = { id: string; url: string; alt: string };

/** The desktop main photo and this row share one `sizes`, so the preloaded first photo is fetched once. */
export const GALLERY_SIZES = "(min-width: 1024px) 50vw, 100vw";

type GalleryCarouselProps = {
  images: GalleryImage[];
  productName: string;
  /** The photo in view, shared with the desktop gallery's live region. */
  index: number;
  onIndexChange: (index: number) => void;
  className?: string;
};

/**
 * The gallery below lg: one photo per screen width, edge to edge, swiped with CSS scroll-snap. Small dots show the
 * position (hidden from screen readers: ProductGallery's live region says "Photo n of total"). With many photos the
 * dots are cut off at the screen edges rather than making the page scroll sideways.
 */
export function GalleryCarousel({
  images,
  productName,
  index,
  onIndexChange,
  className,
}: GalleryCarouselProps) {
  const rowRef = useRef<HTMLUListElement>(null);
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  });

  // The photo picked while the row was hidden (a thumbnail on a wider screen, then the tablet turned) comes into
  // view when the row shows or changes width, so the dots and "Photo n of total" match the photo on screen.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(() => {
      const width = row.clientWidth;
      if (width > 0 && Math.round(row.scrollLeft / width) !== indexRef.current) {
        row.scrollLeft = indexRef.current * width;
      }
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  function onScroll(event: React.UIEvent<HTMLUListElement>) {
    const row = event.currentTarget;
    const shown = Math.round(row.scrollLeft / Math.max(row.clientWidth, 1));
    if (shown !== index) onIndexChange(shown);
  }

  return (
    <div className={cn("relative -mx-4 overflow-x-clip sm:-mx-6", className)}>
      {/* The row scrolls sideways, so it takes keyboard focus (arrow keys scroll it) and shows the focus ring. */}
      <ul
        ref={rowRef}
        tabIndex={0}
        aria-label={`${productName} images`}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory scrollbar-none overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus focus-visible:outline-solid"
      >
        {images.map((image, i) => (
          <li key={image.id} className="w-full shrink-0 snap-start snap-always">
            <CloudImage src={image.url} alt={image.alt} sizes={GALLERY_SIZES} priority={i === 0} />
          </li>
        ))}
      </ul>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <div className="flex gap-2 rounded-full bg-canvas/60 px-3 py-2 backdrop-blur-md">
          {images.map((image, i) => (
            <span
              key={image.id}
              className={cn(
                "size-2 rounded-full bg-ink/25 transition-colors duration-150",
                i === index && "bg-ink",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
