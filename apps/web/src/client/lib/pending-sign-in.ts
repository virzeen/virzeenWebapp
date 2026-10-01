// A sign-in waiting for its emailed code (owner report 2026-10-01: "on the phone, Sign in returns me to the home
// page"). In the installed app, going to the mail app for the code and coming back through the app's icon can
// restart the app on its start page, the home page, and the code screen is gone. The code screen notes the
// sign-in here, and the app goes back to it when it restarts within the code's 10 minutes.

const KEY = "vz.pendingSignIn";
/** How long a code is valid (the "It expires in 10 minutes" email). */
export const PENDING_SIGN_IN_MS = 10 * 60 * 1000;

export type PendingSignIn = { email: string; next: string; at: number };

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Storage can be missing or throw (private windows, blocked site data): a sign-in just isn't resumed then.
function store(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function rememberPendingSignIn(email: string, next: string, now = Date.now(), storage = store()) {
  try {
    storage?.setItem(KEY, JSON.stringify({ email, next, at: now } satisfies PendingSignIn));
  } catch {
    // ignore
  }
}

export function forgetPendingSignIn(storage = store()) {
  try {
    storage?.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** The sign-in to go back to, or null when there's none, it's older than a code lasts, or it's unreadable. */
export function pendingSignIn(now = Date.now(), storage = store()): PendingSignIn | null {
  try {
    const value: unknown = JSON.parse(storage?.getItem(KEY) ?? "null");
    if (!value || typeof value !== "object") return null;
    const { email, next, at } = value as Partial<PendingSignIn>;
    if (typeof email !== "string" || typeof next !== "string" || typeof at !== "number") return null;
    if (now - at > PENDING_SIGN_IN_MS || at > now) return null;
    return { email, next, at };
  } catch {
    return null;
  }
}

/** The code screen's address for a pending sign-in. */
export function verifyHref({ email, next }: PendingSignIn) {
  return `/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`;
}
