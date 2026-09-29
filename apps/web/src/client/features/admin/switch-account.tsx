"use client";

import { Button } from "@virzeen/ui";
import { useSignOut } from "@/client/components/shared/sign-out-button";

/**
 * "Use a different email" on the admin authenticator step: someone signed in with the wrong account (or one
 * whose authenticator they don't have) signs out and goes back to the email form. Looks like the same link on
 * the sign-in code page.
 */
export function SwitchAccountButton() {
  const { signOut, signingOut } = useSignOut("/login?next=%2Fadmin", { replace: true });
  return (
    <Button
      variant="link"
      size="sm"
      onClick={signOut}
      loading={signingOut}
      className="self-center font-normal text-ink-muted hover:text-ink hover:no-underline"
    >
      Use a different email
    </Button>
  );
}
