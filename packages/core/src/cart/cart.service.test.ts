import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { addToCart, createCart, createUser, createVariant, resetDatabase } from "../../test/factories";
import { cartService, MAX_QTY_PER_LINE } from "./cart.service";

describe("cartService.addItem", () => {
  beforeEach(resetDatabase);

  it("adds a new line for an in-stock variant", async () => {
    const cart = await createCart();
    const variant = await createVariant({ stock: 5, pricePaisa: 250_000 });

    const summary = await cartService.addItem({ cartId: cart.id, variantId: variant.id, quantity: 1 });

    expect(summary.items).toHaveLength(1);
    expect(summary.subtotalPaisa).toBe(250_000);
    expect(summary.itemCount).toBe(1);
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

describe("cartService.updateQuantity / removeItem", () => {
  beforeEach(resetDatabase);

  it("won't touch a line that belongs to another cart", async () => {
    const mine = await createCart();
    const theirs = await createCart();
    const variant = await createVariant();
    const line = await addToCart(theirs.id, variant.id);

    await expect(
      cartService.updateQuantity({ cartId: mine.id, itemId: line.id, quantity: 2 }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(cartService.removeItem({ cartId: mine.id, itemId: line.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns the removed line so it can be restored with Undo", async () => {
    const cart = await createCart();
    const variant = await createVariant();
    const line = await addToCart(cart.id, variant.id, 2);

    const result = await cartService.removeItem({ cartId: cart.id, itemId: line.id });

    expect(result.removed).toEqual({ variantId: variant.id, quantity: 2 });
    expect(result.cart.items).toHaveLength(0);
  });
});

describe("cartService.mergeGuestCart", () => {
  beforeEach(resetDatabase);

  it("moves guest lines into the user's cart, capped by stock, and deletes the guest cart", async () => {
    const user = await createUser();
    const userCart = await createCart(user.id);
    const guestCart = await createCart();
    const shared = await createVariant({ stock: 3 });
    const guestOnly = await createVariant({ stock: 5 });
    await addToCart(userCart.id, shared.id, 2);
    await addToCart(guestCart.id, shared.id, 2);
    await addToCart(guestCart.id, guestOnly.id, 1);

    await cartService.mergeGuestCart({ guestToken: guestCart.guestToken as string, userId: user.id });

    const summary = await cartService.getSummary({ userId: user.id });
    const quantities = Object.fromEntries(summary.items.map((item) => [item.variantId, item.quantity]));
    expect(quantities).toEqual({ [shared.id]: 3, [guestOnly.id]: 1 });
    expect(await db.cart.findUnique({ where: { id: guestCart.id } })).toBeNull();
  });

  it("merges exactly once when two requests merge the same guest bag at the same time", async () => {
    const user = await createUser();
    const guestCart = await createCart();
    const variant = await createVariant({ stock: 10 });
    await addToCart(guestCart.id, variant.id, 2);
    const input = { guestToken: guestCart.guestToken as string, userId: user.id };

    await expect(
      Promise.all([cartService.mergeGuestCart(input), cartService.mergeGuestCart(input)]),
    ).resolves.toBeDefined();

    const summary = await cartService.getSummary({ userId: user.id });
    expect(summary.items.map((item) => item.quantity)).toEqual([2]);
  });

  it("is a no-op when the guest cart is already gone", async () => {
    const user = await createUser();
    await expect(
      cartService.mergeGuestCart({ guestToken: "missing", userId: user.id }),
    ).resolves.toBeUndefined();
  });
});

describe("cartService.refreshForCheckout", () => {
  beforeEach(resetDatabase);

  it("updates changed prices and reports PRICE_CHANGED", async () => {
    const cart = await createCart();
    const variant = await createVariant({ pricePaisa: 100_000 });
    await addToCart(cart.id, variant.id);
    await db.productVariant.update({ where: { id: variant.id }, data: { pricePaisa: 120_000 } });

    await expect(cartService.refreshForCheckout(cart.id)).resolves.toEqual({
      changed: "PRICE_CHANGED",
      isEmpty: false,
    });
    await expect(cartService.refreshForCheckout(cart.id)).resolves.toEqual({ changed: null, isEmpty: false });
  });

  it("drops sold-out lines and caps quantities, reporting OUT_OF_STOCK", async () => {
    const cart = await createCart();
    const soldOut = await createVariant({ stock: 0 });
    const lowStock = await createVariant({ stock: 1 });
    await addToCart(cart.id, soldOut.id, 1);
    await addToCart(cart.id, lowStock.id, 3);

    await expect(cartService.refreshForCheckout(cart.id)).resolves.toEqual({
      changed: "OUT_OF_STOCK",
      isEmpty: false,
    });
    const items = await db.cartItem.findMany({ where: { cartId: cart.id } });
    expect(items).toMatchObject([{ variantId: lowStock.id, quantity: 1 }]);
  });
});
