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
    await expect(page.getByRole("radiogroup", { name: "Select size" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );

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

// The Nike-style product page (specs/product-page.md, specs/size-guides.md). The seeded Linen Overshirt has three
// shared photos, the styles Black and Bone, the "Tops" size guide, details and three features.
test.describe("Product page", () => {
  test("thumbnails and the arrows switch the main photo", async ({ page }) => {
    await page.goto("/product/linen-overshirt");
    const main = page.getByTestId("gallery-main").getByRole("img");
    await expect(main).toHaveAttribute("src", /product-03/);

    const second = page.getByRole("button", { name: "Show photo 2", exact: true });
    await second.click();
    await expect(main).toHaveAttribute("src", /product-07/);
    await expect(second).toHaveAttribute("aria-current", "true");
    await expect(page.getByText("Photo 2 of 3")).toBeAttached();

    await page.getByRole("button", { name: "Next photo" }).click();
    await expect(main).toHaveAttribute("src", /product-11/);
    // Wraps around to the first photo.
    await page.getByRole("button", { name: "Next photo" }).click();
    await expect(main).toHaveAttribute("src", /product-03/);
  });

  test("picking a style changes the address, and a ?style= link opens that style", async ({ page }) => {
    await page.goto("/product/linen-overshirt");
    await expect(page.getByRole("radio", { name: "Black", exact: true })).toBeChecked();
    await expect(page.getByText("Colour shown: Black")).toBeVisible();
    // Style numbers (specs/product-editor-on-page.md): the product number, then -101, -102… per style.
    await expect(page.getByText(/^Style: VZ\d{4,}-101$/)).toBeVisible();

    await page.getByRole("radio", { name: "Bone", exact: true }).click();
    await expect(page).toHaveURL(/\/product\/linen-overshirt\?style=Bone$/);
    // The seed's colour shown for Bone.
    await expect(page.getByText("Colour shown: Bone/Natural")).toBeVisible();
    await expect(page.getByText(/^Style: VZ\d{4,}-102$/)).toBeVisible();

    await page.goto("/product/linen-overshirt?style=Bone");
    await expect(page.getByRole("radio", { name: "Bone", exact: true })).toBeChecked();
    // An unknown style falls back to the first style with stock.
    await page.goto("/product/linen-overshirt?style=Nope");
    await expect(page.getByRole("radio", { name: "Black", exact: true })).toBeChecked();
  });

  test("the size guide opens, switches to inches and closes", async ({ page }) => {
    await page.goto("/product/linen-overshirt");
    const button = page.getByRole("button", { name: "Size guide" }).first();
    await button.click();
    const guide = page.getByRole("dialog", { name: "Size guide" });
    await expect(guide).toBeVisible();
    await expect(guide.getByRole("columnheader", { name: "Chest (cm)" })).toBeVisible();
    const medium = guide
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader", { name: "M", exact: true }) });
    await expect(medium).toContainText("94-100");

    await guide.getByRole("radio", { name: "in", exact: true }).click();
    await expect(guide.getByRole("columnheader", { name: "Chest (in)" })).toBeVisible();
    await expect(medium).toContainText("37 - 39.5");

    await page.keyboard.press("Escape");
    await expect(guide).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("the product details popup and the features row", async ({ page }) => {
    await page.goto("/product/linen-overshirt");
    const open = page.getByRole("button", { name: "View product details" });
    await open.click();
    const details = page.getByRole("dialog", { name: "Linen Overshirt" });
    await expect(details).toBeVisible();
    await expect(details.getByRole("heading", { name: "Benefits" })).toBeVisible();
    await expect(details.getByText("100% linen")).toBeVisible();
    await expect(details.getByText("Country/Region of origin: China")).toBeVisible();
    await expect(details.getByText(/^Style: VZ\d{4,}-101$/)).toBeVisible();
    await details.getByRole("button", { name: "Close" }).click();
    await expect(details).toBeHidden();
    await expect(open).toBeFocused();

    await expect(page.getByRole("heading", { level: 2, name: "Features that perform" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Breathes on warm days" })).toBeVisible();
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
