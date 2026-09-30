// Empties every table of a LOCAL test database (names ending in _test or _e2e) before an e2e run.
// Refuses anything else (CLAUDE.md §5.8). No raw SQL: deletes children first.
import { createDbClient } from "../src/client";

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\/virzeen_(test|e2e)(\?|$)/.test(url)) {
  console.error("Refusing to clear: DATABASE_URL must be a local virzeen_test or virzeen_e2e database.");
  process.exit(1);
}

const db = createDbClient(url);
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
  db.favourite.deleteMany(),
  db.productFeature.deleteMany(),
  db.productImage.deleteMany(),
  db.productVariant.deleteMany(),
  db.productStyle.deleteMany(),
  db.product.deleteMany(),
  db.sizeGuide.deleteMany(),
  db.portfolioProject.deleteMany(),
  db.collection.deleteMany(),
  db.category.deleteMany(),
  db.twoFactor.deleteMany(),
  db.session.deleteMany(),
  db.account.deleteMany(),
  db.verification.deleteMany(),
  db.user.deleteMany(),
]);
await db.$disconnect();
console.log("Cleared local test data.");
