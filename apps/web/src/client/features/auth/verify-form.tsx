"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormField, Input, Stack, toast } from "@virzeen/ui";
import { verifyOtpSchema, type VerifyOtpInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "@/client/lib/auth-client";
import { authErrorMessage } from "./auth-errors";

const RESEND_SECONDS = 60;

/** Enter the 6-digit code. On success the guest bag is merged on the next page load. */
export function VerifyForm({ email, next }: { email: string; next: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const form = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    mode: "onBlur",
    defaultValues: { email, otp: "" },
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function onSubmit({ otp }: VerifyOtpInput) {
    setFormError(null);
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    if (error) return setFormError(authErrorMessage(error, email));
    router.replace(next);
    router.refresh();
  }

  async function resend() {
    setResending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setResending(false);
    if (error) return setFormError(authErrorMessage(error, email));
    setCooldown(RESEND_SECONDS);
    toast.success("We sent a new code");
  }

  return (
    <Stack gap={6}>
      {formError && <Alert variant="danger">{formError}</Alert>}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="gap-4 flex flex-col">
        <FormField label="6-digit code" error={errors.otp?.message} required>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="tracking-widest text-center text-h3"
            {...form.register("otp")}
          />
        </FormField>
        <Button type="submit" size="lg" shape="pill" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
      <Button variant="link" onClick={resend} disabled={cooldown > 0 || resending} className="self-center">
        {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
      </Button>
    </Stack>
  );
}
