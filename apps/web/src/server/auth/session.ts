import "server-only";
import { AppError, cartService, type CartOwner } from "@virzeen/core";
import { db } from "@virzeen/db";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/server/auth/auth";
import { env } from "@/server/env";

export const GUEST_CART_COOKIE = "vz_cart";
/** How long an authenticator code keeps the admin area open for a session (security-policy.md §2). */
export const ADMIN_VERIFICATION_HOURS = 12;
const ADMIN_VERIFICATION_MS = ADMIN_VERIFICATION_HOURS * 3_600_000;

/** The signed-in session for this request (memoised per request). */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
};

function toUser(session: NonNullable<Awaited<ReturnType<typeof getSession>>>): SessionUser {
  const user = session.user as typeof session.user & { role?: string; twoFactorEnabled?: boolean | null };
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? "CUSTOMER",
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
  };
}

export async function getUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session ? toUser(session) : null;
}

/** Pages: send guests to sign in and back again. */
export async function requireUserPage(returnTo: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Actions and API routes: a guest gets UNAUTHENTICATED. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  return user;
}

export type AdminState = "ok" | "not-admin" | "needs-enrollment" | "needs-verification";

/** Until when a session's last accepted authenticator code keeps the admin area open (null: none yet). */
async function adminVerifiedUntil(sessionToken: string): Promise<Date | null> {
  const row = await db.session.findUnique({
    where: { token: sessionToken },
    select: { adminVerifiedAt: true },
  });
  return row?.adminVerifiedAt ? new Date(row.adminVerifiedAt.getTime() + ADMIN_VERIFICATION_MS) : null;
}

/** Where an admin stands: role, TOTP enrolled, and TOTP verified in this session (security-policy.md §2). */
export async function getAdminState(): Promise<{ state: AdminState; user: SessionUser | null }> {
  const session = await getSession();
  if (!session) return { state: "not-admin", user: null };
  const user = toUser(session);
  if (user.role !== "ADMIN") return { state: "not-admin", user };
  if (!user.twoFactorEnabled) return { state: "needs-enrollment", user };
  const until = await adminVerifiedUntil(session.session.token);
  const fresh = until !== null && until.getTime() > Date.now();
  return { state: fresh ? "ok" : "needs-verification", user };
}

/**
 * When the admin area next asks the current session for an authenticator code (admin settings). Null when
 * there is no session or it hasn't passed the code step yet.
 */
export async function getAdminVerifiedUntil(): Promise<Date | null> {
  const session = await getSession();
  return session ? adminVerifiedUntil(session.session.token) : null;
}

/** Admin pages: non-admins see 404 (don't reveal the admin area); admins without a fresh TOTP go verify. */
export async function requireAdminPage(): Promise<SessionUser> {
  const { state, user } = await getAdminState();
  if (!user) redirect("/login?next=%2Fadmin");
  if (state === "not-admin") notFound();
  if (state !== "ok") redirect("/admin/verify");
  return user;
}

/** Admin actions: checked inside every action, not only in the layout (security-policy.md §3). */
export async function requireAdmin(): Promise<SessionUser> {
  const { state, user } = await getAdminState();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  if (state !== "ok") throw new AppError("FORBIDDEN", "You don't have access to this.");
  return user;
}

/** Marks the current session as TOTP-verified for the admin area. */
export async function markAdminVerified(): Promise<void> {
  const session = await getSession();
  if (!session) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  await db.session.update({ where: { token: session.session.token }, data: { adminVerifiedAt: new Date() } });
}

// ── Cart owner (guest cookie or signed-in user) ──

const guestCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

/**
 * Who owns the bag for this request. When a guest signs in, their guest bag is merged into the account
 * (glossary: Cart). Sets no cookies, so it is safe in Server Components. Memoised per request so the layout and
 * the page merge once; mergeGuestCart is also safe against concurrent requests.
 */
export const getCartOwner = cache(async (): Promise<CartOwner | null> => {
  const user = await getUser();
  const guestToken = (await cookies()).get(GUEST_CART_COOKIE)?.value;
  if (user) {
    if (guestToken) await cartService.mergeGuestCart({ guestToken, userId: user.id });
    return { userId: user.id };
  }
  return guestToken ? { guestToken } : null;
});

/** Like getCartOwner but creates the bag if needed. Only in Server Actions / Route Handlers (sets a cookie). */
export async function ensureCart(): Promise<{ cartId: string; key: string; userId: string | null }> {
  const user = await getUser();
  const jar = await cookies();
  const guestToken = jar.get(GUEST_CART_COOKIE)?.value;
  if (user) {
    if (guestToken) {
      await cartService.mergeGuestCart({ guestToken, userId: user.id });
      jar.delete(GUEST_CART_COOKIE);
    }
    const { cartId } = await cartService.ensureCart({ userId: user.id });
    return { cartId, key: `user:${user.id}`, userId: user.id };
  }
  const result = await cartService.ensureCart(guestToken ? { guestToken } : { guest: true });
  if (result.guestToken) jar.set(GUEST_CART_COOKIE, result.guestToken, guestCookieOptions);
  return { cartId: result.cartId, key: `guest:${result.guestToken ?? guestToken}`, userId: null };
}
