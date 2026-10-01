"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { pendingSignIn, verifyHref } from "@/client/lib/pending-sign-in";

/**
 * The installed app restarted on its start page (the home page) while a sign-in waits for its emailed code: go
 * back to the code screen (client/lib/pending-sign-in.ts). Runs once, on the page the app opened on, so choosing
 * Home later never jumps away. A browser tab keeps its own page, so only the installed app needs this.
 */
export function ResumeSignIn() {
  const router = useRouter();

  useEffect(() => {
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true; // iPhone home-screen apps
    if (!installed || window.location.pathname !== "/") return;
    const pending = pendingSignIn();
    if (pending) router.replace(verifyHref(pending));
  }, [router]);

  return null;
}
