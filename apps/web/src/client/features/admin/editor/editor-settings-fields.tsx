"use client";

import { Checkbox, FormField, Input, Textarea } from "@virzeen/ui";
import { AudienceField } from "../audience-field";
import { Controller, useFormState, useWatch } from "react-hook-form";
import { useProductEditor } from "./editor-context";

/** Settings → Search engines: URL slug and search description, saved when left. */
export function SettingsSearch() {
  const { form, commit, slugFollowsName, stopSlugFollowingName } = useProductEditor();
  const { errors } = useFormState({ control: form.control, name: ["slug", "seoDescription"] });
  const save = () => void commit();

  return (
    <section aria-labelledby="settings-search-heading" className="flex flex-col gap-4">
      <h3 id="settings-search-heading" className="text-body font-medium">
        Search engines
      </h3>
      <FormField
        label="URL slug"
        helper={
          slugFollowsName
            ? "The end of the address: /product/your-slug. Made from the name until you publish or change it."
            : "The end of the address: /product/your-slug."
        }
        error={errors.slug?.message}
        required
      >
        <Input
          autoComplete="off"
          {...form.register("slug", { onChange: stopSlugFollowingName, onBlur: save })}
        />
      </FormField>
      <FormField
        label="Search description"
        helper="Optional, up to 155 characters. Shown under the name in Google."
        error={errors.seoDescription?.message}
      >
        <Textarea rows={3} maxLength={155} {...form.register("seoDescription", { onBlur: save })} />
      </FormField>
    </section>
  );
}

/**
 * Settings → Visibility: who may see the product (specs/catalog-groups-visibility.md). It is shown only when this and
 * at least one of its collections allow the viewer; saved straight away.
 */
export function SettingsVisibility() {
  const { form, commitField } = useProductEditor();
  const audience = useWatch({ control: form.control, name: "audience" });
  return (
    <FormField
      label="Visibility"
      helper="Shown to someone only when this, and at least one of its collections, allow them."
    >
      <AudienceField value={audience} onChange={(next) => commitField("audience", next)} />
    </FormField>
  );
}

/**
 * Settings → Collections: ticking one saves straight away. The main collection (picked under the name) is always
 * ticked. Nothing when the shop has no collections.
 */
export function SettingsCollections() {
  const { form, options, commit } = useProductEditor();
  const { errors } = useFormState({ control: form.control, name: "collectionIds" });
  const mainCollectionId = useWatch({ control: form.control, name: "mainCollectionId" });
  if (options.collections.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="pb-1 text-body font-medium">Collections</legend>
      <Controller
        control={form.control}
        name="collectionIds"
        render={({ field }) => (
          <div className="flex flex-col">
            {options.collections.map((collection) => (
              <Checkbox
                key={collection.id}
                label={collection.name}
                description={collection.id === mainCollectionId ? "Main collection" : undefined}
                checked={collection.id === mainCollectionId || field.value.includes(collection.id)}
                disabled={collection.id === mainCollectionId}
                onCheckedChange={(checked) => {
                  field.onChange(
                    checked === true
                      ? [...field.value, collection.id]
                      : field.value.filter((id) => id !== collection.id),
                  );
                  void commit();
                }}
              />
            ))}
          </div>
        )}
      />
      {errors.collectionIds?.message && (
        <p className="text-small text-danger" data-field-error tabIndex={-1}>
          {errors.collectionIds.message}
        </p>
      )}
    </fieldset>
  );
}
