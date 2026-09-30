"use client";

import { useFormState, useWatch } from "react-hook-form";
import { useProductEditor } from "./editor-context";
import { photoAltResets } from "./made-alts";
import { MediaGallery } from "./media-gallery";
import { useLandPhoto } from "./media-landing";
import { galleryPhotos, uploadRoom } from "./media-photos";

/**
 * The picked style's photos, like the shop gallery (specs/product-editor-on-page.md "Gallery"): Add photos on the
 * main photo (a big drop zone when there are none), a + tile at the end of the thumbnails, and Make main, move and
 * Remove for the photo on show. With styles, the gallery and its uploads belong to the picked style; a style
 * without photos of its own shows the shared ones, as the shop does. Every change saves; a move or a removal also
 * clears the group's made photo descriptions, so the save numbers them again.
 */
export function EditorGallery() {
  const { form, images, style, styles, product, options, commit } = useProductEditor();
  const [values, name] = useWatch({ control: form.control, name: ["images", "name"] });
  const { errors } = useFormState({ control: form.control, name: "images" });
  const land = useLandPhoto(styles, images, commit);
  const { photos, shared } = galleryPhotos(values, style, styles);
  // Keys from the field array; the data from useWatch (autosave patches single paths, which `fields` misses).
  const keyed = photos.map((photo) => ({
    ...photo,
    key: images.fields[photo.index]?.fieldKey ?? `${photo.url}-${photo.index}`,
  }));
  const problems = [
    errors.images?.message ?? errors.images?.root?.message,
    ...photos.flatMap((photo, position) =>
      [errors.images?.[photo.index]?.url?.message, errors.images?.[photo.index]?.color?.message].map(
        (message) => message && `Photo ${position + 1}: ${message}`,
      ),
    ),
  ].filter((message): message is string => Boolean(message));

  /**
   * After a move or a removal the group's made descriptions ("{name}, {style}, photo 2") name the wrong place: they go
   * blank, and the save makes them again in the new order.
   */
  function renumber(group: string) {
    const color = group.trim();
    const resets = photoAltResets(form.getValues("images"), (style) =>
      style === color ? { name, style } : null,
    );
    for (const reset of resets) form.setValue(reset.name, reset.value, { shouldDirty: true });
    void commit();
  }

  return (
    <MediaGallery
      key={style}
      style={style}
      photos={keyed}
      shared={shared}
      room={uploadRoom(values, style, styles)}
      productId={product.id}
      productName={name}
      uploadsEnabled={options.uploadsEnabled}
      onUploaded={(url) => land(url, style)}
      onMove={(from, to) => {
        const group = values[from]?.color ?? "";
        images.move(from, to);
        renumber(group);
      }}
      onRemove={(index) => {
        const group = values[index]?.color ?? "";
        images.remove(index);
        renumber(group);
      }}
      problems={[...new Set(problems)]}
    />
  );
}
