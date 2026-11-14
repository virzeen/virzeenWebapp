"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Checkbox,
  FloatingInput,
  FormField,
  Input,
  Link,
  Select,
  Stack,
  toast,
} from "@virzeen/ui";
import {
  SHOPPING_PREFERENCE_LABELS,
  SHOPPING_PREFERENCES,
  signupDetailsSchema,
  type SignupDetailsInput,
} from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/client/lib/auth-client";
import { messageFor } from "@/client/lib/error-messages";
import { forgetPendingSignIn } from "@/client/lib/pending-sign-in";
import { completeSignupAction } from "@/server/actions/auth";
import { authErrorMessage, type AuthError } from "./auth-errors";
import { ResendCode } from "./resend-code";

const RESEND_SECONDS = 30;
const REQUEST_TIMEOUT_MS = 15_000;

// The emailed code, plus the create-account details the server checks again. No password: it is set in Settings.
const signupFormSchema = signupDetailsSchema.extend({
  otp: z.string().regex(/^\d{6}$/, { error: "Enter the 6-digit code" }),
});
type SignupFormValues = SignupDetailsInput & { otp: string };

const PREFERENCES = SHOPPING_PREFERENCES.map((value) => ({
  value,
  label: SHOPPING_PREFERENCE_LABELS[value],
}));

/**
 * "Now let's make you a MONO Member." (docs/checkoutfeatures.md §3.4, specs/sign-in-v2.md): the code that was just
 * emailed, a name, a shopping preference, an optional birthday and the two ticks. Creating the account signs the
 * customer in and opens their profile. Create Account stays disabled until the form is valid.
 */
export function SignupForm({ email, next }: { email: string; next: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    mode: "onChange",
    defaultValues: {
      otp: "",
      firstName: "",
      lastName: "",
      preference: undefined as unknown as SignupFormValues["preference"],
      birthday: "",
      marketingOptIn: true,
      termsAccepted: false as unknown as true,
    },
  });
  const { errors, isSubmitting, isValid, touchedFields } = form.formState;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    setResending(true);
    let failure: AuthError | null;
    try {
      ({ error: failure } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
        fetchOptions: { timeout: REQUEST_TIMEOUT_MS },
      }));
    } catch {
      failure = {};
    }
    setResending(false);
    if (failure) return setFormError(authErrorMessage(failure));
    setFormError(null);
    setCooldown(RESEND_SECONDS);
    form.setValue("otp", "", { shouldValidate: true });
    toast.success("We sent a new code");
  }

  async function onSubmit({ otp, ...details }: SignupFormValues) {
    setFormError(null);
    let failure: AuthError | null;
    try {
      // The code makes the account (named with what was typed) and signs in.
      ({ error: failure } = await authClient.signIn.emailOtp({
        email,
        otp,
        name: `${details.firstName} ${details.lastName}`.trim(),
        fetchOptions: { timeout: REQUEST_TIMEOUT_MS },
      }));
    } catch {
      failure = {};
    }
    if (failure) {
      const message = authErrorMessage(failure);
      const codeProblem = ["INVALID_OTP", "INVALID_CODE", "OTP_EXPIRED", "TOO_MANY_ATTEMPTS"].includes(
        (failure.code ?? "").toUpperCase(),
      );
      if (codeProblem) form.setError("otp", { message });
      else setFormError(message);
      return;
    }
    // The account exists and the customer is signed in: keep the rest of the details. If that fails, nothing is lost
    // but those details, which they can add later.
    const saved = await completeSignupAction(details);
    if (!saved.ok) toast.error(messageFor(saved.error));
    forgetPendingSignIn();
    // To the member's profile (owner request 2026-11-11), not back to where they came from. Their bag is kept.
    router.replace("/account");
    router.refresh();
  }

  // Edit goes back to the sign-in form with this email already typed in.
  const editHref = `/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}`;
  return (
    <Stack gap={6}>
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-h1">Now let&apos;s make you a MONO Member.</h1>
        <p className="text-body">
          We&apos;ve sent a code to {email}{" "}
          <Link href={editHref} className="text-ink-muted underline underline-offset-4">
            Edit
          </Link>
        </p>
      </header>

      {formError && <Alert variant="danger">{formError}</Alert>}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Controller
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FloatingInput
                label="6-digit code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                error={
                  touchedFields.otp
                    ? errors.otp?.message
                    : errors.otp?.type === "custom"
                      ? errors.otp.message
                      : undefined
                }
                endAdornment={<ResendCode cooldown={cooldown} resending={resending} onResend={resend} />}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                onChange={(event) => field.onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FloatingInput
            label="First Name"
            required
            autoComplete="given-name"
            error={touchedFields.firstName ? errors.firstName?.message : undefined}
            {...form.register("firstName")}
          />
          <FloatingInput
            label="Last Name"
            required
            autoComplete="family-name"
            error={touchedFields.lastName ? errors.lastName?.message : undefined}
            {...form.register("lastName")}
          />
        </div>

        <FormField
          label="Shopping Preference"
          required
          error={touchedFields.preference ? errors.preference?.message : undefined}
        >
          <Controller
            control={form.control}
            name="preference"
            render={({ field }) => (
              <Select
                ref={field.ref}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onValueChange={(value) => field.onChange(value)}
                options={PREFERENCES}
                placeholder="Choose"
              />
            )}
          />
        </FormField>

        <FormField
          label="Date of Birth"
          helper="Optional. Get a MONO Member reward on your birthday."
          error={errors.birthday?.message}
        >
          <Input
            type="date"
            autoComplete="bday"
            max={new Date().toISOString().slice(0, 10)}
            {...form.register("birthday")}
          />
        </FormField>

        <Controller
          control={form.control}
          name="marketingOptIn"
          render={({ field }) => (
            <Checkbox
              label="Email me about new drops and Member benefits."
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />
        <div className="flex flex-col gap-1">
          <Controller
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <Checkbox
                label={
                  <>
                    I agree to the{" "}
                    <Link href="/privacy" className="underline underline-offset-4">
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <Link href="/terms" className="underline underline-offset-4">
                      Terms of Use
                    </Link>
                    .
                  </>
                }
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          shape="pill"
          className="w-full"
          loading={isSubmitting}
          disabled={!isValid}
        >
          Create Account
        </Button>
      </form>
    </Stack>
  );
}
