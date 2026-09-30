"use client";

import { useSyncExternalStore } from "react";

// "Install the Virzeen app" (owner request 2026-09-30): phones only.
// - Android browsers offer the install panel once through `beforeinstallprompt`, often before React has hydrated.
//   So the offer is caught as soon as this module loads (service-worker.tsx imports it in the root layout).
// - iPhone has no such event and no way to open "Add to Home Screen", so the button shows a short guide instead.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * none: hidden (not a phone, or already running as the installed app).
 * prompt: the browser's own install panel. ios / android: a step-by-step guide.
 */
export type InstallMode = "none" | "prompt" | "ios" | "android";
export type InstallGuide = "ios" | "android";

type Environment = { userAgent: string; maxTouchPoints: number; standalone: boolean; canPrompt: boolean };

export function installMode({ userAgent, maxTouchPoints, standalone, canPrompt }: Environment): InstallMode {
  if (standalone) return "none";
  // iPadOS Safari reports itself as a Mac; touch gives it away.
  if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) return "ios";
  if (!/Android/.test(userAgent)) return "none";
  return canPrompt ? "prompt" : "android";
}

let offer: InstallPromptEvent | null = null;
let installed = false;
let guide: InstallGuide | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // keep the browser's own banner away; our button uses the offer instead
    offer = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    offer = null;
    notify();
  });
}

const STANDALONE = "(display-mode: standalone)";

function subscribe(listener: () => void) {
  listeners.add(listener);
  const display = window.matchMedia(STANDALONE);
  display.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    display.removeEventListener("change", listener);
  };
}

function currentMode(): InstallMode {
  if (installed) return "none";
  return installMode({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone:
      window.matchMedia(STANDALONE).matches || (navigator as { standalone?: boolean }).standalone === true,
    canPrompt: offer !== null,
  });
}

/** How "Install the Virzeen app" works on this device. Always "none" on the server. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, currentMode, () => "none");
}

/** The guide to show, if any. One guide is shown for the whole page (InstallAppGuide in the footer). */
export function useInstallGuide(): InstallGuide | null {
  return useSyncExternalStore(
    subscribe,
    () => guide,
    () => null,
  );
}

export function closeInstallGuide() {
  guide = null;
  notify();
}

/**
 * Opens the browser's install panel when it offers one. Otherwise, or when the offer was already used, opens the
 * guide for this phone.
 */
export async function startInstall() {
  const mode = currentMode();
  if (mode === "none") return;
  const pending = offer;
  if (pending) {
    offer = null; // an offer can be shown only once
    notify();
    await pending.prompt();
    const { outcome } = await pending.userChoice;
    if (outcome === "accepted") installed = true;
    notify();
    return;
  }
  guide = mode === "ios" ? "ios" : "android";
  notify();
}
