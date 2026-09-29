import { describe, expect, it } from "vitest";
import {
  addressSchema,
  addToCartSchema,
  adminPageSchema,
  ALL_DISTRICTS,
  emailSchema,
  parsePortfolioBody,
  phoneSchema,
  productSchema,
  safeRedirectSchema,
  shopFiltersSchema,
} from "./index";

const VALID_ID = "tz4a98xxat96iws9zmbrgj3a";

const validAddress = {
  fullName: "Asha Shrestha",
  phone: "9812345678",
  province: "Bagmati",
  district: "Lalitpur",
  city: "Lalitpur",
  street: "Jhamsikhel Road",
};

describe("nepal data", () => {
  it("lists all 77 districts exactly once", () => {
    expect(ALL_DISTRICTS).toHaveLength(77);
    expect(new Set(ALL_DISTRICTS).size).toBe(77);
  });
});

describe("phoneSchema", () => {
  it("accepts 10-digit numbers starting with 97 or 98", () => {
    expect(phoneSchema.parse("9712345678")).toBe("9712345678");
    expect(phoneSchema.parse(" 9812345678 ")).toBe("9812345678");
  });

  it("rejects other prefixes and lengths with the content-style message", () => {
    for (const bad of ["9612345678", "981234567", "98123456789", "01-5555555"]) {
      const result = phoneSchema.safeParse(bad);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("Enter a 10-digit mobile number starting with 97 or 98");
    }
  });
});

describe("addressSchema", () => {
  it("accepts a complete Nepali address", () => {
    expect(addressSchema.safeParse(validAddress).success).toBe(true);
  });

  it("rejects a district that is not in the chosen province", () => {
    const result = addressSchema.safeParse({ ...validAddress, district: "Kaski" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["district"]);
  });

  it("rejects unknown fields", () => {
    expect(addressSchema.safeParse({ ...validAddress, userId: "x" }).success).toBe(false);
  });

  it("asks for missing fields using the content-style wording", () => {
    const result = addressSchema.safeParse({ ...validAddress, fullName: "" });
    expect(result.error?.issues[0]?.message).toBe("Enter your full name");
  });
});

describe("addToCartSchema", () => {
  it("rejects a price sent by the client", () => {
    const result = addToCartSchema.safeParse({ variantId: VALID_ID, quantity: 1, pricePaisa: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects quantities outside 1–10", () => {
    for (const quantity of [0, 11, 1.5]) {
      expect(addToCartSchema.safeParse({ variantId: VALID_ID, quantity }).success).toBe(false);
    }
  });
});

describe("emailSchema", () => {
  it("normalises case and whitespace", () => {
    expect(emailSchema.parse("  Asha@Example.COM ")).toBe("asha@example.com");
  });
});

describe("safeRedirectSchema", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirectSchema.parse("/checkout")).toBe("/checkout");
  });

  it("falls back to / for external or protocol-relative urls", () => {
    expect(safeRedirectSchema.parse("https://evil.example")).toBe("/");
    expect(safeRedirectSchema.parse("//evil.example")).toBe("/");
  });
});

describe("shopFiltersSchema", () => {
  it("ignores malformed values instead of throwing", () => {
    const filters = shopFiltersSchema.parse({ category: "Bad Slug!", sort: "cheapest", inStock: "yes" });
    expect(filters).toMatchObject({ category: undefined, sort: "newest", inStock: false });
  });
});

describe("adminPageSchema", () => {
  it("falls back to page 1 for anything the database can't page to", () => {
    expect(adminPageSchema.parse("3")).toBe(3);
    for (const value of [undefined, "0", "-2", "1.5", "abc", "99999999999999999999999"]) {
      expect(adminPageSchema.parse(value)).toBe(1);
    }
  });
});

describe("productSchema", () => {
  const variant = {
    sku: "VZ-LINEN-BLK-M",
    size: "M",
    color: "Black",
    pricePaisa: 450_000,
    stock: 3,
    isActive: true,
  };
  const product = {
    name: "Linen Overshirt",
    slug: "linen-overshirt",
    description: "Relaxed overshirt.",
    benefits: [],
    details: [],
    countryOfOrigin: "",
    categoryId: VALID_ID,
    sizeGuideId: "",
    collectionIds: [],
    isPublished: true,
    images: [{ url: "virzeen/products/abc/front", alt: "Front view" }],
    features: [],
    styles: [],
    shippingPaisa: 15_000,
    variants: [variant],
  };

  it("accepts a valid product", () => {
    expect(productSchema.safeParse(product).success).toBe(true);
  });

  it("requires a shipping price (0 allowed, never negative or blank)", () => {
    expect(productSchema.safeParse({ ...product, shippingPaisa: 0 }).success).toBe(true);
    expect(productSchema.safeParse({ ...product, shippingPaisa: -100 }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, shippingPaisa: Number.NaN }).success).toBe(false);
  });

  it("rejects duplicate SKUs", () => {
    expect(productSchema.safeParse({ ...product, variants: [variant, variant] }).success).toBe(false);
  });

  it("refuses to publish without images", () => {
    expect(productSchema.safeParse({ ...product, images: [] }).success).toBe(false);
  });
});

describe("parsePortfolioBody", () => {
  it("keeps valid blocks and drops invalid ones", () => {
    const body = parsePortfolioBody([
      { type: "text", text: "Hello" },
      { type: "image", url: "https://evil.example/x.png", alt: "x", layout: "full" },
      { type: "video" },
    ]);
    expect(body).toEqual([{ type: "text", text: "Hello" }]);
  });
});
