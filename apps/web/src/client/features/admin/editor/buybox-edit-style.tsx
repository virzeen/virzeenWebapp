"use client";

import { Button, Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@virzeen/ui";
import { useState } from "react";
import { useFormState, useWatch } from "react-hook-form";
import { styleEntryIndex, withColourShown } from "./buybox-styles";
import { EditableText } from "./editable-text";
import { useProductEditor } from "./editor-context";
import { photoAltResets } from "./made-alts";

type EditStyleProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where focus goes when the popup closes (the pencil, or Add style once the last style is gone). */
  onCloseAutoFocus: (event: Event) => void;
};

const CAPTION = "text-small font-medium text-ink";

/**
 * The picked style's pencil opens this (specs/product-editor-on-page.md "Style tiles"): its name (a rename keeps
 * its style number), "Colour shown" (e.g. Black/White; blank = the name), the style number (read-only, made when
 * saved) and Remove style (asks first). Each field edits in place and saves, like the page.
 */
export function EditStyle({ open, onOpenChange, onCloseAutoFocus }: EditStyleProps) {
  const { form, style, variantOptions, selectStyle, commitField } = useProductEditor();
  const entries = useWatch({ control: form.control, name: "styles" });
  const { errors } = useFormState({ control: form.control, name: "styles" });
  const [confirming, setConfirming] = useState(false);
  const index = styleEntryIndex(entries, style);
  const entry = entries[index];
  const shown = entry?.colourShown?.trim() ?? "";

  function rename(next: string) {
    const name = next.trim();
    const problem = variantOptions.renameStyle(style, name);
    if (problem) return problem;
    // Its photos' made descriptions name the old style: blank, so this same save makes them with the new one.
    const product = form.getValues("name");
    const resets = photoAltResets(form.getValues("images"), (color) =>
      color === name ? { name: product, style } : null,
    );
    for (const reset of resets) form.setValue(reset.name, reset.value, { shouldDirty: true });
    selectStyle(name);
    return null;
  }

  function remove() {
    variantOptions.removeStyle(style);
    setConfirming(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Edit style"
        description="Changes save as you make them."
        onCloseAutoFocus={onCloseAutoFocus}
        // Radix hears Escape first (capture phase): in an open field it cancels that edit (EditableText), not the popup.
        onEscapeKeyDown={(event) => {
          if (event.target instanceof HTMLInputElement) event.preventDefault();
        }}
      >
        <div className="flex flex-col gap-4">
          <EditableText
            label="Style name"
            value={style}
            error={errors.styles?.[index]?.color?.message}
            inputProps={{ maxLength: 40 }}
            onCommit={rename}
          >
            <p className={CAPTION}>Style name</p>
            <p>{style}</p>
          </EditableText>
          <EditableText
            label="Colour shown"
            value={shown}
            error={errors.styles?.[index]?.colourShown?.message}
            inputProps={{ maxLength: 80, placeholder: style }}
            onCommit={(next) =>
              index === -1
                ? commitField("styles", withColourShown(entries, style, next))
                : commitField(`styles.${index}.colourShown`, next)
            }
          >
            <p className={CAPTION}>Colour shown</p>
            <p className={shown ? undefined : "text-ink-muted"}>{shown || `${style} (the style name)`}</p>
          </EditableText>
          <dl className="flex flex-col">
            <dt className={CAPTION}>Style number</dt>
            <dd className={entry?.code ? "font-mono" : "text-ink-muted"}>
              {entry?.code || "Made when saved"}
            </dd>
          </dl>
        </div>
        <DialogFooter>
          <Dialog open={confirming} onOpenChange={setConfirming}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="sm:mr-auto">
                Remove style
              </Button>
            </DialogTrigger>
            <DialogContent
              title={`Remove ${style}?`}
              description="Its photos go too, and customers can't pick it any more. Past orders keep it."
            >
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Keep</Button>
                </DialogClose>
                <Button variant="destructive" onClick={remove}>
                  Remove
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
