import { emailSchema, safeRedirectSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/client/features/auth/signup-form";
import { getUser } from "@/server/auth/session";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

/** A new email's create-account step (docs/specs/sign-in-v2.md): the code was sent when the email was entered. */
export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const params = flattenSearchParams(await searchParams);
  const next = safeRedirectSchema.parse(params.next ?? "/account");
  const email = emailSchema.safeParse(params.email ?? "");
  if (await getUser()) redirect("/account");
  if (!email.success) redirect(`/login?next=${encodeURIComponent(next)}`);
  return <SignupForm email={email.data} next={next} />;
}
