import { Link } from "@virzeen/ui";
import { emailSchema, safeRedirectSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/client/features/auth/login-form";
import { getUser } from "@/server/auth/session";
import { features } from "@/server/env";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = flattenSearchParams(await searchParams);
  const next = safeRedirectSchema.parse(params.next ?? "/account");
  // Edit on the code page comes back here with the email that was typed.
  const email = emailSchema.safeParse(params.email ?? "");
  if (await getUser()) redirect(next);
  return (
    <>
      <h1 className="font-display text-h1">Sign in</h1>
      <LoginForm
        next={next}
        googleEnabled={features.google}
        {...(email.success ? { defaultEmail: email.data } : {})}
      />
      <p className="text-small text-ink-muted">
        By continuing you agree to our <Link href="/terms">terms</Link> and{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    </>
  );
}
