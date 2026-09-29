"use client";

import { cn } from "@virzeen/ui";
import { useRef, useState } from "react";
import { useFormState, useWatch } from "react-hook-form";
import { SizeGuideDialog } from "@/client/features/products/size-guide-dialog";
import { SizeChips } from "./buybox-size-chips";
import { rowIndexFor, sizeCells } from "./buybox-stock";
import { SingleStock, SizeStock } from "./buybox-stock-inputs";
import { EDITABLE_GROUP, EditPencil } from "./edit-pencil";
import { useProductEditor } from "./editor-context";

/**
 * The size grid, as on the shop page (size-picker.tsx): "Select size" with Size guide on the right (when the product
 * has one), then the size boxes, up to 5 in a row. Each box shows the picked style's stock under it (0 = sold out,
 * struck through as in the shop), and a price when "Different prices for some sizes" is on (Settings). The pencil
 * opens the size chips. A product without sizes has one Stock box. Boxes save when left
 * (specs/product-editor-on-page.md "Sizes").
 */
export function EditorSizes() {
  const { form, style, styles, variants, variantOptions, options } = useProductEditor();
  const [rows, sizeGuideId] = useWatch({ control: form.control, name: ["variants", "sizeGuideId"] });
  const { errors } = useFormState({ control: form.control, name: "variants" });
  const [editing, setEditing] = useState(false);
  const pencilRef = useRef<HTMLButtonElement>(null);
  const sizes = variantOptions.options.sizes;
  const picked = styles.length > 0 ? style : null;
  const showPrice = variantOptions.perRowPrices;
  const guide = options.sizeGuides.find((option) => option.id === sizeGuideId);
  const listError = errors.variants?.message ?? errors.variants?.root?.message;
  const single = sizes.length === 0 ? rowIndexFor(rows, "", picked) : -1;

  function close() {
    setEditing(false);
    requestAnimationFrame(() => pencilRef.current?.focus());
  }

  return (
    <div className={cn(EDITABLE_GROUP, "flex flex-col gap-2")}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-small font-medium text-ink">{sizes.length > 0 ? "Select size" : "Sizes"}</p>
        <div className="flex items-center gap-2">
          {guide && sizes.length > 0 && <SizeGuideDialog guide={guide} />}
          <EditPencil
            ref={pencilRef}
            label="sizes"
            aria-expanded={editing}
            className="-my-2"
            onClick={() => (editing ? close() : setEditing(true))}
          />
        </div>
      </div>
      {editing && <SizeChips onDone={close} />}
      {sizes.length > 0 ? (
        <>
          <p className="text-small text-ink-muted">
            {picked ? `Stock of ${picked} under each size.` : "Stock under each size."}
          </p>
          <ul
            aria-label={picked ? `Stock of ${picked} per size` : "Stock per size"}
            // Boxes at least 4.5rem wide, and never more than 5 in a row (as in the shop).
            className="grid grid-cols-[repeat(auto-fill,minmax(max(4.5rem,calc((100%_-_2rem)/5)),1fr))] gap-2"
          >
            {sizeCells(rows, sizes, picked).map((cell) => (
              <SizeStock
                key={variants.fields[cell.index]?.fieldKey ?? `${picked ?? ""}|${cell.size}`}
                cell={cell}
                style={picked}
                showPrice={showPrice}
              />
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="text-small text-ink-muted">One size. Add sizes to count the stock of each.</p>
          {single !== -1 && (
            <SingleStock
              key={variants.fields[single]?.fieldKey ?? `${picked ?? ""}|one-size`}
              index={single}
              style={picked}
              showPrice={showPrice}
            />
          )}
        </>
      )}
      {listError && (
        <p className="text-small text-danger" data-field-error tabIndex={-1}>
          {listError}
        </p>
      )}
    </div>
  );
}
