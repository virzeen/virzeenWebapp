# Spec: Low stock and best sellers on the admin dashboard

**Status:** Built
**Owner approval:** Virzeen founder, 2026-11-08 (launch plan week 4 "admin low-stock alerts and best sellers", "go for it now"); the details below were chosen by Claude and are reviewed in the PR
**Related docs:** `ui/content-style.md` "Admin", `ui/patterns.md` §10

## Goal

The owners see at a glance which sizes are about to sell out (to restock before a size disappears from the shop) and which products sell best (to reorder and feature them).

## User flow

1. An admin opens `/admin`. Under the tiles, "Low stock" and "Best sellers" sit side by side from `lg`, stacked below it (low stock first).
2. Each product name opens its editor, where the stock boxes are.

## Acceptance criteria

- [x] "Low stock" lists active sizes of published, not archived products with 3 or fewer left (`LOW_STOCK_THRESHOLD`, the same number as the shop's "Only {n} left"), sold out first, then by product name; up to 8, with "{n} more sizes are low." and a link to the products list when there are more.
- [x] Sold out shows a danger "Out of stock" badge; otherwise a warning "Only {n} left".
- [x] "Best sellers" lists the 5 products that sold the most pieces in orders placed in the last 30 days, with the pieces and the sales at the prices paid; ties go to the higher sales.
- [x] Only orders paid online or with cash on delivery due or collected count; cancelled, unpaid, failed and refunded ones don't.
- [x] Empty: "Every size has more than 3 left." / "No sales in the last 30 days."

## Out of scope

- Emails or notifications about low stock (Resend's free plan allows 100 emails a day; the dashboard is enough for two owners).
- A low-stock filter on the products list, and per-day charts.

## UI

- `LowStockSection`, `BestSellersSection` (`client/features/admin/dashboard-stock.tsx`, Server Components) with `DataTable`, `Badge`, `Link`, `Price`, `EmptyState`. No new primitive.

## Data & API

- Models: none changed (reads `ProductVariant`, `Order`, `OrderItem`).
- Core: `stockInsights.lowStock(limit)`, `stockInsights.bestSellers({ days, limit, now })`.
- `LOW_STOCK_THRESHOLD` moved to `@virzeen/validators/limits` (zod-free), used by the shop's `StockLabel` and core.

## Tests

- Integration: `stock-insights.test.ts` (threshold, order, total, drafts/archived/inactive skipped; ranking, sales, cancelled/unpaid/refunded/older orders left out).
- E2E: the admin journey checks the "Low stock" table (a sold-out seed size linking to its editor) and the "Best sellers" heading.
