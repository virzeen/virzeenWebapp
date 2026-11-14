import { emailSchema, safeRedirectSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyForm } from "@/client/features/auth/verify-form";
import { getUser } from "@/server/auth/session";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata: Metadata = { title: "Enter your code", robots: { index: false } };

/**
 * The emailed code for a member (docs/specs/sign-in-v2.md). `pw=1` (set by the sign-in page after its email check)
 * only decides whether "Use Password" is shown; the password check itself says nothing about which emails exist.
 */
export default async function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = flattenSearchParams(await searchParams);
  const next = safeRedirectSchema.parse(params.next ?? "/account");
  const email = emailSchema.safeParse(params.email ?? "");
  if (await getUser()) redirect(next);
  if (!email.success) redirect(`/login?next=${encodeURIComponent(next)}`);
  return <VerifyForm email={email.data} next={next} hasPassword={params.pw === "1"} />;
}
