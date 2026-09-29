"use client";

import { ProductGallery } from "./product-gallery";
import { useProductSelection } from "./product-selection";
import { galleryFor } from "./style-photos";

type StyleGalleryProps = {
  images: { id: string; url: string; alt: string; color: string | null }[];
  productName: string;
};

/** The product gallery for the picked style: only its photos (specs/product-page.md). */
export function StyleGallery({ images, productName }: StyleGalleryProps) {
  const { style, colors } = useProductSelection();
  // Keyed by style so the gallery starts again at the new style's first photo.
  return (
    <ProductGallery key={style ?? ""} images={galleryFor(images, style, colors)} productName={productName} />
  );
}
