import { expect, test } from "@playwright/test";
import { createDbClient } from "@virzeen/db";
import { E2E_DATABASE_URL } from "./env";
import { addToBag, checkoutWith, completeEmailSignIn, uniqueEmail } from "./helpers";

// specs/reviews.md: only a customer whose order was delivered can review the product.

/**
 * Test set-up in the throwaway e2e database: the order as the admin's "Delivered" leaves it. The admin journey
 * covers marking orders in the app; here it would add a two-factor sign-in for nothing.
 */
async function markDelivered(orderNumber: string) {
  const db = createDbClient(E2E_DATABASE_URL);
  try {
    await db.order.update({
      where: { orderNumber },
      data: { status: "DELIVERED", paymentStatus: "COD_COLLECTED", deliveredAt: new Date() },
    });
  } finally {
    await db.$disconnect();
  }
}

test("a customer reviews a product once it has been delivered", async ({ page }) => {
  await addToBag(page, "logo-cap");
  await page.goto("/login?next=/checkout");
  await completeEmailSignIn(page, uniqueEmail("review"));

  // Before delivery the review page explains why there's no form.
  await page.goto("/account/reviews/logo-cap");
  await expect(page.getByText("You can review this once it has been delivered to you.")).toBeVisible();

  await checkoutWith(page, /Cash on delivery/);
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?order=VZ-\d{6}-\d{4}/);
  const orderNumber = new URL(page.url()).searchParams.get("order") ?? "";
  await markDelivered(orderNumber);

  // The delivered order links each line to its review page.
  await page.goto(`/account/orders/${orderNumber}`);
  await page.getByRole("link", { name: "Write a review of Logo Cap" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Write a review" })).toBeVisible();

  // Stars are required.
  await page.getByRole("button", { name: "Submit review" }).click();
  await expect(page.getByText("Choose a rating")).toBeVisible();

  await page.getByRole("radio", { name: "4 stars" }).click();
  await page.getByLabel("Title").fill("Fits well");
  await page.getByLabel("Your review").fill("Soft cotton, the strap adjusts easily.");
  await page.getByRole("button", { name: "Submit review" }).click();

  await expect(page).toHaveURL(/\/product\/logo-cap#reviews$/);
  const reviews = page.getByRole("region", { name: "Reviews" });
  await expect(reviews.getByRole("heading", { level: 3, name: "Fits well" })).toBeVisible();
  await expect(reviews.getByText("Soft cotton, the strap adjusts easily.")).toBeVisible();
  await expect(reviews.getByRole("img", { name: "Rated 4 out of 5" }).first()).toBeVisible();
  await expect(reviews.getByText(/Verified buyer/)).toBeVisible();
});
