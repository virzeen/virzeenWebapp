import { AddressBook } from "@/client/features/account/address-book";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";
import { listMyAddresses } from "@/server/queries/account";

export const metadata = { title: "Delivery addresses" };

export default async function AddressesPage() {
  const user = await requireUserPage("/account/addresses");
  const addresses = await listMyAddresses(user.id);
  return (
    <SettingsShell title="Delivery addresses">
      <AddressBook addresses={addresses} />
    </SettingsShell>
  );
}
