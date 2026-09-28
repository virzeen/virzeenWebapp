import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  type TailwindConfig,
} from "@react-email/components";
import { emailTailwindConfig } from "@virzeen/ui/tokens";

export type EmailLayoutProps = {
  preview: string;
  siteUrl: string;
  children: React.ReactNode;
};

/** Shared frame for every Virzeen email: wordmark, content, calm footer. */
export function EmailLayout({ preview, siteUrl, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind config={emailTailwindConfig as unknown as TailwindConfig}>
        <Body className="m-0 py-8 bg-surface font-text text-ink">
          <Container className="max-w-xl px-8 py-10 mx-auto bg-canvas">
            <Section>
              <Link href={siteUrl} className="text-ink no-underline">
                <Text className="m-0 tracking-widest text-h2">VIRZEEN</Text>
              </Link>
            </Section>
            <Section className="pt-6">{children}</Section>
            <Hr className="my-8 border-line" />
            <Text className="m-0 text-small text-ink-muted">
              Virzeen · timeless monochromium experience.
              <br />
              Questions? Reply to this email and we&apos;ll help.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
