"use client";

import { Button, Popover, PopoverContent, PopoverTrigger } from "@virzeen/ui";
import { Check, ChevronDown, Circle, TriangleAlert } from "lucide-react";
import { useId } from "react";
import { useWatch } from "react-hook-form";
import { publishChecks } from "../publish-checks";
import { useProductEditor } from "./editor-context";

type StatusChipProps = {
  /** Open from outside too: Publish opens it when something is still missing. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * "Draft" or "Published" (as saved) in the top bar; pressing it shows the "Before publishing" checklist in a popover
 * (specs/product-editor-on-page.md), live as the product changes.
 */
export function StatusChip({ open, onOpenChange }: StatusChipProps) {
  const { form, product } = useProductEditor();
  const headingId = useId();
  const [name, images, description, categoryId, shippingPaisa, variants] = useWatch({
    control: form.control,
    name: ["name", "images", "description", "categoryId", "shippingPaisa", "variants"],
  });
  const { checks, noStock } = publishChecks({
    name,
    images,
    description,
    categoryId,
    shippingPaisa,
    variants,
  });
  const published = product.isPublished;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" shape="pill">
          <span className="sr-only">Status: </span>
          {published ? "Published" : "Draft"}
          <ChevronDown className="size-4" strokeWidth={1.5} aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-labelledby={headingId}>
        <p className="text-small text-ink-muted">
          {published
            ? "Customers can see this product."
            : "Only admins can see this product until you publish it."}
        </p>
        <h2 id={headingId} className="text-small font-medium">
          Before publishing
        </h2>
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
      </PopoverContent>
    </Popover>
  );
}
