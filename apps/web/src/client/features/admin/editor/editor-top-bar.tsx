"use client";

import { Button, Link } from "@virzeen/ui";
import { productSchema } from "@virzeen/validators";
import { Eye } from "lucide-react";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { missingForPublish } from "../publish-checks";
import { useProductEditor } from "./editor-context";
import { EditorSettings } from "./editor-settings";
import { SaveStatus } from "./save-status";
import { StatusChip } from "./status-chip";
import { useEditorPreview } from "./use-editor-preview";

/**
 * The editor's sticky top bar (specs/product-editor-on-page.md): ← Products, the status chip with its checklist,
 * the save state, Preview, Settings and Publish / Unpublish. Two rows on phones (the actions under the rest), one
 * from md. Marked `data-editor-bar` so globals.css scrolls focused fields clear of it.
 */
export function EditorTopBar() {
  const { form, commit } = useProductEditor();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const openPreview = useEditorPreview();
  // What the next save sends: after a failed publish it still says published, so Unpublish can take it back.
  const isPublished = useWatch({ control: form.control, name: "isPublished" });

  function publish() {
    const published = { ...form.getValues(), isPublished: true };
    if (missingForPublish(published).length > 0) return setChecklistOpen(true);
    // Something else needs fixing first: saving as it is puts the problems on their fields. Publish stays offered.
    if (productSchema.safeParse(published).success) form.setValue("isPublished", true);
    void commit();
  }

  function unpublish() {
    form.setValue("isPublished", false);
    void commit();
  }

  return (
    <div
      data-editor-bar
      className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-canvas/95 py-2 backdrop-blur-md"
    >
      <Link href="/admin/products" variant="subtle" className="inline-flex min-h-11 items-center text-small">
        ← Products
      </Link>
      <StatusChip open={checklistOpen} onOpenChange={setChecklistOpen} />
      <SaveStatus className="flex-1" />
      <div className="flex items-center gap-2 max-md:w-full max-md:justify-end">
        <Button variant="ghost" size="sm" shape="pill" onClick={openPreview}>
          <Eye className="size-4" strokeWidth={1.5} aria-hidden />
          Preview
        </Button>
        <EditorSettings />
        {isPublished ? (
          <Button variant="secondary" size="sm" shape="pill" onClick={unpublish}>
            Unpublish
          </Button>
        ) : (
          <Button size="sm" shape="pill" onClick={publish}>
            Publish
          </Button>
        )}
      </div>
    </div>
  );
}
