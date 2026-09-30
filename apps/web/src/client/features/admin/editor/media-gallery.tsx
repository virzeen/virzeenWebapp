"use client";

import { useRef, useState } from "react";
import { MediaDropZone } from "./media-drop-zone";
import { MediaMain } from "./media-main";
import { MediaPhone } from "./media-phone";
import { PHOTOS_PER_STYLE, photoMove } from "./media-photos";
import { MediaStrip, type KeyedPhoto } from "./media-strip";
import { useMediaUploads } from "./media-uploads";

export type MediaGalleryProps = {
  /** The picked style ("" without styles); the gallery is keyed by it, so an upload stays with its style. */
  style: string;
  photos: KeyedPhoto[];
  /** The style has no photos of its own, so these are the ones every style shares (as in the shop). */
  shared: boolean;
  room: number;
  productId: string;
  productName: string;
  uploadsEnabled: boolean;
  onUploaded: (url: string) => void;
  /** Whole-list indexes (react-hook-form's move and remove). */
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  /** Photo problems from the last check (list first), shown under the gallery. */
  problems: string[];
};

/**
 * One style's photos in the product editor, laid out like the shop's gallery (product-gallery.tsx): from lg the
 * thumbnail strip (ending in the + tile) left of the 4:5 main photo; below lg the swipeable row with the photo's
 * buttons and Add photos under it. No photos: a big drop zone.
 */
export function MediaGallery(props: MediaGalleryProps) {
  const { style, photos, productName, uploadsEnabled } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLUListElement>(null);
  const [picked, setPicked] = useState(0);
  const uploads = useMediaUploads({
    productId: props.productId,
    room: props.room,
    uploadsEnabled,
    onUploaded: props.onUploaded,
    root: rootRef,
  });
  const total = photos.length;
  const index = Math.min(picked, Math.max(total - 1, 0));
  const current = photos[index];
  const name = `${style ? `${style} photo` : "photo"} ${index + 1}`;
  const alt = current?.alt || `${productName}, photo ${index + 1}`;
  const uploading = uploads.pending.length;

  function move(from: number, to: number) {
    const pair = photoMove(photos, from, to);
    if (!pair) return;
    props.onMove(...pair);
    setPicked(to);
  }

  function remove(position: number) {
    const photo = photos[position];
    if (photo) props.onRemove(photo.index);
  }

  /** Previous/next wrap around; the strip scrolls so the shown thumbnail stays in view. */
  function step(by: number) {
    const next = (index + by + total) % total;
    setPicked(next);
    const strip = stripRef.current;
    const thumb = strip?.children[next] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    if (thumb.offsetTop < strip.scrollTop) strip.scrollTop = thumb.offsetTop;
    else if (thumb.offsetTop + thumb.offsetHeight > strip.scrollTop + strip.clientHeight) {
      strip.scrollTop = thumb.offsetTop + thumb.offsetHeight - strip.clientHeight;
    }
  }

  const actions = { index, name, onMove: move, onRemove: remove, root: rootRef };

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      {props.shared && (
        <p className="text-small text-ink-muted">
          These photos are shared by every style. Add photos to give {style} its own.
        </p>
      )}
      <div className="hidden justify-end gap-4 lg:flex">
        <MediaStrip
          ref={stripRef}
          photos={photos}
          index={index}
          onShow={setPicked}
          pending={uploads.pending}
          canAdd={uploads.left > 0}
          onAdd={uploads.choose}
          productName={productName}
        />
        {current ? (
          <MediaMain
            {...actions}
            position={index}
            count={total}
            photo={current}
            alt={alt}
            uploads={uploads}
            onStep={step}
          />
        ) : (
          <MediaDropZone uploads={uploads} uploadsEnabled={uploadsEnabled} className="max-w-gallery-photo" />
        )}
      </div>
      <MediaPhone
        {...actions}
        className="flex flex-col gap-3 lg:hidden"
        photos={photos}
        onIndexChange={setPicked}
        alt={alt}
        productName={productName}
        uploads={uploads}
        uploadsEnabled={uploadsEnabled}
      />
      {total > 1 && (
        <p className="sr-only" aria-live="polite">
          Photo {index + 1} of {total}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {uploading > 0 ? `Uploading ${uploading} ${uploading === 1 ? "photo" : "photos"}` : ""}
      </p>
      {total > 0 && uploads.left === 0 && uploading === 0 && (
        <p className="text-small text-ink-muted">
          Photos are full ({PHOTOS_PER_STYLE} at most). Remove one to add another.
        </p>
      )}
      {[...new Set(uploads.errors)].map((message) => (
        <p key={message} className="text-small text-danger">
          {message}
        </p>
      ))}
      {props.problems.map((message) => (
        <p key={message} className="text-small text-danger" data-field-error tabIndex={-1}>
          {message}
        </p>
      ))}
      {uploads.parts}
    </div>
  );
}
