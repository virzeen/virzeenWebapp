"use server";

import "server-only";
import { memberService, walletService } from "@virzeen/core";
import { adminWalletSchema, endPassSchema, grantPassSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { runAdminAction } from "./guard";

/** Gives a customer the Monochrome Pass for 6 or 12 months, or extends a running one. Audited in core. */
export async function grantPassAction(input: unknown) {
  return runAdminAction("grantPass", async (admin) => {
    const { userId, months } = grantPassSchema.parse(input);
    const result = await memberService.adminGrantPass(admin.id, userId, months);
    revalidatePath("/admin/customers");
    return { passEndsAt: result.passEndsAt.toISOString() };
  });
}

/** Ends a customer's Pass now. Audited in core. */
export async function endPassAction(input: unknown) {
  return runAdminAction("endPass", async (admin) => {
    const { userId } = endPassSchema.parse(input);
    await memberService.adminEndPass(admin.id, userId);
    revalidatePath("/admin/customers");
    return { ended: true };
  });
}

/** Adds credit (whole rupees) or points to a customer. Audited in core. */
export async function addWalletAction(input: unknown) {
  return runAdminAction("addWallet", async (admin) => {
    const { userId, kind, amount, reason } = adminWalletSchema.parse(input);
    await walletService.adminAdd(admin.id, {
      userId,
      kind,
      amount: kind === "CREDIT" ? amount * 100 : amount,
      reason,
    });
    revalidatePath("/admin/customers");
    return { added: true };
  });
}
