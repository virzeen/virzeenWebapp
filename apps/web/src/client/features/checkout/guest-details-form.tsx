"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormField, Input, Link, Select, Textarea } from "@virzeen/ui";
import {
  DISTRICTS_BY_PROVINCE,
  emailSchema,
  guestDetailsSchema,
  PROVINCES,
  type GuestDetailsInput,
  type Province,
} from "@virzeen/validators";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { guestEmailHasAccountAction } from "@/server/actions/checkout";

export const EMPTY_GUEST_DETAILS: GuestDetailsInput = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  province: "" as Province,
  district: "",
  municipality: "",
  ward: "",
  street: "",
  landmark: "",
  notes: "",
};

// In the order they appear on screen, so a failed save focuses the first field with an error.
const FIELDS = Object.keys(EMPTY_GUEST_DETAILS) as (keyof GuestDetailsInput)[];

type GuestDetailsFormProps = {
  defaultValues: GuestDetailsInput;
  /** Called with the cleaned values once the whole form is valid. */
  onSave: (values: GuestDetailsInput) => void;
  isSaving: boolean;
};

/**
 * The guest's Delivery Options (docs/checkoutfeatures.md §3.5): contact, a Nepal address and an optional note.
 * Same Zod schema as the server. Errors show when a field is left, and nothing is cleared on error.
 */
export function GuestDetailsForm({ defaultValues, onSave, isSaving }: GuestDetailsFormProps) {
  const [hasAccount, setHasAccount] = useState(false);
  const form = useForm<GuestDetailsInput>({
    resolver: zodResolver(guestDetailsSchema),
    mode: "onBlur",
    shouldFocusError: false,
    defaultValues,
  });
  const { errors, submitCount } = form.formState;
  const province = useWatch({ control: form.control, name: "province" });
  const districts = province ? (DISTRICTS_BY_PROVINCE[province as Province] ?? []) : [];

  // After a submit with errors, focus the first field on screen that has one (the two Selects are in screen order).
  useEffect(() => {
    const first = FIELDS.find((name) => form.getFieldState(name).error);
    if (submitCount > 0 && first) form.setFocus(first);
  }, [submitCount, form]);

  async function checkEmail(value: string) {
    if (!emailSchema.safeParse(value).success) return setHasAccount(false);
    const result = await guestEmailHasAccountAction(value);
    setHasAccount(result.ok && result.data.hasAccount);
  }

  const emailField = form.register("email");

  return (
    <form onSubmit={form.handleSubmit(onSave)} noValidate className="flex flex-col gap-4">
      <FormField label="Email" error={errors.email?.message} required>
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          {...emailField}
          onBlur={(event) => {
            void emailField.onBlur(event);
            void checkEmail(event.target.value);
          }}
        />
      </FormField>
      {hasAccount && (
        <Alert variant="info" data-testid="has-account-banner">
          You have a MONO account.{" "}
          <Link href="/login?next=%2Fcheckout" className="underline underline-offset-4">
            Log in to get member prices.
          </Link>{" "}
          You can still continue as a guest.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First name" error={errors.firstName?.message} required>
          <Input autoComplete="shipping given-name" {...form.register("firstName")} />
        </FormField>
        <FormField label="Last name" error={errors.lastName?.message} required>
          <Input autoComplete="shipping family-name" {...form.register("lastName")} />
        </FormField>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <FormField label="Municipality" error={errors.municipality?.message} required>
          <Input autoComplete="shipping address-level2" {...form.register("municipality")} />
        </FormField>
        <FormField label="Ward no." error={errors.ward?.message} required>
          <Input inputMode="numeric" autoComplete="off" {...form.register("ward")} />
        </FormField>
      </div>

      <FormField label="Tole or street" error={errors.street?.message} required>
        <Input autoComplete="shipping street-address" {...form.register("street")} />
      </FormField>

      <FormField
        label="Landmark"
        helper="Optional — helps the rider find you"
        error={errors.landmark?.message}
      >
        <Input autoComplete="off" {...form.register("landmark")} />
      </FormField>

      <FormField
        label="Mobile number"
        helper="+977. 10 digits starting with 97 or 98. The rider will call this number"
        error={errors.phone?.message}
        required
      >
        <Input type="tel" inputMode="numeric" autoComplete="shipping tel" {...form.register("phone")} />
      </FormField>

      <FormField
        label="Delivery notes"
        helper="Optional — for example, “Call at the gate”"
        error={errors.notes?.message}
      >
        <Textarea rows={2} {...form.register("notes")} />
      </FormField>

      <Button type="submit" size="lg" shape="pill" className="w-full" loading={isSaving}>
        Save &amp; Continue
      </Button>
    </form>
  );
}
