import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
  type TailwindConfig,
} from "@react-email/components";
import { emailTailwindConfig, fontStack } from "@virzeen/ui/tokens";

// Spacing in px, not rem: Outlook for Windows drops rem padding and margins.
const tailwindConfig = { ...emailTailwindConfig, presets: [pixelBasedPreset] } as unknown as TailwindConfig;

/** Where the wordmark is served from (apps/web/public; regenerate with scripts/rasterise-email-wordmark.mjs). */
export const EMAIL_WORDMARK_PATH = "/brand/email-wordmark.png";

export type EmailLayoutProps = {
  preview: string;
  siteUrl: string;
  /**
   * Ends the content with "Questions? Reply to this email". Order emails and alerts do (they go out with
   * Reply-To sales@, docs/specs/email-senders.md); sign-in codes don't and point to "Get help" instead.
   */
  invitesReply: boolean;
  children: React.ReactNode;
};

/** "https://virzeen.com" → "virzeen.com", shown large in the footer as the link back to the shop. */
function hostOf(siteUrl: string) {
  try {
    return new URL(siteUrl).host;
  } catch {
    return siteUrl;
  }
}

/**
 * Shared frame for every Virzeen email: centred wordmark, content, the site link, then a small footer
 * (backend-policies.md §9). The wordmark is a PNG because Gmail and Outlook don't show SVG.
 * Spacing sits on cells and margins, never padding on tables, which Outlook for Windows ignores.
 */
export function EmailLayout({ preview, siteUrl, invitesReply, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head>
        {/* Clients that honour this keep the black-on-white design instead of auto-darkening it. The wordmark
            PNG has a thin white halo for the clients that darken it anyway (Gmail). */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        {/* Outlook for Windows doesn't inherit the font into nested tables and falls back to Times. */}
        <style>{`table, td, p, h1, h2, a { font-family: ${fontStack}; }`}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Tailwind config={tailwindConfig}>
        <Body className="m-0 bg-canvas font-text text-ink">
          <Container className="max-w-email mx-auto">
            <Row>
              <Column className="px-6 pt-10 pb-12">
                <Row>
                  <Column align="center">
                    {/* Skipped in the plain-text version; the footer carries the site link. */}
                    <Link href={siteUrl} data-skip-in-text={true}>
                      <Img
                        src={`${siteUrl}${EMAIL_WORDMARK_PATH}`}
                        width={152}
                        height={35}
                        alt="Virzeen"
                        className="mx-auto text-h2 text-ink"
                      />
                    </Link>
                  </Column>
                </Row>
                <Section className="mt-12">{children}</Section>
                {invitesReply && (
                  <Text className="m-0 mt-8 text-small text-ink-muted">
                    Questions? Reply to this email and we&apos;ll help.
                  </Text>
                )}
                <Hr className="my-8 border-line" />
                <Text className="m-0 text-h2">
                  <Link href={siteUrl} className="text-ink no-underline">
                    {hostOf(siteUrl)}
                  </Link>
                </Text>
                <Hr className="mt-8 mb-6 border-line" />
                <Text className="m-0 text-small text-ink-muted">
                  © {new Date().getFullYear()} Virzeen. All rights reserved.
                </Text>
                <Text className="m-0 mt-2 text-small text-ink-muted">
                  <Link href={`${siteUrl}/privacy`} className="text-ink-muted underline">
                    Privacy policy
                  </Link>
                  {" · "}
                  <Link href={`${siteUrl}/contact`} className="text-ink-muted underline">
                    Get help
                  </Link>
                </Text>
              </Column>
            </Row>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
