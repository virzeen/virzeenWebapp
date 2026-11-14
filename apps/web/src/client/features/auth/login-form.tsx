"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FloatingInput, Stack } from "@virzeen/ui";
import { requestOtpSchema, type RequestOtpInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "@/client/lib/auth-client";
import { messageFor } from "@/client/lib/error-messages";
import { rememberPendingSignIn } from "@/client/lib/pending-sign-in";
import { identifyEmailAction } from "@/server/actions/auth";
import { authErrorMessage } from "./auth-errors";
import { GoogleIcon } from "./google-icon";

type LoginFormProps = {
  next: string;
  googleEnabled: boolean;
  /** Typed in already: coming back with Edit from the code page. */
  defaultEmail?: string;
};

/**
 * Email first (docs/checkoutfeatures.md §3.2): the email decides what comes next. A member gets a code (and "Use
 * Password" if they set one) on the code page; a new email gets one on the create-account page. Or Google.
 */
export function LoginForm({ next, googleEnabled, defaultEmail = "" }: LoginFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const form = useForm<RequestOtpInput>({
    resolver: zodResolver(requestOtpSchema),
    mode: "onBlur",
    defaultValues: { email: defaultEmail },
  });
  const { errors, isSubmitting } = form.formState;

  // Back on this page after signing in somewhere else (Google opens in the browser, outside the installed app):
  // ask the server again, and the page moves on to `next` if this phone is now signed in.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  async function onSubmit({ email }: RequestOtpInput) {
    setFormError(null);
    const identified = await identifyEmailAction(email);
    if (!identified.ok) return setFormError(messageFor(identified.error));
    const { registered, hasPassword } = identified.data;
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    if (error) return setFormError(authErrorMessage(error, email));
    const query = `email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`;
    if (!registered) return router.push(`/signup?${query}`);
    // So the installed app can come back to the code screen after a trip to the mail app (ResumeSignIn).
    rememberPendingSignIn(email, next);
    router.push(`/verify?${query}${hasPassword ? "&pw=1" : ""}`);
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
    <Stack gap={3}>
      {formError && <Alert variant="danger">{formError}</Alert>}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
        <FloatingInput
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...form.register("email")}
        />
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
