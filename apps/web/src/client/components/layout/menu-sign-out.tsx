"use client";

import { LogOut } from "lucide-react";
import { useSignOut } from "@/client/components/shared/sign-out-button";

/**
 * "Sign out" in the phone menu, the last row under Help, in the same style as the rows above it. It closes the menu,
 * ends this device's session and goes to the home page (a failure shows a toast and the person stays signed in).
 */
export function MenuSignOut({ onDone }: { onDone: () => void }) {
  const { signOut, signingOut } = useSignOut();
  return (
    <button
      type="button"
      disabled={signingOut}
      onClick={() => {
        onDone();
        void signOut();
      }}
      className="flex min-h-11 w-full cursor-pointer items-center gap-4 text-body font-medium text-ink hover:text-ink-muted active:text-ink-muted disabled:opacity-60"
    >
      <LogOut className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
      Sign out
    </button>
  );
}
