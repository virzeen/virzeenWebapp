"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Checkbox,
  FormField,
  Input,
  Select,
  Separator,
  Stack,
  Switch,
  Textarea,
  toast,
} from "@virzeen/ui";
import { productSchema, type ProductInput } from "@virzeen/validators";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import { messageFor } from "@/client/lib/error-messages";
import { saveProductAction } from "@/server/actions/admin/catalog";
import { itemButton, keepFocusOnPress, refocusAfterListChange, useRevealFirstError } from "./form-focus";
import { ImageUploader } from "./image-uploader";

type ProductFormProps = {
  productId?: string;
  defaultValues?: ProductInput;
  categories: { value: string; label: string }[];
  collections: { id: string; name: string }[];
  uploadsEnabled: boolean;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);

// Admins type rupees; the database stores integer paisa (data-rules.md §1).
const toRupees = (paisa: number | undefined) =>
  paisa === undefined || Number.isNaN(paisa) ? "" : String(paisa / 100);
const toPaisa = (rupees: string) =>
  rupees.trim() === "" ? Number.NaN : Math.round(Number.parseFloat(rupees) * 100);

const EMPTY: ProductInput = {
  name: "",
  slug: "",
  description: "",
  care: "",
  seoDescription: "",
  categoryId: "",
  collectionIds: [],
  isPublished: false,
  images: [],
  shippingPaisa: Number.NaN,
  variants: [{ sku: "", size: "", color: "", pricePaisa: Number.NaN, stock: 0, isActive: true }],
};

/** An error about a whole list (or an image with no input of its own); focusable so a failed save can reveal it. */
function ListError({ children }: { children: React.ReactNode }) {
  return (
    <p tabIndex={-1} data-field-error className="text-small text-danger outline-none">
      {children}
    </p>
  );
}

/** What the shop shows for one variant: product price + shipping (customers see free shipping). */
function CustomerPrice({ control, index }: { control: Control<ProductInput>; index: number }) {
  const [productPrice, shipping] = useWatch({
    control,
    name: [`variants.${index}.pricePaisa`, "shippingPaisa"],
  });
  if (!Number.isFinite(productPrice)) return null;
  return (
    <p className="text-small text-ink-muted sm:col-span-3 xl:col-span-6">
      Customers pay <Price paisa={productPrice + (Number.isFinite(shipping) ? shipping : 0)} />, shown with
      free shipping.
    </p>
  );
}

/** Create/edit a product with its variants and images (patterns.md §10: forms in pages, not dialogs). */
export function ProductForm({
  productId,
  defaultValues,
  categories,
  collections,
  uploadsEnabled,
}: ProductFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(productId));
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    mode: "onBlur",
    defaultValues: defaultValues ?? EMPTY,
    // useRevealFirstError focuses the first problem in page order instead.
    shouldFocusError: false,
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const formRef = useRevealFirstError(submitCount);
  const variants = useFieldArray({ control: form.control, name: "variants", keyName: "fieldKey" });
  const images = useFieldArray({ control: form.control, name: "images", keyName: "fieldKey" });
  const imagesRef = useRef<HTMLUListElement>(null);
  const variantsRef = useRef<HTMLUListElement>(null);
  const addVariantRef = useRef<HTMLButtonElement>(null);

  // After a failed save, re-validating one field doesn't re-run the checks across rows and lists (duplicate SKUs,
  // "Tick For sale…", "Add at least one image…"), so their messages would stay after the fix. Re-check both
  // lists whenever something those checks read changes.
  function recheckLists() {
    if (form.formState.isSubmitted) void form.trigger(["variants", "images"]);
  }

  // The moved image keeps focus on the same arrow, or on the other one once that arrow is disabled.
  function moveImage(index: number, to: number, action: "earlier" | "later") {
    images.move(index, to);
    recheckLists();
    refocusAfterListChange(
      () => itemButton(imagesRef.current, to, action),
      () => itemButton(imagesRef.current, to, action === "earlier" ? "later" : "earlier"),
    );
  }

  // Focus goes to the next item's Remove, else the previous one's, else the add control after the list.
  function removeImage(index: number) {
    images.remove(index);
    recheckLists();
    refocusAfterListChange(
      () => itemButton(imagesRef.current, index, "remove"),
      () => itemButton(imagesRef.current, index - 1, "remove"),
      () =>
        formRef.current?.querySelector<HTMLElement>(
          "[data-image-uploader] button:not(:disabled), [data-image-uploader] input:not([type=file])",
        ),
    );
  }

  function removeVariant(index: number) {
    variants.remove(index);
    recheckLists();
    refocusAfterListChange(
      () => itemButton(variantsRef.current, index, "remove"),
      () => itemButton(variantsRef.current, index - 1, "remove"),
      () => addVariantRef.current,
    );
  }

  async function onSubmit(values: ProductInput) {
    setFormError(null);
    const result = await saveProductAction(
      productId ? { id: productId, product: values } : { product: values },
    );
    if (result.ok) {
      toast.success("Product saved");
      if (!productId) router.replace(`/admin/products/${result.data.id}`);
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

  // Errors on the images and variants lists as a whole (zodResolver puts list-level errors under `root`).
  const imagesError = errors.images?.root?.message ?? errors.images?.message;
  const variantsError = errors.variants?.root?.message ?? errors.variants?.message;

  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(onSubmit, () => setFormError(null))}
      noValidate
      className="flex max-w-4xl flex-col gap-10"
    >
      {formError && (
        <Alert variant="danger" tabIndex={-1} data-error-summary className="outline-none">
          {formError}
        </Alert>
      )}

      <section aria-labelledby="details" className="flex flex-col gap-4">
        <h2 id="details" className="font-display text-h3">
          Details
        </h2>
        <FormField label="Name" error={errors.name?.message} required>
          <Input
            {...form.register("name", {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                if (!slugTouched) form.setValue("slug", slugify(e.target.value));
              },
            })}
          />
        </FormField>
        <FormField
          label="URL slug"
          helper="Appears in the address: /product/your-slug"
          error={errors.slug?.message}
          required
        >
          <Input {...form.register("slug", { onChange: () => setSlugTouched(true) })} />
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
        <FormField label="Description" error={errors.description?.message} required>
          <Textarea rows={5} {...form.register("description")} />
        </FormField>
        <FormField label="Care" helper="Optional" error={errors.care?.message}>
          <Textarea rows={3} {...form.register("care")} />
        </FormField>
        <FormField
          label="Search description"
          helper="Optional, up to 155 characters"
          error={errors.seoDescription?.message}
        >
          <Input maxLength={155} {...form.register("seoDescription")} />
        </FormField>
        {collections.length > 0 && (
          <fieldset className="flex flex-col gap-1">
            <legend className="pb-1 text-small font-medium">Collections</legend>
            <Controller
              control={form.control}
              name="collectionIds"
              render={({ field }) => (
                <div className="grid gap-x-6 sm:grid-cols-2">
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

      <Separator />

      <section aria-labelledby="images-heading" className="flex flex-col gap-4">
        <h2 id="images-heading" className="font-display text-h3">
          Images
        </h2>
        {imagesError && <ListError>{imagesError}</ListError>}
        {images.fields.length > 0 && (
          <ul ref={imagesRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {images.fields.map((image, index) => (
              <li key={image.fieldKey} className="flex flex-col gap-2">
                <CloudImage src={image.url} alt="" sizes="200px" />
                {errors.images?.[index]?.url && <ListError>{errors.images[index].url.message}</ListError>}
                <FormField
                  label={`Alt text ${index + 1}`}
                  error={errors.images?.[index]?.alt?.message}
                  required
                >
                  <Input {...form.register(`images.${index}.alt`)} />
                </FormField>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Move image earlier"
                    data-action="earlier"
                    disabled={index === 0}
                    onClick={() => moveImage(index, index - 1, "earlier")}
                  >
                    <ArrowUp className="size-4" strokeWidth={1.5} aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Move image later"
                    data-action="later"
                    disabled={index === images.fields.length - 1}
                    onClick={() => moveImage(index, index + 1, "later")}
                  >
                    <ArrowDown className="size-4" strokeWidth={1.5} aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove image"
                    data-action="remove"
                    onClick={() => removeImage(index)}
                  >
                    <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <ImageUploader
          folder="products"
          entityId={productId ?? "new"}
          uploadsEnabled={uploadsEnabled}
          onUploaded={(url) => {
            images.append({ url, alt: form.getValues("name") });
            recheckLists();
          }}
        />
      </section>

      <Separator />

      <section aria-labelledby="variants-heading" className="flex flex-col gap-4">
        <h2 id="variants-heading" className="font-display text-h3">
          Variants
        </h2>
        <p className="text-small text-ink-muted">
          One row per colour and size. SKU format: VZ-PRODUCT-COLOUR-SIZE. Prices include VAT. To stop selling
          a variant, untick For sale: saved variants stay on the list because orders refer to them.
        </p>
        <FormField
          label="Shipping price (Rs)"
          helper="Added to every variant's price. Customers see one price and free shipping. Enter 0 for none."
          error={errors.shippingPaisa?.message}
          required
          className="sm:max-w-xs"
        >
          <Controller
            control={form.control}
            name="shippingPaisa"
            render={({ field }) => (
              <Input
                inputMode="decimal"
                defaultValue={toRupees(field.value)}
                onChange={(e) => field.onChange(toPaisa(e.target.value))}
                onBlur={field.onBlur}
              />
            )}
          />
        </FormField>
        {variantsError && <ListError>{variantsError}</ListError>}
        {/* Three columns up to xl: in six, "Product price (Rs)" wraps and drops its box below the others. */}
        <ul ref={variantsRef} className="flex flex-col gap-4">
          {variants.fields.map((variant, index) => {
            const rowErrors = errors.variants?.[index];
            return (
              <li
                key={variant.fieldKey}
                className="grid gap-3 rounded-md border border-line p-4 sm:grid-cols-3 xl:grid-cols-6"
              >
                <FormField label="SKU" error={rowErrors?.sku?.message} required className="xl:col-span-2">
                  <Input
                    className="uppercase"
                    {...form.register(`variants.${index}.sku`, { onChange: recheckLists })}
                  />
                </FormField>
                <FormField label="Colour" error={rowErrors?.color?.message}>
                  <Input {...form.register(`variants.${index}.color`)} />
                </FormField>
                <FormField label="Size" error={rowErrors?.size?.message}>
                  <Input {...form.register(`variants.${index}.size`)} />
                </FormField>
                <FormField label="Product price (Rs)" error={rowErrors?.pricePaisa?.message} required>
                  <Controller
                    control={form.control}
                    name={`variants.${index}.pricePaisa`}
                    render={({ field }) => (
                      <Input
                        inputMode="decimal"
                        defaultValue={toRupees(field.value)}
                        onChange={(e) => field.onChange(toPaisa(e.target.value))}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </FormField>
                <FormField label="Stock" error={rowErrors?.stock?.message} required>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    {...form.register(`variants.${index}.stock`, { valueAsNumber: true })}
                  />
                </FormField>
                <CustomerPrice control={form.control} index={index} />
                <div className="flex items-center justify-between gap-4 sm:col-span-3 xl:col-span-6">
                  <Controller
                    control={form.control}
                    name={`variants.${index}.isActive`}
                    render={({ field }) => (
                      <Checkbox
                        label="For sale"
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked === true);
                          recheckLists();
                        }}
                      />
                    )}
                  />
                  {/* Only a row that isn't saved yet can go: a saved one is switched off with For sale. */}
                  {!variant.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      shape="pill"
                      data-action="remove"
                      disabled={variants.fields.length === 1}
                      onClick={() => removeVariant(index)}
                    >
                      Remove variant
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <Button
          ref={addVariantRef}
          variant="secondary"
          shape="pill"
          className="self-start"
          onMouseDown={keepFocusOnPress}
          onClick={() => {
            const last = form.getValues(`variants.${variants.fields.length - 1}`);
            variants.append({
              sku: "",
              size: "",
              color: last?.color ?? "",
              pricePaisa: last?.pricePaisa ?? Number.NaN,
              stock: 0,
              isActive: true,
            });
          }}
        >
          Add variant
        </Button>
      </section>

      <Separator />

      <Stack gap={4}>
        <Controller
          control={form.control}
          name="isPublished"
          render={({ field }) => (
            <Switch
              label="Published"
              description="Visible in the shop. Needs at least one image and one variant for sale."
              checked={field.value}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                recheckLists();
              }}
            />
          )}
        />
        <Button
          type="submit"
          size="lg"
          shape="pill"
          loading={isSubmitting}
          onMouseDown={keepFocusOnPress}
          className="self-start"
        >
          Save product
        </Button>
      </Stack>
    </form>
  );
}
