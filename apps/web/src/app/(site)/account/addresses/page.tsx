import { AddressBook } from "@/client/features/account/address-book";
import { requireUserPage } from "@/server/auth/session";
import { listMyAddresses } from "@/server/queries/account";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUserPage("/account/addresses");
  const addresses = await listMyAddresses(user.id);
  return <AddressBook addresses={addresses} />;
}
