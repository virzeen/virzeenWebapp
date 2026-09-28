"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormField, Input, Stack } from "@virzeen/ui";
import { requestOtpSchema, type RequestOtpInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "@/client/lib/auth-client";
import { authErrorMessage } from "./auth-errors";
import { GoogleIcon } from "./google-icon";

type LoginFormProps = { next: string; googleEnabled: boolean };

/** Sign in with a 6-digit email code or Google (no passwords). */
export function LoginForm({ next, googleEnabled }: LoginFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const form = useForm<RequestOtpInput>({
    resolver: zodResolver(requestOtpSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit({ email }: RequestOtpInput) {
    setFormError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    if (error) return setFormError(authErrorMessage(error, email));
    router.push(`/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
  }

  async function signInWithGoogle() {
    setFormError(null);
    setGooglePending(true);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (error) {
      setGooglePending(false);
      setFormError(authErrorMessage(error));
    }
  }

  // Email first, Google second, no "or" divider (owner choice 2026-09-28).
  return (
    <Stack gap={6}>
      {formError && <Alert variant="danger">{formError}</Alert>}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField label="Email" error={errors.email?.message} required>
          <Input type="email" inputMode="email" autoComplete="email" {...form.register("email")} />
        </FormField>
        <Button type="submit" size="lg" shape="pill" loading={isSubmitting}>
          Continue with email
        </Button>
      </form>
      {googleEnabled && (
        <Button variant="secondary" size="lg" shape="pill" loading={googlePending} onClick={signInWithGoogle}>
          {!googlePending && <GoogleIcon className="size-5" />}
          Continue with Google
        </Button>
      )}
    </Stack>
  );
}
