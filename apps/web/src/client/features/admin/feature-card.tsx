"use client";

import { Accordion, AccordionItem, Button, FormField, Input, Textarea } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { ImageUploader } from "./image-uploader";

export type FeatureMove = "up" | "down";

type FeatureCardProps = {
  index: number;
  count: number;
  productId: string | undefined;
  uploadsEnabled: boolean;
  onMove: (index: number, to: number, action: FeatureMove) => void;
  onRemove: (index: number) => void;
};

/**
 * One "Features that perform" card in the product editor: its picture on the left (4:5, as in the shop) and the
 * title, text and optional picture description on the right. Move and Remove carry data-action for
 * refocusAfterListChange.
 */
export function FeatureCard({ index, count, productId, uploadsEnabled, onMove, onRemove }: FeatureCardProps) {
  const form = useFormContext<ProductInput>();
  const [imageUrl, title] = useWatch({
    control: form.control,
    name: [`features.${index}.imageUrl`, `features.${index}.title`],
  });
  const errors = form.formState.errors.features?.[index];
  const [altOpen, setAltOpen] = useState("");
  // Blank while typing (and for a moment after a card above is removed): the buttons say "feature 2".
  const name = (title ?? "").trim() || `feature ${index + 1}`;

  return (
    <li className="@container flex flex-col gap-3 rounded-md border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-caption text-ink-muted uppercase">Feature {index + 1}</h3>
        <span className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Move ${name} up`}
            data-action="up"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1, "up")}
          >
            <ArrowUp className="size-4" strokeWidth={1.5} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Move ${name} down`}
            data-action="down"
            disabled={index === count - 1}
            onClick={() => onMove(index, index + 1, "down")}
          >
            <ArrowDown className="size-4" strokeWidth={1.5} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${name}`}
            data-action="remove"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
          </Button>
        </span>
      </div>

      <div className="grid gap-4 @md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="w-full max-w-48">
            <CloudImage src={imageUrl || null} alt="" sizes="192px" />
          </div>
          {errors?.imageUrl && (
            <p tabIndex={-1} data-field-error className="text-small text-danger outline-none">
              {errors.imageUrl.message}
            </p>
          )}
          <ImageUploader
            folder="products"
            entityId={productId ?? "new"}
            uploadsEnabled={uploadsEnabled}
            label={imageUrl ? "Replace picture" : "Add picture"}
            onUploaded={(url) =>
              form.setValue(`features.${index}.imageUrl`, url, { shouldDirty: true, shouldValidate: true })
            }
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <FormField label="Title" helper="Up to 60 characters" error={errors?.title?.message} required>
            <Input maxLength={60} autoComplete="off" {...form.register(`features.${index}.title`)} />
          </FormField>
          <FormField label="Text" helper="Up to 400 characters" error={errors?.body?.message} required>
            <Textarea rows={4} maxLength={400} {...form.register(`features.${index}.body`)} />
          </FormField>
          <Accordion
            type="single"
            collapsible
            value={errors?.alt ? "alt" : altOpen}
            onValueChange={setAltOpen}
          >
            <AccordionItem value="alt" title="Picture description (optional)" headingLevel={4}>
              <FormField
                label="Picture description"
                helper="Read out by screen readers. Leave blank to use the product name and the title."
                error={errors?.alt?.message}
              >
                <Input maxLength={200} autoComplete="off" {...form.register(`features.${index}.alt`)} />
              </FormField>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </li>
  );
}
