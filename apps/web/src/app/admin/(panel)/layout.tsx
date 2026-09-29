import { ButtonLink, Container, Link } from "@virzeen/ui";
import { Wordmark } from "@/client/components/layout/wordmark";
import { SignOutButton } from "@/client/components/shared/sign-out-button";
import { AdminNav } from "@/client/features/admin/admin-nav";
import { requireAdminPage } from "@/server/auth/session";

/** Admin shell. Every page and action re-checks the admin + TOTP state; this is only the frame. */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <>
      <a
        href="#main"
        className="sr-only z-60 rounded-sm bg-ink text-canvas focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      <header className="border-b border-line">
        {/* Fits a 320px phone: there "Admin" sits under the wordmark and Sign out is a text button. */}
        <Container width="full" className="flex h-14 items-center justify-between gap-4">
          <Link
            href="/admin"
            variant="subtle"
            className="inline-flex min-h-11 shrink-0 flex-col items-start justify-center gap-1 text-ink sm:flex-row sm:items-center sm:gap-3"
            aria-label="Admin home"
          >
            <Wordmark className="h-4 w-auto" />
            <span className="text-caption text-ink-muted uppercase">Admin</span>
          </Link>
          <div className="flex min-w-0 items-center gap-4">
            <span className="hidden min-w-0 truncate text-small text-ink-muted sm:block">{admin.email}</span>
            <ButtonLink href="/" variant="secondary" size="sm" shape="pill">
              View shop
            </ButtonLink>
            <SignOutButton variant="link" size="sm" />
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
