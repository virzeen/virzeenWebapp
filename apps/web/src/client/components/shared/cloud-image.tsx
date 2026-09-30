import { cn } from "@virzeen/ui";
import Image from "next/image";

const RATIOS = {
  product: "aspect-4/5",
  square: "aspect-square",
  landscape: "aspect-3/2",
  wide: "aspect-16/9",
  portrait: "aspect-2/3",
  hero: "aspect-4/5 md:aspect-16/9",
} as const;

export type CloudImageProps = {
  /** Cloudinary public id, or a /public path for local assets. */
  src: string | null;
  /** Meaningful description, or "" when purely decorative. */
  alt: string;
  /**
   * Fixed aspect ratio prevents layout shift (docs/ui/performance-seo.md §2). "none": no ratio of its own, the
   * className sizes the box (a picture that fills the height of its grid cell, like a tall feature).
   */
  ratio?: keyof typeof RATIOS | "none";
  /** Rendered width per breakpoint, e.g. "(min-width: 1024px) 25vw, 50vw". Always set it. */
  sizes: string;
  /** Only for the single LCP image on a page: preloaded, fetched at high priority, never lazy. */
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

/** The only way to show images: Cloudinary-optimised, fixed ratio, required alt (components-catalog.md §2). */
export function CloudImage({
  src,
  alt,
  ratio = "product",
  sizes,
  priority = false,
  className,
  imageClassName,
}: CloudImageProps) {
  return (
    <div className={cn("relative overflow-hidden bg-surface", ratio !== "none" && RATIOS[ratio], className)}>
      {src && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          // Next 16 replaced `priority` with `preload`; fetchPriority is what browsers act on.
          {...(priority ? { preload: true, fetchPriority: "high" as const, loading: "eager" as const } : {})}
          className={cn("object-cover", imageClassName)}
        />
      )}
    </div>
  );
}
