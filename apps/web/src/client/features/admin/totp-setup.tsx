"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormField, Input, Link, Stack, toast } from "@virzeen/ui";
import { totpCodeSchema } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { messageFor } from "@/client/lib/error-messages";
import { startTotpEnrollmentAction, verifyAdminTotpAction } from "@/server/actions/admin/security";

type CodeInput = z.infer<typeof totpCodeSchema>;

function CodeForm({
  submitLabel,
  onVerified,
}: {
  submitLabel: string;
  onVerified: (enrolled: boolean) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CodeInput>({ resolver: zodResolver(totpCodeSchema), defaultValues: { code: "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: CodeInput) {
    setFormError(null);
    const result = await verifyAdminTotpAction(values);
    if (result.ok) return onVerified(result.data.enrolled);
    if (result.error.fields?.code) form.setError("code", { message: result.error.fields.code });
    else setFormError(messageFor(result.error));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError && <Alert variant="danger">{formError}</Alert>}
      <FormField label="6-digit code" error={errors.code?.message} required>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="text-center text-h3 tracking-widest"
          {...form.register("code")}
        />
      </FormField>
      <Button type="submit" shape="pill" size="lg" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}

/** Step-up: enter the authenticator code for this session (every 12 hours). */
export function TotpVerify() {
  const router = useRouter();
  return (
    <CodeForm
      submitLabel="Verify"
      onVerified={() => {
        router.replace("/admin");
        router.refresh();
      }}
    />
  );
}

/** Backup codes stay hidden until the admin asks for them. */
function BackupCodes({ codes }: { codes: string[] }) {
  const [shown, setShown] = useState(false);
  const id = useId();
  return (
    <Stack gap={2}>
      <Button
        variant="secondary"
        shape="pill"
        className="self-start"
        aria-expanded={shown}
        aria-controls={id}
        onClick={() => setShown((value) => !value)}
      >
        {shown ? "Hide backup codes" : "Show backup codes"}
      </Button>
      <div id={id} hidden={!shown}>
        <p className="mb-2 text-small text-ink-muted">Each code works once if you lose your phone.</p>
        <ul className="grid grid-cols-2 gap-2 rounded-md bg-surface p-4 font-mono text-small">
          {codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
      </div>
    </Stack>
  );
}

/** First-time setup: scan the QR code, confirm with a code; backup codes on request. */
export function TotpEnrollment() {
  const router = useRouter();
  const [setup, setSetup] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await startTotpEnrollmentAction();
      if (result.ok) setSetup(result.data);
      else setError(messageFor(result.error));
    });
  }

  if (!setup) {
    return (
      <Stack gap={4}>
        {error && <Alert variant="danger">{error}</Alert>}
        <p className="text-body text-ink-muted">
          Admins must use an authenticator app (Google Authenticator, 1Password, Authy…) in addition to email
          sign-in.
        </p>
        <Button shape="pill" size="lg" loading={isPending} onClick={start}>
          Set up authenticator
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap={6}>
      <Stack gap={2}>
        <p className="text-body">1. Scan this QR code with your authenticator app.</p>
        {/* Drawn in the browser: the secret never goes to a QR service. Black on white (the library's
            default) with a quiet zone, which authenticator apps scan reliably in dark mode too. */}
        <div className="self-start">
          <QRCodeSVG
            value={setup.totpURI}
            size={200}
            level="M"
            marginSize={4}
            title="Authenticator setup code"
          />
        </div>
        <Link href={setup.totpURI} className="text-small">
          On this phone? Open in your authenticator app
        </Link>
      </Stack>
      <BackupCodes codes={setup.backupCodes} />
      <Stack gap={2}>
        <p className="text-body">2. Enter the 6-digit code your app shows.</p>
        <CodeForm
          submitLabel="Turn on two-factor"
          onVerified={() => {
            toast.success("Two-factor is on. Enter a new code to continue.");
            router.refresh();
          }}
        />
      </Stack>
    </Stack>
  );
}
