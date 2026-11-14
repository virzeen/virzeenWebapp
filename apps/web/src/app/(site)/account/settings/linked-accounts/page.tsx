import { Link2Off } from "lucide-react";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";
import { getMyLinkedProviders } from "@/server/queries/account";

export const metadata = { title: "Linked accounts" };

const PROVIDER_NAMES: Record<string, string> = { google: "Google" };

/** Settings, Linked accounts: the other services the member signs in with (read only). */
export default async function LinkedAccountsPage() {
  const user = await requireUserPage("/account/settings/linked-accounts");
  const providers = await getMyLinkedProviders(user.id);
  return (
    <SettingsShell title="Linked accounts" mode="section">
      <p className="text-body">Manage accounts and services connected to your Virzeen account.</p>
      {providers.length > 0 ? (
        <ul
          className="flex flex-col divide-y divide-line border-y border-line"
          data-testid="linked-providers"
        >
          {providers.map((provider) => (
            <li key={provider} className="flex items-center justify-between py-3 text-body">
              {PROVIDER_NAMES[provider] ?? provider}
              <span className="text-small text-ink-muted">Connected</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-4 rounded-md bg-surface p-6" data-testid="no-linked-accounts">
          <Link2Off className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
          <p className="text-body">You don&apos;t have any connected apps or services.</p>
        </div>
      )}
    </SettingsShell>
  );
}
