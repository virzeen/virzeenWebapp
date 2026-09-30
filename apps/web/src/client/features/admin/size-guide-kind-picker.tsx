"use client";

import { FormField, RadioGroup, RadioGroupItem } from "@virzeen/ui";
import { SIZE_GUIDE_KIND_LABELS, type SizeGuideFormValues, type SizeGuideKind } from "@virzeen/validators";
import { Shirt, Watch } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";

type Picture = { imageUrl: string; imageAlt: string };

/**
 * Each type's picture while the other type is picked (Clothing's how-to-measure picture, Accessories' size chart),
 * kept by the size guide form for the kind picker and the pictures' uploaders.
 */
export type KindPictures = Partial<Record<SizeGuideKind, Picture>>;

const KINDS: { kind: SizeGuideKind; description: string; icon: typeof Shirt }[] = [
  { kind: "CHART", description: "A size table in cm. Customers can switch it to inches.", icon: Shirt },
  { kind: "PICTURE", description: "One picture of your size chart.", icon: Watch },
];

const isKind = (value: string): value is SizeGuideKind => value === "CHART" || value === "PICTURE";

/**
 * "Type" at the top of the size guide form (specs/product-page-v2.md "Size guides"): two large radio cards,
 * Clothing (a size table) and Accessories (one picture). Switching keeps what was typed until Save: the table stays
 * in the form, and each type keeps its own picture (Clothing's how-to-measure picture, Accessories' size chart) in
 * `picturesRef` while the other type is picked.
 */
export function SizeGuideKindPicker({ picturesRef }: { picturesRef: React.RefObject<KindPictures> }) {
  const form = useFormContext<SizeGuideFormValues>();

  function switchTo(next: SizeGuideKind) {
    const current = form.getValues("kind");
    if (next === current) return;
    picturesRef.current[current] = {
      imageUrl: form.getValues("imageUrl") ?? "",
      imageAlt: form.getValues("imageAlt") ?? "",
    };
    const picture = picturesRef.current[next] ?? { imageUrl: "", imageAlt: "" };
    form.setValue("kind", next, { shouldDirty: true });
    form.setValue("imageUrl", picture.imageUrl, { shouldDirty: true });
    form.setValue("imageAlt", picture.imageAlt, { shouldDirty: true });
    // The other type's problems no longer apply; after a save attempt, check this type's straight away.
    form.clearErrors(["chart", "imageUrl", "imageAlt"]);
    if (form.formState.isSubmitted) void form.trigger(["chart", "imageUrl"]);
  }

  return (
    <Controller
      control={form.control}
      name="kind"
      render={({ field, fieldState }) => (
        <FormField label="Type" error={fieldState.error?.message} required>
          <RadioGroup
            variant="card"
            value={field.value}
            onValueChange={(value) => isKind(value) && switchTo(value)}
            className="grid-cols-1 sm:grid-cols-2"
          >
            {KINDS.map(({ kind, description, icon: Icon }) => (
              <RadioGroupItem
                key={kind}
                value={kind}
                label={SIZE_GUIDE_KIND_LABELS[kind]}
                description={description}
                aside={<Icon className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />}
              />
            ))}
          </RadioGroup>
        </FormField>
      )}
    />
  );
}
