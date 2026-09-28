import { describe, expect, it } from "vitest";
import { authErrorMessage, codeCheckFailure } from "./auth-errors";

describe("codeCheckFailure", () => {
  it("puts a wrong or expired code under the field", () => {
    expect(codeCheckFailure({ code: "INVALID_OTP", status: 400 })).toBe("wrong");
    expect(codeCheckFailure({ code: "invalid_code", status: 400 })).toBe("wrong");
    expect(codeCheckFailure({ code: "OTP_EXPIRED", status: 400 })).toBe("expired");
  });

  it("locks the field after Better Auth's attempt limit, but not for a rate limit", () => {
    expect(codeCheckFailure({ code: "TOO_MANY_ATTEMPTS", status: 403 })).toBe("locked");
    // Our route limiter and Better Auth's own limiter: wait, the code itself may still be fine.
    expect(codeCheckFailure({ code: "RATE_LIMITED", status: 429 })).toBe("other");
    expect(codeCheckFailure({ status: 429, message: "Too many requests. Please try again later." })).toBe(
      "other",
    );
  });

  it("sends anything else to the Alert", () => {
    expect(codeCheckFailure({ status: 500 })).toBe("other");
    expect(codeCheckFailure({})).toBe("other");
  });
});

describe("authErrorMessage", () => {
  it("uses the content-style copy for each sign-in code failure", () => {
    expect(authErrorMessage({ code: "INVALID_OTP", status: 400 })).toBe(
      "That code isn't right. Check it and try again.",
    );
    expect(authErrorMessage({ code: "OTP_EXPIRED", status: 400 })).toBe(
      "That code has expired. Send a new one.",
    );
    expect(authErrorMessage({ code: "TOO_MANY_ATTEMPTS", status: 403 })).toBe(
      "Too many wrong codes. Send a new code to try again.",
    );
    expect(authErrorMessage({ code: "RATE_LIMITED", status: 429 })).toBe(
      "Too many attempts. Please wait a few minutes and try again.",
    );
  });

  it("never shows raw error text", () => {
    expect(authErrorMessage({ status: 500, message: "PrismaClientKnownRequestError" })).toBe(
      "Something went wrong on our side. Please try again.",
    );
  });
});
