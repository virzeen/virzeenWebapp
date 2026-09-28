import { Container, Link } from "@virzeen/ui";
import { safeRedirectSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/client/features/auth/login-form";
import { getUser } from "@/server/auth/session";
import { features } from "@/server/env";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const next = safeRedirectSchema.parse(flattenSearchParams(await searchParams).next ?? "/account");
  if (await getUser()) redirect(next);
  return (
    <Container width="narrow" className="flex max-w-md flex-col gap-8 py-16 lg:py-24">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-h1">Sign in</h1>
        <p className="text-body text-ink-muted">
          No password needed. New here? We&apos;ll create your account.
        </p>
      </header>
      <LoginForm next={next} googleEnabled={features.google} />
      <p className="text-small text-ink-muted">
        By continuing you agree to our <Link href="/terms">terms</Link> and{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    </Container>
  );
}
