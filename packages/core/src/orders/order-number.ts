import "server-only";
import type { Prisma } from "@virzeen/db";
import { AppError } from "../errors";

const nepalDay = new Intl.DateTimeFormat("en-US", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Kathmandu",
});

/** YYMMDD in Nepal time (orders placed after midnight NPT belong to the new day). */
export function orderDayKey(now: Date): string {
  const parts = Object.fromEntries(nepalDay.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}${parts.month}${parts.day}`;
}

/** Next order number VZ-YYMMDD-XXXX. Atomic per day via an upsert on the counter row. */
export async function nextOrderNumber(tx: Prisma.TransactionClient, now: Date): Promise<string> {
  const day = orderDayKey(now);
  const counter = await tx.orderNumberCounter.upsert({
    where: { day },
    create: { day, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  });
  if (counter.value > 9999) throw new AppError("INTERNAL", "Daily order number limit reached.");
  return `VZ-${day}-${String(counter.value).padStart(4, "0")}`;
}
