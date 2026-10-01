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
import { emailTailwindConfig, fontStack, inverseColors as dark } from "@virzeen/ui/tokens";

// Spacing in px, not rem: Outlook for Windows drops rem padding and margins.
const tailwindConfig = { ...emailTailwindConfig, presets: [pixelBasedPreset] } as unknown as TailwindConfig;

/** Where the wordmarks are served from (apps/web/public; regenerate with scripts/rasterise-email-wordmark.mjs). */
export const EMAIL_WORDMARK_PATH = "/brand/email-wordmark.png";
export const EMAIL_WORDMARK_DARK_PATH = "/brand/email-wordmark-dark.png";

/*
 * Dark mode (owner request 2026-10-01: the wordmark white in dark mode and black in light, in every mail app).
 * Mail apps that say they're in dark mode (Apple Mail, iPhone Mail, Outlook for Mac, Samsung) get the whole email
 * white on ink, the site's tone-inverse, and the white wordmark. Written by hand: react-email's Tailwind inlines
 * `dark:` classes as if always dark. The hooks are classes, the only ones left in the HTML: `body` and `vz-page` on
 * the body, `vz-muted`, `vz-surface`, `vz-line` and `vz-button` where the light design uses ink-muted, surface,
 * line and an ink button, and `vz-light-only` / `vz-dark-only` on the two wordmarks.
 */
const darkModeCss = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .vz-page, .vz-page td { background-color: ${dark.canvas} !important; }
  .vz-page, .vz-page td, .vz-page p, .vz-page h1, .vz-page h2, .vz-page a, .vz-page span { color: ${dark.ink} !important; }
  .vz-page .vz-muted, .vz-page .vz-muted a { color: ${dark.inkMuted} !important; }
  .vz-page .vz-surface, .vz-page .vz-surface td { background-color: ${dark.surface} !important; }
  .vz-page hr, .vz-page .vz-line { border-color: ${dark.line} !important; }
  .vz-page .vz-button, .vz-page .vz-button span { background-color: ${dark.ink} !important; color: ${dark.canvas} !important; }
  .vz-light-only { display: none !important; }
  .vz-dark-only { display: block !important; max-height: none !important; }
}`;

/**
 * The white wordmark until dark mode. `mso-hide` (not in React's types): Outlook for Windows shows `display:none`
 * images.
 */
const hiddenUntilDark = {
  display: "none",
  maxHeight: 0,
  overflow: "hidden",
  msoHide: "all",
} as React.CSSProperties;

/*
 * Outlook.com and Outlook's phone apps darken by themselves and mark it with data-ogsc: swap the wordmark there
 * too. A block of its own, so a client that rejects the attribute selector drops only these rules.
 */
const outlookDarkCss = `[data-ogsc] .vz-light-only { display: none !important; }
[data-ogsc] .vz-dark-only { display: block !important; max-height: none !important; }`;

/*
 * Gmail never says it's in dark mode: its apps darken the email by themselves and never change images. So Gmail
 * always gets the white wordmark with mix-blend-mode: difference, which takes the colour opposite to whatever is
 * behind it: black on Gmail's white, white once Gmail has darkened the email. `u + .body` only matches in Gmail
 * (it turns the doctype into <u></u> and the body into <div class="body">) on the web, iPhone and Android with a
 * Google account, all of which blend (caniemail). Gmail with another account reads no <style> and keeps the ink
 * wordmark. Should blending fail anyway, the white wordmark's thin ink halo still outlines it on white.
 */
const gmailCss = `u + .body .vz-light-only { display: none !important; }
u + .body .vz-dark-only { display: block !important; max-height: none !important; mix-blend-mode: difference; }`;

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
        {/* Light and dark designs: clients that honour this use darkModeCss instead of darkening by themselves. */}
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        {/* Outlook for Windows doesn't inherit the font into nested tables and falls back to Times. */}
        <style>{`table, td, p, h1, h2, a { font-family: ${fontStack}; }`}</style>
        <style>{darkModeCss}</style>
        <style>{outlookDarkCss}</style>
        <style>{gmailCss}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Tailwind config={tailwindConfig}>
        {/* `body`: Gmail's hook (gmailCss). */}
        <Body className="body vz-page m-0 bg-canvas font-text text-ink">
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
                        className="vz-light-only mx-auto text-h2 text-ink"
                      />
                      <Img
                        src={`${siteUrl}${EMAIL_WORDMARK_DARK_PATH}`}
                        width={152}
                        height={35}
                        alt="Virzeen"
                        className="vz-dark-only mx-auto text-h2"
                        style={hiddenUntilDark}
                      />
                    </Link>
                  </Column>
                </Row>
                <Section className="mt-12">{children}</Section>
                {invitesReply && (
                  <Text className="vz-muted m-0 mt-8 text-small text-ink-muted">
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
                <Text className="vz-muted m-0 text-small text-ink-muted">
                  © {new Date().getFullYear()} Virzeen. All rights reserved.
                </Text>
                <Text className="vz-muted m-0 mt-2 text-small text-ink-muted">
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
