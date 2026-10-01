import { Link } from "@virzeen/ui";

/**
 * A mailto link that Cloudflare's Email Obfuscation leaves alone. It rewrites every address it finds in the HTML
 * into "[email protected]" plus a decoder script that our CSP blocks, so visitors saw "[email protected]" and React
 * failed to hydrate the page (Lighthouse "errors in console", 2026-10-01). Here the address reaches the HTML as three
 * text nodes (`sales<!-- -->@<!-- -->virzeen.com`) and the link as `mailto:sales%40virzeen.com` (RFC 6068), which
 * match nothing; people still see, copy and click the plain address.
 */
export function EmailLink({ email }: { email: string }) {
  const at = email.indexOf("@");
  const user = email.slice(0, at);
  const domain = email.slice(at + 1);
  return (
    <Link href={`mailto:${user}%40${domain}`}>
      {user}
      {"@"}
      {domain}
    </Link>
  );
}
