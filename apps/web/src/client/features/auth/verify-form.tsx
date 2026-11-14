"use client";

import { Alert, Button, FloatingInput, Link, Stack, toast } from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/client/lib/auth-client";
import { messageFor } from "@/client/lib/error-messages";
import { forgetPendingSignIn, rememberPendingSignIn } from "@/client/lib/pending-sign-in";
import { passwordSignInAction } from "@/server/actions/auth";
import { ResendCode } from "./resend-code";
import { authErrorMessage, codeCheckFailure, type AuthError } from "./auth-errors";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;
// A check or resend with no answer by then fails like any unexpected error, so the page never hangs on it.
const REQUEST_TIMEOUT_MS = 15_000;

type VerifyFormProps = {
  email: string;
  next: string;
  /** The member has set a password, so "Use Password" is offered (decided on the sign-in page). */
  hasPassword: boolean;
};

/**
 * Enter the emailed code, like Nike's (owner request 2026-11-11): a short heading, the email with Edit, one field, and
 * the sign-in goes on by itself the moment the sixth digit is in (docs/specs/sign-in-code.md, sign-in-v2.md). A member
 * with a password can switch to it with "Use Password". On success the guest bag merges on the next page load.
 */
export function VerifyForm({ email, next, hasPassword }: VerifyFormProps) {
  const [mode, setMode] = useState<"code" | "password">("code");
  // Edit goes back to the sign-in form with this email already typed in.
  const editHref = `/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}`;
  return (
    <Stack gap={6}>
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-h1">
          {mode === "code" ? "Enter the 6-digit code sent to your email." : "Enter your password."}
        </h1>
        <p className="text-body">
          {email}{" "}
          <Link href={editHref} className="text-ink-muted underline underline-offset-4">
            Edit
          </Link>
        </p>
      </header>
      {mode === "code" ? (
        <CodeStep
          email={email}
          next={next}
          hasPassword={hasPassword}
          onUsePassword={() => setMode("password")}
        />
      ) : (
        <PasswordStep email={email} next={next} onUseCode={() => setMode("code")} />
      )}
    </Stack>
  );
}

function CodeStep({
  email,
  next,
  hasPassword,
  onUsePassword,
}: VerifyFormProps & { onUsePassword: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [locked, setLocked] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const busy = useRef(false);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function check(otp: string) {
    if (busy.current || otp.length !== CODE_LENGTH) return;
    busy.current = true;
    setAlert(null);
    setError(null);
    setChecking(true);
    let failure: AuthError | null;
    try {
      ({ error: failure } = await authClient.signIn.emailOtp({
        email,
        otp,
        fetchOptions: { timeout: REQUEST_TIMEOUT_MS },
      }));
    } catch {
      failure = {}; // offline, no answer in time or the request failed: handled like any unexpected error
    }
    if (!failure) {
      forgetPendingSignIn();
      router.replace(next); // `busy` stays set: the page is on its way out
      router.refresh();
      return;
    }
    setChecking(false);
    const kind = codeCheckFailure(failure);
    if (kind === "other") {
      // The code itself may be right: keep it, so "Sign In" checks it again without retyping.
      busy.current = false;
      return setAlert(authErrorMessage(failure));
    }
    // A wrong or expired code belongs to the field. It empties so the customer can simply type again.
    setError(authErrorMessage(failure));
    setLocked(kind === "locked");
    setCode("");
    busy.current = false;
    requestAnimationFrame(() => field.current?.focus());
  }

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
    if (failure) return setAlert(authErrorMessage(failure));
    setCode("");
    setError(null);
    setAlert(null);
    setLocked(false);
    setCooldown(RESEND_SECONDS);
    rememberPendingSignIn(email, next); // the new code's 10 minutes start now
    toast.success("We sent a new code");
    requestAnimationFrame(() => field.current?.focus());
  }

  return (
    <>
      {alert && (
        <Alert variant="danger" action={<Button onClick={() => void check(code)}>Try again</Button>}>
          {alert}
        </Alert>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void check(code);
        }}
        noValidate
        className="flex flex-col gap-3"
      >
        <FloatingInput
          ref={field}
          label="6-digit code"
          required
          // One-tap fill from the email or SMS keyboard suggestion; numeric keyboard.
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          autoFocus
          value={code}
          disabled={locked || checking}
          error={error ?? undefined}
          endAdornment={<ResendCode cooldown={cooldown} resending={resending} onResend={resend} />}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
            setCode(digits);
            setError(null);
            // The sign-in goes on by itself once all digits are in.
            if (digits.length === CODE_LENGTH) void check(digits);
          }}
        />
        <Button
          type="submit"
          size="lg"
          shape="pill"
          className="w-full"
          loading={checking}
          disabled={code.length !== CODE_LENGTH}
        >
          Sign In
        </Button>
      </form>
      {hasPassword && (
        <Button variant="secondary" size="lg" shape="pill" className="w-full" onClick={onUsePassword}>
          Use Password
        </Button>
      )}
    </>
  );
}

function PasswordStep({ email, next, onUseCode }: { email: string; next: string; onUseCode: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password || pending) return;
    setError(null);
    setPending(true);
    const result = await passwordSignInAction({ email, password });
    if (result.ok) {
      forgetPendingSignIn();
      router.replace(next);
      router.refresh();
      return;
    }
    setPending(false);
    setError(messageFor(result.error));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <FloatingInput
        label="Password"
        type={visible ? "text" : "password"}
        required
        autoComplete="current-password"
        autoFocus
        value={password}
        error={error ?? undefined}
        onChange={(event) => {
          setPassword(event.target.value);
          setError(null);
        }}
      />
      <div className="flex items-center justify-between gap-4 text-small">
        <Button variant="link" onClick={onUseCode} className="min-h-0 text-small">
          Forgot password?
        </Button>
        <Button
          variant="link"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="min-h-0 text-small"
        >
          {visible ? "Hide password" : "Show password"}
        </Button>
      </div>
      <Button type="submit" size="lg" shape="pill" className="w-full" loading={pending} disabled={!password}>
        Sign In
      </Button>
      <Button variant="secondary" size="lg" shape="pill" className="w-full" onClick={onUseCode}>
        Email me a code instead
      </Button>
    </form>
  );
}
