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
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
    defaultValues: { ...EMPTY, ...defaultValues },
  });
  const { errors, isSubmitting } = form.formState;
  const province = useWatch({ control: form.control, name: "province" });
  const districts = province ? (DISTRICTS_BY_PROVINCE[province as Province] ?? []) : [];

  async function onSubmit(values: AddressInput) {
    setFormError(null);
    const result = await saveAddressAction(
      addressId ? { id: addressId, address: values } : { address: values },
    );
    if (result.ok) return onSaved(result.data.id);
    if (result.error.code === "VALIDATION_FAILED" && result.error.fields) {
      for (const [field, message] of Object.entries(result.error.fields)) {
        form.setError(field.replace(/^address\./, "") as keyof AddressInput, { message });
      }
      return;
    }
    setFormError(messageFor(result.error));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="gap-4 flex flex-col">
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
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="shipping tel"
          maxLength={10}
          {...form.register("phone")}
        />
      </FormField>

      <div className="gap-4 sm:grid-cols-2 grid">
        <FormField label="Province" error={errors.province?.message} required>
          <Controller
            control={form.control}
            name="province"
            render={({ field }) => (
              <Select
                value={field.value}
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
        <FormField label="District" error={errors.district?.message} required>
          <Controller
            control={form.control}
            name="district"
            render={({ field }) => (
              <Select
                value={field.value}
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

      <div className="gap-3 sm:flex-row sm:justify-end flex flex-col-reverse">
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
