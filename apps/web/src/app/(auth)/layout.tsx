import { Link } from "@virzeen/ui";
import { Wordmark } from "@/client/components/layout/wordmark";

/**
 * Sign-in pages: no shop header, bag or footer. Just the Virzeen wordmark (a link home) over one narrow column
 * (owner request 2026-11-11). Not inside `(site)`, so none of its providers load here.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-10">
      <header className="mx-auto w-full max-w-md">
        <Link href="/" variant="subtle" className="inline-block text-ink">
          <Wordmark className="h-4 w-auto sm:h-5" title="Virzeen" />
        </Link>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 pt-8 pb-16 sm:pt-12">
        {children}
      </main>
    </div>
  );
}
