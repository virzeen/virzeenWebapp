import { describe, expect, it } from "vitest";
import { replyToFor, senderFor } from "./email-sender";

// Fake values only.
const senders = {
  EMAIL_FROM: "Virzeen <no-reply@example.com>",
  EMAIL_FROM_AUTH: "Virzeen <verify@example.com>",
};

describe("senderFor", () => {
  it("sends sign-in codes from the sign-in sender", () => {
    expect(senderFor({ sender: "auth" }, senders)).toBe("Virzeen <verify@example.com>");
  });

  it("sends every other email from the default sender", () => {
    expect(senderFor({}, senders)).toBe("Virzeen <no-reply@example.com>");
  });

  it("falls back to the default sender when no sign-in sender is set", () => {
    expect(senderFor({ sender: "auth" }, { ...senders, EMAIL_FROM_AUTH: undefined })).toBe(
      "Virzeen <no-reply@example.com>",
    );
  });
});

describe("replyToFor", () => {
  const settings = { EMAIL_REPLY_TO: "sales@example.com" };

  it("lets customers reply to order emails and alerts", () => {
    expect(replyToFor({}, settings)).toBe("sales@example.com");
  });

  it("never sets Reply-To on sign-in codes", () => {
    expect(replyToFor({ sender: "auth" }, settings)).toBeUndefined();
  });
});
