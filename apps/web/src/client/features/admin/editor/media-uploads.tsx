"use client";

import { Dialog, DialogContent } from "@virzeen/ui";
import { useRef, useState } from "react";
import { ImageUploader } from "../image-uploader";
import { IMAGE_ACCEPT, useImageUploads } from "../use-image-uploads";
import { PHOTOS_PER_STYLE } from "./media-photos";

type MediaUploadsOptions = {
  productId: string;
  /** How many more photos fit (media-photos.ts uploadRoom). */
  room: number;
  uploadsEnabled: boolean;
  /** One finished photo; called in the order the files were chosen, bound to the style they were chosen for. */
  onUploaded: (url: string) => void;
  /** The gallery: after the local "Image reference" popup, focus goes to its visible Add photos when the opener is gone. */
  root: React.RefObject<HTMLElement | null>;
};

export type MediaUploads = ReturnType<typeof useMediaUploads>;

const hasFiles = (event: React.DragEvent) => event.dataTransfer.types.includes("Files");

/**
 * The gallery's uploads (specs/product-editor-on-page.md "Gallery"): many files at once from any Add photos button
 * or dropped on the main photo, up to 12 per style (useImageUploads does the work and the messages). Without
 * Cloudinary keys (local and e2e) the buttons open a small popup with the "Image reference" box instead.
 */
export function useMediaUploads({ productId, room, uploadsEnabled, onUploaded, root }: MediaUploadsOptions) {
  const { pending, errors, upload } = useImageUploads("products", productId, onUploaded);
  const fileInput = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const left = Math.max(room - pending.length, 0);

  function add(files: File[]) {
    const full =
      left === 0
        ? `Photos are full (${PHOTOS_PER_STYLE} at most). Remove one to add another.`
        : `Only ${left} more ${left === 1 ? "photo fits" : "photos fit"} (${PHOTOS_PER_STYLE} at most), so the rest weren't added.`;
    void upload(files, left, full);
  }

  function choose() {
    if (uploadsEnabled) return fileInput.current?.click();
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setReferenceOpen(true);
  }

  /** Spread on the main photo or the empty drop zone: files dragged onto it upload. */
  const dropProps = {
    onDragOver: (event: React.DragEvent) => {
      if (!uploadsEnabled || !hasFiles(event)) return;
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event: React.DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (event: React.DragEvent) => {
      if (!uploadsEnabled || !hasFiles(event)) return;
      event.preventDefault();
      setDragging(false);
      add(Array.from(event.dataTransfer.files));
    },
  };

  const parts = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          add(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      {!uploadsEnabled && (
        <Dialog open={referenceOpen} onOpenChange={setReferenceOpen}>
          <DialogContent
            title="Add photos"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const back = opener.current?.isConnected ? opener.current : null;
              const visible = [
                ...(root.current?.querySelectorAll<HTMLElement>("[data-add-photos]") ?? []),
              ].find((button) => button.offsetParent !== null);
              (back ?? visible)?.focus();
            }}
          >
            <ImageUploader
              folder="products"
              entityId={productId}
              uploadsEnabled={false}
              label="Add photo"
              multiple={{ count: PHOTOS_PER_STYLE - left, limit: PHOTOS_PER_STYLE }}
              onUploaded={(url) => {
                onUploaded(url);
                setReferenceOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );

  return { pending, errors, left, dragging, dropProps, choose, parts };
}
