"use client";

import { cn, Dialog, DialogContent, toast } from "@virzeen/ui";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { ImageUploader } from "../image-uploader";
import { IMAGE_ACCEPT, imageProblem, useImageUploads } from "../use-image-uploads";
import { useProductEditor } from "./editor-context";
import { MAX_FEATURES } from "./features-cards";

type FeatureAddCardProps = {
  /** How many features the product has now. */
  count: number;
  /** One new feature's picture, saved straight away; returns why it can't be used, or null. */
  onPicture: (imageRef: string) => string | null;
  /** After the Image reference box added a feature: its card's title pencil, which takes focus. */
  newCardFocus: () => HTMLElement | null | undefined;
};

const hasFiles = (event: React.DragEvent) => event.dataTransfer.types.includes("Files");

/** "Only 2 more features fit, so the rest weren't added." */
const cutMessage = (left: number) =>
  left === 0
    ? `Add up to ${MAX_FEATURES} features`
    : `Only ${left} more ${left === 1 ? "feature fits" : "features fit"}, so the rest weren't added.`;

/**
 * The + tile, the last cell of the features grid (specs/product-page-v2.md): the size of a thumbnail, dashed, with
 * + and "Add feature". The whole tile is one button: it opens the file picker (click, Enter or Space) and takes
 * pictures dropped on it. Each picture is a new feature, saved as soon as it's uploaded; several at once add several,
 * up to 9 (a toast says when some didn't fit). Without Cloudinary keys (local and e2e) a click or a drop opens a box
 * for an image reference instead. Marked data-feature-add so focus can land here after the last card goes.
 */
export function FeatureAddCard({ count, onPicture, newCardFocus }: FeatureAddCardProps) {
  const { product, options } = useProductEditor();
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceProblem, setReferenceProblem] = useState<string | null>(null);
  const addedByReference = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const tile = useRef<HTMLButtonElement>(null);
  const { pending, errors, upload } = useImageUploads("products", product.id, (imageRef) =>
    setProblem(onPicture(imageRef)),
  );
  const left = Math.max(MAX_FEATURES - count - pending.length, 0);
  const uploading = pending.length;
  const uploadingText = `Uploading ${uploading} ${uploading === 1 ? "picture" : "pictures"}…`;
  const problems = [...new Set([...errors, problem ?? ""])].filter(Boolean);

  function add(files: File[]) {
    setProblem(null);
    const usable = files.filter((file) => !imageProblem(file)).length;
    if (usable > left) toast.error(cutMessage(left));
    // useImageUploads names the files it can't take; the cut is the toast above.
    void upload(files, left);
  }

  function choose() {
    if (options.uploadsEnabled) return input.current?.click();
    addedByReference.current = false;
    setReferenceProblem(null);
    setReferenceOpen(true);
  }

  function addReference(imageRef: string) {
    const found = onPicture(imageRef);
    setReferenceProblem(found);
    if (found) return;
    addedByReference.current = true;
    setReferenceOpen(false);
  }

  return (
    <li data-feature-add className="flex min-w-0 flex-col gap-2">
      <button
        ref={tile}
        type="button"
        onClick={choose}
        onDragOver={(event) => {
          // Always taken, uploads on or off: an untaken file drop opens the picture in the tab, leaving the editor.
          if (!hasFiles(event)) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          setDragging(false);
          if (options.uploadsEnabled) add(Array.from(event.dataTransfer.files));
          else choose();
        }}
        className={cn(
          "flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line-strong p-4 text-center text-ink-muted transition-colors duration-150 ease-standard hover:border-ink hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none",
          dragging && "border-ink bg-surface text-ink",
        )}
      >
        <Plus className="size-6" strokeWidth={1.5} aria-hidden />
        <span className="font-medium">Add feature</span>
      </button>
      {options.uploadsEnabled && (
        <input
          ref={input}
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
      )}
      {uploading > 0 && (
        <p aria-hidden className="text-small text-ink-muted">
          {uploadingText}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {uploading > 0 ? uploadingText : ""}
      </p>
      {problems.map((message) => (
        <p key={message} tabIndex={-1} data-field-error className="text-small text-danger outline-none">
          {message}
        </p>
      ))}
      {!options.uploadsEnabled && (
        <Dialog open={referenceOpen} onOpenChange={setReferenceOpen}>
          <DialogContent
            title="Add feature"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const back = tile.current?.isConnected ? tile.current : null;
              (addedByReference.current ? (newCardFocus() ?? back) : back)?.focus();
            }}
          >
            <div className="flex flex-col gap-2">
              <ImageUploader
                folder="products"
                entityId={product.id}
                uploadsEnabled={false}
                label="Add feature"
                onUploaded={addReference}
              />
              {referenceProblem && <p className="text-small text-danger">{referenceProblem}</p>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </li>
  );
}
