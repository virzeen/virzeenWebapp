import { Heading, Hr, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

export type OtpEmailProps = { otp: string; siteUrl: string };

// No Reply-To on sign-in codes (docs/specs/email-senders.md), so this email doesn't invite replies.
export function OtpEmail({ otp, siteUrl }: OtpEmailProps) {
  return (
    <EmailLayout preview={`Your Virzeen sign-in code is ${otp}`} siteUrl={siteUrl} invitesReply={false}>
      {/* Wording and weight chosen by the owners (2026-09-29). */}
      <Heading as="h1" className="m-0 text-h3 font-medium">
        Your VIRZEEN Member Profile Code
      </Heading>
      <Text className="m-0 mt-4 text-body">Here&apos;s the one-time code you asked for:</Text>
      <Hr className="vz-line mt-8 mb-0 border-line" />
      <Text className="mx-0 my-8 text-center text-display font-normal tracking-widest">{otp}</Text>
      <Hr className="vz-line mt-0 mb-8 border-line" />
      <Text className="m-0 text-body">This code expires in 10 minutes.</Text>
      <Text className="vz-muted m-0 mt-4 text-small text-ink-muted">
        If you didn&apos;t ask for this code, you can ignore this email. Nobody can sign in without it.
      </Text>
    </EmailLayout>
  );
}
