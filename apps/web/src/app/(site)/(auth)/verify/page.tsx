import { Container, Link } from "@virzeen/ui";
import { emailSchema, safeRedirectSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyForm } from "@/client/features/auth/verify-form";
import { getUser } from "@/server/auth/session";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata: Metadata = { title: "Enter your code", robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = flattenSearchParams(await searchParams);
  const next = safeRedirectSchema.parse(params.next ?? "/account");
  const email = emailSchema.safeParse(params.email ?? "");
  if (await getUser()) redirect(next);
  if (!email.success) redirect(`/login?next=${encodeURIComponent(next)}`);
  return (
    <Container width="narrow" className="flex max-w-md flex-col gap-8 py-16 lg:py-24">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-h1">Check your email</h1>
        <p className="text-body text-ink-muted">
          We sent a 6-digit code to <span className="text-ink">{email.data}</span>. It expires in 10 minutes.
        </p>
      </header>
      <VerifyForm email={email.data} next={next} />
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        variant="subtle"
        className="self-center text-small"
      >
        Use a different email
      </Link>
    </Container>
  );
}
