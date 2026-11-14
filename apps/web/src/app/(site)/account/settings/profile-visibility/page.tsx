import { ButtonLink } from "@virzeen/ui";
import { ReviewNameForm } from "@/client/features/account/settings-forms";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";
import { getMySettings } from "@/server/queries/account";

export const metadata = { title: "Profile visibility" };

/**
 * Settings, Profile visibility, like Nike's (specs/member-area-nike-layout.md): a line about the profile, the avatar
 * block (a circle with the initial, "Profile display", the name and an outlined Edit pill), a hairline, then
 * "Product review visibility" with its explanation and the choices. Location sharing has no equivalent here.
 */
export default async function ProfileVisibilityPage() {
  const user = await requireUserPage("/account/settings/profile-visibility");
  const settings = await getMySettings(user.id);
  const display = user.name.trim() || user.email.split("@")[0] || "Member";
  return (
    <SettingsShell title="Profile visibility" mode="section">
      <p className="text-body">Your Virzeen profile represents you on the product reviews you write.</p>
      <div className="flex items-center gap-6">
        <span
          aria-hidden
          className="flex size-24 shrink-0 items-center justify-center rounded-full bg-surface font-display text-h2 text-ink-muted"
        >
          {display.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col items-start gap-2">
          <span className="text-body font-medium">Profile display</span>
          <span className="max-w-full truncate text-body text-ink-muted">{display}</span>
          <ButtonLink href="/account/settings" variant="secondary" shape="pill" size="sm">
            Edit
          </ButtonLink>
        </div>
      </div>
      <div className="flex flex-col gap-4 border-t border-line pt-8">
        <h3 className="text-body font-medium">Product review visibility</h3>
        <p className="text-body">
          Choose how you will appear on any Virzeen product reviews you complete. This applies to your past
          and future reviews.
        </p>
        <ReviewNameForm initial={settings.reviewNameStyle} />
      </div>
    </SettingsShell>
  );
}
