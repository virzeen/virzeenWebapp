import "server-only";
import type { Prisma } from "@virzeen/db";
import { AppError } from "../errors";

export type StockLine = { variantId: string; quantity: number };

// Lock rows in a stable order so two concurrent orders can't deadlock each other.
const byVariant = (lines: readonly StockLine[]) =>
  [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId));

/**
 * Decrements stock for every line with a conditional update (never read-then-write).
 * Throws OUT_OF_STOCK if any line can't be covered; the caller's transaction then rolls back.
 */
export async function reserveStock(tx: Prisma.TransactionClient, lines: readonly StockLine[]): Promise<void> {
  for (const line of byVariant(lines)) {
    const result = await tx.productVariant.updateMany({
      where: { id: line.variantId, isActive: true, stock: { gte: line.quantity } },
      data: { stock: { decrement: line.quantity } },
    });
    if (result.count === 0) {
      throw new AppError("OUT_OF_STOCK", "Some items just sold out.", {
        meta: { variantId: line.variantId },
      });
    }
  }
}

/** Returns stock for cancelled/expired orders. Runs in the same transaction as the cancellation. */
export async function restoreStock(tx: Prisma.TransactionClient, lines: readonly StockLine[]): Promise<void> {
  for (const line of byVariant(lines)) {
    await tx.productVariant.update({
      where: { id: line.variantId },
      data: { stock: { increment: line.quantity } },
    });
  }
}
