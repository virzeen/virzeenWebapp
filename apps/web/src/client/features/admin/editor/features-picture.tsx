"use client";

import { Button, cn, Popover, PopoverContent, PopoverTrigger } from "@virzeen/ui";
import { GripVertical, ImageUp } from "lucide-react";
import { useRef, useState } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { ImageUploader } from "../image-uploader";
import { IMAGE_ACCEPT, useImageUploads } from "../use-image-uploads";
import { useProductEditor } from "./editor-context";
import type { FeatureDragHandle } from "./features-sortable";

type FeaturePictureProps = {
  imageUrl: string;
  alt: string;
  /** The card's name in the button's label: "Replace picture of {name}". */
  name: string;
  /** A problem from the last save. */
  error?: string | undefined;
  /** Takes the uploaded picture; returns why it can't be used, or null. */
  onUploaded: (imageRef: string) => string | null;
  /** More on the picture (the card's buttons). */
  children?: React.ReactNode;
  /** Makes the picture the card's drag handle (features-sortable.tsx); null while dragging is off. */
  drag?: FeatureDragHandle | null;
};

/** The thumbnails are 2 a row on phones, 3 at md and 5 from lg (beside the admin menu, so under a fifth). */
const SIZES = "(min-width: 1024px) 18vw, (min-width: 768px) 33vw, 50vw";

/**
 * A feature card's picture in the editor: a square thumbnail (the shape in the shop follows the layout, seen in
 * Preview), with Replace picture in its top-left corner. Without Cloudinary keys (local development) the button
 * opens a box for an image reference instead. With `drag`, the picture (not its buttons) drags the card: a grab
 * cursor, and a small grip at the top, between the buttons, that only shows it (screen readers skip it).
 */
export function FeaturePicture({
  imageUrl,
  alt,
  name,
  error,
  onUploaded,
  children,
  drag,
}: FeaturePictureProps) {
  const { product, options } = useProductEditor();
  const [problem, setProblem] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const take = (imageRef: string) => {
    setManualOpen(false);
    setProblem(onUploaded(imageRef));
  };
  const { pending, errors, upload } = useImageUploads("products", product.id, take);
  const busy = pending.length > 0;
  const label = `Replace picture of ${name}`;
  const problems = [...new Set([...errors, problem ?? error ?? ""])].filter(Boolean);

  const button = (
    <Button
      variant="secondary"
      size="icon"
      shape="pill"
      aria-label={label}
      data-action="picture"
      loading={busy}
      onClick={options.uploadsEnabled ? () => input.current?.click() : undefined}
    >
      {!busy && <ImageUp className="size-5" strokeWidth={1.5} aria-hidden />}
    </Button>
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={drag?.ref}
        {...drag?.listeners}
        className={cn("relative", drag && "callout-none touch-manipulation select-none")}
      >
        <CloudImage
          src={imageUrl || null}
          alt={alt}
          ratio="square"
          sizes={SIZES}
          className={cn(
            "rounded-md",
            drag && "cursor-grab active:cursor-grabbing",
            drag?.lifted && "shadow-md",
          )}
        />
        {drag && (
          // Clicks pass through to the picture: the grip only shows it drags, and never covers a button's edge.
          <span
            aria-hidden
            className="pointer-events-none absolute top-2 left-1/2 flex h-11 -translate-x-1/2 items-center"
          >
            <span className="rounded-full border border-ink/20 bg-canvas p-1 text-ink">
              <GripVertical className="size-4" strokeWidth={1.5} />
            </span>
          </span>
        )}
        {children}
        <div className="absolute top-2 left-2">
          {options.uploadsEnabled ? (
            <>
              <input
                ref={input}
                type="file"
                accept={IMAGE_ACCEPT}
                tabIndex={-1}
                aria-hidden
                className="sr-only"
                onChange={(event) => {
                  void upload(Array.from(event.target.files ?? []).slice(0, 1));
                  event.target.value = "";
                }}
              />
              {button}
            </>
          ) : (
            <Popover open={manualOpen} onOpenChange={setManualOpen}>
              <PopoverTrigger asChild>{button}</PopoverTrigger>
              <PopoverContent aria-label={label} align="start">
                <ImageUploader
                  folder="products"
                  entityId={product.id}
                  uploadsEnabled={false}
                  label="Replace picture"
                  onUploaded={take}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {busy ? "Uploading picture" : ""}
      </p>
      {problems.map((message) => (
        <p key={message} tabIndex={-1} data-field-error className="text-small text-danger outline-none">
          {message}
        </p>
      ))}
    </div>
  );
}
