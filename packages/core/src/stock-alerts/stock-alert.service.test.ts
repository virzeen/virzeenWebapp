import { db } from "@virzeen/db";
import { MAX_STOCK_ALERTS } from "@virzeen/validators";
import { beforeEach, describe, expect, it } from "vitest";
import { checkoutFixture, createUser, createVariant, resetDatabase } from "../../test/factories";
import { sentEmails } from "../../test/setup";
import { checkoutService } from "../orders/checkout.service";
import { orderService } from "../orders/orders.service";
import { stockAlertService, variantPath } from "./stock-alert.service";

// "Notify me when it's back" (specs/notify-me.md).

const setStock = (variantId: string, stock: number) =>
  db.productVariant.update({ where: { id: variantId }, data: { stock } });

const backInStockEmails = () => sentEmails.filter((email) => email.subject.endsWith("is back in stock"));

describe("stockAlertService.request / cancel", () => {
  beforeEach(resetDatabase);

  it("saves one waiting request per customer and variant, however often it's asked", async () => {
    const user = await createUser();
    const variant = await createVariant({ stock: 0 });

    await stockAlertService.request(user.id, variant.id);
    await stockAlertService.request(user.id, variant.id);
    await Promise.all([
      stockAlertService.request(user.id, variant.id),
      stockAlertService.request(user.id, variant.id),
    ]);

    expect(await db.stockAlert.count({ where: { userId: user.id } })).toBe(1);
    expect(await stockAlertService.waitingVariantIds(user.id, [variant.id])).toEqual([variant.id]);
  });

  it("refuses a variant in stock, not for sale, or of a product out of the shop", async () => {
    const user = await createUser();
    const inStock = await createVariant({ stock: 2 });
    const inactive = await createVariant({ stock: 0, isActive: false });
    const archived = await createVariant({ stock: 0, productArchived: true });
    const draft = await createVariant({ stock: 0, productPublished: false });

    await expect(stockAlertService.request(user.id, inStock.id)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "It's back in stock. Add it to your bag.",
    });
    for (const variant of [inactive, archived, draft]) {
      await expect(stockAlertService.request(user.id, variant.id)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    }
    expect(await db.stockAlert.count()).toBe(0);
  });

  it(`keeps at most ${MAX_STOCK_ALERTS} waiting requests per customer`, async () => {
    const user = await createUser();
    const variants = [];
    for (let i = 0; i <= MAX_STOCK_ALERTS; i += 1) variants.push(await createVariant({ stock: 0 }));
    for (const variant of variants.slice(0, MAX_STOCK_ALERTS)) {
      await stockAlertService.request(user.id, variant.id);
    }

    await expect(stockAlertService.request(user.id, variants[MAX_STOCK_ALERTS]!.id)).rejects.toMatchObject({
      code: "CONFLICT",
      message: `You can wait for up to ${MAX_STOCK_ALERTS} sizes. Remove one to add another.`,
    });

    // One removed makes room again.
    await stockAlertService.cancel(user.id, variants[0]!.id);
    await stockAlertService.request(user.id, variants[MAX_STOCK_ALERTS]!.id);
  });

  it("cancels only the customer's own waiting request", async () => {
    const [asha, bina] = [await createUser(), await createUser()];
    const variant = await createVariant({ stock: 0 });
    await stockAlertService.request(asha.id, variant.id);
    await stockAlertService.request(bina.id, variant.id);

    await stockAlertService.cancel(asha.id, variant.id);
    await stockAlertService.cancel(asha.id, variant.id); // twice: harmless

    expect(await stockAlertService.waitingVariantIds(asha.id, [variant.id])).toEqual([]);
    expect(await stockAlertService.waitingVariantIds(bina.id, [variant.id])).toEqual([variant.id]);
  });
});

describe("stockAlertService.listForUser / waitingCounts", () => {
  beforeEach(resetDatabase);

  it("lists waiting requests newest first, with the style, size, photo and link details", async () => {
    const user = await createUser();
    const first = await createVariant({ stock: 0, color: "Black", size: "M" });
    const second = await createVariant({ stock: 0, color: "White", size: "L" });
    const gone = await createVariant({ stock: 0 });
    await stockAlertService.request(user.id, first.id);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await stockAlertService.request(user.id, second.id);
    await stockAlertService.request(user.id, gone.id);
    await db.productVariant.update({ where: { id: gone.id }, data: { isActive: false } });

    const items = await stockAlertService.listForUser(user.id);

    expect(items.map((item) => item.variantId)).toEqual([second.id, first.id]);
    expect(items[1]).toMatchObject({
      productName: "Linen Overshirt",
      color: "Black",
      size: "M",
      variantLabel: "Black / M",
      imageUrl: "/placeholder/product-1.jpg",
    });
  });

  it("counts waiting customers per variant of one product, leaving out ones already emailed", async () => {
    const variant = await createVariant({ stock: 0 });
    const other = await createVariant({ stock: 0, productId: variant.productId, size: "L" });
    const [a, b, c] = [await createUser(), await createUser(), await createUser()];
    await stockAlertService.request(a.id, variant.id);
    await stockAlertService.request(b.id, variant.id);
    await stockAlertService.request(c.id, other.id);
    await db.stockAlert.updateMany({ where: { userId: c.id }, data: { notifiedAt: new Date() } });

    expect(await stockAlertService.waitingCounts(variant.productId)).toEqual({ [variant.id]: 2 });
  });
});

describe("stockAlertService.notifyAvailable", () => {
  beforeEach(resetDatabase);

  it("sends nothing while the variant is still sold out", async () => {
    const user = await createUser();
    const variant = await createVariant({ stock: 0 });
    await stockAlertService.request(user.id, variant.id);

    expect(await stockAlertService.notifyAvailable([variant.id])).toBe(0);
    expect(sentEmails).toHaveLength(0);
  });

  it("emails each waiting customer once when it's back, with a link to that style and size", async () => {
    const [asha, bina] = [await createUser(), await createUser()];
    const variant = await createVariant({ stock: 0, color: "Black", size: "M" });
    await stockAlertService.request(asha.id, variant.id);
    await stockAlertService.request(bina.id, variant.id);
    await setStock(variant.id, 3);

    const counts = await Promise.all([
      stockAlertService.notifyAvailable([variant.id]),
      stockAlertService.notifyAvailable([variant.id]),
    ]);
    await stockAlertService.notifyAvailable([variant.id]);

    expect(counts[0] + counts[1]).toBe(2);
    const emails = backInStockEmails();
    expect(emails.map((email) => email.to).sort()).toEqual([asha.email, bina.email].sort());
    const product = await db.product.findUniqueOrThrow({ where: { id: variant.productId } });
    expect(emails[0]?.text).toContain(`https://virzeen.test/product/${product.slug}?style=Black&size=M`);
    expect(await db.stockAlert.count({ where: { notifiedAt: null } })).toBe(0);
    expect(await stockAlertService.listForUser(asha.id)).toEqual([]);
  });

  it("starts a new wait when asked again after the email", async () => {
    const user = await createUser();
    const variant = await createVariant({ stock: 0 });
    await stockAlertService.request(user.id, variant.id);
    await setStock(variant.id, 1);
    await stockAlertService.notifyAvailable([variant.id]);
    await setStock(variant.id, 0);

    await stockAlertService.request(user.id, variant.id);
    await setStock(variant.id, 2);
    await stockAlertService.notifyAvailable([variant.id]);

    expect(backInStockEmails()).toHaveLength(2);
  });

  it("drops requests for sizes no longer sold or products out of the shop, without an email", async () => {
    const user = await createUser();
    const removed = await createVariant({ stock: 0 });
    const archived = await createVariant({ stock: 0 });
    await stockAlertService.request(user.id, removed.id);
    await stockAlertService.request(user.id, archived.id);
    await db.productVariant.update({ where: { id: removed.id }, data: { isActive: false, stock: 4 } });
    await db.product.update({ where: { id: archived.productId }, data: { archivedAt: new Date() } });
    await setStock(archived.id, 4);

    await stockAlertService.notifyAvailable([removed.id]);
    await stockAlertService.notifyProduct(archived.productId);

    expect(sentEmails).toHaveLength(0);
    expect(await db.stockAlert.count()).toBe(0);
  });

  it("emails waiting customers when a cancelled order returns the last pieces", async () => {
    const waiting = await createUser();
    const fixture = await checkoutFixture({ stock: 1, quantity: 1 });
    const { orderNumber } = await checkoutService.placeOrder({
      userId: fixture.user.id,
      customerEmail: fixture.user.email,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      paymentMethod: "COD",
    });
    await stockAlertService.request(waiting.id, fixture.variant.id);
    const admin = await createUser({ role: "ADMIN" });

    await orderService.advance(admin.id, { orderNumber, to: "CANCELLED", reason: "Customer asked" });

    expect(backInStockEmails().map((email) => email.to)).toEqual([waiting.email]);
  });
});

describe("variantPath", () => {
  it("opens the style and size, encoded, and leaves out what the variant hasn't got", () => {
    expect(variantPath("tee", "Black / White", "XL")).toBe("/product/tee?style=Black+%2F+White&size=XL");
    expect(variantPath("vase", null, null)).toBe("/product/vase");
  });
});
