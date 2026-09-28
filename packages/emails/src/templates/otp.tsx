import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

export type OtpEmailProps = { otp: string; siteUrl: string };

export function OtpEmail({ otp, siteUrl }: OtpEmailProps) {
  return (
    <EmailLayout preview={`Your Virzeen sign-in code is ${otp}`} siteUrl={siteUrl}>
      <Heading as="h1" className="m-0 font-normal text-h1">
        Your sign-in code
      </Heading>
      <Text className="text-body text-ink-muted">Enter this code to sign in. It expires in 10 minutes.</Text>
      <Text className="my-6 px-6 py-4 tracking-widest rounded-md bg-surface text-center text-h1">{otp}</Text>
      <Text className="text-small text-ink-muted">
        If you didn&apos;t try to sign in, you can ignore this email. Nobody can sign in without this code.
      </Text>
    </EmailLayout>
  );
}
