import { ButtonLink, Container, Link } from "@virzeen/ui";
import { Wordmark } from "@/client/components/layout/wordmark";
import { AdminNav } from "@/client/features/admin/admin-nav";
import { requireAdminPage } from "@/server/auth/session";

/** Admin shell. Every page and action re-checks the admin + TOTP state; this is only the frame. */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <>
      <header className="border-b border-line">
        <Container width="full" className="flex h-14 items-center justify-between gap-4">
          <Link
            href="/admin"
            variant="subtle"
            className="flex items-center gap-3 text-ink"
            aria-label="Admin home"
          >
            <Wordmark className="h-4 w-auto" />
            <span className="text-caption text-ink-muted uppercase">Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-small text-ink-muted sm:inline">{admin.email}</span>
            <ButtonLink href="/" variant="secondary" size="sm" shape="pill">
              View shop
            </ButtonLink>
          </div>
        </Container>
      </header>
      <Container width="full" className="grid gap-8 py-8 lg:grid-cols-[12rem_1fr]">
        <AdminNav />
        <main id="main" className="min-w-0">
          {children}
        </main>
      </Container>
    </>
  );
}
