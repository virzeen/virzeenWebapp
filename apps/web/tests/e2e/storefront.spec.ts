import { expect, test } from "@playwright/test";

// Journey 1: browse → product page → add to bag → bag updates.
test.describe("Add to bag", () => {
  test("customer picks a size and adds the product to the bag @mobile", async ({ page }) => {
    await page.goto("/shop");
    await page
      .getByRole("link", { name: /Linen Overshirt/ })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Linen Overshirt" })).toBeVisible();

    // With no size chosen the button points at the size picker instead of adding.
    await page.getByRole("button", { name: "Select a size" }).click();
    await expect(page.getByRole("radiogroup", { name: "Size" })).toHaveAttribute("aria-invalid", "true");

    await page.getByRole("radio", { name: "M", exact: true }).click();
    await page.getByRole("button", { name: "Add to bag" }).click();

    await expect(page.getByText("Added to bag")).toBeVisible();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag).toBeVisible();
    await expect(bag.getByText("Linen Overshirt")).toBeVisible();
    await expect(bag.getByTestId("cart-subtotal")).toContainText("Rs 4,500");

    // The drawer is modal (the page behind it is hidden from assistive tech), so close it first.
    await page.keyboard.press("Escape");
    await expect(bag).toBeHidden();
    await expect(page.getByTestId("open-bag")).toHaveAccessibleName("Open bag, 1 item");
  });

  test("out-of-stock sizes cannot be selected", async ({ page }) => {
    await page.goto("/product/linen-overshirt");
    await expect(page.getByRole("radio", { name: "XL", exact: true })).toBeDisabled();
  });

  test("the bag keeps quantity changes and removal with undo", async ({ page }) => {
    await page.goto("/product/logo-cap");
    await page.getByRole("button", { name: "Add to bag" }).click();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await bag.getByRole("button", { name: "Increase quantity" }).click();
    await expect(bag.getByTestId("cart-subtotal")).toContainText("Rs 3,600");

    await bag.getByRole("button", { name: "Remove" }).click();
    await expect(bag.getByText("Your bag is empty.")).toBeVisible();
    await expect(bag.getByRole("status")).toHaveText(/Removed Logo Cap\./);
    await bag.getByRole("button", { name: "Undo" }).click();
    await expect(bag.getByText("Logo Cap")).toBeVisible();
    await expect(bag.getByTestId("cart-subtotal")).toContainText("Rs 3,600");
  });
});

test.describe("Storefront pages", () => {
  test("home, shop filters and portfolio render", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("timeless monochromium experience.");

    await page.goto("/shop/accessories");
    await expect(page.getByRole("heading", { level: 1, name: "Accessories" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Logo Cap/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Linen Overshirt/ })).toHaveCount(0);

    await page.goto("/portfolio/preorder-starting-soon");
    await expect(page.getByRole("heading", { level: 1, name: "Preorder starting soon" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shop the story" })).toBeVisible();
  });

  test("unknown products show the friendly not-found page", async ({ page }) => {
    // Product pages stream behind a loading state, so the status is already sent (200); Next.js marks the
    // streamed not-found page noindex instead (node_modules/next/dist/docs, loading.md).
    await page.goto("/product/does-not-exist");
    await expect(page.getByText("We couldn't find that page.")).toBeVisible();
    // generateMetadata calls notFound() too, so the tab says so instead of showing the site's default title.
    await expect(page).toHaveTitle("Page not found — Virzeen");
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });

  test("unknown pages outside the shop return a real 404", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Installable app", () => {
  test("serves the manifest and shows the offline page when the connection drops", async ({
    page,
    context,
  }) => {
    const manifest = await page.request.get("/manifest.webmanifest");
    expect(await manifest.json()).toMatchObject({ name: "Virzeen", display: "standalone" });

    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload(); // now controlled by the service worker

    await context.setOffline(true);
    await page.goto("/shop");
    await expect(page.getByText("You're offline.")).toBeVisible();
    await context.setOffline(false);
  });
});
