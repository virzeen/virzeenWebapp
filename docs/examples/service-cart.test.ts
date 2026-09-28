// packages/core/src/cart/cart.service.test.ts
// Runs against the disposable test database (see docs/testing/testing-strategy.md §2).
import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, createCart, createVariant } from "../../test/factories";
import { cartService, MAX_QTY_PER_LINE } from "./cart.service";

describe("cartService.addItem", () => {
  beforeEach(resetDatabase);

  it("adds a new line for an in-stock variant", async () => {
    const cart = await createCart();
    const variant = await createVariant({ stock: 5, pricePaisa: 250_000 });

    const summary = await cartService.addItem({ cartId: cart.id, variantId: variant.id, quantity: 1 });

    expect(summary.items).toHaveLength(1);
    expect(summary.subtotalPaisa).toBe(250_000);
  });

  it("increases quantity when the variant is already in the cart", async () => {
    const cart = await createCart();
    const variant = await createVariant({ stock: 5 });
    await cartService.addItem({ cartId: cart.id, variantId: variant.id, quantity: 1 });

    const summary = await cartService.addItem({ cartId: cart.id, variantId: variant.id, quantity: 2 });

    expect(summary.items[0]?.quantity).toBe(3);
  });

  it("rejects a quantity above stock with OUT_OF_STOCK", async () => {
    const cart = await createCart();
    const variant = await createVariant({ stock: 2 });

    await expect(
      cartService.addItem({ cartId: cart.id, variantId: variant.id, quantity: 3 }),
    ).rejects.toMatchObject({
      code: "OUT_OF_STOCK",
    });
  });

  it("caps a single line at the per-line limit even with high stock", async () => {
    const cart = await createCart();
    const variant = await createVariant({ stock: 100 });

    await expect(
      cartService.addItem({ cartId: cart.id, variantId: variant.id, quantity: MAX_QTY_PER_LINE + 1 }),
    ).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
  });

  it("rejects variants of archived products with NOT_FOUND", async () => {
    const cart = await createCart();
    const variant = await createVariant({ stock: 5, productArchived: true });

    await expect(
      cartService.addItem({ cartId: cart.id, variantId: variant.id, quantity: 1 }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
