import "server-only";
import { randomUUID } from "node:crypto";
import { db, type Prisma } from "@virzeen/db";
import { emailSchema } from "@virzeen/validators";
import { recordAudit } from "../audit/audit";
import { AppError } from "../errors";

// Owner-run admin account operations (`pnpm admin …`, docs/runbooks/admin-accounts.md). There is no signed-in
// actor on the command line, so audit entries name the affected user as actor, with `via: "admin command"`.
// Every change signs the person out everywhere (security-policy.md §2: sessions rotate on role change).

export type AdminAccount = { email: string; name: string; twoFactorEnabled: boolean; since: Date };

function parseEmail(input: string): string {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_FAILED", "Enter a valid email address.", {
      fields: { email: "Enter a valid email address" },
    });
  }
  return parsed.data;
}

async function findUser(tx: Prisma.TransactionClient, email: string) {
  const user = await tx.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!user) throw new AppError("NOT_FOUND", `No account uses ${email}.`);
  return user;
}

const signOutEverywhere = (tx: Prisma.TransactionClient, userId: string) =>
  tx.session.deleteMany({ where: { userId } });

export const adminAccounts = {
  /**
   * Makes the email an admin, creating the account if it has never signed in. They sign in with the email
   * code (or Google) and set up an authenticator on their first visit to /admin.
   */
  async grant(emailInput: string): Promise<{ created: boolean }> {
    const email = parseEmail(emailInput);
    return db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email }, select: { id: true, role: true } });
      const user = existing
        ? await tx.user.update({ where: { id: existing.id }, data: { role: "ADMIN" }, select: { id: true } })
        : await tx.user.create({
            data: {
              id: randomUUID().replace(/-/g, ""),
              email,
              name: "Virzeen Admin",
              emailVerified: false,
              role: "ADMIN",
            },
            select: { id: true },
          });
      await signOutEverywhere(tx, user.id);
      await recordAudit(tx, {
        actorId: user.id,
        action: "user.grantAdmin",
        entity: "user",
        entityId: user.id,
        diff: { role: { from: existing?.role ?? null, to: "ADMIN" }, via: "admin command" },
      });
      return { created: !existing };
    });
  },

  /** Removes admin rights. The last admin can't be removed, so the shop is never left without one. */
  async revoke(emailInput: string): Promise<void> {
    const email = parseEmail(emailInput);
    await db.$transaction(async (tx) => {
      const user = await findUser(tx, email);
      if (user.role !== "ADMIN") throw new AppError("NOT_FOUND", `${email} is not an admin.`);
      const others = await tx.user.count({ where: { role: "ADMIN", id: { not: user.id } } });
      if (others === 0) {
        throw new AppError("CONFLICT", `${email} is the only admin. Make someone else an admin first.`);
      }
      await tx.user.update({ where: { id: user.id }, data: { role: "CUSTOMER" } });
      await signOutEverywhere(tx, user.id);
      await recordAudit(tx, {
        actorId: user.id,
        action: "user.revokeAdmin",
        entity: "user",
        entityId: user.id,
        diff: { role: { from: "ADMIN", to: "CUSTOMER" }, via: "admin command" },
      });
    });
  },

  /**
   * For a lost or replaced phone: removes the authenticator and signs the person out. On their next visit to
   * /admin they sign in with the email code and set up a new authenticator.
   */
  async resetTwoFactor(emailInput: string): Promise<void> {
    const email = parseEmail(emailInput);
    await db.$transaction(async (tx) => {
      const user = await findUser(tx, email);
      await tx.twoFactor.deleteMany({ where: { userId: user.id } });
      await tx.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false } });
      await signOutEverywhere(tx, user.id);
      await recordAudit(tx, {
        actorId: user.id,
        action: "user.resetTwoFactor",
        entity: "user",
        entityId: user.id,
        diff: { via: "admin command" },
      });
    });
  },

  async list(): Promise<AdminAccount[]> {
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select: { email: true, name: true, twoFactorEnabled: true, createdAt: true },
    });
    return admins.map(({ createdAt, ...admin }) => ({ ...admin, since: createdAt }));
  },
};
