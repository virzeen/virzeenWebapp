import { expect, test } from "@playwright/test";
import { addToBag, checkoutWith, completeEmailSignIn, readEmail, uniqueEmail } from "./helpers";

// Journeys 2–5 (testing-strategy.md §2). eSewa and Khalti are the mock providers from mock-providers.mjs.

test("guest bag is merged into the account at sign-in", async ({ page }) => {
  await addToBag(page, "structured-tote");
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);

  await completeEmailSignIn(page, uniqueEmail("merge"));
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible();
  await expect(page.getByText("Structured Tote")).toBeVisible();
});

test("checkout with cash on delivery confirms the order and shows it in the account", async ({ page }) => {
  const email = uniqueEmail("cod");
  await addToBag(page, "monochrome-oversized-tee", { color: "Black", size: "M" });
  await page.goto("/login?next=/checkout");
  await completeEmailSignIn(page, email);
  await checkoutWith(page, /Cash on delivery/);

  // Shipping is included in product prices, so checkout adds nothing and says so.
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,450");
  await expect(page.getByRole("complementary", { name: "Order summary" })).toContainText("ShippingFree");
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page).toHaveURL(/\/checkout\/success\?order=VZ-\d{6}-\d{4}/);
  const orderNumber = new URL(page.url()).searchParams.get("order") ?? "";
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Thank you — your order ${orderNumber} is confirmed.`,
  );
  expect(await readEmail(email, /confirmed/)).toContain(orderNumber);

  await page.goto("/account/orders");
  await expect(page.getByRole("link", { name: new RegExp(orderNumber) })).toBeVisible();
  await expect(page.getByTestId("open-bag")).toHaveAccessibleName("Open bag");
});

test("checkout with eSewa verifies the payment and marks the order paid", async ({ page }) => {
  await addToBag(page, "crew-socks-three-pack", { color: "White", size: "L/XL" });
  await page.goto("/login?next=/checkout");
  await completeEmailSignIn(page, uniqueEmail("esewa"));
  await checkoutWith(page, /eSewa/);

  await page.getByRole("button", { name: "Continue to eSewa" }).click();

  // mock eSewa → /api/payments/esewa/success → signature + status API → success page
  await expect(page).toHaveURL(/\/checkout\/success\?order=VZ-/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("is confirmed");
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
});

test("checkout with Khalti verifies the payment and marks the order paid", async ({ page }) => {
  await addToBag(page, "silk-scarf");
  await page.goto("/login?next=/checkout");
  await completeEmailSignIn(page, uniqueEmail("khalti"));
  await checkoutWith(page, /Khalti/);

  await page.getByRole("button", { name: "Continue to Khalti" }).click();

  await expect(page).toHaveURL(/\/checkout\/success\?order=VZ-/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("is confirmed");
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
});

test("a forged eSewa callback never marks anything paid", async ({ page }) => {
  const forged = Buffer.from(
    JSON.stringify({
      transaction_uuid: "VZ-260101-0001-1",
      total_amount: "1.0",
      status: "COMPLETE",
      signed_field_names: "total_amount,transaction_uuid",
      signature: "not-a-real-signature",
    }),
  ).toString("base64");
  await page.goto(`/api/payments/esewa/success?data=${encodeURIComponent(forged)}`);
  await expect(page).toHaveURL(/\/checkout\/failed/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Payment didn't go through.");
});
