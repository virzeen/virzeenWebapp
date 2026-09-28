import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser, resetDatabase } from "../../test/factories";
import { adminAccounts } from "./admin-accounts";

async function signedInSession(userId: string) {
  return db.session.create({
    data: {
      id: `s-${userId}`,
      token: `token-${userId}`,
      userId,
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  });
}

async function enrolTwoFactor(userId: string) {
  await db.twoFactor.create({ data: { id: `tf-${userId}`, secret: "x", backupCodes: "x", userId } });
  await db.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
}

describe("adminAccounts.grant", () => {
  beforeEach(resetDatabase);

  it("makes an existing customer an admin, signs them out and records it", async () => {
    const user = await createUser({ email: "owner@example.com" });
    await signedInSession(user.id);

    await expect(adminAccounts.grant(" Owner@Example.com ")).resolves.toEqual({ created: false });

    expect(await db.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({ role: "ADMIN" });
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.auditLog.findFirst({ where: { entityId: user.id } })).toMatchObject({
      action: "user.grantAdmin",
      entity: "user",
    });
  });

  it("creates the account when the email has never signed in", async () => {
    await expect(adminAccounts.grant("new-owner@example.com")).resolves.toEqual({ created: true });

    expect(await db.user.findUnique({ where: { email: "new-owner@example.com" } })).toMatchObject({
      role: "ADMIN",
      twoFactorEnabled: false,
    });
  });

  it("rejects an invalid email", async () => {
    await expect(adminAccounts.grant("not-an-email")).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});

describe("adminAccounts.resetTwoFactor", () => {
  beforeEach(resetDatabase);

  it("removes the authenticator and signs the admin out, so /admin asks them to set it up again", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await enrolTwoFactor(admin.id);
    await signedInSession(admin.id);

    await adminAccounts.resetTwoFactor(admin.email);

    expect(await db.user.findUniqueOrThrow({ where: { id: admin.id } })).toMatchObject({
      twoFactorEnabled: false,
    });
    expect(await db.twoFactor.count({ where: { userId: admin.id } })).toBe(0);
    expect(await db.session.count({ where: { userId: admin.id } })).toBe(0);
  });

  it("reports an unknown email as NOT_FOUND", async () => {
    await expect(adminAccounts.resetTwoFactor("nobody@example.com")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("adminAccounts.revoke", () => {
  beforeEach(resetDatabase);

  it("turns an admin back into a customer and signs them out", async () => {
    await createUser({ role: "ADMIN" });
    const other = await createUser({ role: "ADMIN" });
    await signedInSession(other.id);

    await adminAccounts.revoke(other.email);

    expect(await db.user.findUniqueOrThrow({ where: { id: other.id } })).toMatchObject({ role: "CUSTOMER" });
    expect(await db.session.count({ where: { userId: other.id } })).toBe(0);
  });

  it("refuses to remove the last admin", async () => {
    const only = await createUser({ role: "ADMIN" });

    await expect(adminAccounts.revoke(only.email)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.user.findUniqueOrThrow({ where: { id: only.id } })).toMatchObject({ role: "ADMIN" });
  });

  it("reports a customer as NOT_FOUND among admins", async () => {
    const customer = await createUser();
    await expect(adminAccounts.revoke(customer.email)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("adminAccounts.list", () => {
  beforeEach(resetDatabase);

  it("lists admins with their two-factor status", async () => {
    const admin = await createUser({ role: "ADMIN", email: "a@example.com" });
    await enrolTwoFactor(admin.id);
    await createUser({ email: "customer@example.com" });

    await expect(adminAccounts.list()).resolves.toEqual([
      expect.objectContaining({ email: "a@example.com", twoFactorEnabled: true }),
    ]);
  });
});
