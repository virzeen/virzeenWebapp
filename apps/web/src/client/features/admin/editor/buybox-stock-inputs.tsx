"use client";

import { cn, FormField, Input } from "@virzeen/ui";
import { useId } from "react";
import { useFormState, useWatch } from "react-hook-form";
import { RupeesInput } from "../rupees-input";
import { cellName, type SizeCell } from "./buybox-stock";
import { useProductEditor } from "./editor-context";

// The shop's size box (RadioGroup "card"), drawn as the stock box's visible label: sold out is struck through.
const BOX =
  "flex min-h-11 items-center justify-center rounded-sm border px-3 py-2 text-center text-body font-medium";

/** A row's stock (and price) boxes: the form value, saved when the box is left. */
function useRowInputs(index: number) {
  const { form, commit } = useProductEditor();
  const price = useWatch({ control: form.control, name: `variants.${index}.pricePaisa` });
  const { errors } = useFormState({ control: form.control, name: `variants.${index}` });
  const row = errors.variants?.[index];
  return {
    stock: form.register(`variants.${index}.stock`, { valueAsNumber: true, onBlur: () => void commit() }),
    price: {
      value: price,
      onValueChange: (paisa: number) =>
        form.setValue(`variants.${index}.pricePaisa`, paisa, { shouldDirty: true }),
      onBlur: () => void commit(),
    },
    stockError: row?.stock?.message,
    priceError: row?.pricePaisa?.message,
  };
}

type SizeStockProps = { cell: SizeCell; style: string | null; showPrice: boolean };

/**
 * One size in the editor's size grid (specs/product-editor-on-page.md "Sizes"): the size box as the shop draws it,
 * then its stock for the picked style (0 = sold out), and its price when prices differ per size.
 */
export function SizeStock({ cell, style, showPrice }: SizeStockProps) {
  const id = useId();
  const name = cellName(style, cell.size);
  if (cell.index === -1 || !cell.forSale) {
    return (
      <li className="flex min-w-0 flex-col gap-1">
        <p className={cn(BOX, "border-line text-ink-muted line-through")}>{cell.size}</p>
        <p className="text-center text-small text-ink-muted">Not for sale</p>
      </li>
    );
  }
  return <SizeStockInputs id={id} cell={cell} name={name} showPrice={showPrice} />;
}

function SizeStockInputs({
  id,
  cell,
  name,
  showPrice,
}: {
  id: string;
  cell: SizeCell;
  name: string;
  showPrice: boolean;
}) {
  const inputs = useRowInputs(cell.index);
  const problems = [inputs.stockError, showPrice ? inputs.priceError : undefined].filter(Boolean);
  const errorId = problems.length > 0 ? `${id}-error` : undefined;
  return (
    <li className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={`${id}-stock`}
        className={cn(
          BOX,
          cell.soldOut ? "border-line text-ink-muted line-through" : "border-line-strong text-ink",
        )}
      >
        {cell.size}
      </label>
      <Input
        id={`${id}-stock`}
        type="number"
        inputMode="numeric"
        min={0}
        aria-label={`Stock, ${name}`}
        aria-invalid={inputs.stockError ? true : undefined}
        aria-describedby={errorId}
        {...inputs.stock}
      />
      {showPrice && (
        <RupeesInput
          aria-label={`Price in rupees, ${name}`}
          aria-invalid={inputs.priceError ? true : undefined}
          aria-describedby={errorId}
          {...inputs.price}
        />
      )}
      {errorId && (
        <p id={errorId} className="text-small text-danger">
          {problems.join(" ")}
        </p>
      )}
    </li>
  );
}

/** A product without sizes: one "Stock" box for the picked style (and its price when prices differ per size). */
export function SingleStock({
  index,
  style,
  showPrice,
}: {
  index: number;
  style: string | null;
  showPrice: boolean;
}) {
  const inputs = useRowInputs(index);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        label={style ? `Stock, ${style}` : "Stock"}
        helper="How many you have."
        error={inputs.stockError}
      >
        <Input type="number" inputMode="numeric" min={0} {...inputs.stock} />
      </FormField>
      {showPrice && (
        <FormField label="Price (Rs)" error={inputs.priceError}>
          <RupeesInput {...inputs.price} />
        </FormField>
      )}
    </div>
  );
}
