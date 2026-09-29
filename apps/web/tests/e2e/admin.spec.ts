import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL } from "./env";
import { completeEmailSignIn, signIn, totp, uniqueEmail } from "./helpers";

// Journeys 6–7 (testing-strategy.md §2) plus the admin TOTP step-up (security-policy.md §2).

test("guests are sent to sign in, customers get a 404 for /admin, and Sign out ends the session", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);

  await signIn(page, uniqueEmail("customer"));
  const response = await page.goto("/admin/orders");
  expect(response?.status()).toBe(404);

  // Sign out from the account settings page (the same button as the admin header and admin settings).
  await page.goto("/account/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
});

test("admin sets up two-factor, creates a product and it appears in the shop", async ({ page }) => {
  await page.goto("/login?next=/admin");
  await completeEmailSignIn(page, E2E_ADMIN_EMAIL);
  await expect(page).toHaveURL(/\/admin\/verify/);

  // Enrol an authenticator, then pass the step-up.
  await page.getByRole("button", { name: "Set up authenticator" }).click();
  // Step 1: the key is only inside the QR code and the phone-only "open in app" link; backup codes on request.
  const qr = page.getByRole("img", { name: "Authenticator setup code" });
  await expect(qr).toBeVisible();
  const openInApp = page.locator('a[href^="otpauth:"]');
  await expect(openInApp).toBeHidden(); // desktop viewport
  const backupCode = page.getByText(/^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/).first();
  await expect(backupCode).toBeHidden();
  await page.getByRole("button", { name: "Show backup codes" }).click();
  await expect(backupCode).toBeVisible();
  const secret = new URL((await openInApp.getAttribute("href")) ?? "").searchParams.get("secret") ?? "";
  // Step 2: the QR code gives way to the code field.
  await page.getByRole("button", { name: "Next" }).click();
  await expect(qr).toBeHidden();
  await expect(page.getByText("2. Enter the 6-digit code your app shows.")).toBeVisible();
  await page.getByLabel(/6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: "Turn on two-factor" }).click();
  await expect(page.getByRole("button", { name: "Verify" })).toBeVisible();
  await page.getByLabel(/6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

  // Create a product with the editor (specs/admin-product-editor.md).
  await page.getByRole("link", { name: "Products" }).click();
  await page.getByRole("link", { name: "New product" }).click();
  await page.getByLabel(/^Product name/).fill("E2E Monochrome Beanie");
  // Unsaved changes: leaving by a link asks first; cancelling stays.
  page.once("dialog", (dialog) => void dialog.dismiss());
  await page.getByRole("link", { name: "← Products" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "New product" })).toBeVisible();

  await page.getByLabel(/^Image reference/).fill("/placeholder/product-06.jpg");
  await page.getByRole("button", { name: "Add photo" }).click();
  await expect(page.getByText("Main photo", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Description" })
    .fill("A ribbed beanie for cold Kathmandu mornings.");
  // One price for every size, plus shipping; customers see the sum (Rs 1,500) with free shipping.
  await page.getByLabel(/^Price \(Rs\)/).fill("1350");
  await page.getByLabel(/^Shipping \(Rs\)/).fill("150");
  await expect(page.getByText(/Customers pay Rs 1,500/)).toBeVisible();
  // A style (colour), then two sizes typed with commas: a stock row for each combination.
  await page.getByLabel(/^Add a style/).fill("Black");
  await page.getByLabel(/^Add a style/).press("Enter");
  await expect(page.getByRole("region", { name: "Black" })).toBeVisible();
  await page.getByLabel(/^Sizes/).fill("S, M,");
  await page.getByLabel("Stock, Black, S").fill("5");
  await page.getByLabel("Stock, Black, M").fill("7");
  await page.getByRole("combobox", { name: /Category/ }).click();
  await page.getByRole("option", { name: "Accessories" }).click();
  // The slug fills itself from the name, under Search engines.
  await page.getByRole("button", { name: "Search engines" }).click();
  await expect(page.getByLabel(/URL slug/)).toHaveValue("e2e-monochrome-beanie");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Product published")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/products\/(?!new)[a-z0-9]+$/);

  // SKUs were made on save; a second save keeps the same two rows instead of adding them again.
  await page.getByRole("checkbox", { name: /Edit SKU codes/ }).click();
  await expect(page.getByLabel("SKU, Black, S")).toHaveValue("VZ-E2EMONOCHROM-BLACK-S");
  await page.getByLabel("Stock, Black, M").fill("8");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Product saved")).toBeVisible();
  await expect(page.getByLabel(/^Stock, /)).toHaveCount(2);
  await expect(page.getByLabel("SKU, Black, M")).toHaveValue("VZ-E2EMONOCHROM-BLACK-M");

  // Preview: the product page in a new tab, following the editor as it changes (nothing saved).
  const [preview] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Preview", exact: true }).click(),
  ]);
  await expect(preview.getByText("Preview: only you can see this.", { exact: false })).toBeVisible();
  await expect(preview.getByRole("heading", { level: 1, name: "E2E Monochrome Beanie" })).toBeVisible();
  await expect(preview.getByText("Rs 1,500").first()).toBeVisible();
  await page.getByLabel(/^Product name/).fill("E2E Monochrome Beanie, ribbed");
  await expect(
    preview.getByRole("heading", { level: 1, name: "E2E Monochrome Beanie, ribbed" }),
  ).toBeVisible();
  await preview.getByRole("radio", { name: "S", exact: true }).click();
  await preview.getByRole("button", { name: "Add to bag" }).click();
  await expect(preview.getByText("This is a preview. Nothing was added to your bag.")).toBeVisible();
  await preview.close();
  // Back to the saved name, so the editor has no unsaved changes when the test moves on.
  await page.getByLabel(/^Product name/).fill("E2E Monochrome Beanie");

  await page.goto("/shop/accessories");
  await page.getByRole("link", { name: /E2E Monochrome Beanie/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Monochrome Beanie" })).toBeVisible();
  await expect(page.getByText("Rs 1,500").first()).toBeVisible();

  // Products list: status filters, and Duplicate makes a draft copy (stock 0) that opens in the editor.
  await page.goto("/admin/products");
  await page.getByRole("link", { name: /^Drafts \(\d+\)$/ }).click();
  await expect(page.getByRole("link", { name: /E2E Monochrome Beanie/ })).toBeHidden();
  await page.getByRole("link", { name: /^All \(\d+\)$/ }).click();
  await page.getByRole("button", { name: "Duplicate E2E Monochrome Beanie" }).click();
  await expect(page.getByText("Copy saved as a draft")).toBeVisible();
  await expect(page.getByLabel(/^Product name/)).toHaveValue("E2E Monochrome Beanie (copy)");
  await expect(page.getByLabel("Stock, Black, S")).toHaveValue("0");
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeVisible();

  // Styles (specs/product-styles.md): a second design with its own photo and price on the same page.
  await page.getByLabel(/^Add another style/).fill("Mountain print");
  await page.getByLabel(/^Add another style/).press("Enter");
  const mountain = page.getByRole("region", { name: "Mountain print" });
  await mountain.getByLabel(/^Image reference/).fill("/placeholder/product-02.jpg");
  await mountain.getByRole("button", { name: "Add photo" }).click();
  await mountain.getByLabel(/^Price \(Rs\)/).fill("1650");
  await expect(mountain.getByText(/Customers pay Rs 1,800/)).toBeVisible();
  await mountain.getByLabel("Stock, Mountain print, S").fill("3");
  const black = page.getByRole("region", { name: "Black" });
  await black.getByLabel(/^Image reference/).fill("/placeholder/product-07.jpg");
  await black.getByRole("button", { name: "Add photo" }).click();
  await black.getByLabel("Stock, Black, S").fill("2");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Product published")).toBeVisible();
  // The shop page: picture swatches; picking a style changes its photos and price.
  await page.goto("/product/e2e-monochrome-beanie-copy");
  await expect(page.getByText("Style: Black")).toBeVisible();
  await expect(page.locator('main img[src*="product-07"]').first()).toBeVisible();
  await page.getByRole("radio", { name: "Mountain print" }).click();
  await expect(page.getByText("Style: Mountain print")).toBeVisible();
  await expect(page.locator('main img[src*="product-02"]').first()).toBeVisible();
  await expect(page.getByText("Rs 1,800").first()).toBeVisible();
  await expect(page.getByRole("radio", { name: "M", exact: true })).toBeDisabled();

  // A mistyped admin address stays inside the admin frame, with a way back.
  await page.goto("/admin/no-such-page");
  await expect(
    page.getByRole("heading", { level: 1, name: "This page doesn't exist, or the item was archived." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to dashboard" })).toBeVisible();

  // Settings, the last nav item: the admin's own account, sign-in security and Sign out.
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(E2E_ADMIN_EMAIL);
  await page.getByLabel(/^Name/).fill("E2E Admin");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const security = page.getByRole("region", { name: "Sign-in security" });
  await expect(security.getByText("On", { exact: true })).toBeVisible();
  await expect(
    security.getByText(
      /On this device, you'll be asked for the next one after \d{1,2} [A-Z][a-z]{2} \d{4}, \d{1,2}:\d{2} [AP]M\./,
    ),
  ).toBeVisible();
  // The authenticator is never reset or switched off from the website (security-policy.md §2).
  await expect(security.getByRole("button")).toHaveCount(0);

  // Sign out from the admin header: back to the home page, and /admin asks to sign in again.
  await page.getByRole("banner").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});

test("an admin on the authenticator step can sign out and use a different email", async ({ page }) => {
  await page.goto("/login?next=/admin");
  await completeEmailSignIn(page, E2E_ADMIN_EMAIL);
  await expect(page).toHaveURL(/\/admin\/verify/);
  await expect(page.getByText(`Signed in as ${E2E_ADMIN_EMAIL}`)).toBeVisible();

  await page.getByRole("button", { name: "Use a different email" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  // Signed out: the admin area asks for an email again.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});
