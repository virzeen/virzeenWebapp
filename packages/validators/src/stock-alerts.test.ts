import { describe, expect, it } from "vitest";
import { stockAlertSchema } from "./stock-alerts";

describe("stockAlertSchema", () => {
  it("accepts a variant id", () => {
    expect(stockAlertSchema.parse({ variantId: "ckvariant0001" })).toEqual({ variantId: "ckvariant0001" });
  });

  it("refuses a missing or malformed id and extra fields", () => {
    expect(stockAlertSchema.safeParse({}).success).toBe(false);
    expect(stockAlertSchema.safeParse({ variantId: "NOT A ID" }).success).toBe(false);
    expect(stockAlertSchema.safeParse({ variantId: "ckvariant0001", userId: "someone" }).success).toBe(false);
  });
});
