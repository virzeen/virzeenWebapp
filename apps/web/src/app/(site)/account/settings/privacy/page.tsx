import { ButtonLink, Link } from "@virzeen/ui";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";

export const metadata = { title: "Privacy" };

/**
 * Settings, Privacy (specs/member-area-nike-layout.md). Virzeen does not use data for advertising (its privacy policy says so), so there are no
 * toggles: the page says so, links the policy and offers "Download your data". Deleting the account is pending the
 * owner's rule (the spec's "Privacy rules"), so for now it points to Contact us.
 */
export default async function PrivacyPage() {
  await requireUserPage("/account/settings/privacy");
  return (
    <SettingsShell title="Privacy" mode="section">
      <p className="text-body">
        We use your details only to take, deliver and support your orders, and to keep the shop secure. We
        don&apos;t sell your data and we don&apos;t use it for advertising. Read more in our{" "}
        <Link href="/privacy" variant="default">
          Privacy Policy
        </Link>
        .
      </p>

      <section aria-labelledby="download-data" className="flex flex-col gap-4 border-t border-line pt-8">
        <h3 id="download-data" className="font-display text-h3">
          Download your data
        </h3>
        <p className="text-body text-ink-muted">
          Get one file with what you have given us: your details, addresses, favourites, reviews, interests,
          points and orders.
        </p>
        <ButtonLink
          href="/api/account/export"
          download
          prefetch={false}
          shape="pill"
          variant="secondary"
          className="self-start"
        >
          Download my data
        </ButtonLink>
      </section>

      <section aria-labelledby="delete-account" className="flex flex-col gap-4 border-t border-line pt-8">
        <h3 id="delete-account" className="font-display text-h3">
          Delete account
        </h3>
        <p className="text-body text-ink-muted">
          To delete your account, contact us and we will take care of it. Orders we have already shipped are
          kept for our records.
        </p>
        <ButtonLink href="/contact" shape="pill" variant="secondary" className="self-start">
          Contact us
        </ButtonLink>
      </section>
    </SettingsShell>
  );
}
