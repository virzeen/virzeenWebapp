import { describe, expect, it } from "vitest";
import type { CartView } from "@/server/actions/cart";
import { lineAdded } from "./cart-provider";

type Line = CartView["items"][number];

const line = (variantId: string, quantity: number): Line => ({
  id: `line-${variantId}`,
  variantId,
  productId: `product-${variantId}`,
  color: "Black",
  productName: `Product ${variantId}`,
  productSlug: `product-${variantId}`,
  variantLabel: "Black / M",
  unitPricePaisa: 450000,
  quantity,
  lineTotalPaisa: 450000 * quantity,
  imageUrl: null,
  imageAlt: "",
  maxQuantity: 10,
  isAvailable: true,
});

const cart = (...items: Line[]): CartView => ({
  items,
  subtotalPaisa: items.reduce((sum, item) => sum + item.lineTotalPaisa, 0),
  itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
});

describe("lineAdded", () => {
  it("finds a new line", () => {
    expect(lineAdded(cart(line("a", 1)), cart(line("a", 1), line("b", 1)))?.variantId).toBe("b");
  });

  it("finds a line whose quantity went up", () => {
    expect(lineAdded(cart(line("a", 1), line("b", 1)), cart(line("a", 2), line("b", 1)))?.variantId).toBe(
      "a",
    );
  });

  it("finds the first line of an empty bag", () => {
    expect(lineAdded(cart(), cart(line("a", 1)))?.variantId).toBe("a");
  });

  it("is null when nothing went up", () => {
    expect(lineAdded(cart(line("a", 2)), cart(line("a", 1)))).toBeNull();
  });
});
