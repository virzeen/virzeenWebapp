"use client";

import { Button, Popover, PopoverContent, PopoverTrigger } from "@virzeen/ui";
import { ImageUp } from "lucide-react";
import { useRef, useState } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { ImageUploader } from "../image-uploader";
import { IMAGE_ACCEPT, useImageUploads } from "../use-image-uploads";
import { useProductEditor } from "./editor-context";

type FeaturePictureProps = {
  imageUrl: string;
  alt: string;
  /** The card's name in the button's label: "Replace picture of {name}". */
  name: string;
  /** A problem from the last save. */
  error?: string | undefined;
  /** Takes the uploaded picture; returns why it can't be used, or null. */
  onUploaded: (imageRef: string) => string | null;
  /** More on the picture (the card's buttons, "Not saved yet"). */
  children?: React.ReactNode;
};

/**
 * A feature card's picture, 4:5 as in the shop (product-features.tsx), with an upload button on it that replaces
 * the picture. Without Cloudinary keys (local development) the button opens a box for an image reference instead.
 */
export function FeaturePicture({ imageUrl, alt, name, error, onUploaded, children }: FeaturePictureProps) {
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
      <div className="relative">
        <CloudImage
          src={imageUrl || null}
          alt={alt}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 85vw"
          className="rounded-md"
        />
        {children}
        <div className="absolute right-3 bottom-3">
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
              <PopoverContent aria-label={label} align="end">
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
