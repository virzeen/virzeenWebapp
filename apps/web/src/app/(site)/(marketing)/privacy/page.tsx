import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Virzeen stores about you and why.",
  alternates: { canonical: "/privacy" },
};

// Describes what is stored and why (security-policy.md §9). ◆ Owner/legal review before launch.
export default function PrivacyPage() {
  return (
    <ContentPage eyebrow="Legal" title="Privacy" draftNotice>
      <ContentHeading>What we store</ContentHeading>
      <p>
        Your name and email (to sign you in and send order emails), your delivery addresses and mobile number
        (so the courier can reach you), and your orders. We never see or store your eSewa or Khalti
        credentials — payments happen on their sites.
      </p>
      <ContentHeading>Why</ContentHeading>
      <p>
        Only to take, deliver and support your orders, and to keep the shop secure. We don&apos;t sell your
        data.
      </p>
      <ContentHeading>Cookies</ContentHeading>
      <p>We use essential cookies to keep you signed in and to remember your bag. No advertising cookies.</p>
      <ContentHeading>Your choices</ContentHeading>
      <p>You can update your details and addresses in your account, or contact us to delete your account.</p>
    </ContentPage>
  );
}
