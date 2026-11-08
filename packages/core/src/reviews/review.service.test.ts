import { db, type OrderStatus } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { createProduct, createUser, createVariant, resetDatabase } from "../../test/factories";
import { reviewService } from "./review.service";

// specs/reviews.md, against the test database.

let orderSeq = 0;

/** An order row for `userId` with one line (test data only: status changes in the app go through order-state.ts). */
async function orderOf(userId: string, variantId: string, status: OrderStatus, variantLabel = "Black / M") {
  return db.order.create({
    data: {
      orderNumber: `VZ-REVIEW-${orderSeq++}`,
      userId,
      status,
      paymentStatus: status === "DELIVERED" ? "COD_COLLECTED" : "COD_DUE",
      paymentMethod: "COD",
      subtotalPaisa: 450_000,
      shippingPaisa: 0,
      totalPaisa: 450_000,
      shippingZone: "KATHMANDU_VALLEY",
      addressSnapshot: {},
      customerEmail: "customer@example.com",
      deliveredAt: status === "DELIVERED" ? new Date() : null,
      items: {
        create: [
          {
            variantId,
            productName: "Linen Overshirt",
            productSlug: "linen-overshirt",
            sku: "SKU",
            variantLabel,
            unitPricePaisa: 450_000,
            quantity: 1,
          },
        ],
      },
    },
  });
}

async function setup() {
  const customer = await createUser();
  await db.user.update({ where: { id: customer.id }, data: { name: "Asha Gurung" } });
  const product = await createProduct({ name: "Linen Overshirt" });
  const variant = await createVariant({ productId: product.id });
  return { customer, product, variant };
}

const review = (productId: string, rating = 5) => ({
  productId,
  rating,
  title: "Lovely",
  body: "Soft linen.",
});

describe("reviewService", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("lets a customer review a product delivered to them, with what they received", async () => {
    const { customer, product, variant } = await setup();
    await orderOf(customer.id, variant.id, "DELIVERED");

    await reviewService.save(customer.id, review(product.id, 4));

    expect(await reviewService.listForProduct(product.id)).toMatchObject([
      { rating: 4, title: "Lovely", body: "Soft linen.", variantLabel: "Black / M", authorName: "Asha" },
    ]);
    expect(await reviewService.summary(product.id)).toEqual({ count: 1, average: 4 });
  });

  it("refuses a review before the order is delivered", async () => {
    const { customer, product, variant } = await setup();
    await orderOf(customer.id, variant.id, "SHIPPED");

    await expect(reviewService.save(customer.id, review(product.id))).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect((await reviewService.forCustomer(customer.id, product.slug))?.canReview).toBe(false);
  });

  it("refuses someone else's delivered order", async () => {
    const { product, variant } = await setup();
    const other = await createUser();
    const stranger = await createUser();
    await orderOf(other.id, variant.id, "DELIVERED");

    await expect(reviewService.save(stranger.id, review(product.id))).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("keeps one review per customer and product: saving again edits it", async () => {
    const { customer, product, variant } = await setup();
    await orderOf(customer.id, variant.id, "DELIVERED");

    await reviewService.save(customer.id, review(product.id, 2));
    await reviewService.save(customer.id, { ...review(product.id, 5), title: "Better after a wash" });

    expect(await db.review.count()).toBe(1);
    expect((await reviewService.forCustomer(customer.id, product.slug))?.review).toEqual({
      rating: 5,
      title: "Better after a wash",
      body: "Soft linen.",
    });
  });

  it("averages visible reviews to one decimal; a hidden one leaves the shop and stays hidden after an edit", async () => {
    const { product, variant } = await setup();
    const admin = await createUser({ role: "ADMIN" });
    const ratings = [5, 4, 4];
    const ids: string[] = [];
    for (const rating of ratings) {
      const customer = await createUser();
      await orderOf(customer.id, variant.id, "DELIVERED");
      ids.push((await reviewService.save(customer.id, review(product.id, rating))).id);
    }
    expect(await reviewService.summary(product.id)).toEqual({ count: 3, average: 4.3 });

    await reviewService.setHidden(admin.id, { reviewId: ids[0]!, hidden: true });

    expect(await reviewService.summary(product.id)).toEqual({ count: 2, average: 4 });
    expect(await reviewService.listForProduct(product.id)).toHaveLength(2);
    expect(await db.auditLog.count({ where: { action: "review.hide", entityId: ids[0]! } })).toBe(1);

    const hiddenOwner = await db.review.findUniqueOrThrow({
      where: { id: ids[0]! },
      select: { userId: true },
    });
    await reviewService.save(hiddenOwner.userId, review(product.id, 5));
    expect(await reviewService.summary(product.id)).toEqual({ count: 2, average: 4 });

    await reviewService.setHidden(admin.id, { reviewId: ids[0]!, hidden: false });
    expect((await reviewService.summary(product.id)).count).toBe(3);
  });

  it("lists every review for the admin, filtered by shown or hidden", async () => {
    const { customer, product, variant } = await setup();
    const admin = await createUser({ role: "ADMIN" });
    await orderOf(customer.id, variant.id, "DELIVERED");
    const { id } = await reviewService.save(customer.id, review(product.id));
    await reviewService.setHidden(admin.id, { reviewId: id, hidden: true });

    expect((await reviewService.listForAdmin({ page: 1 })).total).toBe(1);
    expect((await reviewService.listForAdmin({ status: "shown", page: 1 })).total).toBe(0);
    const hidden = await reviewService.listForAdmin({ status: "hidden", page: 1 });
    expect(hidden.rows[0]).toMatchObject({
      product: { name: "Linen Overshirt" },
      user: { name: "Asha Gurung" },
    });
  });
});
