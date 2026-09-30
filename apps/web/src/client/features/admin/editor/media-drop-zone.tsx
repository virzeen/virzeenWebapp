"use client";

import { Button, cn } from "@virzeen/ui";
import { ImagePlus } from "lucide-react";
import type { MediaUploads } from "./media-uploads";

type MediaDropZoneProps = {
  uploads: MediaUploads;
  uploadsEnabled: boolean;
  className?: string;
};

/**
 * The main photo's place while the style (or the product) has no photos: one big 4:5 drop zone with Add photos
 * (specs/product-editor-on-page.md "Gallery"). Files dropped anywhere on it upload.
 */
export function MediaDropZone({ uploads, uploadsEnabled, className }: MediaDropZoneProps) {
  const uploading = uploads.pending.length;
  return (
    <div
      {...uploads.dropProps}
      className={cn(
        "flex aspect-4/5 w-full flex-col items-center justify-center gap-4 rounded-md border border-dashed border-line-strong bg-surface p-6 text-center transition-colors duration-150 ease-standard",
        uploads.dragging && "border-ink bg-canvas",
        className,
      )}
    >
      <ImagePlus className="size-6 text-ink-muted" strokeWidth={1.5} aria-hidden />
      <Button
        data-add-photos
        variant="secondary"
        shape="pill"
        disabled={uploads.left === 0}
        onClick={uploads.choose}
      >
        Add photos
      </Button>
      <p className="max-w-xs text-small text-ink-muted">
        {uploading > 0
          ? `Uploading ${uploading} ${uploading === 1 ? "photo" : "photos"}…`
          : uploadsEnabled
            ? "Drag photos here, or choose them. JPG, PNG, WebP or AVIF, up to 10 MB each."
            : "The first photo is the main photo."}
      </p>
    </div>
  );
}
