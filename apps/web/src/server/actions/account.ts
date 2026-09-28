"use server";

import "server-only";
import { addressService } from "@virzeen/core";
import { addressIdSchema, addressSchema, idSchema, profileSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { runAction } from "@/server/actions/result";
import { auth } from "@/server/auth/auth";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";

const saveAddressInput = z.strictObject({ id: idSchema.optional(), address: addressSchema });

/** Create or update one of the signed-in customer's addresses. */
export async function saveAddressAction(input: unknown) {
  return runAction("saveAddress", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    const { id, address } = saveAddressInput.parse(input);
    const saved = id
      ? await addressService.update(user.id, id, address)
      : await addressService.create(user.id, address);
    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return saved;
  });
}

export async function deleteAddressAction(input: unknown) {
  return runAction("deleteAddress", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    const { id } = addressIdSchema.parse(input);
    await addressService.remove(user.id, id);
    revalidatePath("/account/addresses");
    return { id };
  });
}

export async function updateProfileAction(input: unknown) {
  return runAction("updateProfile", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    const { name } = profileSchema.parse(input);
    await auth.api.updateUser({ body: { name }, headers: await headers() });
    revalidatePath("/account", "layout");
    return { name };
  });
}
