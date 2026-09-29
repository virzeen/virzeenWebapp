"use client";

import { FormField, Link, Select } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { Controller, useFormContext } from "react-hook-form";

// The select can't hold "" as an option's value (Radix), so "No size guide" has its own; the form keeps "".
const NO_GUIDE = "none";

/** Organise → "Size guide": the chart customers open from the product page (specs/size-guides.md). */
export function SizeGuideSelect({ sizeGuides }: { sizeGuides: { id: string; name: string }[] }) {
  const form = useFormContext<ProductInput>();
  const options = [
    { value: NO_GUIDE, label: "No size guide" },
    ...sizeGuides.map((guide) => ({ value: guide.id, label: guide.name })),
  ];

  return (
    <div className="flex flex-col gap-1">
      <FormField label="Size guide" error={form.formState.errors.sizeGuideId?.message}>
        <Controller
          control={form.control}
          name="sizeGuideId"
          render={({ field }) => (
            <Select
              ref={field.ref}
              value={field.value || NO_GUIDE}
              onValueChange={(value) => field.onChange(value === NO_GUIDE ? "" : value)}
              onBlur={field.onBlur}
              options={options}
            />
          )}
        />
      </FormField>
      <Link href="/admin/size-guides" className="inline-flex min-h-11 items-center self-start text-small">
        Manage size guides
      </Link>
    </div>
  );
}
