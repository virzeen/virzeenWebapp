import "server-only";
import { db } from "@virzeen/db";
import type { Address } from "@virzeen/validators";
import { AppError } from "../errors";

export const MAX_ADDRESSES = 10;

const addressSelect = {
  id: true,
  fullName: true,
  phone: true,
  province: true,
  district: true,
  city: true,
  street: true,
  landmark: true,
  isDefault: true,
} as const;

export type SavedAddress = {
  id: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  city: string;
  street: string;
  landmark: string | null;
  isDefault: boolean;
};

function toData(address: Address) {
  return {
    fullName: address.fullName,
    phone: address.phone,
    province: address.province,
    district: address.district,
    city: address.city,
    street: address.street,
    landmark: address.landmark ? address.landmark : null,
  };
}

/** Every method takes the signed-in userId; addresses of other users are "not found" (security-policy.md §3). */
export const addressService = {
  async list(userId: string): Promise<SavedAddress[]> {
    return db.address.findMany({
      where: { userId },
      select: addressSelect,
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  },

  async get(userId: string, id: string): Promise<SavedAddress> {
    const address = await db.address.findFirst({ where: { id, userId }, select: addressSelect });
    if (!address) throw new AppError("NOT_FOUND", "Address not found.");
    return address;
  },

  async create(userId: string, address: Address): Promise<SavedAddress> {
    return db.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      if (count >= MAX_ADDRESSES) {
        throw new AppError(
          "CONFLICT",
          `You can save up to ${MAX_ADDRESSES} addresses. Remove one to add another.`,
        );
      }
      const makeDefault = count === 0 || address.isDefault === true;
      if (makeDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.create({
        data: { ...toData(address), userId, isDefault: makeDefault },
        select: addressSelect,
      });
    });
  },

  async update(userId: string, id: string, address: Address): Promise<SavedAddress> {
    return db.$transaction(async (tx) => {
      const owned = await tx.address.findFirst({ where: { id, userId }, select: { isDefault: true } });
      if (!owned) throw new AppError("NOT_FOUND", "Address not found.");
      if (address.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      // The default only moves to another address; it is never switched off, so there is always one.
      return tx.address.update({
        where: { id },
        data: { ...toData(address), isDefault: owned.isDefault || address.isDefault === true },
        select: addressSelect,
      });
    });
  },

  async remove(userId: string, id: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const owned = await tx.address.findFirst({ where: { id, userId }, select: { isDefault: true } });
      if (!owned) throw new AppError("NOT_FOUND", "Address not found.");
      await tx.address.delete({ where: { id } });
      if (owned.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
  },
};
