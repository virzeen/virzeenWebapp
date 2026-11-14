import { ButtonLink, Link } from "@virzeen/ui";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";

export const metadata = { title: "Privacy" };

/**
 * Settings, Privacy, like Nike's (specs/member-area-nike-layout.md): a paragraph, the policy link on its own line, a
 * hairline and "Download your data". Virzeen does not use data for advertising (its privacy policy says so), so there
 * are no advertising toggles. Deleting the account is on Account details, next to Nike's.
 */
export default async function PrivacyPage() {
  await requireUserPage("/account/settings/privacy");
  return (
    <SettingsShell title="Privacy" mode="section">
      <p className="text-body">
        We use your details only to take, deliver and support your orders, and to keep the shop secure. We
        don&apos;t sell your data and we don&apos;t use it for advertising.
      </p>
      <p className="text-body">For more information, see our Privacy Policy.</p>
      <Link href="/privacy" variant="default" className="self-start">
        Virzeen Privacy Policy
      </Link>

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
    </SettingsShell>
  );
}
