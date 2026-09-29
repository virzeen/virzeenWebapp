"use client";

import {
  Button,
  cn,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  FormField,
  Input,
} from "@virzeen/ui";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { renameOption, sameValue } from "../variant-options";
import { stylesAfterAdd } from "./buybox-styles";
import { useProductEditor } from "./editor-context";

type AddStyleProps = {
  /** "tile": a 64px + square beside picture tiles; "chip": a button like the colour chips. */
  look: "tile" | "chip";
  /** After a style was added: focus its tile (it is picked). */
  onAdded: () => void;
  ref?: React.Ref<HTMLButtonElement>;
};

/**
 * The + that adds a style (specs/product-editor-on-page.md "Style tiles"): a popup with the style's name. Rows are
 * made for every size (useVariantOptions), the style gets its entry (a removed style added back keeps its number)
 * and is picked; it all saves at once.
 */
export function AddStyle({ look, onAdded, ref }: AddStyleProps) {
  const { form, styles, variants, variantOptions, selectStyle } = useProductEditor();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const added = useRef(false);

  function add(event: React.FormEvent) {
    event.preventDefault();
    const hadStyles = styles.length > 0;
    const problem = variantOptions.addStyle(name);
    setError(problem);
    if (problem) return;
    const style = name.trim();
    // Rows of a removed style switched back on keep their old spelling ("White" added back as "white"): the rows,
    // the tiles and the photos must all use the new one.
    const rows = form.getValues("variants");
    if (rows.some((row) => sameValue(row.color, style) && (row.color ?? "").trim() !== style)) {
      variants.replace(renameOption(rows, "color", style, style));
    }
    form.setValue("styles", stylesAfterAdd(form.getValues("styles"), style, hadStyles), {
      shouldDirty: true,
    });
    selectStyle(style);
    added.current = true;
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) return;
        setName("");
        setError(null);
      }}
    >
      <DialogTrigger asChild>
        {look === "tile" ? (
          <button
            ref={ref}
            type="button"
            aria-label="Add style"
            title="Add style"
            className={cn(
              "flex size-16 shrink-0 items-center justify-center rounded-sm border border-dashed border-line-strong text-ink-muted transition-colors duration-150 ease-standard hover:border-ink hover:text-ink",
              "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none",
            )}
          >
            <Plus className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
        ) : (
          <Button ref={ref} variant="secondary" className="self-start">
            <Plus className="size-4" strokeWidth={1.5} aria-hidden />
            Add style
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        title="Add a style"
        description="A colour or a design, e.g. Black or Mountain print."
        onCloseAutoFocus={(event) => {
          if (!added.current) return;
          added.current = false;
          event.preventDefault();
          requestAnimationFrame(onAdded);
        }}
      >
        <form noValidate onSubmit={add} className="flex flex-col gap-6">
          <FormField label="Style name" error={error ?? undefined}>
            <Input
              value={name}
              maxLength={40}
              autoComplete="off"
              enterKeyHint="done"
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
          </FormField>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit">Add style</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
