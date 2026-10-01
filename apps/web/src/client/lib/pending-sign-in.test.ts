import { describe, expect, it } from "vitest";
import {
  forgetPendingSignIn,
  PENDING_SIGN_IN_MS,
  pendingSignIn,
  rememberPendingSignIn,
  verifyHref,
} from "./pending-sign-in";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe("pending sign-in", () => {
  it("is remembered for as long as the code lasts", () => {
    const storage = memoryStorage();
    rememberPendingSignIn("asha@example.com", "/checkout", 1_000, storage);
    expect(pendingSignIn(1_000 + PENDING_SIGN_IN_MS, storage)).toEqual({
      email: "asha@example.com",
      next: "/checkout",
      at: 1_000,
    });
    expect(pendingSignIn(1_001 + PENDING_SIGN_IN_MS, storage)).toBeNull();
  });

  it("is gone once forgotten (signed in)", () => {
    const storage = memoryStorage();
    rememberPendingSignIn("asha@example.com", "/account", 1_000, storage);
    forgetPendingSignIn(storage);
    expect(pendingSignIn(2_000, storage)).toBeNull();
  });

  it("ignores missing, broken or future entries, and missing storage", () => {
    const storage = memoryStorage();
    expect(pendingSignIn(1_000, storage)).toBeNull();
    storage.setItem("vz.pendingSignIn", "{not json");
    expect(pendingSignIn(1_000, storage)).toBeNull();
    storage.setItem("vz.pendingSignIn", JSON.stringify({ email: "a@b.co", next: "/account" }));
    expect(pendingSignIn(1_000, storage)).toBeNull();
    rememberPendingSignIn("a@b.co", "/account", 5_000, storage);
    expect(pendingSignIn(1_000, storage)).toBeNull();
    expect(pendingSignIn(1_000, null)).toBeNull();
  });

  it("links back to the code screen with the email and the page to return to", () => {
    expect(verifyHref({ email: "asha+shop@example.com", next: "/product/linen-overshirt", at: 0 })).toBe(
      "/verify?email=asha%2Bshop%40example.com&next=%2Fproduct%2Flinen-overshirt",
    );
  });
});
