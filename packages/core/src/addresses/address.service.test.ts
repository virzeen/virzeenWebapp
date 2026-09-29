import { db } from "@virzeen/db";
import { addressSchema } from "@virzeen/validators";
import { beforeEach, describe, expect, it } from "vitest";
import { createAddress, createUser, resetDatabase } from "../../test/factories";
import { addressService } from "./address.service";

const edited = (overrides: Record<string, unknown> = {}) =>
  addressSchema.parse({
    fullName: "Asha Shrestha",
    phone: "+977 98123 45678",
    province: "Bagmati",
    district: "Lalitpur",
    city: "Lalitpur",
    street: "Jhamsikhel Road 14",
    landmark: "",
    ...overrides,
  });

describe("addressService.update", () => {
  beforeEach(resetDatabase);

  it("saves the edited fields, with the phone number normalised", async () => {
    const user = await createUser();
    const address = await createAddress(user.id);

    const saved = await addressService.update(user.id, address.id, edited({ isDefault: true }));

    expect(saved).toMatchObject({ street: "Jhamsikhel Road 14", phone: "9812345678", landmark: null });
  });

  it("keeps the current default when the form sends isDefault false", async () => {
    const user = await createUser();
    const address = await createAddress(user.id);

    const saved = await addressService.update(user.id, address.id, edited({ isDefault: false }));

    expect(saved.isDefault).toBe(true);
  });

  it("moves the default to the edited address when asked", async () => {
    const user = await createUser();
    await createAddress(user.id);
    const second = await addressService.create(user.id, edited());
    expect(second.isDefault).toBe(false);

    await addressService.update(user.id, second.id, edited({ isDefault: true }));

    const defaults = await db.address.findMany({ where: { userId: user.id, isDefault: true } });
    expect(defaults.map((a) => a.id)).toEqual([second.id]);
  });

  it("treats another customer's address as not found", async () => {
    const owner = await createUser();
    const other = await createUser();
    const address = await createAddress(owner.id);

    await expect(addressService.update(other.id, address.id, edited())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
