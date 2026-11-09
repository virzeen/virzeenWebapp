"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormField, Input, RadioGroup, RadioGroupItem, Textarea, toast } from "@virzeen/ui";
import { REVIEW_RATINGS, reviewSchema, type ReviewData, type ReviewInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Stars } from "@/client/components/shared/star-rating";
import { messageFor } from "@/client/lib/error-messages";
import { saveReviewAction } from "@/server/actions/reviews";

type ReviewFormProps = {
  productId: string;
  productSlug: string;
  /** The customer's review, when they're editing it. */
  review: { rating: number; title: string; body: string } | null;
};

/**
 * Stars (required), a title and the review (both optional), with `reviewSchema` on both sides (specs/reviews.md).
 * After saving it goes back to the product's reviews with a toast.
 */
export function ReviewForm({ productId, productSlug, review }: ReviewFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const form = useForm<ReviewInput, unknown, ReviewData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      productId,
      rating: review?.rating ?? 0,
      title: review?.title ?? "",
      body: review?.body ?? "",
    },
    shouldFocusError: false,
  });
  const { errors, isSubmitting, submitCount } = form.formState;

  // After a failed submit, focus the first problem in screen order (patterns.md §4): the stars come first.
  useEffect(() => {
    if (submitCount === 0) return;
    if (formError) return alertRef.current?.focus();
    if (errors.rating) return form.setFocus("rating");
    if (errors.title) return form.setFocus("title");
    if (errors.body) form.setFocus("body");
  }, [submitCount, errors, formError, form]);

  async function onSubmit(values: ReviewData) {
    setFormError(null);
    const result = await saveReviewAction(values);
    if (result.ok) {
      toast.success("Thanks for your review.");
      router.push(`/product/${productSlug}#reviews`);
      return;
    }
    const fields = result.error.fields ?? {};
    for (const name of ["rating", "title", "body"] as const) {
      if (fields[name]) form.setError(name, { message: fields[name] });
    }
    if (!Object.keys(fields).some((name) => ["rating", "title", "body"].includes(name))) {
      setFormError(messageFor(result.error));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex max-w-md flex-col gap-6">
      {formError && (
        <Alert variant="danger" ref={alertRef} tabIndex={-1} data-error-summary>
          {formError}
        </Alert>
      )}
      <FormField label="Your rating" error={errors.rating?.message} required>
        <Controller
          control={form.control}
          name="rating"
          render={({ field }) => (
            <RadioGroup
              ref={field.ref}
              value={field.value ? String(field.value) : ""}
              onValueChange={(value) => field.onChange(Number(value))}
              onBlur={field.onBlur}
            >
              {REVIEW_RATINGS.map((stars) => (
                <RadioGroupItem
                  key={stars}
                  value={String(stars)}
                  label={
                    <span className="inline-flex items-center gap-2">
                      <Stars filled={stars} />
                      {stars === 1 ? "1 star" : `${stars} stars`}
                    </span>
                  }
                />
              ))}
            </RadioGroup>
          )}
        />
      </FormField>
      <FormField label="Title" helper="Optional, e.g. Soft and true to size" error={errors.title?.message}>
        <Input autoComplete="off" {...form.register("title")} />
      </FormField>
      <FormField
        label="Your review"
        helper="Optional. How did it fit, feel and wash?"
        error={errors.body?.message}
      >
        <Textarea rows={5} {...form.register("body")} />
      </FormField>
      <Button type="submit" shape="pill" loading={isSubmitting} className="self-start">
        {review ? "Save review" : "Submit review"}
      </Button>
    </form>
  );
}
