"use client";

import { useEffect } from "react";
// Loaded with the root layout so the browser's install offer is caught before any "Install" button renders.
import "@/client/lib/install-app";

/** Registers public/sw.js (installable app + offline page). Production only, so development never caches. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
