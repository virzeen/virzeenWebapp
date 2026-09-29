"use client";

import { Button, Checkbox, FormField, Input, Select, toast } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { messageFor } from "@/client/lib/error-messages";
import { saveCategoryAction } from "@/server/actions/admin/catalog";
import { keepFocusOnPress } from "./form-focus";
import { SizeGuideSelect } from "./size-guide-select";
import { slugify } from "./slugify";

type ProductOrganizeProps = {
  categories: { value: string; label: string }[];
  collections: { id: string; name: string }[];
  sizeGuides: { id: string; name: string }[];
};

/** Sidebar box: category (with "New category" right here, as in WordPress), size guide and collections. */
export function ProductOrganize({ categories, collections, sizeGuides }: ProductOrganizeProps) {
  const form = useFormContext<ProductInput>();
  const router = useRouter();
  const [added, setAdded] = useState<{ value: string; label: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newError, setNewError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The page's list catches up after router.refresh(); until then the new one comes from `added`.
  const options = [...categories, ...added.filter((a) => !categories.some((c) => c.value === a.value))];

  function addCategory() {
    const name = newName.trim();
    if (!name) return setNewError("Enter a name");
    setNewError(null);
    startTransition(async () => {
      const result = await saveCategoryAction({ name, slug: slugify(name), sortOrder: 0 });
      if (!result.ok) {
        setNewError(
          result.error.code === "VALIDATION_FAILED" && result.error.fields?.slug
            ? "A category with this name already exists. Choose it in the list."
            : messageFor(result.error),
        );
        return;
      }
      setAdded((current) => [...current, { value: result.data.id, label: name }]);
      form.setValue("categoryId", result.data.id, { shouldDirty: true, shouldValidate: true });
      setNewName("");
      setAdding(false);
      toast.success("Category added");
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="organize-heading"
      className="flex flex-col gap-4 rounded-md border border-line p-4"
    >
      <h2 id="organize-heading" className="font-display text-h3">
        Organise
      </h2>
      <FormField label="Category" error={form.formState.errors.categoryId?.message} required>
        <Controller
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <Select
              ref={field.ref}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={options}
              placeholder="Choose a category"
            />
          )}
        />
      </FormField>
      {adding ? (
        <div className="flex flex-col gap-2">
          <FormField label="New category name" error={newError ?? undefined}>
            <Input
              value={newName}
              maxLength={60}
              autoComplete="off"
              enterKeyHint="done"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault(); // Enter here adds the category; it never saves the product
                addCategory();
              }}
            />
          </FormField>
          <div className="flex gap-2">
            <Button
              size="sm"
              shape="pill"
              loading={pending}
              onMouseDown={keepFocusOnPress}
              onClick={addCategory}
            >
              Add category
            </Button>
            <Button
              variant="ghost"
              size="sm"
              shape="pill"
              disabled={pending}
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="link" size="sm" className="self-start" onClick={() => setAdding(true)}>
          + New category
        </Button>
      )}

      <SizeGuideSelect sizeGuides={sizeGuides} />

      {collections.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="pb-1 text-small font-medium">Collections</legend>
          <Controller
            control={form.control}
            name="collectionIds"
            render={({ field }) => (
              <div className="flex flex-col">
                {collections.map((collection) => (
                  <Checkbox
                    key={collection.id}
                    label={collection.name}
                    checked={field.value.includes(collection.id)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked === true
                          ? [...field.value, collection.id]
                          : field.value.filter((id) => id !== collection.id),
                      )
                    }
                  />
                ))}
              </div>
            )}
          />
        </fieldset>
      )}
    </section>
  );
}
