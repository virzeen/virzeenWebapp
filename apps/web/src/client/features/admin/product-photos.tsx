"use client";

import { Accordion, AccordionItem, Badge, Button, cn, FormField, Input } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useFormContext, useWatch, type UseFieldArrayReturn } from "react-hook-form";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { itemButton, refocusAfterListChange } from "./form-focus";
import { ImageUploader } from "./image-uploader";
import { ListError } from "./list-error";

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
  productId,
  uploadsEnabled,
  onListChange,
}: ProductPhotosProps) {
  const form = useFormContext<ProductInput>();
  const name = useWatch({ control: form.control, name: "name" });
  const errors = form.formState.errors.images;
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [descriptionsOpen, setDescriptionsOpen] = useState("");
  // This section's photos with their place in the whole list (the form's index).
  const mine = images.fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => (field.color ?? "") === style);
  const listError = style === "" ? (errors?.root?.message ?? errors?.message) : undefined;
  const hasAltError = mine.some(({ index }) => errors?.[index]?.alt);
  const Heading = `h${headingLevel}` as const;
  // Names the photo for screen readers: "photo 2", or "Mountain photo 2" in a style card.
  const photoName = (position: number) => `${style ? `${style} photo` : "photo"} ${position + 1}`;

  // Positions are within this section; the move happens in the whole list. The moved photo keeps focus on the
  // same control, or on the other arrow once that one is disabled.
  function move(from: number, to: number, action: "earlier" | "later" | "main") {
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

  return (
    <section ref={sectionRef} aria-labelledby={headingId} className="flex flex-col gap-4">
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
        <ul ref={listRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {mine.map(({ field, index }, position) => (
            <li
              key={field.fieldKey}
              draggable
              onDragStart={(e) => {
                setDragFrom(position);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                setDropAt(position);
              }}
              onDrop={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                if (dragFrom !== position) move(dragFrom, position, "earlier");
                endDrag();
              }}
              onDragEnd={endDrag}
              className={cn(
                "flex cursor-grab flex-col gap-2 rounded-md",
                dragFrom === position && "opacity-50",
                dropAt === position && dragFrom !== position && "ring-2 ring-focus ring-offset-2",
              )}
            >
              <div className="relative">
                <CloudImage src={field.url} alt="" sizes="(min-width: 1280px) 200px, 45vw" />
                {position === 0 && <Badge className="absolute top-2 left-2">Main photo</Badge>}
              </div>
              {errors?.[index]?.url && <ListError>{errors[index].url.message}</ListError>}
              {errors?.[index]?.color && <ListError>{errors[index].color.message}</ListError>}
              <div className="flex flex-wrap items-center gap-1">
                {position > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    shape="pill"
                    data-action="main"
                    onClick={() => move(position, 0, "later")}
                  >
                    Make main
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${photoName(position)} earlier`}
                  data-action="earlier"
                  disabled={position === 0}
                  onClick={() => move(position, position - 1, "earlier")}
                >
                  <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${photoName(position)} later`}
                  data-action="later"
                  disabled={position === mine.length - 1}
                  onClick={() => move(position, position + 1, "later")}
                >
                  <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${photoName(position)}`}
                  data-action="remove"
                  onClick={() => remove(position)}
                >
                  <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ImageUploader
        folder="products"
        entityId={productId ?? "new"}
        uploadsEnabled={uploadsEnabled}
        label={uploadsEnabled ? "Choose photos" : "Add photo"}
        multiple={{ count: mine.length, limit: MAX_PHOTOS }}
        onUploaded={(url) => {
          images.append({ url, alt: "", color: style });
          onListChange();
        }}
      />
      {mine.length > 0 && (
        <Accordion
          type="single"
          collapsible
          value={hasAltError ? "descriptions" : descriptionsOpen}
          onValueChange={setDescriptionsOpen}
        >
          <AccordionItem
            value="descriptions"
            title="Photo descriptions (optional)"
            headingLevel={headingLevel === 2 ? 3 : 4}
          >
            <div className="flex flex-col gap-4">
              <p className="text-small">
                Read out by screen readers and used by search engines. Leave blank to use the product
                {style ? " and style" : ""} name.
              </p>
              {mine.map(({ field, index }, position) => (
                <FormField
                  key={field.fieldKey}
                  label={position === 0 ? "Photo 1 (main)" : `Photo ${position + 1}`}
                  error={errors?.[index]?.alt?.message}
                >
                  <Input
                    maxLength={200}
                    placeholder={[name.trim() || "The product name", style].filter(Boolean).join(", ")}
                    {...form.register(`images.${index}.alt`)}
                  />
                </FormField>
              ))}
            </div>
          </AccordionItem>
        </Accordion>
      )}
    </section>
  );
}
