"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, CodeInput, FormField, Stack, VisuallyHidden, toast } from "@virzeen/ui";
import { verifyOtpSchema, type VerifyOtpInput } from "@virzeen/validators";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Controller, useForm } from "react-hook-form";
import { authClient } from "@/client/lib/auth-client";
import { forgetPendingSignIn, rememberPendingSignIn } from "@/client/lib/pending-sign-in";
import { authErrorMessage, codeCheckFailure, type AuthError } from "./auth-errors";

const RESEND_SECONDS = 60;
// A wrong code stays on screen (red, shaking) this long before the boxes empty: just past --animate-shake (400ms).
const CLEAR_WRONG_CODE_MS = 500;
// A check or resend with no answer by then fails like any unexpected error, so the page never hangs on it.
const REQUEST_TIMEOUT_MS = 15_000;

// checking → success (until the next page shows) or back to idle with an error. locked: too many wrong codes,
// so the field stays shut until a new code is sent.
type Phase = "idle" | "checking" | "success" | "locked";

// Disabling a focused control drops focus to the page: move it to `target`, unless the person has gone elsewhere.
function focusIfLost(target: HTMLElement | null) {
  const current = document.activeElement;
  if (!current || current === document.body || current.matches(":disabled")) target?.focus();
}

/**
 * Enter the 6-digit code. It's checked as soon as the last digit is in (docs/specs/sign-in-code.md).
 * On success the guest bag is merged on the next page load.
 */
export function VerifyForm({ email, next }: { email: string; next: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [alert, setAlert] = useState<{ message: string; retry: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0); // +1 per error shown on the field: replays the shake
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  // Checking, accepted, or still showing a rejected code: ignore completes and Enter (no double submissions).
  const busy = useRef(false);
  // A new code is being sent, which replaces the old one on the server: no code is checked meanwhile.
  const sending = useRef(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const resendButton = useRef<HTMLButtonElement>(null);
  const form = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    // Validated on submit only: a half-typed code shouldn't turn red on blur or while typing.
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: { email, otp: "" },
  });
  const fieldError = form.formState.errors.otp?.message;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // The field is shut (which drops focus to the page), so move to the way out. While the resend cooldown runs
  // that button can't take focus: it gets it when the cooldown ends, unless the person has gone elsewhere.
  useEffect(() => {
    if (phase !== "locked" || cooldown > 0) return;
    focusIfLost(resendButton.current);
  }, [phase, cooldown]);

  // A rejected code stays on screen for a moment, then empties and a code can be submitted again.
  function clearRejectedCodeSoon() {
    clearTimer.current = setTimeout(() => {
      clearTimer.current = undefined;
      form.setValue("otp", "");
      busy.current = false;
    }, CLEAR_WRONG_CODE_MS);
  }

  // The person edits the rejected code (or a new code was sent) first: keep what they have and accept input.
  function cancelClear() {
    if (clearTimer.current === undefined) return;
    clearTimeout(clearTimer.current);
    clearTimer.current = undefined;
    busy.current = false;
  }

  async function check({ otp }: VerifyOtpInput) {
    if (busy.current) return;
    busy.current = true;
    setAlert(null);
    form.clearErrors("otp");
    setPhase("checking");
    let error: AuthError | null;
    try {
      ({ error } = await authClient.signIn.emailOtp({
        email,
        otp,
        fetchOptions: { timeout: REQUEST_TIMEOUT_MS },
      }));
    } catch {
      error = {}; // offline, no answer in time or the request failed: handled like any unexpected error
    }
    if (!error) {
      setPhase("success"); // `busy` stays set
      forgetPendingSignIn();
      router.replace(next);
      router.refresh();
      return;
    }
    const failure = codeCheckFailure(error);
    if (failure === "other") {
      // The code itself may be right: keep it, so "Try again" (or Enter) checks it again without retyping.
      busy.current = false;
      setPhase("idle");
      return setAlert({ message: authErrorMessage(error), retry: true });
    }
    // A wrong or expired code belongs to the code field (docs/ui/patterns.md §4). Focus never left it.
    setPhase(failure === "locked" ? "locked" : "idle");
    setAttempt((n) => n + 1);
    form.setError("otp", { message: authErrorMessage(error) });
    // The wrong code shakes in red, then the boxes empty so the person can simply retype.
    clearRejectedCodeSoon();
  }

  // Enter, a completed code and "Try again" all submit the same way. An invalid submit shakes the boxes again.
  function submit(event?: React.BaseSyntheticEvent) {
    event?.preventDefault();
    // Checked first: handleSubmit would clear the field error (e.g. Enter while a wrong code is still showing).
    if (busy.current || sending.current) return;
    void form.handleSubmit(check, () => setAttempt((n) => n + 1))(event);
  }

  function retry() {
    form.setFocus("otp"); // this button goes away while the code is checked
    submit();
  }

  async function resend() {
    sending.current = true;
    setResending(true);
    let error: AuthError | null;
    try {
      ({ error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
        fetchOptions: { timeout: REQUEST_TIMEOUT_MS },
      }));
    } catch {
      error = {};
    }
    sending.current = false;
    if (error) {
      // This button was disabled while sending, which dropped focus to the page: enable it and give focus back.
      flushSync(() => setResending(false));
      focusIfLost(resendButton.current);
      return setAlert({ message: authErrorMessage(error), retry: false });
    }
    // The old code no longer works: start again with an empty field, usable even after too many wrong codes.
    cancelClear();
    // Enable the field before focusing it.
    flushSync(() => {
      setResending(false);
      setPhase("idle");
    });
    form.resetField("otp");
    setAlert(null);
    setCooldown(RESEND_SECONDS);
    rememberPendingSignIn(email, next); // the new code's 10 minutes start now
    toast.success("We sent a new code");
    form.setFocus("otp");
  }

  return (
    <Stack gap={6}>
      {alert && (
        <Alert variant="danger" action={alert.retry && <Button onClick={retry}>Try again</Button>}>
          {alert.message}
        </Alert>
      )}
      {/* No submit button: the code is checked once the last digit is in. Enter works too, because the code is
          this form's only field (implicit submission). */}
      <form onSubmit={submit} noValidate className="flex flex-col gap-2">
        {/* The helper says so up front (WCAG 3.2.2). As the field's description it is read out when the field
            takes focus, which it does on arrival. */}
        <FormField
          label="6-digit code"
          helper="We'll sign you in as soon as all 6 digits are in."
          error={fieldError}
          required
        >
          <Controller
            control={form.control}
            name="otp"
            render={({ field }) => (
              <CodeInput
                {...field}
                length={6}
                // The only thing to do on this page.
                autoFocus
                status={phase === "checking" || phase === "success" ? phase : undefined}
                // While a new code is sent the old one is being replaced: nothing can be completed or pasted.
                readOnly={resending}
                disabled={phase === "locked"}
                errorKey={attempt}
                onChange={(code) => {
                  if (code === field.value) return;
                  cancelClear();
                  // An error stays until the person starts typing a new code.
                  if (code.length > field.value.length) form.clearErrors("otp");
                  field.onChange(code);
                }}
                onComplete={() => submit()}
              />
            )}
          />
        </FormField>
        <CheckStatus phase={phase} error={fieldError} attempt={attempt} />
      </form>
      <Button
        ref={resendButton}
        variant="link"
        onClick={resend}
        disabled={cooldown > 0 || resending || phase === "checking" || phase === "success"}
        className="self-center"
      >
        {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
      </Button>
    </Stack>
  );
}

type CheckStatusProps = { phase: Phase; error: string | undefined; attempt: number };

/**
 * The polite live region for the check, right under the boxes. FormField's error text isn't a live region, so a
 * field error is repeated here, visually hidden, to be announced (on screen it shows once; reading the page line by
 * line passes it twice). The danger Alert announces itself.
 */
function CheckStatus({ phase, error, attempt }: CheckStatusProps) {
  return (
    <div role="status" className="text-small">
      {phase === "checking" && (
        <p className="flex items-center gap-2 text-ink-muted">
          <Loader2 className="size-4 animate-spin" strokeWidth={1.5} aria-hidden />
          Checking your code…
        </p>
      )}
      {phase === "success" && (
        <p className="flex items-center gap-2 text-success">
          <CheckCircle2 className="size-4" strokeWidth={1.5} aria-hidden />
          Code accepted. Signing you in…
        </p>
      )}
      {/* Keyed by attempt so the same message after another wrong code is announced again. */}
      {error && <VisuallyHidden key={attempt}>{error}</VisuallyHidden>}
    </div>
  );
}
