"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormField, Input, toast } from "@virzeen/ui";
import { profileSchema, type ProfileInput } from "@virzeen/validators";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { messageFor } from "@/client/lib/error-messages";
import { updateProfileAction } from "@/server/actions/account";

/**
 * Name, and the sign-in email (not editable in phase 1). Account settings and admin settings both use it.
 */
export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { name } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ProfileInput) {
    setFormError(null);
    const result = await updateProfileAction(values);
    if (result.ok) toast.success("Saved");
    else setFormError(messageFor(result.error));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex max-w-md flex-col gap-4">
      {formError && <Alert variant="danger">{formError}</Alert>}
      <FormField label="Name" error={errors.name?.message} required>
        <Input autoComplete="name" {...form.register("name")} />
      </FormField>
      <FormField label="Email" helper="You sign in with this email.">
        <Input type="email" value={email} readOnly disabled />
      </FormField>
      <Button type="submit" shape="pill" loading={isSubmitting} className="self-start">
        Save
      </Button>
    </form>
  );
}
