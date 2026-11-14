"use server";

import "server-only";
import {
  addressService,
  interestService,
  memberService,
  referralService,
  settingsService,
} from "@virzeen/core";
import {
  addressIdSchema,
  addressSchema,
  birthdaySchema,
  communicationSchema,
  idSchema,
  interestsSchema,
  profileSchema,
  referralCodeSchema,
  reviewNameSchema,
  shopPreferencesSchema,
} from "@virzeen/validators";
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

/** A new member enters a friend's referral code, before their first order (specs/member-perks.md). */
export async function applyReferralCodeAction(input: unknown) {
  return runAction("applyReferralCode", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    const { code } = referralCodeSchema.parse(input);
    await referralService.applyCode(user.id, code);
    revalidatePath("/account/membership");
    return { applied: true };
  });
}

/** The member saves their birthday, once, for the birthday reward (specs/member-perks.md). */
export async function setBirthdayAction(input: unknown) {
  return runAction("setBirthday", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    const { birthday } = birthdaySchema.parse(input);
    await memberService.setBirthday(user.id, birthday);
    revalidatePath("/account/membership");
    return { saved: true };
  });
}

/** Profile, Interests: the member's categories and collections, replaced by this set (specs/member-area-nike-layout.md). */
export async function saveInterestsAction(input: unknown) {
  return runAction("saveInterests", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    await interestService.save(user.id, interestsSchema.parse(input));
    revalidatePath("/account");
    return { saved: true };
  });
}

/** Settings, Shop preferences. */
export async function saveShopPreferencesAction(input: unknown) {
  return runAction("saveShopPreferences", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    await settingsService.saveShopPreferences(user.id, shopPreferencesSchema.parse(input));
    revalidatePath("/account/settings/shop-preferences");
    return { saved: true };
  });
}

/** Settings, Communication preferences: the marketing email tick. */
export async function saveCommunicationAction(input: unknown) {
  return runAction("saveCommunication", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    await settingsService.saveCommunication(user.id, communicationSchema.parse(input));
    revalidatePath("/account/settings/communication-preferences");
    return { saved: true };
  });
}

/** Settings, Profile visibility: the name a product review shows. */
export async function saveReviewNameAction(input: unknown) {
  return runAction("saveReviewName", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    await settingsService.saveReviewName(user.id, reviewNameSchema.parse(input));
    revalidatePath("/account/settings/profile-visibility");
    return { saved: true };
  });
}
