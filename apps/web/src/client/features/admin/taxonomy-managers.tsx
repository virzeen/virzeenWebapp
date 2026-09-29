"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  FormField,
  Input,
  Stack,
  Switch,
  Textarea,
  toast,
} from "@virzeen/ui";
import {
  categorySchema,
  collectionSchema,
  type CategoryInput,
  type CollectionInput,
} from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { messageFor } from "@/client/lib/error-messages";
import { saveCategoryAction, saveCollectionAction } from "@/server/actions/admin/catalog";
import { ArchiveButton } from "./archive-button";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const productCount = (count: number) => `${count} ${count === 1 ? "product" : "products"}`;

/**
 * Which row is in the form. Editing moves focus to the form's Name field and scrolls the form into view;
 * Save or Cancel returns focus to that row's Edit button.
 */
function useEditing<Row extends { id: string }>() {
  const [editing, setEditing] = useState<Row | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnTo = useRef<string | null>(null);
  useEffect(() => {
    if (editing || !returnTo.current) return;
    listRef.current?.querySelector<HTMLElement>(`[data-edit-id="${returnTo.current}"]`)?.focus();
    returnTo.current = null;
  }, [editing]);
  function stopEditing() {
    returnTo.current = editing?.id ?? null;
    setEditing(null);
  }
  return { editing, startEditing: setEditing, stopEditing, listRef };
}

type Category = { id: string; name: string; slug: string; sortOrder: number; _count: { products: number } };

function CategoryForm({ initial, onDone }: { initial?: Category; onDone: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: initial
      ? { id: initial.id, name: initial.name, slug: initial.slug, sortOrder: initial.sortOrder }
      : { name: "", slug: "", sortOrder: 0 },
  });
  const { errors, isSubmitting } = form.formState;
  const { setFocus } = form;

  // The form sits above the list: bring it into view when a row's Edit is chosen (it remounts per row).
  useEffect(() => {
    if (!initial) return;
    formRef.current?.scrollIntoView({ block: "start" });
    setFocus("name");
  }, [initial, setFocus]);

  async function onSubmit(values: CategoryInput) {
    setFormError(null);
    const result = await saveCategoryAction(values);
    if (!result.ok) {
      if (result.error.fields?.slug) form.setError("slug", { message: result.error.fields.slug });
      else setFormError(messageFor(result.error));
      return;
    }
    toast.success("Category saved");
    form.reset({ name: "", slug: "", sortOrder: 0 });
    onDone();
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      aria-labelledby="category-form-heading"
      className="grid scroll-mt-4 gap-4 rounded-md border border-line p-5 sm:grid-cols-4"
    >
      <h2 id="category-form-heading" className="font-display text-h3 sm:col-span-4">
        {initial ? `Edit ${initial.name}` : "Add a category"}
      </h2>
      {formError && (
        <Alert variant="danger" className="sm:col-span-4">
          {formError}
        </Alert>
      )}
      <FormField label="Name" error={errors.name?.message} required className="sm:col-span-2">
        <Input
          {...form.register("name", {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              if (!initial) form.setValue("slug", slugify(e.target.value));
            },
          })}
        />
      </FormField>
      <FormField label="URL slug" error={errors.slug?.message} required>
        <Input {...form.register("slug")} />
      </FormField>
      <FormField label="Order" error={errors.sortOrder?.message}>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          {...form.register("sortOrder", { valueAsNumber: true })}
        />
      </FormField>
      <div className="flex gap-2 sm:col-span-4">
        <Button type="submit" shape="pill" loading={isSubmitting}>
          {initial ? "Save" : "Add category"}
        </Button>
        {initial && (
          <Button variant="secondary" shape="pill" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const { editing, startEditing, stopEditing, listRef } = useEditing<Category>();
  return (
    <Stack gap={6}>
      <CategoryForm key={editing?.id ?? "new"} initial={editing ?? undefined} onDone={stopEditing} />
      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet."
          description="Add Tops, Bottoms, Accessories… to organise the shop."
        />
      ) : (
        <ul ref={listRef} className="divide-y divide-line border-y border-line">
          {categories.map((category) => (
            <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex flex-col">
                <span className="text-body">{category.name}</span>
                <span className="text-small text-ink-muted">
                  /shop/{category.slug} · {productCount(category._count.products)} · order{" "}
                  {category.sortOrder}
                </span>
              </span>
              <span className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  data-edit-id={category.id}
                  aria-label={`Edit ${category.name}`}
                  onClick={() => startEditing(category)}
                >
                  Edit
                </Button>
                <ArchiveButton kind="category" id={category.id} name={category.name} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
}

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFeatured: boolean;
  _count: { products: number };
};

function CollectionForm({ initial, onDone }: { initial?: Collection; onDone: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const empty: CollectionInput = { name: "", slug: "", description: "", isFeatured: false };
  const form = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema),
    defaultValues: initial
      ? {
          id: initial.id,
          name: initial.name,
          slug: initial.slug,
          description: initial.description ?? "",
          isFeatured: initial.isFeatured,
        }
      : empty,
  });
  const { errors, isSubmitting } = form.formState;
  const { setFocus } = form;

  // The form sits above the list: bring it into view when a row's Edit is chosen (it remounts per row).
  useEffect(() => {
    if (!initial) return;
    formRef.current?.scrollIntoView({ block: "start" });
    setFocus("name");
  }, [initial, setFocus]);

  async function onSubmit(values: CollectionInput) {
    setFormError(null);
    const result = await saveCollectionAction(values);
    if (!result.ok) {
      if (result.error.fields?.slug) form.setError("slug", { message: result.error.fields.slug });
      else setFormError(messageFor(result.error));
      return;
    }
    toast.success("Collection saved");
    form.reset(empty);
    onDone();
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      aria-labelledby="collection-form-heading"
      className="grid scroll-mt-4 gap-4 rounded-md border border-line p-5 sm:grid-cols-2"
    >
      <h2 id="collection-form-heading" className="font-display text-h3 sm:col-span-2">
        {initial ? `Edit ${initial.name}` : "Add a collection"}
      </h2>
      {formError && (
        <Alert variant="danger" className="sm:col-span-2">
          {formError}
        </Alert>
      )}
      <FormField label="Name" error={errors.name?.message} required>
        <Input
          {...form.register("name", {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              if (!initial) form.setValue("slug", slugify(e.target.value));
            },
          })}
        />
      </FormField>
      <FormField label="URL slug" error={errors.slug?.message} required>
        <Input {...form.register("slug")} />
      </FormField>
      <FormField
        label="Description"
        helper="Optional"
        error={errors.description?.message}
        className="sm:col-span-2"
      >
        <Textarea rows={2} {...form.register("description")} />
      </FormField>
      <Controller
        control={form.control}
        name="isFeatured"
        render={({ field }) => (
          <Switch label="Featured on the home page" checked={field.value} onCheckedChange={field.onChange} />
        )}
      />
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" shape="pill" loading={isSubmitting}>
          {initial ? "Save" : "Add collection"}
        </Button>
        {initial && (
          <Button variant="secondary" shape="pill" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function CollectionManager({ collections }: { collections: Collection[] }) {
  const { editing, startEditing, stopEditing, listRef } = useEditing<Collection>();
  return (
    <Stack gap={6}>
      <CollectionForm key={editing?.id ?? "new"} initial={editing ?? undefined} onDone={stopEditing} />
      {collections.length === 0 ? (
        <EmptyState title="No collections yet." description="Group products for campaigns and seasons." />
      ) : (
        <ul ref={listRef} className="divide-y divide-line border-y border-line">
          {collections.map((collection) => (
            <li key={collection.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-body">
                  {collection.name}
                  {collection.isFeatured && <Badge variant="accent">Featured</Badge>}
                </span>
                <span className="text-small text-ink-muted">
                  /collections/{collection.slug} · {productCount(collection._count.products)} · add products
                  from each product&apos;s page
                </span>
              </span>
              <span className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  data-edit-id={collection.id}
                  aria-label={`Edit ${collection.name}`}
                  onClick={() => startEditing(collection)}
                >
                  Edit
                </Button>
                <ArchiveButton kind="collection" id={collection.id} name={collection.name} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
}
