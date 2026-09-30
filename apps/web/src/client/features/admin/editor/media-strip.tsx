"use client";

import { cn, Skeleton } from "@virzeen/ui";
import { Plus } from "lucide-react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import type { PendingUpload } from "../use-image-uploads";
import type { ShownPhoto } from "./media-photos";

export type KeyedPhoto = ShownPhoto & { key: string };

type MediaStripProps = {
  ref: React.Ref<HTMLUListElement>;
  photos: KeyedPhoto[];
  /** The photo on show. */
  index: number;
  onShow: (index: number) => void;
  pending: PendingUpload[];
  /** False when the style's photos are full (the gallery says so under it). */
  canAdd: boolean;
  onAdd: () => void;
  productName: string;
};

const TILE_FOCUS =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus focus-visible:outline-solid";

/**
 * The thumbnail strip from lg, as on the shop page (product-gallery.tsx): 4rem thumbnails as tall as the main photo,
 * scrolling when they don't fit; hovering or pressing one shows it, with its buttons on the main photo (a 4rem
 * thumbnail can't hold four 44px buttons). Tabbing past a thumbnail doesn't change the photo, so the buttons after
 * the strip still work on the one picked.
 * Uploads in progress wait at the end, then the + tile that adds photos: new photos go last, and the + moves down.
 */
export function MediaStrip({
  ref,
  photos,
  index,
  onShow,
  pending,
  canAdd,
  onAdd,
  productName,
}: MediaStripProps) {
  return (
    <div className="relative w-16 shrink-0">
      <ul
        ref={ref}
        aria-label={`${productName} images`}
        className="absolute inset-0 flex scrollbar-none flex-col gap-2 overflow-y-auto"
      >
        {photos.map((photo, i) => (
          <li key={photo.key}>
            <button
              type="button"
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => onShow(i)}
              onMouseEnter={() => onShow(i)}
              className={cn(
                "relative block size-16 overflow-hidden rounded-sm",
                TILE_FOCUS,
                "after:absolute after:inset-0 after:bg-ink/15 after:opacity-0 after:transition-opacity after:duration-150 hover:after:opacity-100 aria-[current=true]:after:opacity-100",
              )}
            >
              <CloudImage src={photo.url} alt="" ratio="square" sizes="64px" />
            </button>
          </li>
        ))}
        {pending.map((upload) => (
          <li key={upload.key}>
            <Skeleton className="size-16" />
            <span className="sr-only">Uploading {upload.name}</span>
          </li>
        ))}
        <li>
          <button
            type="button"
            data-add-photos
            aria-label="Add photos"
            title="Add photos"
            disabled={!canAdd}
            onClick={onAdd}
            className={cn(
              "flex size-16 items-center justify-center rounded-sm border border-dashed border-line-strong text-ink-muted transition-colors duration-150 ease-standard hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line-strong disabled:hover:text-ink-muted",
              TILE_FOCUS,
            )}
          >
            <Plus className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
        </li>
      </ul>
    </div>
  );
}
