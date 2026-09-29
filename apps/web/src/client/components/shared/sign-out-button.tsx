"use client";

import { Button, type ButtonProps, toast } from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type AuthError, authErrorMessage } from "@/client/features/auth/auth-errors";
import { authClient } from "@/client/lib/auth-client";

/**
 * Ends this device's session, then goes to `to` and refreshes the server components. `replace` swaps the
 * current page out of the history (for pages that only make sense signed in). The one place that signs out.
 * If it fails, the person stays where they are (still signed in) and a toast says so; the button works again.
 */
export function useSignOut(to = "/", { replace = false }: { replace?: boolean } = {}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    // better-fetch returns `{ error }` on an HTTP error (a 429 or 500: the session is still valid) and throws
    // when the request never reaches us (offline).
    const error: AuthError | null = await authClient.signOut().then(
      (result) => result.error,
      () => ({}),
    );
    if (error) {
      setSigningOut(false);
      toast.error(authErrorMessage(error));
      return;
    }
    if (replace) router.replace(to);
    else router.push(to);
    router.refresh();
  }

  return { signOut, signingOut };
}

/** "Sign out" (account settings, admin header and admin settings), then the home page. Secondary pill by default. */
export function SignOutButton({
  variant = "secondary",
  shape = "pill",
  ...props
}: Omit<ButtonProps, "onClick" | "loading" | "children">) {
  const { signOut, signingOut } = useSignOut();
  return (
    <Button variant={variant} shape={shape} {...props} onClick={signOut} loading={signingOut}>
      Sign out
    </Button>
  );
}
