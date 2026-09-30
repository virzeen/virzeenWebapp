"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormField, Input, Link, Select } from "@virzeen/ui";
import { createDraftProductSchema, type CreateDraftProductInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { messageFor } from "@/client/lib/error-messages";
import { createDraftProductAction } from "@/server/actions/admin/catalog";
import { RupeesInput } from "../rupees-input";

type NewProductFormProps = {
  categories: { value: string; label: string }[];
  /** A Cancel button or link, shown before "Create draft". */
  cancel: React.ReactNode;
};

/**
 * New product (specs/product-editor-on-page.md "User flow"): a name, a category and a price make a draft, and its
 * editor opens. Used in the Products page's popup and on /admin/products/new.
 */
export function NewProductForm({ categories, cancel }: NewProductFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  // Stays busy until the editor opens, so a second press can't make a second draft.
  const [opening, setOpening] = useState(false);
  const form = useForm<CreateDraftProductInput>({
    resolver: zodResolver(createDraftProductSchema),
    mode: "onBlur",
    defaultValues: { name: "", categoryId: "", pricePaisa: Number.NaN },
  });
  const { errors, isSubmitting } = form.formState;

  async function create(values: CreateDraftProductInput) {
    setFormError(null);
    const result = await createDraftProductAction(values);
    if (result.ok) {
      setOpening(true);
      return router.push(`/admin/products/${result.data.id}`);
    }
    let onFields = false;
    for (const [field, message] of Object.entries(result.error.fields ?? {})) {
      if (field !== "name" && field !== "categoryId" && field !== "pricePaisa") continue;
      form.setError(field, { message }, { shouldFocus: !onFields });
      onFields = true;
    }
    if (!onFields) setFormError(messageFor(result.error));
  }

  if (categories.length === 0) {
    return (
      <Alert variant="info">
        Add a category first: every product belongs to one.{" "}
        <Link href="/admin/categories">Go to categories</Link>
      </Alert>
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(create)} className="flex flex-col gap-4">
      {formError && <Alert variant="danger">{formError}</Alert>}
      <FormField label="Product name" error={errors.name?.message} required>
        <Input autoComplete="off" {...form.register("name")} />
      </FormField>
      <FormField label="Category" error={errors.categoryId?.message} required>
        <Controller
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <Select
              ref={field.ref}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={categories}
              placeholder="Choose a category"
            />
          )}
        />
      </FormField>
      <FormField
        label="Price (Rs)"
        helper="Includes VAT. You add shipping, photos and sizes on the next page."
        error={errors.pricePaisa?.message}
        required
      >
        <Controller
          control={form.control}
          name="pricePaisa"
          render={({ field }) => (
            <RupeesInput
              ref={field.ref}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </FormField>
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        {cancel}
        <Button type="submit" shape="pill" loading={isSubmitting || opening}>
          Create draft
        </Button>
      </div>
    </form>
  );
}
