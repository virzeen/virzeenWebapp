"use client";

import { Button } from "@virzeen/ui";
import { ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { GALLERY_SIZES } from "@/client/features/products/gallery-carousel";
import { MediaActions } from "./media-actions";
import type { KeyedPhoto } from "./media-strip";
import type { MediaUploads } from "./media-uploads";

type MediaMainProps = {
  photo: KeyedPhoto;
  position: number;
  count: number;
  /** Names the photo's buttons ("photo 2", "Black photo 2"). */
  name: string;
  alt: string;
  uploads: MediaUploads;
  onStep: (by: number) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (position: number) => void;
  root: React.RefObject<HTMLElement | null>;
};

/**
 * The large 4:5 photo from lg (as on the shop page: never taller than the screen, previous/next at the bottom
 * right), with the editor's buttons on it: Make main (top left), Add photos (top right; files dropped on the photo
 * upload too) and move / Remove (bottom left). The buttons are bordered so they show on light photos.
 */
export function MediaMain(props: MediaMainProps) {
  const { photo, position, count, name, alt, uploads, onStep, onMove, onRemove, root } = props;
  return (
    <div
      {...uploads.dropProps}
      className="max-w-gallery-photo relative w-full min-w-0"
      data-testid="gallery-main"
    >
      <CloudImage key={photo.key} src={photo.url} alt={alt} sizes={GALLERY_SIZES} className="rounded-md" />
      {uploads.dragging && (
        <div className="absolute inset-0 flex items-center justify-center rounded-md border border-dashed border-ink bg-canvas/80">
          <p className="text-body font-medium">Drop photos to add them</p>
        </div>
      )}
      <MediaActions
        position={position}
        count={count}
        name={name}
        url={photo.url}
        direction="vertical"
        mainClassName="absolute top-4 left-4"
        toolsClassName="absolute bottom-4 left-4"
        onMove={onMove}
        onRemove={onRemove}
        root={root}
      />
      <Button
        data-add-photos
        variant="secondary"
        size="sm"
        shape="pill"
        className="absolute top-4 right-4"
        disabled={uploads.left === 0}
        onClick={uploads.choose}
      >
        <ImagePlus className="size-4" strokeWidth={1.5} aria-hidden />
        Add photos
      </Button>
      {count > 1 && (
        <div className="absolute right-4 bottom-4 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            shape="pill"
            aria-label="Previous photo"
            onClick={() => onStep(-1)}
          >
            <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            shape="pill"
            aria-label="Next photo"
            onClick={() => onStep(1)}
          >
            <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
