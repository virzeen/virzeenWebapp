import "server-only";
import { runAction } from "@/server/actions/result";
import { requireAdmin, type SessionUser } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";

/**
 * Every admin action: authenticate + authorize (ADMIN with a fresh TOTP step-up) → rate-limit → body.
 * Checked inside each action, not only in the admin layout (security-policy.md §3).
 */
export function runAdminAction<T>(name: string, body: (admin: SessionUser) => Promise<T>) {
  return runAction(name, async () => {
    const admin = await requireAdmin();
    await rateLimit("admin", `admin:${admin.id}`);
    return body(admin);
  });
}
