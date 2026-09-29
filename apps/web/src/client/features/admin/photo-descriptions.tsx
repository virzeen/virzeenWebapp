"use client";

import { Accordion, AccordionItem, FormField, Input } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

type PhotoDescriptionsProps = {
  /** The section's photos: a stable key and the place in the whole `images` list. */
  photos: { key: string; index: number }[];
  /** "" for the photos shared by every style. */
  style: string;
  headingLevel: 3 | 4;
};

/** "Photo descriptions (optional)": one per photo. Opens by itself when one has an error. */
export function PhotoDescriptions({ photos, style, headingLevel }: PhotoDescriptionsProps) {
  const form = useFormContext<ProductInput>();
  const name = useWatch({ control: form.control, name: "name" });
  const errors = form.formState.errors.images;
  const [open, setOpen] = useState("");
  const hasError = photos.some(({ index }) => errors?.[index]?.alt);

  return (
    <Accordion type="single" collapsible value={hasError ? "descriptions" : open} onValueChange={setOpen}>
      <AccordionItem value="descriptions" title="Photo descriptions (optional)" headingLevel={headingLevel}>
        <div className="flex flex-col gap-4">
          <p className="text-small">
            Read out by screen readers and used by search engines. Leave blank to use the product
            {style ? " and style" : ""} name.
          </p>
          {photos.map(({ key, index }, position) => (
            <FormField
              key={key}
              label={position === 0 ? "Photo 1 (main)" : `Photo ${position + 1}`}
              error={errors?.[index]?.alt?.message}
            >
              <Input
                maxLength={200}
                placeholder={[name.trim() || "The product name", style].filter(Boolean).join(", ")}
                {...form.register(`images.${index}.alt`)}
              />
            </FormField>
          ))}
        </div>
      </AccordionItem>
    </Accordion>
  );
}
