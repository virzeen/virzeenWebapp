"use client";

import { FormField, Input, Textarea } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { useFormContext } from "react-hook-form";
import { LinesField } from "./lines-field";

/**
 * "Description and care": the description, the bullets of the product details popup (Benefits, Product details,
 * Country/Region of origin) and care notes (specs/product-page.md "Admin product details").
 */
export function ProductDescription() {
  const form = useFormContext<ProductInput>();
  const { errors } = form.formState;

  return (
    <section aria-labelledby="description-heading" className="flex flex-col gap-4">
      <h2 id="description-heading" className="font-display text-h3">
        Description and care
      </h2>
      <FormField label="Description" error={errors.description?.message} required>
        <Textarea rows={6} {...form.register("description")} />
      </FormField>
      <LinesField
        control={form.control}
        name="benefits"
        label="Benefits"
        helper="Optional. One per line, up to 12. Shown in the product details popup."
      />
      <LinesField
        control={form.control}
        name="details"
        label="Product details"
        helper="Optional. One per line, up to 20, e.g. 100% cotton."
        rows={5}
      />
      <FormField
        label="Country/Region of origin"
        helper="Optional, e.g. Nepal"
        error={errors.countryOfOrigin?.message}
        className="sm:max-w-sm"
      >
        <Input maxLength={60} autoComplete="off" {...form.register("countryOfOrigin")} />
      </FormField>
      <FormField label="Care" helper="Optional: washing and care notes" error={errors.care?.message}>
        <Textarea rows={3} {...form.register("care")} />
      </FormField>
    </section>
  );
}
