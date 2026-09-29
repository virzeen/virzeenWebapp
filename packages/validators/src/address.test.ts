import { describe, expect, it } from "vitest";
import { addressFormValues, addressSchema, phoneSchema, type SavedAddressFields } from "./address";

// A saved address as /account/addresses receives it: with its id, and null for an empty landmark.
const saved: SavedAddressFields & { id: string } = {
  id: "tz4a98xxat96iws9zmbrgj3a",
  fullName: "Asha Shrestha",
  phone: "9812345678",
  province: "Bagmati",
  district: "Lalitpur",
  city: "Lalitpur",
  street: "Jhamsikhel Road",
  landmark: null,
  isDefault: true,
};

describe("addressFormValues", () => {
  it("turns a saved address into values the strict schema accepts", () => {
    // The edit form used to spread the whole row, so the unknown `id` failed every submit silently.
    expect(addressSchema.safeParse({ ...saved, landmark: "" }).success).toBe(false);

    const result = addressSchema.safeParse(addressFormValues(saved));

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ street: "Jhamsikhel Road", landmark: "", isDefault: true });
  });

  it("keeps a saved landmark", () => {
    expect(addressFormValues({ ...saved, landmark: "Behind the temple" }).landmark).toBe("Behind the temple");
  });
});

describe("phoneSchema normalising", () => {
  it("drops spaces, brackets and hyphens", () => {
    expect(phoneSchema.parse("98123 45678")).toBe("9812345678");
    expect(phoneSchema.parse("981-234-5678")).toBe("9812345678");
    expect(phoneSchema.parse("(981) 2345678")).toBe("9812345678");
  });

  it("drops the +977 or 00977 country code", () => {
    expect(phoneSchema.parse("+977 9812345678")).toBe("9812345678");
    expect(phoneSchema.parse("+977-981-2345678")).toBe("9812345678");
    expect(phoneSchema.parse("009779712345678")).toBe("9712345678");
    expect(phoneSchema.parse("9779812345678")).toBe("9812345678");
  });

  it("keeps a 10-digit number that itself starts with 977", () => {
    expect(phoneSchema.parse("9771234567")).toBe("9771234567");
  });

  it("still rejects numbers that aren't Nepali mobiles", () => {
    for (const bad of ["+977 961234567", "+91 9812345678", "98123 4567", "phone"]) {
      expect(phoneSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("addressSchema district", () => {
  it("asks to choose a district, since it's a select", () => {
    const result = addressSchema.safeParse({ ...addressFormValues(saved), district: "" });
    expect(result.error?.issues.find((issue) => issue.path[0] === "district")?.message).toBe(
      "Choose your district",
    );
  });
});
