"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@virzeen/ui";
import { productSchema, type ProductInput } from "@virzeen/validators";
import { useCallback, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm, useFormContext } from "react-hook-form";
import { useUnsavedChanges } from "../use-unsaved-changes";
import { useVariantOptions } from "../use-variant-options";
import { EditDraftsContext, useDraftProblems } from "./edit-drafts";
import {
  ProductEditorContext,
  type EditorChange,
  type EditorOptions,
  type EditorProduct,
  type ProductEditor,
} from "./editor-context";
import { nextSlug, slugFollowsName } from "./editor-slug";
import { firstIssueUnder, withChanges } from "./field-issues";
import { useAddedCategories } from "./use-added-categories";
import { useAutosave, type SavedProduct } from "./use-autosave";

type ProductEditorProviderProps = {
  product: EditorProduct;
  /** The form's values as core reads them (getProductForEdit's `values`). */
  values: ProductInput;
  options: EditorOptions;
  children: React.ReactNode;
};

/**
 * Owns the on-page product editor's state (specs/product-editor-on-page.md): the react-hook-form form (FormProvider,
 * so useFormContext works below), the one `images` and one `variants` field array, the picked style, the options,
 * and the autosave. Read it with useProductEditor().
 */
export function ProductEditorProvider({ product, values, options, children }: ProductEditorProviderProps) {
  // Each save refreshes the page, which sends the product again: the editor keeps what it started with (the form
  // already holds the saved values) and only takes new options, such as a category added meanwhile.
  const [start] = useState({ product, values });
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: start.values,
    shouldFocusError: false,
  });
  return (
    <FormProvider {...form}>
      <EditorState product={start.product} values={start.values} options={options}>
        {children}
      </EditorState>
    </FormProvider>
  );
}

type SetValueLoose = (name: string, value: unknown, options?: { shouldDirty?: boolean }) => void;

function EditorState({ product: initial, values, options, children }: ProductEditorProviderProps) {
  const form = useFormContext<ProductInput>();
  const [product, setProduct] = useState(initial);
  const [picked, setPicked] = useState<string | null>(null);
  const [slugFollows, setSlugFollows] = useState(
    () => !initial.everPublished && slugFollowsName(values.slug, values.name),
  );
  const slugTries = useRef(0);
  const savedPublished = useRef(initial.isPublished);

  function onSaved(saved: SavedProduct) {
    const published = saved.values.isPublished;
    if (published !== savedPublished.current)
      toast.success(published ? "Product published" : "Product unpublished");
    savedPublished.current = published;
    slugTries.current = 0;
    if (published) setSlugFollows(false);
    setProduct((was) => ({
      ...was,
      slug: saved.slug,
      isPublished: published,
      everPublished: was.everPublished || published,
      savedAt: saved.savedAt,
    }));
  }

  function onSlugTaken() {
    if (!slugFollows || slugTries.current >= 5) return false;
    slugTries.current += 1;
    const { slug, name } = form.getValues();
    form.setValue("slug", nextSlug(slug, name));
    return true;
  }

  const autosave = useAutosave({
    form,
    productId: initial.id,
    savedAt: initial.savedAt,
    savedValues: values,
    onSaved,
    onSlugTaken,
  });
  const { commit } = autosave;
  const images = useFieldArray({ control: form.control, name: "images", keyName: "fieldKey" });
  // The rows only change through the editor's own handlers, so the size and style lists never reload.
  const variantOptions = useVariantOptions({
    initialRows: values.variants,
    savedAt: undefined,
    images,
    onListChange: () => void commit(),
  });

  const commitFields = useCallback(
    (changes: readonly EditorChange[]) => {
      const checked = productSchema.safeParse(withChanges(form.getValues(), changes));
      const names = changes.map((change) => change.name);
      const problem = checked.success ? null : firstIssueUnder(checked.error.issues, names);
      if (problem) return problem;
      const setValue = form.setValue as unknown as SetValueLoose;
      for (const { name, value } of changes) setValue(name, value, { shouldDirty: true });
      form.clearErrors(names);
      void commit();
      return null;
    },
    [form, commit],
  );

  const { drafts, openProblem } = useDraftProblems();
  const save = openProblem ? { status: "invalid" as const, message: openProblem } : autosave.state;
  useUnsavedChanges(save.status !== "saved");

  const { categories, addCategory } = useAddedCategories(options.categories);
  const styles = variantOptions.options.colors;
  const style = picked !== null && styles.includes(picked) ? picked : (styles[0] ?? "");
  const editor: ProductEditor = {
    form,
    images,
    variants: variantOptions.variants,
    variantOptions,
    styles,
    style,
    selectStyle: setPicked,
    options: { ...options, categories },
    addCategory,
    product,
    slugFollowsName: slugFollows,
    stopSlugFollowingName: () => setSlugFollows(false),
    save,
    commit,
    commitField: (name, value) => commitFields([{ name, value }]),
    commitFields,
    retry: () => void commit(),
  };

  return (
    <ProductEditorContext value={editor}>
      <EditDraftsContext value={drafts}>{children}</EditDraftsContext>
    </ProductEditorContext>
  );
}
