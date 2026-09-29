"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Checkbox, FormField, Input, Select } from "@virzeen/ui";
import {
  addressSchema,
  DISTRICTS_BY_PROVINCE,
  PROVINCES,
  type AddressInput,
  type Province,
} from "@virzeen/validators";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { messageFor } from "@/client/lib/error-messages";
import { saveAddressAction } from "@/server/actions/account";

type AddressFormProps = {
  addressId?: string;
  defaultValues?: Partial<AddressInput>;
  onSaved: (addressId: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

const EMPTY: AddressInput = {
  fullName: "",
  phone: "",
  province: "" as Province,
  district: "",
  city: "",
  street: "",
  landmark: "",
  isDefault: false,
};
// In the order they appear on screen.
const FIELDS = Object.keys(EMPTY) as (keyof AddressInput)[];
const isField = (name: string): name is keyof AddressInput => FIELDS.includes(name as keyof AddressInput);
// For an error with no field to sit under, so a submit never fails silently.
const GENERAL_ERROR = messageFor({ code: "INTERNAL", message: "" });

/** Nepal delivery address (patterns.md §4). Same Zod schema as the server. */
export function AddressForm({
  addressId,
  defaultValues,
  onSaved,
  onCancel,
  submitLabel = "Save",
}: AddressFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    mode: "onBlur",
    // react-hook-form focuses in registration order, which puts the two Selects after every Input.
    shouldFocusError: false,
    defaultValues: { ...EMPTY, ...defaultValues },
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const province = useWatch({ control: form.control, name: "province" });
  const districts = province ? (DISTRICTS_BY_PROVINCE[province as Province] ?? []) : [];
  // The default address can't be switched off, only moved: making another address the default does that.
  const isCurrentDefault = addressId !== undefined && defaultValues?.isDefault === true;

  // After a submit with errors, focus the first field on screen that has one. This runs after the render
  // that shows the messages, so a screen reader reads the error with the field.
  useEffect(() => {
    const first = FIELDS.find((name) => form.getFieldState(name).error);
    if (submitCount > 0 && first) form.setFocus(first);
  }, [submitCount, form]);

  async function onSubmit(values: AddressInput) {
    setFormError(null);
    const result = await saveAddressAction(
      addressId ? { id: addressId, address: values } : { address: values },
    );
    if (result.ok) return onSaved(result.data.id);
    if (result.error.code === "VALIDATION_FAILED" && result.error.fields) {
      for (const [path, message] of Object.entries(result.error.fields)) {
        const field = path.replace(/^address\./, "");
        if (isField(field)) form.setError(field, { message });
        else setFormError(GENERAL_ERROR);
      }
      return;
    }
    setFormError(messageFor(result.error));
  }

  function onInvalid(fieldErrors: FieldErrors<AddressInput>) {
    const names = Object.keys(fieldErrors);
    setFormError(names.length > 0 && names.every(isField) ? null : GENERAL_ERROR);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} noValidate className="flex flex-col gap-4">
      {formError && <Alert variant="danger">{formError}</Alert>}

      <FormField label="Full name" error={errors.fullName?.message} required>
        <Input autoComplete="shipping name" {...form.register("fullName")} />
      </FormField>

      <FormField
        label="Mobile number"
        helper="The courier will call this number"
        error={errors.phone?.message}
        required
      >
        <Input type="tel" inputMode="numeric" autoComplete="shipping tel" {...form.register("phone")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Province" error={errors.province?.message} required>
          <Controller
            control={form.control}
            name="province"
            render={({ field }) => (
              <Select
                ref={field.ref}
                value={field.value}
                onBlur={field.onBlur}
                onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue("district", "");
                }}
                options={PROVINCES}
                placeholder="Choose a province"
              />
            )}
          />
        </FormField>
        {/* No district error under "Choose a province first": the province error says what to do. */}
        <FormField label="District" error={province ? errors.district?.message : undefined} required>
          <Controller
            control={form.control}
            name="district"
            render={({ field }) => (
              <Select
                ref={field.ref}
                value={field.value}
                onBlur={field.onBlur}
                onValueChange={field.onChange}
                options={districts}
                placeholder={province ? "Choose a district" : "Choose a province first"}
                disabled={!province}
              />
            )}
          />
        </FormField>
      </div>

      <FormField label="City or municipality" error={errors.city?.message} required>
        <Input autoComplete="shipping address-level2" {...form.register("city")} />
      </FormField>

      <FormField label="Street address" error={errors.street?.message} required>
        <Input autoComplete="shipping street-address" {...form.register("street")} />
      </FormField>

      <FormField
        label="Landmark"
        helper="Optional — helps the courier find you"
        error={errors.landmark?.message}
      >
        <Input autoComplete="off" {...form.register("landmark")} />
      </FormField>

      {isCurrentDefault ? (
        <p className="text-small text-ink-muted">This is your default address</p>
      ) : (
        <Controller
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <Checkbox
              label="Make this my default address"
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" shape="pill" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" shape="pill" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
