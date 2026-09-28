import { Container } from "@virzeen/ui";
import type { Metadata } from "next";
import { AccountNav } from "@/client/features/account/account-nav";
import { requireUserPage } from "@/server/auth/session";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage("/account");
  return (
    <Container className="flex flex-col gap-8 py-12 lg:py-16">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-h1">Account</h1>
        <p className="text-body text-ink-muted">{user.email}</p>
      </header>
      <div className="grid gap-8 md:grid-cols-[12rem_1fr] md:gap-12">
        <AccountNav isAdmin={user.role === "ADMIN"} />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
