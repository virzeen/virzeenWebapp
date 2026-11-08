import { Container } from "@virzeen/ui";
import type { Metadata } from "next";
import { AccountNav } from "@/client/features/account/account-nav";
import { requireUserPage } from "@/server/auth/session";

// A plain string title here would drop the root "%s — Virzeen" template for every account page.
export const metadata: Metadata = {
  title: { default: "My profile", template: "%s — Virzeen" },
  robots: { index: false },
};

/** Like Nike's member pages (owner 2026-11-08): the tabs in a centred row, then the page with its own h1. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage("/account");
  return (
    <Container className="flex flex-col gap-10 pt-4 pb-16 lg:gap-16 lg:pb-24">
      <AccountNav isAdmin={user.role === "ADMIN"} />
      <div className="min-w-0">{children}</div>
    </Container>
  );
}
