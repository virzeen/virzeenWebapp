import { Badge } from "@virzeen/ui";
import { SignOutButton } from "@/client/components/shared/sign-out-button";
import { ProfileForm } from "@/client/features/account/profile-form";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { formatDateTime } from "@/client/lib/format";
import { ADMIN_VERIFICATION_HOURS, getAdminVerifiedUntil, requireAdminPage } from "@/server/auth/session";

export const metadata = { title: "Settings" };

/**
 * The signed-in admin's own settings: name, sign-in security, sign out. The authenticator is never reset or
 * switched off from the website, only with `pnpm admin` (security-policy.md §2, runbooks/admin-accounts.md).
 */
export default async function AdminSettingsPage() {
  const admin = await requireAdminPage();
  const verifiedUntil = await getAdminVerifiedUntil();

  return (
    <div className="flex flex-col gap-10">
      <AdminPageHeader title="Settings" description="Your account and how you sign in." />

      <section aria-labelledby="account-heading" className="flex flex-col gap-4">
        <h2 id="account-heading" className="font-display text-h3">
          Your account
        </h2>
        <ProfileForm name={admin.name} email={admin.email} />
      </section>

      <section aria-labelledby="security-heading" className="flex max-w-xl flex-col gap-4">
        <h2 id="security-heading" className="font-display text-h3">
          Sign-in security
        </h2>
        <p className="flex items-center gap-3 text-body">
          Authenticator app <Badge variant="success">On</Badge>
        </p>
        <p className="text-body text-ink-muted">
          The admin area asks for a code from your authenticator app each time you sign in, and again every{" "}
          <span className="whitespace-nowrap">{ADMIN_VERIFICATION_HOURS} hours</span>.
          {verifiedUntil && (
            <>
              {" "}
              On this device, you&apos;ll be asked for the next one after{" "}
              <span className="whitespace-nowrap text-ink">{formatDateTime(verifiedUntil)}</span>.
            </>
          )}
        </p>
        <div className="flex flex-col gap-2">
          <h3 className="text-body font-medium">Lost or replaced your phone?</h3>
          <p className="text-body text-ink-muted">
            The authenticator can&apos;t be reset or switched off on the website, so nobody can remove it from
            here. Ask your developer to reset it. They&apos;ll call you first to check it&apos;s really you.
            Then sign in again and scan the new QR code with your new phone.
          </p>
          <p className="text-body text-ink-muted">
            Still have the old phone? Most authenticator apps can move your codes to a new phone, so no reset
            is needed.
          </p>
        </div>
      </section>

      <section aria-labelledby="sign-out-heading" className="flex flex-col gap-4">
        <h2 id="sign-out-heading" className="font-display text-h3">
          Sign out
        </h2>
        <p className="text-body text-ink-muted">
          Signs you out on this device and takes you to the home page.
        </p>
        <SignOutButton className="self-start" />
      </section>
    </div>
  );
}
