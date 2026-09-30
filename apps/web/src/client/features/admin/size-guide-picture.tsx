"use client";

import { Button, cn, FormField, Input } from "@virzeen/ui";
import type { SizeGuideFormValues, SizeGuideKind } from "@virzeen/validators";
import { useId, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { ImageUploader } from "./image-uploader";
import type { KindPictures } from "./size-guide-kind-picker";

type SizeGuidePictureProps = {
  /** CHART (Clothing): the optional how-to-measure picture. PICTURE (Accessories): the size chart picture, required. */
  kind: SizeGuideKind;
  guideId: string | undefined;
  uploadsEnabled: boolean;
  /** Each type's picture while the other type is picked (SizeGuideKindPicker). */
  picturesRef: React.RefObject<KindPictures>;
};

/**
 * A size guide's picture (the form's `imageUrl`), with its description once there is one. For an Accessories guide
 * it is the guide itself: its own section, shown larger, and a blank description reads "{name} size chart".
 */
export function SizeGuidePicture({ kind, guideId, uploadsEnabled, picturesRef }: SizeGuidePictureProps) {
  const form = useFormContext<SizeGuideFormValues>();
  const [imageUrl, name] = useWatch({ control: form.control, name: ["imageUrl", "name"] });
  const { errors } = form.formState;
  const groupRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const chartPicture = kind === "PICTURE";
  // An Accessories guide's picture is a section of the form of its own; a Clothing guide's sits in "Fit and how to
  // measure".
  const Wrapper = chartPicture ? "section" : "div";
  const Heading = chartPicture ? "h2" : "h3";
  const madeDescription = name.trim()
    ? `Left blank, it reads "${name.trim()} size chart".`
    : `Left blank, it reads the guide's name and "size chart".`;

  // An upload that finishes after the type was switched is this type's picture, not the other's: it waits with this
  // type's kept picture until the type is switched back.
  function uploaded(url: string) {
    if (form.getValues("kind") === kind) {
      form.setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true });
      return;
    }
    picturesRef.current[kind] = { imageUrl: url, imageAlt: picturesRef.current[kind]?.imageAlt ?? "" };
  }

  function removePicture() {
    form.setValue("imageUrl", "", { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
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
    <Wrapper
      ref={groupRef}
      aria-labelledby={chartPicture ? headingId : undefined}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <Heading id={headingId} className={chartPicture ? "font-display text-h3" : "text-body font-medium"}>
          {chartPicture ? "Size chart picture" : "How-to-measure picture"}
        </Heading>
        <p className="text-small text-ink-muted">
          {chartPicture
            ? "Required. A clear picture of your size chart. Customers see it large and can open it full size."
            : "Optional, e.g. a drawing that shows where to measure."}
        </p>
      </div>
      {imageUrl && (
        <div className="flex flex-col items-start gap-2">
          <div className={cn("w-full", chartPicture ? "max-w-sm" : "max-w-60")}>
            <CloudImage
              src={imageUrl}
              alt=""
              ratio="square"
              sizes={chartPicture ? "384px" : "240px"}
              className="rounded-md"
              imageClassName="object-contain"
            />
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
        label={imageUrl ? "Replace picture" : chartPicture ? "Add size chart picture" : "Add picture"}
        onUploaded={uploaded}
      />
      {imageUrl && (
        <FormField
          label="Picture description"
          helper={
            chartPicture
              ? `Optional. Read out by screen readers. ${madeDescription}`
              : "Read out by screen readers, e.g. Where to measure chest, length and sleeve."
          }
          error={errors.imageAlt?.message}
        >
          <Input maxLength={200} autoComplete="off" {...form.register("imageAlt")} />
        </FormField>
      )}
    </Wrapper>
  );
}
