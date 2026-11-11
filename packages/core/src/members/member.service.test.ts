import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser, resetDatabase } from "../../test/factories";
import { memberService } from "./member.service";

async function addPassword(userId: string) {
  await db.account.create({
    data: { id: `acc-${userId}`, accountId: userId, providerId: "credential", userId, password: "hash" },
  });
}

describe("memberService.identify", () => {
  beforeEach(resetDatabase);

  it("says an unknown email is not registered", async () => {
    expect(await memberService.identify("nobody@example.com")).toEqual({
      registered: false,
      hasPassword: false,
    });
  });

  it("finds an account whatever the email's case, and reports whether it has a password", async () => {
    const user = await createUser({ email: "sita@example.com" });
    expect(await memberService.identify(" Sita@Example.com ")).toEqual({
      registered: true,
      hasPassword: false,
    });
    await addPassword(user.id);
    expect(await memberService.identify("sita@example.com")).toEqual({ registered: true, hasPassword: true });
  });

  it("never offers a password to an admin: they sign in with a code and the authenticator", async () => {
    const admin = await createUser({ email: "boss@example.com", role: "ADMIN" });
    await addPassword(admin.id);
    expect(await memberService.identify("boss@example.com")).toEqual({
      registered: true,
      hasPassword: false,
    });
  });
});

describe("memberService.saveSignupProfile", () => {
  beforeEach(resetDatabase);

  it("keeps the preference, birthday, marketing tick and the time the terms were agreed", async () => {
    const user = await createUser();
    const now = new Date("2026-11-11T06:00:00Z");
    await memberService.saveSignupProfile(user.id, {
      preference: "CLOTHING",
      birthday: "1998-03-14",
      marketingOptIn: true,
      now,
    });
    const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved).toMatchObject({
      shoppingPreference: "CLOTHING",
      marketingOptIn: true,
      termsAcceptedAt: now,
    });
    expect(saved.birthday?.toISOString().slice(0, 10)).toBe("1998-03-14");
  });

  it("accepts no birthday", async () => {
    const user = await createUser();
    await memberService.saveSignupProfile(user.id, {
      preference: "BOTH",
      birthday: "",
      marketingOptIn: false,
    });
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).birthday).toBeNull();
  });

  it("knows whether a password is set", async () => {
    const user = await createUser();
    expect(await memberService.hasPassword(user.id)).toBe(false);
    await addPassword(user.id);
    expect(await memberService.hasPassword(user.id)).toBe(true);
  });
});
