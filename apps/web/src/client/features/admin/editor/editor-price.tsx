"use client";

import { useFormState, useWatch } from "react-hook-form";
import { Price } from "@/client/components/shared/price";
import { toPaisa, toRupees } from "../rupees-input";
import { sameValue } from "../variant-options";
import { EditableText } from "./editable-text";
import { useProductEditor } from "./editor-context";

const RUPEES = { inputMode: "decimal" } as const;

/**
 * The price under the name, and the editor-only line "Shipping Rs 150 included · Customers pay Rs 1,650" with its
 * own pencil (specs/product-editor-on-page.md). The price is the product price before shipping: without styles it
 * sets every row, with styles the picked style's rows. With prices per size, each size has its own (EditorSizes).
 */
export function EditorPrice() {
  const { form, style, styles, variantOptions, commitField, commitFields } = useProductEditor();
  const [variants, shipping] = useWatch({ control: form.control, name: ["variants", "shippingPaisa"] });
  const { errors } = useFormState({ control: form.control, name: ["variants", "shippingPaisa"] });
  const rows = variants
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => styles.length === 0 || sameValue(row.color, style));
  // A row for sale shows the price (a removed size's row keeps the price it had).
  const price = (rows.find(({ row }) => row.isActive) ?? rows[0])?.row.pricePaisa ?? Number.NaN;
  const priceError = rows.map(({ index }) => errors.variants?.[index]?.pricePaisa?.message).find(Boolean);
  const perSize = variantOptions.perRowPrices;
  const hasPrice = Number.isFinite(price) && !perSize;
  const hasShipping = Number.isFinite(shipping);

  return (
    <div className="flex flex-col gap-1 pt-2">
      {perSize ? (
        <p className="text-body text-ink-muted">Prices per size</p>
      ) : (
        <EditableText
          label="Price (Rs)"
          editLabel={styles.length > 0 ? `price of ${style}` : "price"}
          value={toRupees(price)}
          placeholder="Add a price"
          error={priceError}
          inputProps={RUPEES}
          onCommit={(next) =>
            commitFields(
              rows.map(({ index }) => ({
                name: `variants.${index}.pricePaisa` as const,
                value: toPaisa(next),
              })),
            )
          }
        >
          <p className="text-h3">
            <Price paisa={price} />
          </p>
        </EditableText>
      )}
      <EditableText
        label="Shipping (Rs)"
        editLabel="shipping"
        value={toRupees(shipping)}
        placeholder="Add shipping (0 for none)"
        error={errors.shippingPaisa?.message}
        inputProps={RUPEES}
        onCommit={(next) => commitField("shippingPaisa", toPaisa(next))}
      >
        <p className="text-small text-ink-muted">
          Shipping <Price paisa={hasShipping ? shipping : 0} /> included
          {hasPrice && (
            <>
              {" · "}Customers pay <Price paisa={price + (hasShipping ? shipping : 0)} />
            </>
          )}
        </p>
      </EditableText>
    </div>
  );
}
