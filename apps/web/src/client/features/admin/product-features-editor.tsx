"use client";

import { Button } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { Plus } from "lucide-react";
import { useRef } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { FeatureCard, type FeatureMove } from "./feature-card";
import { itemButton, keepFocusOnPress, refocusAfterListChange } from "./form-focus";
import { ListError } from "./list-error";

const MAX_FEATURES = 6; // productSchema allows 6

type ProductFeaturesEditorProps = {
  productId: string | undefined;
  uploadsEnabled: boolean;
};

/**
 * "Features that perform" (specs/product-page.md): up to 6 cards shown in a row under the product, each with a
 * picture, a title and a short text. Add, move up or down, remove; focus follows the moved or removed card.
 */
export function ProductFeaturesEditor({ productId, uploadsEnabled }: ProductFeaturesEditorProps) {
  const form = useFormContext<ProductInput>();
  const features = useFieldArray({ control: form.control, name: "features", keyName: "fieldKey" });
  const errors = form.formState.errors.features;
  const listError = errors?.root?.message ?? errors?.message;
  const listRef = useRef<HTMLOListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const count = features.fields.length;

  // The moved card keeps focus on the same arrow, or on the other one once that arrow is disabled.
  function move(index: number, to: number, action: FeatureMove) {
    features.move(index, to);
    refocusAfterListChange(
      () => itemButton(listRef.current, to, action),
      () => itemButton(listRef.current, to, action === "up" ? "down" : "up"),
    );
  }

  // Focus goes to the next card's Remove, else the previous one's, else "Add feature".
  function remove(index: number) {
    features.remove(index);
    refocusAfterListChange(
      () => itemButton(listRef.current, index, "remove"),
      () => itemButton(listRef.current, index - 1, "remove"),
      () => addRef.current,
    );
  }

  return (
    <section aria-labelledby="features-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="features-heading" className="font-display text-h3">
          Features that perform
        </h2>
        <p className="text-small text-ink-muted">
          {count} of {MAX_FEATURES}
        </p>
      </div>
      <p className="-mt-2 text-small text-ink-muted">
        Optional: cards shown under the product, each a picture with a short title and text.
      </p>
      {listError && <ListError>{listError}</ListError>}
      {count > 0 && (
        <ol ref={listRef} className="flex flex-col gap-4">
          {features.fields.map((feature, index) => (
            <FeatureCard
              key={feature.fieldKey}
              index={index}
              count={count}
              productId={productId}
              uploadsEnabled={uploadsEnabled}
              onMove={move}
              onRemove={remove}
            />
          ))}
        </ol>
      )}
      <Button
        ref={addRef}
        variant="secondary"
        shape="pill"
        className="self-start"
        disabled={count >= MAX_FEATURES}
        onMouseDown={keepFocusOnPress}
        onClick={() =>
          features.append(
            { title: "", body: "", imageUrl: "", alt: "" },
            { focusName: `features.${count}.title` },
          )
        }
      >
        <Plus className="size-4" strokeWidth={1.5} aria-hidden />
        Add feature
      </Button>
    </section>
  );
}
