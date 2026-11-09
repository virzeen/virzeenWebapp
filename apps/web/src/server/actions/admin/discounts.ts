"use server";

import "server-only";
import { discountService } from "@virzeen/core";
import { discountCodeSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { runAdminAction } from "./guard";

/** Adds a discount code or edits one (specs/discount-codes.md). Audited in core. */
export async function saveDiscountCodeAction(input: unknown) {
  return runAdminAction("saveDiscountCode", async (admin) => {
    const data = discountCodeSchema.parse(input);
    const saved = await discountService.save(admin.id, data);
    revalidatePath("/admin/discounts");
    return saved;
  });
}
