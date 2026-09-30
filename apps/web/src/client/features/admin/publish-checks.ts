import type { ProductInput } from "@virzeen/validators";

// The "Before publishing" checklist (specs/product-editor-on-page.md): the status chip's popover and Publish in the
// editor's top bar.

export type PublishCheck = { label: string; done: boolean };

type CheckedValues = Pick<
  ProductInput,
  "name" | "images" | "description" | "categoryId" | "shippingPaisa" | "variants"
>;

/**
 * What the product still needs before it can be published, in checklist order, and `noStock`: everything is in
 * place but nothing for sale has stock (it would show as sold out). Blank number boxes are NaN.
 */
export function publishChecks(values: CheckedValues): { checks: PublishCheck[]; noStock: boolean } {
  const forSale = values.variants.filter((variant) => variant.isActive);
  const checks = [
    { label: "Name", done: values.name.trim() !== "" },
    { label: "At least one photo", done: values.images.length > 0 },
    { label: "Description", done: values.description.trim() !== "" },
    {
      label: "Price",
      done: forSale.length > 0 && forSale.every((v) => Number.isFinite(v.pricePaisa) && v.pricePaisa >= 100),
    },
    { label: "Shipping (0 for none)", done: Number.isFinite(values.shippingPaisa) },
    { label: "Category", done: values.categoryId !== "" },
    { label: "Something for sale", done: forSale.length > 0 },
  ];
  // Only once everything else is in place: on a blank product it would just be noise.
  const noStock = checks.every((check) => check.done) && forSale.every((v) => !(v.stock > 0));
  return { checks, noStock };
}

/** The labels of the checks still to do; empty when the product can be published. */
export const missingForPublish = (values: CheckedValues) =>
  publishChecks(values)
    .checks.filter((check) => !check.done)
    .map((check) => check.label);
