"use client";

import { Button, cn } from "@virzeen/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { GALLERY_SIZES, GalleryCarousel, type GalleryImage } from "./gallery-carousel";

/**
 * The product photos (specs/product-page.md "Gallery"). From lg: a vertical strip of thumbnails beside one large
 * 4:5 photo; hovering or clicking a thumbnail shows it; round previous/next buttons sit on the photo (bordered, so
 * they show on light photos too). Below lg: a swipeable row, one photo per screen width, with dots. A hidden live
 * region says which photo shows. One photo: just the photo. The first photo is the page's LCP image.
 */
export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [picked, setIndex] = useState(0);
  const stripRef = useRef<HTMLUListElement>(null);
  const [first] = images;
  // The admin preview can drop photos while one further along is shown.
  const index = Math.min(picked, Math.max(images.length - 1, 0));

  if (images.length <= 1) {
    return (
      <CloudImage
        src={first?.url ?? null}
        alt={first?.alt ?? productName}
        sizes={GALLERY_SIZES}
        priority={Boolean(first)}
        className="-mx-4 sm:-mx-6 lg:mx-0 lg:rounded-md"
      />
    );
  }

  const total = images.length;
  const current = images[index];

  /** Previous/next wrap around; the strip scrolls so the shown thumbnail stays in view. */
  function step(by: number) {
    const next = (index + by + total) % total;
    setIndex(next);
    const strip = stripRef.current;
    const thumb = strip?.children[next] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    if (thumb.offsetTop < strip.scrollTop) strip.scrollTop = thumb.offsetTop;
    else if (thumb.offsetTop + thumb.offsetHeight > strip.scrollTop + strip.clientHeight) {
      strip.scrollTop = thumb.offsetTop + thumb.offsetHeight - strip.clientHeight;
    }
  }

  return (
    <div>
      <div className="hidden justify-end gap-4 lg:flex">
        {/* The strip is as tall as the main photo and scrolls when the thumbnails don't fit. */}
        <div className="relative w-16 shrink-0">
          <ul
            ref={stripRef}
            aria-label={`${productName} images`}
            className="absolute inset-0 flex scrollbar-none flex-col gap-2 overflow-y-auto"
          >
            {images.map((image, i) => (
              <li key={image.id}>
                <button
                  type="button"
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => setIndex(i)}
                  onMouseEnter={() => setIndex(i)}
                  className={cn(
                    "relative block size-16 overflow-hidden rounded-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus focus-visible:outline-solid",
                    "after:absolute after:inset-0 after:bg-ink/15 after:opacity-0 after:transition-opacity after:duration-150 hover:after:opacity-100 aria-[current=true]:after:opacity-100",
                  )}
                >
                  <CloudImage src={image.url} alt="" ratio="square" sizes="64px" />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="max-w-gallery-photo relative w-full min-w-0" data-testid="gallery-main">
          <CloudImage
            key={current?.id}
            src={current?.url ?? null}
            alt={current?.alt ?? productName}
            sizes={GALLERY_SIZES}
            priority={index === 0}
            className="rounded-md"
          />
          <div className="absolute right-4 bottom-4 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              shape="pill"
              aria-label="Previous photo"
              onClick={() => step(-1)}
            >
              <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              shape="pill"
              aria-label="Next photo"
              onClick={() => step(1)}
            >
              <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden />
            </Button>
          </div>
        </div>
      </div>
      <GalleryCarousel
        images={images}
        productName={productName}
        index={index}
        onIndexChange={setIndex}
        className="lg:hidden"
      />
      <p className="sr-only" aria-live="polite">
        Photo {index + 1} of {total}
      </p>
    </div>
  );
}
