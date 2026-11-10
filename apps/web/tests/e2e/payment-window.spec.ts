import { expect, test, type Page } from "@playwright/test";
import { addToBag, checkoutWith, completeEmailSignIn, uniqueEmail } from "./helpers";

// 15 minutes to pay (specs/payment-window.md), with the mock Khalti from mock-providers.mjs: its payment page
// cancels when asked with `cancel=1`, and pays otherwise.

/** The next visit to the mock Khalti payment page cancels instead of paying (the customer leaves it). */
async function cancelNextKhaltiPayment(page: Page) {
  let used = false;
  await page.route("**/khalti/pay?*", async (route) => {
    const url = new URL(route.request().url());
    if (used || url.searchParams.has("cancel")) return route.continue();
    used = true;
    url.searchParams.set("cancel", "1");
    await route.continue({ url: url.toString() });
  });
}

async function leaveKhaltiWithoutPaying(page: Page, ip: string) {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": ip });
  await addToBag(page, "silk-scarf");
  await page.goto("/login?next=/checkout");
  await completeEmailSignIn(page, uniqueEmail("pay-window"));
  await checkoutWith(page, /Khalti/);
  await cancelNextKhaltiPayment(page);
  await page.getByRole("button", { name: "Continue to Khalti" }).click();
  // Back from Khalti without paying: the order still waits, on its own page.
  await expect(page).toHaveURL(/\/account\/orders\/VZ-[\d-]+\?payment=failed$/);
}

test("leaving Khalti without paying keeps the order, and Pay now pays it", async ({ page }) => {
  await leaveKhaltiWithoutPaying(page, "198.51.100.50");
  const panel = page.getByRole("region", { name: "Waiting for your payment" });
  await expect(
    panel.getByText(/^Payment didn't go through\. You can still pay until \d{1,2}:\d{2} [AP]M\.$/),
  ).toBeVisible();
  await expect(panel.getByText(/minutes left/)).toBeVisible();
  await expect(page.getByText("Not paid yet")).toBeVisible();

  await panel.getByRole("radio", { name: "Khalti" }).click();
  await panel.getByRole("button", { name: "Pay now" }).click();

  // mock Khalti pays → callback → lookup → success page
  await expect(page).toHaveURL(/\/checkout\/success\?order=VZ-/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("is confirmed");
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
});

test("Cancel order on a waiting order puts the items back in the bag", async ({ page }) => {
  await leaveKhaltiWithoutPaying(page, "198.51.100.51");
  const panel = page.getByRole("region", { name: "Waiting for your payment" });

  await panel.getByRole("button", { name: "Cancel order" }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel this order?" });
  await dialog.getByRole("button", { name: "Cancel order" }).click();

  await expect(page.getByText("Order cancelled. The items are back in your bag.")).toBeVisible();
  await expect(panel).toHaveCount(0);
  await expect(page.getByText("Not charged")).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByRole("link", { name: /Silk Scarf/ }).first()).toBeVisible();
});
