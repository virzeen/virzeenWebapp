"use client";

import { cn } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { useId, useRef, useState } from "react";
import { useFormContext, type UseFieldArrayReturn } from "react-hook-form";
import { itemButton, refocusAfterListChange } from "./form-focus";
import { ImageUploader } from "./image-uploader";
import { ListError } from "./list-error";
import { PhotoDescriptions } from "./photo-descriptions";
import { PhotoTile, type PhotoDrag, type PhotoMove } from "./photo-tile";

const MAX_PHOTOS = 12; // per style (and for the shared photos); productSchema allows 60 in all

export type ImagesArray = UseFieldArrayReturn<ProductInput, "images", "fieldKey">;

type ProductPhotosProps = {
  /** The one `images` field array (ProductForm owns it; each section shows its own photos). */
  images: ImagesArray;
  /** Whose photos: a style name, or "" for the photos shared by every style (specs/product-styles.md). */
  style: string;
  title: string;
  hint?: string;
  /** 2 for the page section, 4 inside a style card (under its h3). */
  headingLevel?: 2 | 4;
  /**
   * "grid": tiles in 2 to 4 columns (the page section). "stacked": for a style card's narrow photo column, the
   * main photo large across the top, the others as 2-column tiles under it and a compact drop area.
   */
  layout?: "grid" | "stacked";
  productId: string | undefined;
  uploadsEnabled: boolean;
  /** Re-runs the list checks after a change (see ProductForm). */
  onListChange: () => void;
};

/** Photos: many at once, first is the main photo, reorder by buttons or (desktop) dragging. */
export function ProductPhotos({
  images,
  style,
  title,
  hint,
  headingLevel = 2,
  layout = "grid",
  productId,
  uploadsEnabled,
  onListChange,
}: ProductPhotosProps) {
  const form = useFormContext<ProductInput>();
  const errors = form.formState.errors.images;
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  // This section's photos with their place in the whole list (the form's index).
  const mine = images.fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => (field.color ?? "") === style);
  const listError = style === "" ? (errors?.root?.message ?? errors?.message) : undefined;
  const Heading = `h${headingLevel}` as const;
  const stacked = layout === "stacked";
  // Names the photo for screen readers: "photo 2", or "Mountain photo 2" in a style card.
  const photoName = (position: number) => `${style ? `${style} photo` : "photo"} ${position + 1}`;
  const sizesOf = (position: number) =>
    !stacked
      ? "(min-width: 1280px) 200px, 45vw"
      : position === 0
        ? "(min-width: 1024px) 320px, (min-width: 640px) 384px, 90vw"
        : "(min-width: 1024px) 160px, (min-width: 640px) 192px, 45vw";

  // Positions are within this section; the move happens in the whole list. The moved photo keeps focus on the
  // same control, or on the other arrow once that one is disabled.
  function move(from: number, to: number, action: PhotoMove) {
    const source = mine[from];
    const target = mine[to];
    if (!source || !target) return;
    images.move(source.index, target.index);
    onListChange();
    refocusAfterListChange(
      () => itemButton(listRef.current, to, action),
      () => itemButton(listRef.current, to, action === "earlier" ? "later" : "earlier"),
    );
  }

  // Focus goes to the next photo's Remove, else the previous one's, else the uploader.
  function remove(position: number) {
    const photo = mine[position];
    if (!photo) return;
    images.remove(photo.index);
    onListChange();
    refocusAfterListChange(
      () => itemButton(listRef.current, position, "remove"),
      () => itemButton(listRef.current, position - 1, "remove"),
      () => sectionRef.current?.querySelector<HTMLElement>("[data-image-uploader] button:not(:disabled)"),
    );
  }

  const endDrag = () => {
    setDragFrom(null);
    setDropAt(null);
  };
  const drag: PhotoDrag = {
    from: dragFrom,
    at: dropAt,
    start: setDragFrom,
    over: setDropAt,
    drop: (position) => {
      if (dragFrom !== null && dragFrom !== position) move(dragFrom, position, "earlier");
      endDrag();
    },
    end: endDrag,
  };

  return (
    <section ref={sectionRef} aria-labelledby={headingId} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading id={headingId} className={cn("font-display", headingLevel === 2 ? "text-h3" : "text-body")}>
          {title}
        </Heading>
        <p className="text-small text-ink-muted">
          {mine.length} of {MAX_PHOTOS} · the first is the main photo
        </p>
      </div>
      {hint && <p className="-mt-2 text-small text-ink-muted">{hint}</p>}
      {listError && <ListError>{listError}</ListError>}
      {mine.length > 0 && (
        // One list in both layouts, so a tile's place in the list is its position (itemButton relies on it).
        <ul
          ref={listRef}
          className={cn(
            "grid",
            stacked ? "grid-cols-2 gap-3" : "grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4",
          )}
        >
          {mine.map(({ field, index }, position) => (
            <PhotoTile
              key={field.fieldKey}
              url={field.url}
              position={position}
              count={mine.length}
              name={photoName(position)}
              errors={[errors?.[index]?.url?.message, errors?.[index]?.color?.message]}
              sizes={sizesOf(position)}
              className={cn(stacked && position === 0 && "col-span-2")}
              drag={drag}
              onMove={move}
              onRemove={remove}
            />
          ))}
        </ul>
      )}
      <ImageUploader
        folder="products"
        entityId={productId ?? "new"}
        uploadsEnabled={uploadsEnabled}
        label={uploadsEnabled ? "Choose photos" : "Add photo"}
        multiple={{ count: mine.length, limit: MAX_PHOTOS }}
        compact={stacked}
        onUploaded={(url) => {
          images.append({ url, alt: "", color: style });
          onListChange();
        }}
      />
      {mine.length > 0 && (
        <PhotoDescriptions
          photos={mine.map(({ field, index }) => ({ key: field.fieldKey, index }))}
          style={style}
          headingLevel={headingLevel === 2 ? 3 : 4}
        />
      )}
    </section>
  );
}
