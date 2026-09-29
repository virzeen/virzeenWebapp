"use client";

import { Button, Checkbox, cn, Input } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { Trash2 } from "lucide-react";
import { useId } from "react";
import { Controller, useFormContext, useWatch, type FieldArrayWithId } from "react-hook-form";
import { RupeesInput } from "./rupees-input";
import { variantLabel } from "./variant-options";

type VariantTableProps = {
  /** The rows to show with their place in the whole `variants` list (a style card shows only its own). */
  rows: { field: FieldArrayWithId<ProductInput, "variants", "fieldKey">; index: number }[];
  showPrices: boolean;
  showSkus: boolean;
  onRemove: (index: number) => void;
  /** Re-runs the list checks (For sale, duplicate SKUs) after a change. */
  onListChange: () => void;
};

const headerClass = "px-3 py-2 text-left text-caption font-medium text-ink-muted uppercase";

/**
 * Stock grid: one row per size × colour. The column headers are the visible labels (docs/ui/patterns.md §10), so each
 * input's accessible name repeats them with the row ("Stock, Black, M").
 */
export function VariantTable({ rows, showPrices, showSkus, onRemove, onListChange }: VariantTableProps) {
  const form = useFormContext<ProductInput>();
  const values = useWatch({ control: form.control, name: "variants" });
  const errors = form.formState.errors.variants;
  const idBase = useId();

  const errorLine = (index: number, field: "stock" | "pricePaisa" | "sku") => {
    const message = errors?.[index]?.[field]?.message;
    const id = `${idBase}-${index}-${field}`;
    return {
      props: { "aria-invalid": message ? true : undefined, "aria-describedby": message ? id : undefined },
      line: message ? (
        <p id={id} className="pt-1 text-small text-danger">
          {message}
        </p>
      ) : null,
    };
  };

  return (
    <div className="w-full overflow-x-auto rounded-md border border-line">
      <table className="w-full border-collapse text-small">
        <caption className="sr-only">Sizes and colours: for sale, stock{showPrices ? ", price" : ""}</caption>
        <thead className="bg-surface">
          <tr>
            <th scope="col" className={headerClass}>
              For sale
            </th>
            <th scope="col" className={headerClass}>
              Stock
            </th>
            {showPrices && (
              <th scope="col" className={headerClass}>
                Price (Rs)
              </th>
            )}
            {showSkus && (
              <th scope="col" className={headerClass}>
                SKU
              </th>
            )}
            <th scope="col" className="w-11 px-3 py-2">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ field, index }) => {
            const row = values[index] ?? field;
            const label = variantLabel(row);
            const stock = errorLine(index, "stock");
            const price = errorLine(index, "pricePaisa");
            const sku = errorLine(index, "sku");
            return (
              <tr key={field.fieldKey} className={cn(!row.isActive && "text-ink-muted")}>
                <td className="px-3 py-1 align-top">
                  <Controller
                    control={form.control}
                    name={`variants.${index}.isActive`}
                    render={({ field: active }) => (
                      <Checkbox
                        label={label}
                        checked={active.value}
                        onCheckedChange={(checked) => {
                          active.onChange(checked === true);
                          onListChange();
                        }}
                      />
                    )}
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    aria-label={`Stock, ${label}`}
                    className="w-24"
                    {...stock.props}
                    {...form.register(`variants.${index}.stock`, { valueAsNumber: true })}
                  />
                  {stock.line}
                </td>
                {showPrices && (
                  <td className="px-3 py-2 align-top">
                    <Controller
                      control={form.control}
                      name={`variants.${index}.pricePaisa`}
                      render={({ field: amount }) => (
                        <RupeesInput
                          aria-label={`Price in rupees, ${label}`}
                          className="w-28"
                          value={amount.value}
                          onValueChange={amount.onChange}
                          onBlur={amount.onBlur}
                          {...price.props}
                        />
                      )}
                    />
                    {price.line}
                  </td>
                )}
                {showSkus && (
                  <td className="px-3 py-2 align-top">
                    <Input
                      aria-label={`SKU, ${label}`}
                      placeholder="Made on save"
                      autoComplete="off"
                      className="w-56 uppercase"
                      {...sku.props}
                      {...form.register(`variants.${index}.sku`, { onChange: onListChange })}
                    />
                    {sku.line}
                  </td>
                )}
                <td className="px-1 py-2 align-top">
                  {/* Only a row that isn't saved yet can go: a saved one is switched off with For sale. */}
                  {!field.id && values.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${label}`}
                      data-action="remove"
                      onClick={() => onRemove(index)}
                    >
                      <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
