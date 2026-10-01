"use client";

import { linkVariants } from "@virzeen/ui";
import { useSyncExternalStore } from "react";

const noChanges = () => () => {};

/**
 * An email link that Cloudflare's Email Obfuscation leaves alone. It rewrites every `mailto:` link and every address
 * it finds in the HTML into "[email protected]" plus a decoder script that our CSP blocks, so visitors saw no address
 * and the console showed errors (Lighthouse, 2026-10-01; a `%40` in the mailto didn't stop it). So the HTML carries
 * the address as three text nodes (`sales<!-- -->@<!-- -->virzeen.com`) in a link without an `href`, and the browser
 * adds `mailto:` as soon as the page runs. Without JavaScript the address is still there to read and copy.
 */
export function EmailLink({ email }: { email: string }) {
  // False on the server and while hydrating, true after: the HTML never holds the mailto.
  const running = useSyncExternalStore(
    noChanges,
    () => true,
    () => false,
  );
  const at = email.indexOf("@");
  return (
    <a href={running ? `mailto:${email}` : undefined} className={linkVariants()}>
      {email.slice(0, at)}
      {"@"}
      {email.slice(at + 1)}
    </a>
  );
}
