"use client";

import { EditorDetailsDialog } from "./content-details-dialog";
import { EditableCare, EditableLines } from "./content-lines";

/**
 * "View product details" as on the shop page (it opens the same popup, from the current values), and right under it
 * a box with what that popup holds: "Product details" and "Benefits" (one per line) and "Care", each editable in
 * place (specs/product-editor-on-page.md). The box is the editor's own; customers only see the popup.
 */
export function EditorDetails() {
  return (
    // The shop keeps the button 1rem under the bullets (one block with the description); the column's gap is 2rem.
    <div className="-mt-4 flex flex-col gap-4">
      <EditorDetailsDialog />
      <section
        aria-label="In the product details popup"
        className="flex flex-col gap-6 rounded-md border border-line p-4"
      >
        <p className="text-small text-ink-muted">Shown when customers open View product details.</p>
        <EditableLines
          name="details"
          title="Product details"
          empty="Add product details, e.g. 100% cotton"
          rows={5}
        />
        <EditableLines name="benefits" title="Benefits" empty="Add benefits, e.g. Keeps you cool" rows={4} />
        <EditableCare />
      </section>
    </div>
  );
}
