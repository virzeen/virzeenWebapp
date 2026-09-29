"use client";

import { Accordion, AccordionItem, Badge, Button, cn, FormField, Input } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { itemButton, refocusAfterListChange } from "./form-focus";
import { ImageUploader } from "./image-uploader";
import { ListError } from "./list-error";

const MAX_PHOTOS = 12; // productSchema: images.max(12)

type ProductPhotosProps = {
  productId: string | undefined;
  uploadsEnabled: boolean;
  /** Re-runs the list checks after a change (see ProductForm). */
  onListChange: () => void;
};

/** Photos: many at once, first is the main photo, reorder by buttons or (desktop) dragging. */
export function ProductPhotos({ productId, uploadsEnabled, onListChange }: ProductPhotosProps) {
  const form = useFormContext<ProductInput>();
  const images = useFieldArray({ control: form.control, name: "images", keyName: "fieldKey" });
  const name = useWatch({ control: form.control, name: "name" });
  const errors = form.formState.errors.images;
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [descriptionsOpen, setDescriptionsOpen] = useState("");
  const listError = errors?.root?.message ?? errors?.message;
  const hasAltError = images.fields.some((_, index) => errors?.[index]?.alt);

  // The moved photo keeps focus on the same control, or on the other arrow once that one is disabled.
  function move(from: number, to: number, action: "earlier" | "later" | "main") {
    images.move(from, to);
    onListChange();
    refocusAfterListChange(
      () => itemButton(listRef.current, to, action),
      () => itemButton(listRef.current, to, action === "earlier" ? "later" : "earlier"),
    );
  }

  // Focus goes to the next photo's Remove, else the previous one's, else the uploader.
  function remove(index: number) {
    images.remove(index);
    onListChange();
    refocusAfterListChange(
      () => itemButton(listRef.current, index, "remove"),
      () => itemButton(listRef.current, index - 1, "remove"),
      () => sectionRef.current?.querySelector<HTMLElement>("[data-image-uploader] button:not(:disabled)"),
    );
  }

  const endDrag = () => {
    setDragFrom(null);
    setDropAt(null);
  };

  return (
    <section ref={sectionRef} aria-labelledby="photos-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="photos-heading" className="font-display text-h3">
          Photos
        </h2>
        <p className="text-small text-ink-muted">
          {images.fields.length} of {MAX_PHOTOS} · the first is the main photo
        </p>
      </div>
      {listError && <ListError>{listError}</ListError>}
      {images.fields.length > 0 && (
        <ul ref={listRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {images.fields.map((image, index) => (
            <li
              key={image.fieldKey}
              draggable
              onDragStart={(e) => {
                setDragFrom(index);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                setDropAt(index);
              }}
              onDrop={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                if (dragFrom !== index) move(dragFrom, index, "earlier");
                endDrag();
              }}
              onDragEnd={endDrag}
              className={cn(
                "flex cursor-grab flex-col gap-2 rounded-md",
                dragFrom === index && "opacity-50",
                dropAt === index && dragFrom !== index && "ring-2 ring-focus ring-offset-2",
              )}
            >
              <div className="relative">
                <CloudImage src={image.url} alt="" sizes="(min-width: 1280px) 200px, 45vw" />
                {index === 0 && <Badge className="absolute top-2 left-2">Main photo</Badge>}
              </div>
              {errors?.[index]?.url && <ListError>{errors[index].url.message}</ListError>}
              <div className="flex flex-wrap items-center gap-1">
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    shape="pill"
                    data-action="main"
                    onClick={() => move(index, 0, "later")}
                  >
                    Make main
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move photo ${index + 1} earlier`}
                  data-action="earlier"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1, "earlier")}
                >
                  <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move photo ${index + 1} later`}
                  data-action="later"
                  disabled={index === images.fields.length - 1}
                  onClick={() => move(index, index + 1, "later")}
                >
                  <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove photo ${index + 1}`}
                  data-action="remove"
                  onClick={() => remove(index)}
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
        multiple={{ count: images.fields.length, limit: MAX_PHOTOS }}
        onUploaded={(url) => {
          images.append({ url, alt: "" });
          onListChange();
        }}
      />
      {images.fields.length > 0 && (
        <Accordion
          type="single"
          collapsible
          value={hasAltError ? "descriptions" : descriptionsOpen}
          onValueChange={setDescriptionsOpen}
        >
          <AccordionItem value="descriptions" title="Photo descriptions (optional)">
            <div className="flex flex-col gap-4">
              <p className="text-small">
                Read out by screen readers and used by search engines. Leave blank to use the product name.
              </p>
              {images.fields.map((image, index) => (
                <FormField
                  key={image.fieldKey}
                  label={index === 0 ? "Photo 1 (main)" : `Photo ${index + 1}`}
                  error={errors?.[index]?.alt?.message}
                >
                  <Input
                    maxLength={200}
                    placeholder={name.trim() || "The product name"}
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
