"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { ImageUploader } from "../image-uploader";
import { useProductEditor } from "./editor-context";

/**
 * The + card at the end of "Features that perform": a new feature starts with its picture (uploaded here, or an
 * image reference without Cloudinary keys); its card then asks for a title and text. `onPicture` returns why the
 * picture can't be used, or null. Marked data-feature-add so focus can land here after the last card goes.
 */
export function FeatureAddCard({ onPicture }: { onPicture: (imageRef: string) => string | null }) {
  const { product, options } = useProductEditor();
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <li data-feature-add className="flex flex-col gap-2">
      <div className="flex aspect-4/5 flex-col items-center justify-center gap-4 rounded-md border border-dashed border-line-strong p-6 text-center">
        <Plus className="size-8 text-ink-muted" strokeWidth={1.5} aria-hidden />
        <p className="text-small text-ink-muted">Start with its picture, then add a title and text.</p>
        <ImageUploader
          folder="products"
          entityId={product.id}
          uploadsEnabled={options.uploadsEnabled}
          label="Add feature"
          onUploaded={(imageRef) => setProblem(onPicture(imageRef))}
        />
      </div>
      {problem && (
        <p tabIndex={-1} data-field-error className="text-small text-danger outline-none">
          {problem}
        </p>
      )}
    </li>
  );
}
