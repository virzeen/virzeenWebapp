import { expect, test } from "@playwright/test";
import { createDbClient } from "@virzeen/db";
import { E2E_DATABASE_URL } from "./env";
import { addToBag, checkoutWith, completeEmailSignIn, readEmail, uniqueEmail } from "./helpers";

// Journeys 2–5 (testing-strategy.md §2). eSewa and Khalti are the mock providers from mock-providers.mjs.

/**
 * Test set-up in the throwaway e2e database: a 10% code as the admin's Discounts page makes it. The admin journey
 * covers that page; here it would add a two-factor sign-in for nothing.
 */
async function createTenPercentCode(code: string) {
  const db = createDbClient(E2E_DATABASE_URL);
  try {
    await db.discountCode.upsert({
      where: { code },
      create: { code, kind: "PERCENT", percentOff: 10 },
      update: { isActive: true, usedCount: 0, maxUses: null, endsAt: null },
    });
  } finally {
    await db.$disconnect();
  }
}

test("a discount code takes money off at checkout and stays on the order", async ({ page }) => {
  // Its own visitor address (a documentation range, as Railway's edge would pass it on), so this sign-in doesn't use
  // up the 10-codes-per-address limit (rate-limit.ts "otp:ip") the rest of the suite shares; see phone-sign-in.spec.
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.10" });
  await createTenPercentCode("E2E-WELCOME10");
  await addToBag(page, "monochrome-oversized-tee", { color: "Black", size: "M" });
  await page.goto("/login?next=/checkout");
  await completeEmailSignIn(page, uniqueEmail("discount"));
  await checkoutWith(page, /Cash on delivery/);
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,450");

  await page.getByRole("button", { name: "Add a discount code" }).click();
  const field = page.getByLabel("Discount code");
  await expect(field).toBeFocused();
  await field.fill("nope");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("This code isn't valid.")).toBeVisible();
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,450");

  // Any case works; the server works out 10% of Rs 2,450, rounded down to whole rupees.
  await field.fill(" e2e-welcome10 ");
  await field.press("Enter");
  await expect(page.getByTestId("discount-applied")).toHaveText("E2E-WELCOME10 applied");
  await expect(page.getByTestId("checkout-discount")).toHaveText("−Rs 245");
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,205");

  // Remove takes it off; applying it again puts it back.
  await page.getByRole("button", { name: "Remove discount code E2E-WELCOME10" }).click();
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,450");
  await page.getByRole("button", { name: "Add a discount code" }).click();
  await page.getByLabel("Discount code").fill("E2E-WELCOME10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,205");

  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?order=VZ-\d{6}-\d{4}/);
  const discountLine = page.getByTestId("order-discount");
  await expect(discountLine).toContainText("Discount (E2E-WELCOME10)");
  await expect(discountLine).toContainText("−Rs 245");
});

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
  await expect(page.getByTestId("open-bag")).toHaveAccessibleName("Bag");
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
