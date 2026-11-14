"use server";

import "server-only";
import { AppError, memberService } from "@virzeen/core";
import {
  emailSchema,
  passwordSignInSchema,
  setPasswordSchema,
  signupDetailsSchema,
} from "@virzeen/validators";
import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { runAction } from "@/server/actions/result";
import { auth } from "@/server/auth/auth";
import { getUser, requireUser } from "@/server/auth/session";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

// Sign-in steps that need the server: the email check, the create-account details, password sign-in and the
// password in Settings (specs/sign-in-v2.md). Codes and Google stay on Better Auth's own routes.

/**
 * "Is this email registered, and does it have a password?" at the top of sign-in: a member gets a code (and "Use
 * Password" when they set one), a new email goes to the create-account step. Limited to 10 a minute per IP (the answer
 * says whether an email is registered; docs/checkoutfeatures.md §8).
 */
export async function identifyEmailAction(input: unknown) {
  return runAction("identifyEmail", async () => {
    await rateLimit("identify", await clientIp());
    const email = emailSchema.parse(input);
    return memberService.identify(email);
  });
}

/**
 * Saves the create-account details on the account the emailed code just made (the page signs in with the code, naming
 * the account, then calls this). Nothing else can be changed through it.
 */
export async function completeSignupAction(input: unknown) {
  return runAction("completeSignup", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    const details = signupDetailsSchema.parse(input);
    await memberService.saveSignupProfile(user.id, {
      preference: details.preference,
      birthday: details.birthday ?? null,
      marketingOptIn: details.marketingOptIn,
    });
    revalidatePath("/account", "layout");
    return { saved: true };
  });
}

const BAD_PASSWORD_LOGIN = "That email and password don't match.";

/**
 * Sign in with an email and password. One message for every failure (unknown email, no password set, a wrong password,
 * an admin), so it never says which. Admins never sign in this way: their way in is the code plus the authenticator.
 * Limited per IP and per email.
 */
export async function passwordSignInAction(input: unknown) {
  return runAction("passwordSignIn", async () => {
    const { email, password } = passwordSignInSchema.parse(input);
    await rateLimit("login:ip", await clientIp());
    await rateLimit("login:email", email);
    const { hasPassword } = await memberService.identify(email);
    if (hasPassword) {
      try {
        const result = await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
        // A second step (an authenticator) can't be completed here: treated as a failed sign-in.
        if (!("twoFactorRedirect" in result && result.twoFactorRedirect)) return { signedIn: true };
      } catch (error) {
        if (!(error instanceof APIError)) throw error;
      }
    }
    throw new AppError("VALIDATION_FAILED", BAD_PASSWORD_LOGIN, { fields: { password: BAD_PASSWORD_LOGIN } });
  });
}

/**
 * Settings → Password: set a first password (the account has none yet), or change it (the current one is needed).
 * Not for admins, who sign in with a code and the authenticator.
 */
export async function setPasswordAction(input: unknown) {
  return runAction("setPassword", async () => {
    const user = await requireUser();
    if (user.role === "ADMIN") {
      throw new AppError("FORBIDDEN", "Admins sign in with an emailed code and the authenticator app.");
    }
    await rateLimit("account", `user:${user.id}`);
    const { currentPassword, newPassword } = setPasswordSchema.parse(input);
    const requestHeaders = await headers();
    if (await memberService.hasPassword(user.id)) {
      if (!currentPassword) {
        throw new AppError("VALIDATION_FAILED", "Enter your current password.", {
          fields: { currentPassword: "Enter your current password" },
        });
      }
      try {
        await auth.api.changePassword({ body: { currentPassword, newPassword }, headers: requestHeaders });
      } catch (error) {
        if (!(error instanceof APIError)) throw error;
        throw new AppError("VALIDATION_FAILED", "That isn't your current password.", {
          fields: { currentPassword: "That isn't your current password" },
        });
      }
      revalidatePath("/account/settings", "layout");
      return { changed: true };
    }
    await auth.api.setPassword({ body: { newPassword }, headers: requestHeaders });
    revalidatePath("/account/settings", "layout");
    return { changed: false };
  });
}

/** Whether to show "Set password" or "Change password" in Settings. */
export async function hasPasswordAction() {
  return runAction("hasPassword", async () => {
    const user = await getUser();
    return { hasPassword: user ? await memberService.hasPassword(user.id) : false };
  });
}
