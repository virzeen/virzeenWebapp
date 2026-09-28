import { describe, expect, it } from "vitest";
import { markOtpDeliveryFailed, trackOtpDelivery } from "./otp-delivery";

// Mimics Better Auth: the sender runs inside the request and its error is caught and only logged.
async function swallowErrors(send: () => Promise<void>) {
  try {
    await send();
  } catch {
    // logged by Better Auth
  }
  return "code sent";
}

describe("trackOtpDelivery", () => {
  it("reports a delivery that failed inside the request, even though the error was swallowed", async () => {
    const outcome = await trackOtpDelivery(() =>
      swallowErrors(async () => {
        await Promise.resolve();
        markOtpDeliveryFailed();
        throw new Error("Resend is down");
      }),
    );
    expect(outcome).toEqual({ result: "code sent", failed: true });
  });

  it("reports success when the email went out", async () => {
    const outcome = await trackOtpDelivery(() => swallowErrors(async () => {}));
    expect(outcome).toEqual({ result: "code sent", failed: false });
  });

  it("keeps concurrent requests apart", async () => {
    const [failing, fine] = await Promise.all([
      trackOtpDelivery(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        markOtpDeliveryFailed();
      }),
      trackOtpDelivery(async () => new Promise((resolve) => setTimeout(resolve, 10))),
    ]);
    expect(failing.failed).toBe(true);
    expect(fine.failed).toBe(false);
  });

  it("ignores a failure outside any tracked request", () => {
    expect(() => markOtpDeliveryFailed()).not.toThrow();
  });
});
