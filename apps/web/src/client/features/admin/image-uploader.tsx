"use client";

import { Button, cn, FormField, Input, Skeleton } from "@virzeen/ui";
import type { UploadSignatureInput } from "@virzeen/validators";
import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { keepFocusOnPress } from "./form-focus";
import { IMAGE_ACCEPT, useImageUploads } from "./use-image-uploads";

type ImageUploaderProps = {
  folder: UploadSignatureInput["folder"];
  entityId: string;
  uploadsEnabled: boolean;
  onUploaded: (imageRef: string) => void;
  label?: string;
  /** Product photos: several files at once, chosen or dragged onto the area; `count` of `limit` already added. */
  multiple?: { count: number; limit: number };
  /** A narrow column (a style card's photos): a smaller drop area and 2-column upload tiles. */
  compact?: boolean;
};

const hasFiles = (event: React.DragEvent) => event.dataTransfer.types.includes("Files");

/**
 * Uploads straight from the browser to Cloudinary with server-signed parameters (project-brief.md §10).
 * Without Cloudinary keys (local development) it accepts an image reference instead.
 * data-image-uploader: the product form sends focus here once the last image is removed.
 * keepFocusOnPress: pressing a button mustn't blur a form field first (its error line would move the button).
 */
export function ImageUploader({
  folder,
  entityId,
  uploadsEnabled,
  onUploaded,
  label = "Add image",
  multiple,
  compact = false,
}: ImageUploaderProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [manualRef, setManualRef] = useState("");
  const [dragging, setDragging] = useState(false);
  const { pending, errors, upload } = useImageUploads(folder, entityId, onUploaded);
  const room = multiple ? Math.max(multiple.limit - multiple.count - pending.length, 0) : 1;

  function add(files: File[]) {
    if (!multiple) return void upload(files.slice(0, 1));
    const full =
      room === 0
        ? `Photos are full (${multiple.limit} at most). Remove one to add another.`
        : `Only ${room} more ${room === 1 ? "photo fits" : "photos fit"} (${multiple.limit} at most), so the rest weren't added.`;
    void upload(files, room, full);
  }

  if (!uploadsEnabled) {
    return (
      <div
        data-image-uploader
        className="flex flex-col gap-2 rounded-md border border-dashed border-line-strong p-4"
      >
        <FormField
          label="Image reference"
          helper="Uploads switch on when Cloudinary keys are set. For now, enter a Cloudinary public id or a /public path."
        >
          <Input
            value={manualRef}
            onChange={(e) => setManualRef(e.target.value)}
            placeholder="/placeholder/product-01.jpg"
          />
        </FormField>
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          className="self-start"
          disabled={manualRef.trim().length === 0 || room === 0}
          onMouseDown={keepFocusOnPress}
          onClick={() => {
            onUploaded(manualRef.trim());
            setManualRef("");
          }}
        >
          {label}
        </Button>
      </div>
    );
  }

  const chooser = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple={Boolean(multiple)}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => {
          add(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <Button
        variant="secondary"
        shape="pill"
        loading={!multiple && pending.length > 0}
        disabled={room === 0}
        className={cn(!multiple && "self-start")}
        onMouseDown={keepFocusOnPress}
        onClick={() => fileInput.current?.click()}
      >
        <ImagePlus className="size-4" strokeWidth={1.5} aria-hidden />
        {label}
      </Button>
    </>
  );

  return (
    <div data-image-uploader className="flex flex-col gap-3">
      {multiple && pending.length > 0 && (
        <ul className={cn("grid grid-cols-2", compact ? "gap-3" : "gap-4 sm:grid-cols-3 xl:grid-cols-4")}>
          {pending.map((file) => (
            <li key={file.key} className="flex flex-col gap-2">
              <Skeleton shape="image" />
              <span className="truncate text-small text-ink-muted">Uploading {file.name}</span>
            </li>
          ))}
        </ul>
      )}
      {multiple ? (
        <div
          onDragOver={(e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            setDragging(false);
            add(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-md border border-dashed border-line-strong text-center transition-colors duration-150 ease-standard",
            compact ? "px-3 py-4" : "px-4 py-8",
            dragging && "border-ink bg-surface",
          )}
        >
          <p className="text-small text-ink-muted">
            Drag photos here, or choose them. JPG, PNG, WebP or AVIF, up to 10 MB each.
          </p>
          {chooser}
        </div>
      ) : (
        chooser
      )}
      <p aria-live="polite" className="sr-only">
        {pending.length > 0 ? `Uploading ${pending.length} ${pending.length === 1 ? "image" : "images"}` : ""}
      </p>
      {errors.length > 0 && (
        <ul className="flex flex-col gap-1">
          {[...new Set(errors)].map((message) => (
            <li key={message} className="text-small text-danger">
              {message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
