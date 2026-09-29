import { Container, Link } from "@virzeen/ui";
import { notFound, redirect } from "next/navigation";
import { Wordmark } from "@/client/components/layout/wordmark";
import { SwitchAccountButton } from "@/client/features/admin/switch-account";
import { TotpEnrollment, TotpVerify } from "@/client/features/admin/totp-setup";
import { getAdminState } from "@/server/auth/session";

export const metadata = { title: "Verify" };

/**
 * Admin two-factor: first-time enrolment, then a TOTP step-up every 12 hours. Shows which account is signed
 * in, with a way back to the email form.
 */
export default async function AdminVerifyPage() {
  const { state, user } = await getAdminState();
  if (!user) redirect("/login?next=%2Fadmin");
  if (state === "not-admin") notFound();
  if (state === "ok") redirect("/admin");

  return (
    <Container width="narrow" className="flex max-w-md flex-col gap-8 py-16">
      <Link href="/" variant="subtle" aria-label="Virzeen home" className="self-start text-ink">
        <Wordmark className="h-5 w-auto" />
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-h1">
          {state === "needs-enrollment" ? "Secure your admin account" : "Admin verification"}
        </h1>
        {state !== "needs-enrollment" && (
          <p className="text-body text-ink-muted">Enter the code from your authenticator app.</p>
        )}
        <p className="text-small text-ink-muted">
          Signed in as <span className="break-all text-ink">{user.email}</span>
        </p>
      </header>
      {state === "needs-enrollment" ? <TotpEnrollment /> : <TotpVerify />}
      <SwitchAccountButton />
    </Container>
  );
}
