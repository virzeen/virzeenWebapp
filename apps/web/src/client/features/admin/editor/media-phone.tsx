"use client";

import { Button } from "@virzeen/ui";
import { ImagePlus } from "lucide-react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { GALLERY_SIZES, GalleryCarousel } from "@/client/features/products/gallery-carousel";
import { MediaActions } from "./media-actions";
import { MediaDropZone } from "./media-drop-zone";
import type { KeyedPhoto } from "./media-strip";
import type { MediaUploads } from "./media-uploads";

type MediaPhoneProps = {
  photos: KeyedPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  /** The photo's alt text on show, and what photos without one are called. */
  alt: string;
  productName: string;
  /** Names the photo's buttons ("photo 2", "Black photo 2"). */
  name: string;
  uploads: MediaUploads;
  uploadsEnabled: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (position: number) => void;
  root: React.RefObject<HTMLElement | null>;
  className?: string;
};

/**
 * The gallery below lg, as on the shop page: the swipeable row (one photo: just the photo; none: the drop zone),
 * then the shown photo's buttons and Add photos under it, since a phone has no thumbnail strip.
 */
export function MediaPhone(props: MediaPhoneProps) {
  const { photos, index, alt, productName, uploads } = props;
  const current = photos[index];
  const uploading = uploads.pending.length;

  return (
    <div className={props.className}>
      {photos.length > 1 ? (
        <GalleryCarousel
          images={photos.map((photo, i) => ({
            id: photo.key,
            url: photo.url,
            alt: photo.alt || `${productName}, photo ${i + 1}`,
          }))}
          productName={productName}
          index={index}
          onIndexChange={props.onIndexChange}
        />
      ) : current ? (
        <CloudImage src={current.url} alt={alt} sizes={GALLERY_SIZES} className="-mx-4 sm:-mx-6" />
      ) : (
        <MediaDropZone uploads={uploads} uploadsEnabled={props.uploadsEnabled} />
      )}
      {current && (
        <div className="flex flex-wrap items-center gap-2">
          <MediaActions
            position={index}
            count={photos.length}
            name={props.name}
            url={current.url}
            direction="horizontal"
            onMove={props.onMove}
            onRemove={props.onRemove}
            root={props.root}
          />
          <Button
            data-add-photos
            variant="secondary"
            size="sm"
            shape="pill"
            className="ml-auto"
            disabled={uploads.left === 0}
            onClick={uploads.choose}
          >
            <ImagePlus className="size-4" strokeWidth={1.5} aria-hidden />
            Add photos
          </Button>
          {uploading > 0 && (
            <p className="w-full text-small text-ink-muted">
              Uploading {uploading} {uploading === 1 ? "photo" : "photos"}…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
