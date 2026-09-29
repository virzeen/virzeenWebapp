"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Accordion, AccordionItem, Alert, FormField, Input, Textarea, toast } from "@virzeen/ui";
import { productSchema, type ProductInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form";
import type { SizeGuideView } from "@/client/features/products/product-details-data";
import { messageFor } from "@/client/lib/error-messages";
import { saveProductAction } from "@/server/actions/admin/catalog";
import { useRevealFirstError } from "./form-focus";
import { previewUrl, writePreviewDraft } from "./preview-draft";
import { ProductDescription } from "./product-description";
import { ProductFeaturesEditor } from "./product-features-editor";
import { ProductOrganize } from "./product-organize";
import { ProductPhotos } from "./product-photos";
import { ProductPublishPanel, type SaveAction } from "./product-publish-panel";
import { ProductVariants } from "./product-variants";
import { slugify } from "./slugify";
import { useUnsavedChanges } from "./use-unsaved-changes";

type ProductFormProps = {
  /** The saved product; absent on the New product page. `savedAt` changes after each save (the form reloads). */
  saved?: { id: string; slug: string; isPublished: boolean; savedAt: string };
  defaultValues?: ProductInput;
  categories: { value: string; label: string; slug?: string }[];
  collections: { id: string; name: string }[];
  /** Active size guides, whole, so the preview's Size guide popup can show the picked one. */
  sizeGuides: (SizeGuideView & { id: string })[];
  uploadsEnabled: boolean;
};

const EMPTY: ProductInput = {
  name: "",
  slug: "",
  description: "",
  care: "",
  benefits: [],
  details: [],
  countryOfOrigin: "",
  seoDescription: "",
  categoryId: "",
  sizeGuideId: "",
  collectionIds: [],
  isPublished: false,
  images: [],
  features: [],
  shippingPaisa: Number.NaN,
  variants: [{ sku: "", size: "", color: "", pricePaisa: Number.NaN, stock: 0, isActive: true }],
};

const SAVED_TOAST: Record<SaveAction, string> = {
  publish: "Product published",
  draft: "Draft saved",
  save: "Product saved",
  unpublish: "Product unpublished",
};

/**
 * WordPress-style product editor (specs/admin-product-editor.md): content on the left, Publish box and organising
 * on the right; one column on phones with the save buttons fixed to the bottom. Forms in pages (patterns.md §10).
 */
export function ProductForm({
  saved,
  defaultValues,
  categories,
  collections,
  sizeGuides,
  uploadsEnabled,
}: ProductFormProps) {
  const router = useRouter();
  const initial = defaultValues ?? EMPTY;
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<SaveAction | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(saved));
  const [seoOpen, setSeoOpen] = useState("");
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    mode: "onBlur",
    defaultValues: initial,
    // useRevealFirstError focuses the first problem in page order instead.
    shouldFocusError: false,
  });
  const { errors, isDirty, submitCount } = form.formState;
  // One photo list for the shared photos and every style card (specs/product-styles.md).
  const images = useFieldArray({ control: form.control, name: "images", keyName: "fieldKey" });
  const hasStyles = useWatch({ control: form.control, name: "variants" }).some(
    (row) => row.isActive && (row.color ?? "").trim() !== "",
  );
  const formRef = useRevealFirstError(submitCount);
  useUnsavedChanges(isDirty && pending === null);

  // After a save the page sends the saved product (made SKUs, new variant ids): load it, so a second save
  // updates those variants instead of adding them again.
  const loadedAt = useRef(saved?.savedAt);
  useEffect(() => {
    if (saved?.savedAt === loadedAt.current) return;
    loadedAt.current = saved?.savedAt;
    form.reset(initial);
  }, [saved?.savedAt, initial, form]);

  // Preview (specs/admin-product-editor.md): the draft goes to the preview tab through localStorage, again after
  // every change once Preview has been opened, so the tab follows the editor.
  const previewKey = saved?.id ?? "new";
  const previewing = useRef(false);
  const handOverDraft = useCallback(() => {
    const values = form.getValues();
    const category = categories.find((option) => option.value === values.categoryId);
    const sizeGuide = sizeGuides.find((guide) => guide.id === values.sizeGuideId);
    writePreviewDraft(previewKey, {
      values,
      category: category ? { name: category.label, slug: category.slug ?? slugify(category.label) } : null,
      sizeGuide: sizeGuide ?? null,
    });
  }, [form, categories, sizeGuides, previewKey]);
  useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: () => {
        if (!previewing.current) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(handOverDraft, 250);
      },
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [form, handOverDraft]);

  function openPreview() {
    previewing.current = true;
    handOverDraft();
    window.open(previewUrl(previewKey), `virzeen-preview-${previewKey}`);
  }

  // Checks across rows and lists (duplicate SKUs, For sale, photos before publishing) only re-run when asked.
  function recheckLists() {
    if (form.formState.isSubmitted) void form.trigger(["variants", "images"]);
  }

  async function submit(values: ProductInput, action: SaveAction) {
    setFormError(null);
    setPending(action);
    const result = await saveProductAction(saved ? { id: saved.id, product: values } : { product: values });
    setPending(null);
    if (result.ok) {
      toast.success(SAVED_TOAST[action]);
      if (!saved) {
        form.reset(values); // not "unsaved" any more, so leaving for the edit page doesn't ask
        router.replace(`/admin/products/${result.data.id}`);
        return;
      }
      router.refresh();
      return;
    }
    if (result.error.code === "VALIDATION_FAILED" && result.error.fields) {
      for (const [field, message] of Object.entries(result.error.fields)) {
        form.setError(field.replace(/^product\./, "") as keyof ProductInput, { message });
      }
    }
    setFormError(messageFor(result.error));
  }

  function save(action: SaveAction) {
    form.setValue("isPublished", action === "publish" || action === "save");
    void form.handleSubmit(
      (values) => submit(values, action),
      () => setFormError(null),
    )();
  }

  const hasSeoError = Boolean(errors.slug || errors.seoDescription);

  return (
    <FormProvider {...form}>
      <form
        ref={formRef}
        onSubmit={(e) => e.preventDefault()}
        noValidate
        className="grid gap-8 max-lg:pb-24 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div className="flex min-w-0 flex-col gap-10">
          {formError && (
            <Alert variant="danger" tabIndex={-1} data-error-summary className="outline-none">
              {formError}
            </Alert>
          )}
          <FormField label="Product name" error={errors.name?.message} required>
            <Input
              autoComplete="off"
              {...form.register("name", {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  if (!slugTouched) form.setValue("slug", slugify(e.target.value));
                },
              })}
            />
          </FormField>

          <ProductPhotos
            images={images}
            style=""
            title={hasStyles ? "Photos for every style" : "Photos"}
            hint={
              hasStyles
                ? "Optional: photos that fit every style, like a size chart. Each style's own photos are in its card under Price and stock."
                : undefined
            }
            productId={saved?.id}
            uploadsEnabled={uploadsEnabled}
            onListChange={recheckLists}
          />

          <ProductDescription />

          <ProductFeaturesEditor productId={saved?.id} uploadsEnabled={uploadsEnabled} />

          <ProductVariants
            initialRows={initial.variants}
            savedAt={saved?.savedAt}
            images={images}
            productId={saved?.id}
            uploadsEnabled={uploadsEnabled}
            onListChange={recheckLists}
          />
        </div>

        {/* From lg the whole sidebar stays in view while the page scrolls, and scrolls by itself when it's taller
            than the screen, so Organise never slides under the Publish box. -mt-6 with py-6 keeps a gap above it
            once it sticks (the gap is the page header's padding); px-1 leaves room for focus rings. */}
        <aside
          aria-label="Publish and organise"
          className="flex flex-col gap-6 lg:sticky lg:top-0 lg:-mx-1 lg:-mt-6 lg:max-h-dvh lg:self-start lg:overflow-y-auto lg:px-1 lg:py-6"
        >
          <ProductPublishPanel
            control={form.control}
            saved={saved ?? null}
            unsaved={isDirty}
            pending={pending}
            onSave={save}
            onPreview={openPreview}
          />
          <ProductOrganize categories={categories} collections={collections} sizeGuides={sizeGuides} />
          <Accordion
            type="single"
            collapsible
            value={hasSeoError ? "seo" : seoOpen}
            onValueChange={setSeoOpen}
          >
            <AccordionItem value="seo" title="Search engines" headingLevel={2}>
              <div className="flex flex-col gap-4">
                <FormField
                  label="URL slug"
                  helper="The end of the address: /product/your-slug. Made from the name."
                  error={errors.slug?.message}
                  required
                >
                  <Input
                    autoComplete="off"
                    {...form.register("slug", { onChange: () => setSlugTouched(true) })}
                  />
                </FormField>
                <FormField
                  label="Search description"
                  helper="Optional, up to 155 characters. Shown under the name in Google."
                  error={errors.seoDescription?.message}
                >
                  <Textarea rows={3} maxLength={155} {...form.register("seoDescription")} />
                </FormField>
              </div>
            </AccordionItem>
          </Accordion>
        </aside>
      </form>
    </FormProvider>
  );
}
