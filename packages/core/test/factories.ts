import { randomBytes } from "node:crypto";
import { db } from "@virzeen/db";

// Test data builders for the disposable test database (testing-strategy.md §5).

let sequence = 0;
const next = () => `${Date.now().toString(36)}${(sequence++).toString(36)}`;
const cuidLike = () => `t${randomBytes(12).toString("hex").slice(0, 23)}`;

/** Empties every table, children first. No raw SQL (data-rules.md §1). */
export async function resetDatabase() {
  await db.$transaction([
    db.orderEvent.deleteMany(),
    db.payment.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.orderNumberCounter.deleteMany(),
    db.cartItem.deleteMany(),
    db.cart.deleteMany(),
    db.auditLog.deleteMany(),
    db.address.deleteMany(),
    db.productImage.deleteMany(),
    db.productVariant.deleteMany(),
    db.product.deleteMany(),
    db.portfolioProject.deleteMany(),
    db.collection.deleteMany(),
    db.category.deleteMany(),
    db.twoFactor.deleteMany(),
    db.session.deleteMany(),
    db.account.deleteMany(),
    db.verification.deleteMany(),
    db.user.deleteMany(),
  ]);
}

export async function createUser(overrides: { role?: "CUSTOMER" | "ADMIN"; email?: string } = {}) {
  return db.user.create({
    data: {
      id: cuidLike(),
      name: "Asha Shrestha",
      email: overrides.email ?? `user-${next()}@example.com`,
      emailVerified: true,
      role: overrides.role ?? "CUSTOMER",
    },
  });
}

export async function createCategory() {
  const slug = `cat-${next()}`;
  return db.category.create({ data: { slug, name: `Category ${slug}` } });
}

type VariantOptions = {
  stock?: number;
  pricePaisa?: number;
  size?: string;
  color?: string;
  isActive?: boolean;
  productArchived?: boolean;
  productPublished?: boolean;
  productId?: string;
};

export async function createProduct(
  options: { published?: boolean; archived?: boolean; name?: string } = {},
) {
  const category = await createCategory();
  const slug = `product-${next()}`;
  return db.product.create({
    data: {
      slug,
      name: options.name ?? "Linen Overshirt",
      description: "Relaxed overshirt.",
      categoryId: category.id,
      isPublished: options.published ?? true,
      publishedAt: new Date(),
      archivedAt: options.archived ? new Date() : null,
      images: { create: [{ url: "/placeholder/product-1.jpg", alt: "Front view", sortOrder: 0 }] },
    },
  });
}

export async function createVariant(options: VariantOptions = {}) {
  const productId =
    options.productId ??
    (
      await createProduct({
        published: options.productPublished ?? true,
        archived: options.productArchived ?? false,
      })
    ).id;
  const price = options.pricePaisa ?? 450_000;
  const variant = await db.productVariant.create({
    data: {
      productId,
      sku: `VZ-TEST-${next().toUpperCase()}`,
      size: options.size ?? "M",
      color: options.color ?? "Black",
      pricePaisa: price,
      stock: options.stock ?? 5,
      isActive: options.isActive ?? true,
    },
  });
  await db.product.update({ where: { id: productId }, data: { fromPricePaisa: price } });
  return variant;
}

export async function createCart(userId?: string) {
  return db.cart.create({
    data: userId
      ? { userId, expiresAt: new Date(Date.now() + 86_400_000) }
      : { guestToken: randomBytes(16).toString("hex"), expiresAt: new Date(Date.now() + 86_400_000) },
  });
}

export async function addToCart(cartId: string, variantId: string, quantity = 1) {
  const variant = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  return db.cartItem.create({ data: { cartId, variantId, quantity, unitPricePaisa: variant.pricePaisa } });
}

export async function createAddress(userId: string, district = "Lalitpur", province = "Bagmati") {
  return db.address.create({
    data: {
      userId,
      fullName: "Asha Shrestha",
      phone: "9812345678",
      province,
      district,
      city: district,
      street: "Jhamsikhel Road",
      isDefault: true,
    },
  });
}

/** A signed-in customer with an address and a bag holding `quantity` of one variant. */
export async function checkoutFixture(
  options: { stock?: number; pricePaisa?: number; quantity?: number; district?: string } = {},
) {
  const user = await createUser();
  const address = await createAddress(user.id, options.district ?? "Lalitpur");
  const variant = await createVariant({
    stock: options.stock ?? 5,
    pricePaisa: options.pricePaisa ?? 450_000,
  });
  const cart = await createCart(user.id);
  await addToCart(cart.id, variant.id, options.quantity ?? 1);
  return { user, address, variant, cart };
}
