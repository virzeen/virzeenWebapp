import "server-only";
import type { Prisma } from "@virzeen/db";

export type AuditEntry = {
  actorId: string;
  /** Verb in the form "<entity>.<action>", e.g. "product.save", "order.ship". */
  action: string;
  entity: string;
  entityId: string;
  diff?: Prisma.InputJsonValue;
};

/** Records an admin action (security-policy.md §9). Call inside the same transaction as the change. */
export async function recordAudit(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      ...(entry.diff === undefined ? {} : { diff: entry.diff }),
    },
  });
}
