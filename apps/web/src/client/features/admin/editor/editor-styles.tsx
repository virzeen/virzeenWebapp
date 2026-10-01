"use client";

import { FormField, RadioGroup, RadioGroupItem } from "@virzeen/ui";
import { useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { SizeGuideDialog } from "@/client/features/products/size-guide-dialog";
import { hasStylePhotos, tilePhotoFor } from "@/client/features/products/style-photos";
import { AddStyle } from "./buybox-add-style";
import { EditStyle } from "./buybox-edit-style";
import { EditPencil } from "./edit-pencil";
import { useProductEditor } from "./editor-context";

/**
 * The style tiles, as on the shop page (style-picker.tsx): square picture tiles when any style has photos, else
 * "Colour: {name}" chips; picking one shows its photos, price and stock (nothing is ever disabled here). A + adds a
 * style; the pencil beside "Style: {name}" (or a double-click on the tile) edits the picked one
 * (specs/product-editor-on-page.md "Style tiles"). A product without styles shows only Add style. A product with a
 * size guide but no sizes shows "Size guide" before the pencil, as the shop does (editor-sizes.tsx has it otherwise).
 */
export function EditorStyles() {
  const { form, styles, style, selectStyle, variantOptions, options } = useProductEditor();
  const [images, sizeGuideId] = useWatch({ control: form.control, name: ["images", "sizeGuideId"] });
  const guide =
    variantOptions.options.sizes.length === 0
      ? options.sizeGuides.find((option) => option.id === sizeGuideId)
      : undefined;
  const [editing, setEditing] = useState(false);
  const pencilRef = useRef<HTMLButtonElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const photos = images.map((image) => ({ url: image.url, color: image.color?.trim() || null }));
  const tiles = hasStylePhotos(photos, styles);
  // A new style is picked: its tile takes focus.
  const focusPicked = () =>
    groupRef.current?.querySelector<HTMLElement>('[role="radio"][data-state="checked"]')?.focus();

  return (
    <div className="flex flex-col gap-2">
      {styles.length === 0 ? (
        <>
          <p className="text-small font-medium text-ink">Styles</p>
          <p className="text-small text-ink-muted">
            Colours or designs. Each can have its own photos and price.
          </p>
          <div ref={groupRef}>
            <AddStyle ref={addRef} look="chip" onAdded={focusPicked} />
          </div>
        </>
      ) : (
        <FormField
          label={`${tiles ? "Style" : "Colour"}: ${style}`}
          labelAside={
            <div className="flex items-center gap-2">
              {guide && <SizeGuideDialog guide={guide} />}
              <EditPencil
                ref={pencilRef}
                label={`style ${style}`}
                className="-my-2"
                onClick={() => setEditing(true)}
              />
            </div>
          }
        >
          <div ref={groupRef} className={tiles ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}>
            <RadioGroup
              variant={tiles ? "swatch" : "card"}
              value={style}
              onValueChange={selectStyle}
              className={tiles ? undefined : "grid-cols-2 sm:grid-cols-3"}
            >
              {styles.map((name) => (
                <RadioGroupItem
                  key={name}
                  value={name}
                  label={name}
                  onDoubleClick={() => setEditing(true)}
                  media={
                    tiles ? (
                      <CloudImage
                        src={tilePhotoFor(photos, name)?.url ?? null}
                        alt=""
                        ratio="square"
                        sizes="64px"
                      />
                    ) : undefined
                  }
                />
              ))}
            </RadioGroup>
            <AddStyle ref={addRef} look={tiles ? "tile" : "chip"} onAdded={focusPicked} />
          </div>
        </FormField>
      )}
      <EditStyle
        open={editing}
        onOpenChange={setEditing}
        onCloseAutoFocus={(event) => {
          // Back to the pencil; once the last style is removed it's gone, so Add style.
          event.preventDefault();
          requestAnimationFrame(() => (pencilRef.current ?? addRef.current)?.focus());
        }}
      />
    </div>
  );
}
