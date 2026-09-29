"use client";

import { Button, FormField, Input } from "@virzeen/ui";
import type { SizeGuideInput } from "@virzeen/validators";
import { useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { ImageUploader } from "./image-uploader";

type SizeGuidePictureProps = {
  guideId: string | undefined;
  uploadsEnabled: boolean;
};

/** The optional how-to-measure picture of a size guide, with its description once there is one. */
export function SizeGuidePicture({ guideId, uploadsEnabled }: SizeGuidePictureProps) {
  const form = useFormContext<SizeGuideInput>();
  const imageUrl = useWatch({ control: form.control, name: "imageUrl" });
  const { errors } = form.formState;
  const groupRef = useRef<HTMLDivElement>(null);

  function removePicture() {
    form.setValue("imageUrl", "", { shouldDirty: true });
    form.setValue("imageAlt", "", { shouldDirty: true });
    // The button is gone: focus moves to the uploader.
    requestAnimationFrame(() =>
      groupRef.current
        ?.querySelector<HTMLElement>(
          "[data-image-uploader] input, [data-image-uploader] button:not(:disabled)",
        )
        ?.focus(),
    );
  }

  return (
    <div ref={groupRef} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-body font-medium">How-to-measure picture</h3>
        <p className="text-small text-ink-muted">Optional, e.g. a drawing that shows where to measure.</p>
      </div>
      {imageUrl && (
        <div className="flex flex-col items-start gap-2">
          <div className="w-full max-w-60">
            <CloudImage src={imageUrl} alt="" ratio="square" sizes="240px" />
          </div>
          <Button variant="ghost" size="sm" shape="pill" onClick={removePicture}>
            Remove picture
          </Button>
        </div>
      )}
      {errors.imageUrl && (
        <p tabIndex={-1} data-field-error className="text-small text-danger outline-none">
          {errors.imageUrl.message}
        </p>
      )}
      <ImageUploader
        folder="size-guides"
        entityId={guideId ?? "new"}
        uploadsEnabled={uploadsEnabled}
        label={imageUrl ? "Replace picture" : "Add picture"}
        onUploaded={(url) => form.setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true })}
      />
      {imageUrl && (
        <FormField
          label="Picture description"
          helper="Read out by screen readers, e.g. Where to measure chest, length and sleeve."
          error={errors.imageAlt?.message}
        >
          <Input maxLength={200} autoComplete="off" {...form.register("imageAlt")} />
        </FormField>
      )}
    </div>
  );
}
