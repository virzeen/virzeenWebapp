"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Checkbox,
  FormField,
  Input,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Stack,
  Switch,
  Textarea,
  toast,
} from "@virzeen/ui";
import {
  PORTFOLIO_KIND_LABELS,
  PORTFOLIO_KINDS,
  portfolioProjectSchema,
  type PortfolioProjectInput,
} from "@virzeen/validators";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { messageFor } from "@/client/lib/error-messages";
import { savePortfolioProjectAction } from "@/server/actions/admin/portfolio";
import { itemButton, keepFocusOnPress, refocusAfterListChange, useRevealFirstError } from "./form-focus";
import { ImageUploader } from "./image-uploader";

type PortfolioFormProps = {
  projectId?: string;
  defaultValues?: PortfolioProjectInput;
  productOptions: { id: string; name: string }[];
  uploadsEnabled: boolean;
};

const EMPTY: PortfolioProjectInput = {
  title: "",
  slug: "",
  kind: "CAMPAIGN",
  summary: "",
  coverUrl: "",
  coverAlt: "",
  body: [],
  productIds: [],
  isPublished: false,
  sortOrder: 0,
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Portfolio case study editor: cover, text/image blocks, shoppable products (patterns.md §9). */
export function PortfolioForm({
  projectId,
  defaultValues,
  productOptions,
  uploadsEnabled,
}: PortfolioFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<PortfolioProjectInput>({
    resolver: zodResolver(portfolioProjectSchema),
    mode: "onBlur",
    defaultValues: defaultValues ?? EMPTY,
    // useRevealFirstError focuses the first problem in page order instead.
    shouldFocusError: false,
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const formRef = useRevealFirstError(submitCount);
  // Story blocks are a union (text | image), so read their errors by path.
  const blockError = (path: `body.${number}.${"heading" | "text" | "url" | "alt" | "caption"}`) =>
    form.getFieldState(path, form.formState).error?.message;
  const blocks = useFieldArray({ control: form.control, name: "body", keyName: "fieldKey" });
  const coverUrl = useWatch({ control: form.control, name: "coverUrl" });
  const blocksRef = useRef<HTMLOListElement>(null);
  const addTextRef = useRef<HTMLButtonElement>(null);

  // The moved block keeps focus on the same arrow, or on the other one once that arrow is disabled.
  function moveBlock(index: number, to: number, action: "up" | "down") {
    blocks.move(index, to);
    refocusAfterListChange(
      () => itemButton(blocksRef.current, to, action),
      () => itemButton(blocksRef.current, to, action === "up" ? "down" : "up"),
    );
  }

  // Focus goes to the next block's Remove, else the previous one's, else "Add text".
  function removeBlock(index: number) {
    blocks.remove(index);
    refocusAfterListChange(
      () => itemButton(blocksRef.current, index, "remove"),
      () => itemButton(blocksRef.current, index - 1, "remove"),
      () => addTextRef.current,
    );
  }

  async function onSubmit(values: PortfolioProjectInput) {
    setFormError(null);
    const result = await savePortfolioProjectAction(
      projectId ? { id: projectId, project: values } : { project: values },
    );
    if (result.ok) {
      toast.success("Project saved");
      if (!projectId) router.replace(`/admin/portfolio/${result.data.id}`);
      router.refresh();
      return;
    }
    if (result.error.code === "VALIDATION_FAILED" && result.error.fields) {
      for (const [field, message] of Object.entries(result.error.fields)) {
        form.setError(field.replace(/^project\./, "") as keyof PortfolioProjectInput, { message });
      }
    }
    setFormError(messageFor(result.error));
  }

  return (
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

      <section className="flex flex-col gap-4" aria-labelledby="story-details">
        <h2 id="story-details" className="font-display text-h3">
          Story
        </h2>
        <FormField label="Title" error={errors.title?.message} required>
          <Input
            {...form.register("title", {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                if (!projectId) form.setValue("slug", slugify(e.target.value));
              },
            })}
          />
        </FormField>
        <FormField label="URL slug" helper="/portfolio/your-slug" error={errors.slug?.message} required>
          <Input {...form.register("slug")} />
        </FormField>
        <FormField label="Type" required>
          <Controller
            control={form.control}
            name="kind"
            render={({ field }) => (
              <RadioGroup
                variant="card"
                value={field.value}
                onValueChange={field.onChange}
                className="grid-cols-1 sm:grid-cols-3"
              >
                {PORTFOLIO_KINDS.map((kind) => (
                  <RadioGroupItem key={kind} value={kind} label={PORTFOLIO_KIND_LABELS[kind]} />
                ))}
              </RadioGroup>
            )}
          />
        </FormField>
        <FormField
          label="Summary"
          helper="Shown on cards and in search results"
          error={errors.summary?.message}
          required
        >
          <Textarea rows={3} {...form.register("summary")} />
        </FormField>
      </section>

      <Separator />

      <section className="flex flex-col gap-4" aria-labelledby="cover-heading">
        <h2 id="cover-heading" className="font-display text-h3">
          Cover image
        </h2>
        {coverUrl && (
          <div className="max-w-sm">
            <CloudImage src={coverUrl} alt="" ratio="landscape" sizes="384px" />
          </div>
        )}
        {errors.coverUrl && (
          <p tabIndex={-1} data-field-error className="text-small text-danger outline-none">
            {coverUrl ? errors.coverUrl.message : "Add a cover image"}
          </p>
        )}
        <ImageUploader
          folder="portfolio"
          entityId={projectId ?? "new"}
          uploadsEnabled={uploadsEnabled}
          label={coverUrl ? "Replace cover" : "Add cover"}
          onUploaded={(url) => form.setValue("coverUrl", url, { shouldValidate: true })}
        />
        <FormField label="Cover alt text" error={errors.coverAlt?.message} required>
          <Input {...form.register("coverAlt")} />
        </FormField>
      </section>

      <Separator />

      <section className="flex flex-col gap-4" aria-labelledby="blocks-heading">
        <h2 id="blocks-heading" className="font-display text-h3">
          Story blocks
        </h2>
        <ol ref={blocksRef} className="flex flex-col gap-4">
          {blocks.fields.map((block, index) => (
            <li key={block.fieldKey} className="flex flex-col gap-3 rounded-md border border-line p-4">
              <div className="flex items-center justify-between">
                <span className="text-caption text-ink-muted uppercase">
                  {index + 1}. {block.type === "text" ? "Text" : "Image"}
                </span>
                <span className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Move block up"
                    data-action="up"
                    disabled={index === 0}
                    onClick={() => moveBlock(index, index - 1, "up")}
                  >
                    <ArrowUp className="size-4" strokeWidth={1.5} aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Move block down"
                    data-action="down"
                    disabled={index === blocks.fields.length - 1}
                    onClick={() => moveBlock(index, index + 1, "down")}
                  >
                    <ArrowDown className="size-4" strokeWidth={1.5} aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove block"
                    data-action="remove"
                    onClick={() => removeBlock(index)}
                  >
                    <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
                  </Button>
                </span>
              </div>
              {block.type === "text" ? (
                <>
                  <FormField label="Heading" helper="Optional" error={blockError(`body.${index}.heading`)}>
                    <Input {...form.register(`body.${index}.heading` as const)} />
                  </FormField>
                  <FormField label="Text" required error={blockError(`body.${index}.text`)}>
                    <Textarea rows={4} {...form.register(`body.${index}.text` as const)} />
                  </FormField>
                </>
              ) : (
                <>
                  <div className="max-w-xs">
                    <CloudImage src={block.url} alt="" ratio="landscape" sizes="320px" />
                  </div>
                  {blockError(`body.${index}.url`) && (
                    <p tabIndex={-1} data-field-error className="text-small text-danger outline-none">
                      {blockError(`body.${index}.url`)}
                    </p>
                  )}
                  <FormField label="Alt text" required error={blockError(`body.${index}.alt`)}>
                    <Input {...form.register(`body.${index}.alt` as const)} />
                  </FormField>
                  <FormField label="Caption" helper="Optional" error={blockError(`body.${index}.caption`)}>
                    <Input {...form.register(`body.${index}.caption` as const)} />
                  </FormField>
                  <Controller
                    control={form.control}
                    name={`body.${index}.layout` as const}
                    render={({ field }) => (
                      <Switch
                        label="Full width"
                        checked={field.value === "full"}
                        onCheckedChange={(checked) => field.onChange(checked ? "full" : "inset")}
                      />
                    )}
                  />
                </>
              )}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-start gap-3">
          <Button
            ref={addTextRef}
            variant="secondary"
            shape="pill"
            onMouseDown={keepFocusOnPress}
            onClick={() => blocks.append({ type: "text", heading: "", text: "" })}
          >
            Add text
          </Button>
          <ImageUploader
            folder="portfolio"
            entityId={projectId ?? "new"}
            uploadsEnabled={uploadsEnabled}
            label="Add image"
            onUploaded={(url) => blocks.append({ type: "image", url, alt: "", caption: "", layout: "full" })}
          />
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-2" aria-labelledby="products-heading">
        <h2 id="products-heading" className="font-display text-h3">
          Shop the story
        </h2>
        <Controller
          control={form.control}
          name="productIds"
          render={({ field }) => (
            <div className="grid max-h-80 gap-x-6 overflow-y-auto rounded-md border border-line px-4 sm:grid-cols-2">
              {productOptions.map((product) => (
                <Checkbox
                  key={product.id}
                  label={product.name}
                  checked={field.value.includes(product.id)}
                  onCheckedChange={(checked) =>
                    field.onChange(
                      checked === true
                        ? [...field.value, product.id]
                        : field.value.filter((id) => id !== product.id),
                    )
                  }
                />
              ))}
            </div>
          )}
        />
      </section>

      <Separator />

      <Stack gap={4}>
        <FormField
          label="Order on the portfolio page"
          helper="Lower numbers come first"
          error={errors.sortOrder?.message}
        >
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            className="max-w-32"
            {...form.register("sortOrder", { valueAsNumber: true })}
          />
        </FormField>
        <Controller
          control={form.control}
          name="isPublished"
          render={({ field }) => (
            <Switch
              label="Published"
              description="Visible on the portfolio page"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Button
          type="submit"
          size="lg"
          shape="pill"
          loading={isSubmitting}
          onMouseDown={keepFocusOnPress}
          className="self-start"
        >
          Save project
        </Button>
      </Stack>
    </form>
  );
}
