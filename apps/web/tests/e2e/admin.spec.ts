import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL } from "./env";
import { completeEmailSignIn, signIn, totp, uniqueEmail } from "./helpers";

// Journeys 6–7 (testing-strategy.md §2) plus the admin TOTP step-up (security-policy.md §2).

test("guests are sent to sign in and customers get a 404 for /admin", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);

  await signIn(page, uniqueEmail("customer"));
  const response = await page.goto("/admin/orders");
  expect(response?.status()).toBe(404);
});

test("admin sets up two-factor, creates a product and it appears in the shop", async ({ page }) => {
  await page.goto("/login?next=/admin");
  await completeEmailSignIn(page, E2E_ADMIN_EMAIL);
  await expect(page).toHaveURL(/\/admin\/verify/);

  // Enrol an authenticator, then pass the step-up.
  await page.getByRole("button", { name: "Set up authenticator" }).click();
  const secret = (await page.getByText(/^[A-Z2-7]{4}( [A-Z2-7]{1,4})+$/).innerText()).replace(/\s/g, "");
  await page.getByLabel(/6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: "Turn on two-factor" }).click();
  await expect(page.getByRole("button", { name: "Verify" })).toBeVisible();
  await page.getByLabel(/6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

  // Create a product.
  await page.getByRole("link", { name: "Products" }).click();
  await page.getByRole("link", { name: "New product" }).click();
  await page.getByLabel(/^Name/).fill("E2E Monochrome Beanie");
  await expect(page.getByLabel(/URL slug/)).toHaveValue("e2e-monochrome-beanie");
  await page.getByRole("combobox", { name: /Category/ }).click();
  await page.getByRole("option", { name: "Accessories" }).click();
  await page.getByLabel(/^Description/).fill("A ribbed beanie for cold Kathmandu mornings.");
  await page.getByLabel(/Image reference/).fill("/placeholder/product-06.jpg");
  await page.getByRole("button", { name: "Add image" }).click();
  await page.getByLabel(/^SKU/).fill("VZ-BEANIE-BLK-OS");
  await page.getByLabel(/^Colour/).fill("Black");
  // Product price + shipping; customers see the sum (Rs 1,500) with free shipping.
  await page.getByLabel(/^Shipping price \(Rs\)/).fill("150");
  await page.getByLabel(/^Product price \(Rs\)/).fill("1350");
  await expect(page.getByText(/Customers pay Rs 1,500/)).toBeVisible();
  await page.getByLabel(/^Stock/).fill("12");
  await page.getByRole("switch", { name: /Published/ }).click();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Product saved")).toBeVisible();

  await page.goto("/shop/accessories");
  await page.getByRole("link", { name: /E2E Monochrome Beanie/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Monochrome Beanie" })).toBeVisible();
  await expect(page.getByText("Rs 1,500").first()).toBeVisible();
});
