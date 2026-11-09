import "server-only";
import { db, type PaymentStatus } from "@virzeen/db";
import { LOW_STOCK_THRESHOLD } from "@virzeen/validators/limits";
import { variantLabelOf } from "../cart/cart-summary";

// The admin dashboard's "Low stock" and "Best sellers" (specs/admin-stock-insights.md). Reads only.

/** Orders that count as sold: paid online, or cash on delivery due or collected (never cancelled or refunded). */
const SOLD_PAYMENTS: PaymentStatus[] = ["PAID", "COD_DUE", "COD_COLLECTED"];

export type LowStockRow = {
  variantId: string;
  productId: string;
  productName: string;
  /** "Black / M"; "One size" when the product has neither. */
  label: string;
  stock: number;
};

export type BestSellerRow = {
  productId: string;
  productName: string;
  unitsSold: number;
  salesPaisa: number;
};

export const stockInsights = {
  /**
   * Sizes for sale that are running out: active variants of published products with `LOW_STOCK_THRESHOLD` or fewer
   * left, sold out first. `total` counts them all; `rows` holds the first `limit`.
   */
  async lowStock(limit = 10): Promise<{ rows: LowStockRow[]; total: number }> {
    const where = {
      isActive: true,
      stock: { lte: LOW_STOCK_THRESHOLD },
      product: { isPublished: true, archivedAt: null },
    };
    const [variants, total] = await Promise.all([
      db.productVariant.findMany({
        where,
        select: {
          id: true,
          size: true,
          color: true,
          stock: true,
          product: { select: { id: true, name: true } },
        },
        orderBy: [{ stock: "asc" }, { product: { name: "asc" } }, { sortOrder: "asc" }, { id: "asc" }],
        take: limit,
      }),
      db.productVariant.count({ where }),
    ]);
    return {
      total,
      rows: variants.map((v) => ({
        variantId: v.id,
        productId: v.product.id,
        productName: v.product.name,
        label: variantLabelOf(v),
        stock: v.stock,
      })),
    };
  },

  /**
   * The products that sold the most pieces in the last `days` days (by the order's date), with what they brought
   * in at the prices paid. Ties go to the higher sales, then the name.
   */
  async bestSellers({ days = 30, limit = 5, now = new Date() } = {}): Promise<BestSellerRow[]> {
    const since = new Date(now.getTime() - days * 24 * 60 * 60_000);
    const items = await db.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: since },
          status: { not: "CANCELLED" },
          paymentStatus: { in: SOLD_PAYMENTS },
        },
      },
      select: {
        quantity: true,
        unitPricePaisa: true,
        variant: { select: { product: { select: { id: true, name: true } } } },
      },
    });
    const byProduct = new Map<string, BestSellerRow>();
    for (const item of items) {
      const { id, name } = item.variant.product;
      const row = byProduct.get(id) ?? { productId: id, productName: name, unitsSold: 0, salesPaisa: 0 };
      row.unitsSold += item.quantity;
      row.salesPaisa += item.quantity * item.unitPricePaisa;
      byProduct.set(id, row);
    }
    return [...byProduct.values()]
      .sort(
        (a, b) =>
          b.unitsSold - a.unitsSold ||
          b.salesPaisa - a.salesPaisa ||
          a.productName.localeCompare(b.productName),
      )
      .slice(0, limit);
  },
};
