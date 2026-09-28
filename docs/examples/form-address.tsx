// apps/web/src/client/features/checkout/address-form.tsx
"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, PROVINCES, type AddressInput } from "@virzeen/validators"; // same schema the server uses
import { Alert, Button, FormField, Input, Select } from "@virzeen/ui";
import { saveAddressAction } from "@/server/actions/address";
import { messageFor } from "@/client/lib/error-messages";

export function AddressForm({ onSaved }: { onSaved: (addressId: string) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      phone: "",
      province: "",
      district: "",
      city: "",
      street: "",
      landmark: "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: AddressInput) {
    setFormError(null);
    const result = await saveAddressAction(values);
    if (result.ok) return onSaved(result.data.id);
    if (result.error.code === "VALIDATION_FAILED" && result.error.fields) {
      for (const [field, message] of Object.entries(result.error.fields)) {
        form.setError(field as keyof AddressInput, { message });
      }
      return;
    }
    setFormError(messageFor(result.error.code));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <Alert variant="danger">{formError}</Alert>}

      {/* FormField wires label ↔ control ↔ error ids (aria-describedby) */}
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

      <FormField label="Province" error={errors.province?.message} required>
        <Controller
          control={form.control}
          name="province"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              options={PROVINCES}
              placeholder="Choose a province"
            />
          )}
        />
      </FormField>

      <FormField label="Street address" error={errors.street?.message} required>
        <Input autoComplete="shipping street-address" {...form.register("street")} />
      </FormField>

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Save
      </Button>
    </form>
  );
}
