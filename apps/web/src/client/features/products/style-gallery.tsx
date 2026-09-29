"use client";

import { ProductGallery } from "./product-gallery";
import { useSelectedStyle } from "./selected-style";
import { galleryFor } from "./style-photos";

type StyleGalleryProps = {
  images: { id: string; url: string; alt: string; color: string | null }[];
  productName: string;
  styles: string[];
  initialStyle: string | null;
};

/** The product gallery for the picked style: its photos, then the shared ones (specs/product-styles.md). */
export function StyleGallery({ images, productName, styles, initialStyle }: StyleGalleryProps) {
  const { style } = useSelectedStyle(initialStyle);
  // Keyed by style so a swiped phone row starts again at the new style's first photo.
  return (
    <ProductGallery key={style ?? ""} images={galleryFor(images, style, styles)} productName={productName} />
  );
}
