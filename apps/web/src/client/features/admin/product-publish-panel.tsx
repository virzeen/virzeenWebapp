"use client";

import { Badge, Button, ButtonLink } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { Check, Circle, Eye, TriangleAlert } from "lucide-react";
import { useWatch, type Control } from "react-hook-form";
import { DuplicateProductButton } from "./duplicate-product-button";
import { keepFocusOnPress } from "./form-focus";

export type SaveAction = "publish" | "draft" | "save" | "unpublish";

type ProductPublishPanelProps = {
  control: Control<ProductInput>;
  /** What's saved now (not what the form says): decides the status and the buttons. */
  saved: { id: string; slug: string; isPublished: boolean } | null;
  unsaved: boolean;
  pending: SaveAction | null;
  onSave: (action: SaveAction) => void;
  /** Opens the product page as customers would see it, unsaved changes included, in a new tab. */
  onPreview: () => void;
};

/** WordPress-style Publish box: status, what's still missing, and the save buttons. */
export function ProductPublishPanel({
  control,
  saved,
  unsaved,
  pending,
  onSave,
  onPreview,
}: ProductPublishPanelProps) {
  const [name, images, description, categoryId, shipping, variants] = useWatch({
    control,
    name: ["name", "images", "description", "categoryId", "shippingPaisa", "variants"],
  });
  const forSale = variants.filter((variant) => variant.isActive);
  const checks = [
    { label: "Name", done: name.trim() !== "" },
    { label: "At least one photo", done: images.length > 0 },
    { label: "Description", done: description.trim() !== "" },
    {
      label: "Price",
      done: forSale.length > 0 && forSale.every((v) => Number.isFinite(v.pricePaisa) && v.pricePaisa >= 100),
    },
    { label: "Shipping (0 for none)", done: Number.isFinite(shipping) },
    { label: "Category", done: categoryId !== "" },
    { label: "Something ticked For sale", done: forSale.length > 0 },
  ];
  // Only once everything else is in place: on a blank form it would just be noise.
  const noStock = checks.every((check) => check.done) && forSale.every((v) => !(v.stock > 0));
  const published = saved?.isPublished === true;
  const [primary, secondary]: [SaveAction, SaveAction] = published
    ? ["save", "unpublish"]
    : ["publish", "draft"];
  const labels: Record<SaveAction, string> = {
    publish: "Publish",
    draft: "Save draft",
    save: "Save",
    unpublish: "Unpublish",
  };

  return (
    <section
      aria-labelledby="publish-heading"
      className="flex flex-col gap-4 rounded-md border border-line bg-canvas p-4 lg:sticky lg:top-6 lg:z-10"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="publish-heading" className="font-display text-h3">
          Publish
        </h2>
        <Badge variant={published ? "success" : "neutral"}>{published ? "Published" : "Draft"}</Badge>
      </div>
      <p className="text-small text-ink-muted">
        {published
          ? "Customers can see this product."
          : "Only admins can see this product until you publish it."}
        {unsaved && " You have unsaved changes."}
      </p>

      <div className="flex flex-col gap-2">
        <h3 className="text-small font-medium">Before publishing</h3>
        <ul className="flex flex-col gap-1 text-small">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center gap-2">
              {check.done ? (
                <Check className="size-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden />
              )}
              <span className={check.done ? "text-ink" : "text-ink-muted"}>
                {check.label}
                <span className="sr-only">{check.done ? ": done" : ": still to do"}</span>
              </span>
            </li>
          ))}
        </ul>
        {noStock && (
          <p className="flex items-start gap-2 text-small text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            Stock is 0, so it will show as sold out.
          </p>
        )}
      </div>

      {/* Phones: the buttons sit in a bar fixed to the bottom of the screen, always in reach (globals.css keeps
          focus and toasts clear of it). */}
      <div
        data-admin-save-bar
        className="flex gap-2 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-10 max-lg:border-t max-lg:border-line max-lg:bg-canvas max-lg:p-4 lg:flex-col"
      >
        {/* Phones: an eye button keeps three actions on one row. Desktop: a full Preview button below. */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          shape="pill"
          aria-label="Preview"
          className="lg:hidden"
          onClick={onPreview}
        >
          <Eye className="size-4" strokeWidth={1.5} aria-hidden />
        </Button>
        {[primary, secondary].map((action) => (
          <Button
            key={action}
            type="button"
            variant={action === primary ? "primary" : "secondary"}
            shape="pill"
            className="flex-1 lg:w-full lg:flex-none"
            loading={pending === action}
            disabled={pending !== null && pending !== action}
            onMouseDown={keepFocusOnPress}
            onClick={() => onSave(action)}
          >
            {labels[action]}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          shape="pill"
          className="max-lg:hidden lg:w-full"
          onClick={onPreview}
        >
          <Eye className="size-4" strokeWidth={1.5} aria-hidden />
          Preview
        </Button>
      </div>

      {saved && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {published && (
            <ButtonLink href={`/product/${saved.slug}`} variant="ghost" size="sm" shape="pill">
              View in shop
            </ButtonLink>
          )}
          <DuplicateProductButton id={saved.id} unsaved={unsaved} />
        </div>
      )}
    </section>
  );
}
