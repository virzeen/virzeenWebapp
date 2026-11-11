"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FloatingInput, toast } from "@virzeen/ui";
import { passwordSchema } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { messageFor } from "@/client/lib/error-messages";
import { setPasswordAction } from "@/server/actions/auth";

const fields = {
  currentPassword: z.string().max(128).optional(),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
};
const schema = z.object(fields).refine((v) => v.newPassword === v.confirmPassword, {
  path: ["confirmPassword"],
  error: "The passwords don't match",
});
type Values = z.infer<typeof schema>;

/**
 * Settings → Password (specs/sign-in-v2.md): set a first password, or change it with the current one. A password is
 * optional; it only adds "Use Password" on the sign-in code page. At least 8 characters.
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit({ currentPassword, newPassword }: Values) {
    setFormError(null);
    const result = await setPasswordAction({
      ...(hasPassword ? { currentPassword } : {}),
      newPassword,
    });
    if (result.ok) {
      toast.success(result.data.changed ? "Password changed" : "Password saved");
      form.reset();
      router.refresh(); // the page now offers "Change password"
      return;
    }
    const field = result.error.fields?.currentPassword;
    if (field) form.setError("currentPassword", { message: field });
    else setFormError(messageFor(result.error));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex max-w-md flex-col gap-4">
      <p className="text-body text-ink-muted">
        {hasPassword
          ? "Change the password you use with your email to sign in."
          : "Add a password if you'd like to sign in with it. You can always sign in with an emailed code instead."}
      </p>
      {formError && <Alert variant="danger">{formError}</Alert>}
      {hasPassword && (
        <FloatingInput
          label="Current password"
          type="password"
          required
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...form.register("currentPassword")}
        />
      )}
      <FloatingInput
        label="New password"
        type="password"
        required
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...form.register("newPassword")}
      />
      <FloatingInput
        label="Confirm new password"
        type="password"
        required
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />
      <Button type="submit" shape="pill" size="lg" loading={isSubmitting} className="self-start">
        {hasPassword ? "Change password" : "Set password"}
      </Button>
    </form>
  );
}
