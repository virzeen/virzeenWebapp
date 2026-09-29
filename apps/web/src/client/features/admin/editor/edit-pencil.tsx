"use client";

import { Button, cn } from "@virzeen/ui";
import { Pencil } from "lucide-react";

/**
 * The class that makes an element the "editable" group: an EditPencil with `reveal` inside it shows on hover or
 * keyboard focus of the group (from md, with a mouse); on phones and touch screens it always shows.
 */
export const EDITABLE_GROUP = "group/editable";

type EditPencilProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "variant" | "size" | "shape"
> & {
  /** Read as "Edit {label}", e.g. "Edit product name". */
  label: string;
  /** Hidden until the surrounding EDITABLE_GROUP is hovered or holds focus (desktop with a mouse only). */
  reveal?: boolean;
};

/** The round pencil button next to editable text (specs/product-editor-on-page.md "Editing model"). 44px. */
export function EditPencil({ label, reveal = true, className, ...props }: EditPencilProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      shape="pill"
      aria-label={`Edit ${label}`}
      className={cn(
        // Hidden, not removed: it stays in the tab order, and focusing it shows it.
        reveal &&
          "transition-opacity duration-150 ease-standard md:pointer-fine:opacity-0 md:pointer-fine:group-focus-within/editable:opacity-100 md:pointer-fine:group-hover/editable:opacity-100",
        className,
      )}
      {...props}
    >
      <Pencil className="size-4" strokeWidth={1.5} aria-hidden />
    </Button>
  );
}
