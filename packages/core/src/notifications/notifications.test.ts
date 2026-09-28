import { describe, expect, it } from "vitest";
import { sentEmails } from "../../test/setup";
import { notifications } from "./notifications";

// Sign-in codes go out from their own address (docs/specs/email-senders.md); the web mailer maps `sender`.

describe("notification senders", () => {
  it("marks sign-in code emails for the sign-in sender", async () => {
    await notifications.sendOtp("customer@example.com", "123456");
    expect(sentEmails.map((e) => e.sender)).toEqual(["auth"]);
  });

  it("sends owner alerts from the default sender", async () => {
    await notifications.alertOwner("Test alert", ["A line"]);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]?.sender).toBeUndefined();
  });
});
