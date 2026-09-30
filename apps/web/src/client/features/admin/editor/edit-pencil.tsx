"use client";

import { Button } from "@virzeen/ui";
import { Pencil } from "lucide-react";

type EditPencilProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "variant" | "size" | "shape"
> & {
  /** Read as "Edit {label}", e.g. "Edit product name". */
  label: string;
};

/**
 * The round pencil button next to editable text (specs/product-editor-on-page.md "Editing model"). 44px. Always
 * shown, on every screen (owner, 2026-09-30: not only on hover).
 */
export function EditPencil({ label, ...props }: EditPencilProps) {
  return (
    <Button variant="ghost" size="icon" shape="pill" aria-label={`Edit ${label}`} {...props}>
      <Pencil className="size-4" strokeWidth={1.5} aria-hidden />
    </Button>
  );
}
