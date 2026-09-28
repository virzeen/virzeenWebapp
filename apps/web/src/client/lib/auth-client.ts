"use client";

import { emailOTPClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Browser auth client (sign-in with Google or email OTP, sign-out). Same origin as the app. */
export const authClient = createAuthClient({
  plugins: [emailOTPClient(), twoFactorClient()],
});
