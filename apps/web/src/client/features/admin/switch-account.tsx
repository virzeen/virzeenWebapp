"use client";

import { Button } from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/client/lib/auth-client";

/**
 * "Use a different email" on the admin authenticator step: someone signed in with the wrong account (or one
 * whose authenticator they don't have) signs out and goes back to the email form. Looks like the same link on
 * the sign-in code page.
 */
export function SwitchAccountButton() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function signOutAndSwitch() {
    setLeaving(true);
    await authClient.signOut();
    router.replace("/login?next=%2Fadmin");
    router.refresh();
  }

  return (
    <Button
      variant="link"
      size="sm"
      onClick={signOutAndSwitch}
      loading={leaving}
      className="self-center font-normal text-ink-muted hover:text-ink hover:no-underline"
    >
      Use a different email
    </Button>
  );
}
