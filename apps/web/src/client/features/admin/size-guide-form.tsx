"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormField, Input, Separator, Textarea, toast } from "@virzeen/ui";
import { sizeGuideSchema, type SizeGuideInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { messageFor } from "@/client/lib/error-messages";
import { saveSizeGuideAction } from "@/server/actions/admin/catalog";
import { keepFocusOnPress, useRevealFirstError } from "./form-focus";
import { LinesField } from "./lines-field";
import { SizeChartMeasurements } from "./size-chart-measurements";
import { SizeChartSizes } from "./size-chart-sizes";
import { SizeGuidePicture } from "./size-guide-picture";
import { useSizeChart } from "./use-size-chart";
import { useUnsavedChanges } from "./use-unsaved-changes";

type SizeGuideFormProps = {
  /** The saved guide's id; absent on the New size guide page. */
  guideId?: string;
  defaultValues?: SizeGuideInput;
  uploadsEnabled: boolean;
};

const EMPTY: SizeGuideInput = {
  name: "",
  intro: "",
  chart: { columns: [""], rows: [{ size: "", values: [""] }] },
  fitTips: "",
  howToMeasure: [],
  imageUrl: "",
  imageAlt: "",
};

/** The chart's two parts share one state: the measurements are the table's columns. */
function SizeChartEditor() {
  const chart = useSizeChart();
  return (
    <section aria-labelledby="chart-heading" className="flex flex-col gap-6">
      <h2 id="chart-heading" className="font-display text-h3">
        Chart
      </h2>
      <SizeChartMeasurements chart={chart} />
      <SizeChartSizes chart={chart} />
    </section>
  );
}

/** Size guide editor (specs/size-guides.md): name and intro, the chart in cm, fit tips and how to measure. */
export function SizeGuideForm({ guideId, defaultValues, uploadsEnabled }: SizeGuideFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SizeGuideInput>({
    resolver: zodResolver(sizeGuideSchema),
    mode: "onBlur",
    defaultValues: defaultValues ?? EMPTY,
    // useRevealFirstError focuses the first problem in page order instead.
    shouldFocusError: false,
  });
  const { errors, isDirty, isSubmitting, submitCount } = form.formState;
  const formRef = useRevealFirstError(submitCount);
  useUnsavedChanges(isDirty && !isSubmitting);

  async function onSubmit(values: SizeGuideInput) {
    setFormError(null);
    const result = await saveSizeGuideAction(guideId ? { id: guideId, guide: values } : { guide: values });
    if (result.ok) {
      toast.success("Size guide saved");
      form.reset(values); // not "unsaved" any more, so leaving doesn't ask
      if (!guideId) {
        router.replace(`/admin/size-guides/${result.data.id}`);
        return;
      }
      router.refresh();
      return;
    }
    if (result.error.code === "VALIDATION_FAILED" && result.error.fields) {
      for (const [field, message] of Object.entries(result.error.fields)) {
        form.setError(field.replace(/^guide\./, "") as FieldPath<SizeGuideInput>, { message });
      }
    }
    setFormError(messageFor(result.error));
  }

  return (
    <FormProvider {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit, () => setFormError(null))}
        noValidate
        className="flex max-w-3xl flex-col gap-10"
      >
        {formError && (
          <Alert variant="danger" tabIndex={-1} data-error-summary className="outline-none">
            {formError}
          </Alert>
        )}

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
            helper="Optional, up to 500 characters. Shown above the chart."
            error={errors.intro?.message}
          >
            <Textarea rows={3} maxLength={500} {...form.register("intro")} />
          </FormField>
        </section>

        <Separator />
        <SizeChartEditor />
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
          <SizeGuidePicture guideId={guideId} uploadsEnabled={uploadsEnabled} />
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
    </FormProvider>
  );
}
