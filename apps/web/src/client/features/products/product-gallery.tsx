import { CloudImage } from "@/client/components/shared/cloud-image";

type GalleryImage = { id: string; url: string; alt: string };

/**
 * Mobile: swipeable row (CSS scroll-snap, no JS). Desktop: two-column stack of large images (patterns.md §6).
 * The first image is the page's LCP image. A single image fills the column rather than a one-item row.
 */
export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [first] = images;
  if (images.length <= 1) {
    return (
      <CloudImage
        src={first?.url ?? null}
        alt={first?.alt ?? productName}
        sizes="(min-width: 1024px) 60vw, 100vw"
        priority={Boolean(first)}
      />
    );
  }
  return (
    <div className="-mx-4 sm:mx-0">
      {/*
        The row scrolls sideways, so it takes keyboard focus (arrow keys scroll it) and shows the focus ring.
        The ring sits outside the row because the images would cover an inset one; on phones, where the row
        runs to the screen edges, its top and bottom lines show.
      */}
      <ul
        tabIndex={0}
        aria-label={`${productName} images`}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none sm:px-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible"
      >
        {images.map((image, index) => {
          const wide = index === 0 || (index === images.length - 1 && images.length % 2 === 0);
          return (
            <li
              key={image.id}
              // Desktop: the first image spans both columns; with an even count the last one does too, so no
              // image sits beside an empty half.
              className="w-10/12 shrink-0 snap-center sm:w-7/12 lg:w-auto first:lg:col-span-2 last:even:lg:col-span-2"
              aria-label={`Image ${index + 1} of ${images.length}`}
            >
              <CloudImage
                src={image.url}
                alt={image.alt}
                sizes={wide ? "(min-width: 1024px) 60vw, 85vw" : "(min-width: 1024px) 30vw, 85vw"}
                priority={index === 0}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
