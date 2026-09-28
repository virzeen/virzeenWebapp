import { CloudImage } from "@/client/components/shared/cloud-image";

type GalleryImage = { id: string; url: string; alt: string };

/**
 * Mobile: swipeable row (CSS scroll-snap, no JS). Desktop: two-column stack of large images (patterns.md §6).
 * The first image is the page's LCP image.
 */
export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  if (images.length === 0) {
    return <CloudImage src={null} alt={productName} sizes="(min-width: 1024px) 60vw, 100vw" />;
  }
  return (
    <section aria-label={`${productName} images`} className="-mx-4 sm:mx-0">
      <ul className="gap-2 px-4 sm:px-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible flex snap-x snap-mandatory overflow-x-auto">
        {images.map((image, index) => (
          <li
            key={image.id}
            className="sm:w-7/12 lg:w-auto first:lg:col-span-2 w-10/12 shrink-0 snap-center"
            aria-label={`Image ${index + 1} of ${images.length}`}
          >
            <CloudImage
              src={image.url}
              alt={image.alt}
              sizes={index === 0 ? "(min-width: 1024px) 60vw, 85vw" : "(min-width: 1024px) 30vw, 85vw"}
              priority={index === 0}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
