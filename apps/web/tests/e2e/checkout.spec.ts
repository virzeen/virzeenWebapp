import { expect, test } from "@playwright/test";
import { createDbClient } from "@virzeen/db";
import { E2E_DATABASE_URL } from "./env";
import {
  addToBag,
  checkoutWith,
  completeEmailSignIn,
  fillGuestDetails,
  readEmail,
  uniqueEmail,
} from "./helpers";

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
  await checkoutWith(page, /Cash on delivery/, { continueToReview: false });
  // Rs 2,450 is under the member free-delivery line (Rs 3,000), so Rs 150 delivery is added.
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,600");

  await page.getByRole("button", { name: "Add a discount code" }).click();
  const field = page.getByLabel("Discount code");
  await expect(field).toBeFocused();
  await field.fill("nope");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("This code isn't valid.")).toBeVisible();
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,600");

  // Any case works; the server works out 10% of Rs 2,450, rounded down to whole rupees.
  await field.fill(" e2e-welcome10 ");
  await field.press("Enter");
  await expect(page.getByTestId("discount-applied")).toHaveText("E2E-WELCOME10 applied");
  await expect(page.getByTestId("checkout-discount")).toHaveText("−Rs 245");
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,355");

  // Remove takes it off; applying it again puts it back.
  await page.getByRole("button", { name: "Remove discount code E2E-WELCOME10" }).click();
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,600");
  await page.getByRole("button", { name: "Add a discount code" }).click();
  await page.getByLabel("Discount code").fill("E2E-WELCOME10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,355");

  await page.getByTestId("payment-continue").click();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?order=VZ-\d{6}-\d{4}/);
  const discountLine = page.getByTestId("order-discount");
  await expect(discountLine).toContainText("Discount (E2E-WELCOME10)");
  await expect(discountLine).toContainText("−Rs 245");
});

test("a signed-out visitor chooses how to check out; Member goes to sign-in and the bag is merged", async ({
  page,
}) => {
  await addToBag(page, "structured-tote");
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Choose how you would like to check out");
  await expect(page.getByTestId("member-panel")).toBeVisible();
  await expect(page.getByTestId("guest-panel")).toBeVisible();
  await page.getByTestId("choose-member").click();
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);

  await completeEmailSignIn(page, uniqueEmail("merge"));
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "In Your Bag" })).toBeVisible();
  await expect(page.getByText("Structured Tote")).toBeVisible();
});

test("checkout with cash on delivery confirms the order and shows it in the account", async ({ page }) => {
  const email = uniqueEmail("cod");
  await addToBag(page, "monochrome-oversized-tee", { color: "Black", size: "M" });
  await page.goto("/login?next=/checkout");
  await completeEmailSignIn(page, email);
  await checkoutWith(page, /Cash on delivery/);

  // A member pays Rs 150 delivery under Rs 3,000 (docs/specs/checkout-v2-week1.md).
  await expect(page.getByTestId("checkout-delivery")).toHaveText("Rs 150");
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,600");
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

test("a guest checks out without an account and only their browser can open the confirmation", async ({
  page,
  browser,
}) => {
  const email = uniqueEmail("guest");
  await addToBag(page, "monochrome-oversized-tee", { color: "Black", size: "M" });
  await page.goto("/checkout");
  await page.getByTestId("choose-guest").click();
  await expect(page).toHaveURL(/\/checkout\?as=guest$/);

  // Rs 2,450 + Rs 200 guest delivery; members would pay Rs 150, so the nudge shows the Rs 50 saving.
  await expect(page.getByTestId("checkout-delivery")).toHaveText("Rs 200");
  await expect(page.getByTestId("checkout-total")).toHaveText("Rs 2,650");
  await expect(page.getByTestId("member-nudge")).toContainText("MONO Members save Rs 50 on this order.");
  await expect(page.getByTestId("free-delivery-hint")).toContainText("Add Rs 1,550 more for free delivery.");
  await expect(page.getByTestId("arrives-by").first()).toContainText("Arrives by");

  // A wrong phone number keeps what was typed and says what is wrong.
  await fillGuestDetails(page, email);
  await page.getByLabel(/^Mobile number/).fill("1234567890");
  await page.getByRole("button", { name: /Save & Continue/ }).click();
  await expect(page.getByText("Enter a 10-digit mobile number starting with 97 or 98")).toBeVisible();
  await expect(page.getByLabel(/^First name/)).toHaveValue("Sita");
  await page.getByLabel(/^Mobile number/).fill("98 12345678");
  await page.getByRole("button", { name: /Save & Continue/ }).click();

  await expect(page.getByTestId("delivery-summary")).toContainText("Sita Rai");
  await page.getByRole("radio", { name: /Cash on delivery/ }).click();
  await page.getByTestId("payment-continue").click();
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page).toHaveURL(/\/checkout\/success\?order=VZ-\d{6}-\d{4}/);
  const url = page.url();
  const orderNumber = new URL(url).searchParams.get("order") ?? "";
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Thank you — your order ${orderNumber} is confirmed.`,
  );
  expect(await readEmail(email, /confirmed/)).toContain(orderNumber);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("is confirmed");

  // Someone who only knows the order number gets nothing.
  const stranger = await browser.newContext();
  const strangerPage = await stranger.newPage();
  // notFound() under a loading boundary streams, so the status is 200 (ai/common-mistakes.md): check the page.
  await strangerPage.goto(url);
  await expect(strangerPage.getByText(orderNumber)).toHaveCount(0);
  await expect(strangerPage.getByText("is confirmed")).toHaveCount(0);
  await expect(strangerPage.locator("meta[name=robots]").first()).toHaveAttribute("content", /noindex/);
  await stranger.close();
});

test("the bag page shows the free-delivery hint, the member saving and the arrival date", async ({
  page,
}) => {
  await addToBag(page, "monochrome-oversized-tee", { color: "Black", size: "M" });
  await page.goto("/cart");
  await expect(page.getByTestId("cart-delivery")).toHaveText("Rs 200");
  await expect(page.getByTestId("cart-total")).toHaveText("Rs 2,650");
  await expect(page.getByTestId("cart-free-delivery-hint")).toHaveText(
    "Add Rs 1,550 more for free delivery.",
  );
  await expect(page.getByTestId("cart-member-line")).toHaveText("MONO Members save Rs 50 on this order.");
  await expect(page.getByTestId("cart-arrives-by")).toContainText("Arrives by");
});
