import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

// Better Auth 1.7.6 awaits sendVerificationOTP but swallows its errors (runInBackgroundOrAwait only logs them),
// so a failed email would still answer "code sent". The auth route tracks each send request here and turns a
// failed delivery into an error the sign-in form shows.
const delivery = new AsyncLocalStorage<{ failed: boolean }>();

/** Runs `send` and reports whether a sign-in code email failed during it. */
export async function trackOtpDelivery<T>(send: () => Promise<T>): Promise<{ result: T; failed: boolean }> {
  const state = { failed: false };
  const result = await delivery.run(state, send);
  return { result, failed: state.failed };
}

/** Called by sendVerificationOTP (auth.ts) when the email couldn't be sent. */
export function markOtpDeliveryFailed(): void {
  const state = delivery.getStore();
  if (state) state.failed = true;
}
