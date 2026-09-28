"use server";

import "server-only";
import { AppError } from "@virzeen/core";
import { totpCodeSchema } from "@virzeen/validators";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { runAction } from "@/server/actions/result";
import { auth } from "@/server/auth/auth";
import { getAdminState, markAdminVerified } from "@/server/auth/session";
import { logger } from "@/server/logger";
import { rateLimit } from "@/server/security/rate-limit";

async function requireAdminRole() {
  const { state, user } = await getAdminState();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  if (state === "not-admin") throw new AppError("FORBIDDEN", "You don't have access to this.");
  return { state, user };
}

/** Step 1 of admin 2FA: create a TOTP secret. Returns the otpauth URI and one-time backup codes. */
export async function startTotpEnrollmentAction() {
  return runAction("startTotpEnrollment", async () => {
    const { state, user } = await requireAdminRole();
    if (state !== "needs-enrollment") throw new AppError("CONFLICT", "Two-factor is already set up.");
    await rateLimit("admin:totp", `admin:${user.id}`);
    const result = await auth.api.enableTwoFactor({ body: { method: "totp" }, headers: await headers() });
    if (result.method !== "totp") throw new AppError("INTERNAL", "Authenticator setup failed.");
    return { totpURI: result.totpURI, backupCodes: result.backupCodes };
  });
}

/**
 * Verifies a 6-digit TOTP code. During enrolment this switches two-factor on (Better Auth issues a new session,
 * so the admin then verifies once more); afterwards it marks this session as verified for the admin area.
 */
export async function verifyAdminTotpAction(input: unknown) {
  return runAction("verifyAdminTotp", async () => {
    const { state, user } = await requireAdminRole();
    await rateLimit("admin:totp", `admin:${user.id}`);
    const { code } = totpCodeSchema.parse(input);
    try {
      await auth.api.verifyTOTP({ body: { code }, headers: await headers() });
    } catch (error) {
      if (error instanceof APIError) {
        throw new AppError("VALIDATION_FAILED", "That code isn't right. Check your authenticator app.", {
          fields: { code: "That code isn't right. Check your authenticator app." },
        });
      }
      throw error;
    }
    if (state === "needs-enrollment") {
      logger.info("admin enabled two-factor", { adminId: user.id });
      return { enrolled: true };
    }
    await markAdminVerified();
    logger.info("admin verified two-factor", { adminId: user.id });
    return { enrolled: false };
  });
}
