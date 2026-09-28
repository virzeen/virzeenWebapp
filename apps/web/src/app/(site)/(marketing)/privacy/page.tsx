import { Link } from "@virzeen/ui";
import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";
import { SITE } from "@/client/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Virzeen stores about you and why.",
  alternates: { canonical: "/privacy" },
};

// Describes what is stored and why (security-policy.md §9). Mirrors the schema (User, Session, Address,
// Order) and the services in docs/architecture.md; update both when either changes.
export default function PrivacyPage() {
  return (
    <ContentPage eyebrow="Legal" title="Privacy">
      <ContentHeading>What we store</ContentHeading>
      <ul className="flex list-disc flex-col gap-2 pl-6">
        <li>Your name and email address, to sign you in and send order emails.</li>
        <li>Your delivery addresses and mobile number, so the courier can reach you.</li>
        <li>Your orders and their delivery status.</li>
        <li>For each device you sign in on, its IP address and browser type, to keep your account secure.</li>
      </ul>
      <p>We don&apos;t collect card or wallet details: you pay in cash when your order arrives.</p>
      <ContentHeading>Why</ContentHeading>
      <p>
        Only to take, deliver and support your orders, and to keep the shop secure. We don&apos;t sell your
        data and we don&apos;t use it for advertising.
      </p>
      <ContentHeading>Services we use</ContentHeading>
      <p>A few companies help us run the shop. Each gets only what it needs for its job:</p>
      <ul className="flex list-disc flex-col gap-2 pl-6">
        <li>Railway hosts the website and our database, in Singapore.</li>
        <li>Cloudflare runs our domain and protects the site from attacks.</li>
        <li>Resend delivers our emails.</li>
        <li>
          Upstash keeps short-lived security counters (your IP address or email) to stop abuse. They expire
          within minutes.
        </li>
        <li>Sentry receives error reports so we can fix problems. Personal details are removed first.</li>
        <li>
          Google, only if you choose &ldquo;Continue with Google&rdquo;: Google shares your name, email and
          profile picture with us.
        </li>
      </ul>
      <ContentHeading>Cookies</ContentHeading>
      <p>
        We use essential cookies to keep you signed in and to remember your bag, and Cloudflare may set a
        security cookie. No advertising or tracking cookies.
      </p>
      <ContentHeading>Your choices</ContentHeading>
      <p>
        You can update your details and addresses in your account. To get a copy of your data or delete your
        account, email <Link href={`mailto:${SITE.infoEmail}`}>{SITE.infoEmail}</Link>. Order records we need
        for tax and accounting stay with us after an account is deleted.
      </p>
    </ContentPage>
  );
}
