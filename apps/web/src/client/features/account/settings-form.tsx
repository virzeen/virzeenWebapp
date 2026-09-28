"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormField, Input, Separator, Stack, toast } from "@virzeen/ui";
import { profileSchema, type ProfileInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "@/client/lib/auth-client";
import { messageFor } from "@/client/lib/error-messages";
import { updateProfileAction } from "@/server/actions/account";

/** Name + sign out. Email is the sign-in identity and isn't editable in phase 1. */
export function SettingsForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { name } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ProfileInput) {
    setFormError(null);
    const result = await updateProfileAction(values);
    if (result.ok) toast.success("Saved");
    else setFormError(messageFor(result.error));
  }

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Stack gap={8}>
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
      <Separator />
      <Button variant="secondary" shape="pill" onClick={signOut} loading={signingOut} className="self-start">
        Sign out
      </Button>
    </Stack>
  );
}
