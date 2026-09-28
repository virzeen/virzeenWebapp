"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormField, Input, Separator, Stack } from "@virzeen/ui";
import { requestOtpSchema, type RequestOtpInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "@/client/lib/auth-client";
import { authErrorMessage } from "./auth-errors";

type LoginFormProps = { next: string; googleEnabled: boolean };

/** Sign in with Google or a 6-digit email code (no passwords). */
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

  return (
    <Stack gap={6}>
      {formError && <Alert variant="danger">{formError}</Alert>}
      {googleEnabled && (
        <>
          <Button
            variant="secondary"
            size="lg"
            shape="pill"
            loading={googlePending}
            onClick={signInWithGoogle}
          >
            Continue with Google
          </Button>
          <div className="gap-4 flex items-center text-small text-ink-muted">
            <Separator className="flex-1" />
            or
            <Separator className="flex-1" />
          </div>
        </>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="gap-4 flex flex-col">
        <FormField
          label="Email"
          error={errors.email?.message}
          helper="We'll email you a 6-digit code."
          required
        >
          <Input type="email" inputMode="email" autoComplete="email" {...form.register("email")} />
        </FormField>
        <Button type="submit" size="lg" shape="pill" loading={isSubmitting}>
          Continue with email
        </Button>
      </form>
    </Stack>
  );
}
