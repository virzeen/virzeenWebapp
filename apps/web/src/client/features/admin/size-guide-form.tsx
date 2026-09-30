"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormField, Input, Separator, Textarea, toast } from "@virzeen/ui";
import {
  sizeGuideSchema,
  type SizeChart,
  type SizeGuideFormValues,
  type SizeGuideInput,
} from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FormProvider, useForm, useWatch, type FieldPath } from "react-hook-form";
import { messageFor } from "@/client/lib/error-messages";
import { saveSizeGuideAction } from "@/server/actions/admin/catalog";
import { keepFocusOnPress, useRevealFirstError } from "./form-focus";
import { LinesField } from "./lines-field";
import { SizeChartEditor } from "./size-chart-editor";
import { emptyChart } from "./size-chart-templates";
import { SizeGuideKindPicker, type KindPictures } from "./size-guide-kind-picker";
import { SizeGuidePicture } from "./size-guide-picture";
import { SizeGuidePreview } from "./size-guide-preview";
import { useUnsavedChanges } from "./use-unsaved-changes";

type SizeGuideFormProps = {
  /** The saved guide's id; absent on the New size guide page. */
  guideId?: string;
  /** The saved guide (adminReads.getSizeGuideForEdit): `chart` is null for a PICTURE guide. */
  defaultValues?: Omit<SizeGuideFormValues, "chart"> & { chart: SizeChart | null };
  uploadsEnabled: boolean;
};

const EMPTY: SizeGuideFormValues = {
  kind: "CHART",
  name: "",
  intro: "",
  chart: emptyChart(),
  fitTips: "",
  howToMeasure: [],
  imageUrl: "",
  imageAlt: "",
};

// An Accessories guide has no table, and a stored table that wasn't valid comes back with no cells: either way the
// form starts an empty one to type in if the type is switched.
const draftChart = (chart: SizeChart | null) =>
  chart && chart.columns.length > 0 && chart.rows.length > 0 ? chart : emptyChart();

/**
 * Size guide editor (specs/size-guides.md, specs/product-page-v2.md "Size guides"): the type, name and intro, then a
 * Clothing guide's size table or an Accessories guide's picture, then fit tips and how to measure. "What customers
 * see" (the popup, live) sits beside it from xl and under it before that.
 */
export function SizeGuideForm({ guideId, defaultValues, uploadsEnabled }: SizeGuideFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SizeGuideFormValues, unknown, SizeGuideInput>({
    resolver: zodResolver(sizeGuideSchema),
    mode: "onBlur",
    defaultValues: defaultValues ? { ...defaultValues, chart: draftChart(defaultValues.chart) } : EMPTY,
    // useRevealFirstError focuses the first problem in page order instead.
    shouldFocusError: false,
  });
  const { errors, isDirty, isSubmitting, submitCount } = form.formState;
  const kind = useWatch({ control: form.control, name: "kind" });
  const formRef = useRevealFirstError(submitCount);
  // Each type's picture while the other type is picked, so switching (or an upload finishing after it) loses neither.
  const picturesRef = useRef<KindPictures>({});
  useUnsavedChanges(isDirty && !isSubmitting);

  async function onSubmit(values: SizeGuideInput) {
    setFormError(null);
    const result = await saveSizeGuideAction(guideId ? { id: guideId, guide: values } : { guide: values });
    if (result.ok) {
      toast.success("Size guide saved");
      // Not "unsaved" any more, so leaving doesn't ask. A PICTURE guide keeps the table typed before switching.
      form.reset({ ...values, chart: values.chart ?? form.getValues("chart") });
      if (!guideId) {
        router.replace(`/admin/size-guides/${result.data.id}`);
        return;
      }
      router.refresh();
      return;
    }
    if (result.error.code === "VALIDATION_FAILED" && result.error.fields) {
      for (const [field, message] of Object.entries(result.error.fields)) {
        form.setError(field.replace(/^guide\./, "") as FieldPath<SizeGuideFormValues>, { message });
      }
    }
    setFormError(messageFor(result.error));
  }

  return (
    <FormProvider {...form}>
      {/*
        The preview sits beside the form only from xl, so the size table has room for its measurements (at lg it
        goes under the form, as on phones).
      */}
      <div className="grid max-w-6xl items-start gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit, () => setFormError(null))}
          noValidate
          className="flex min-w-0 flex-col gap-10"
        >
          {formError && (
            <Alert variant="danger" tabIndex={-1} data-error-summary className="outline-none">
              {formError}
            </Alert>
          )}

          <SizeGuideKindPicker picturesRef={picturesRef} />

          <section aria-labelledby="guide-heading" className="flex flex-col gap-4">
            <h2 id="guide-heading" className="font-display text-h3">
              Name and intro
            </h2>
            <FormField
              label="Name"
              helper="e.g. T-shirts. Customers see it in the Size guide popup."
              error={errors.name?.message}
              required
            >
              <Input maxLength={60} autoComplete="off" {...form.register("name")} />
            </FormField>
            <FormField
              label="Intro"
              helper="Optional, up to 500 characters. Shown at the top of the popup."
              error={errors.intro?.message}
            >
              <Textarea rows={3} maxLength={500} {...form.register("intro")} />
            </FormField>
          </section>

          <Separator />
          {kind === "PICTURE" ? (
            <SizeGuidePicture
              kind="PICTURE"
              guideId={guideId}
              uploadsEnabled={uploadsEnabled}
              picturesRef={picturesRef}
            />
          ) : (
            <SizeChartEditor />
          )}
          <Separator />

          <section aria-labelledby="fit-heading" className="flex flex-col gap-4">
            <h2 id="fit-heading" className="font-display text-h3">
              Fit and how to measure
            </h2>
            <FormField
              label="Fit tips"
              helper="Optional, up to 500 characters, e.g. Relaxed fit. Between sizes? Take the smaller one."
              error={errors.fitTips?.message}
            >
              <Textarea rows={3} maxLength={500} {...form.register("fitTips")} />
            </FormField>
            <LinesField
              control={form.control}
              name="howToMeasure"
              label="How to measure"
              helper="Optional. One tip per line, up to 10."
            />
            {kind !== "PICTURE" && (
              <SizeGuidePicture
                kind="CHART"
                guideId={guideId}
                uploadsEnabled={uploadsEnabled}
                picturesRef={picturesRef}
              />
            )}
          </section>

          <Button
            type="submit"
            size="lg"
            shape="pill"
            loading={isSubmitting}
            onMouseDown={keepFocusOnPress}
            className="self-start"
          >
            Save size guide
          </Button>
        </form>

        {/* Pinned beside the form from xl; a long popup scrolls inside it. Not an <aside>: it sits inside <main>. */}
        {/* min-w-0: a wide table in the popup scrolls inside it instead of widening the page on phones. */}
        <div className="min-w-0 xl:sticky xl:top-0 xl:max-h-svh xl:overflow-y-auto xl:py-4">
          <SizeGuidePreview />
        </div>
      </div>
    </FormProvider>
  );
}
