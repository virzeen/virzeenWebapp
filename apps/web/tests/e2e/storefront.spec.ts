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

    // The bag drawer slides in from the right and says "Added to bag".
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag).toHaveAccessibleDescription("Added to bag · 1 item");
    await expect(bag.getByText("Linen Overshirt")).toBeVisible();
    await expect(bag.getByTestId("cart-subtotal")).toContainText("Rs 4,500");
    await expect(bag.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");

    // The drawer is modal (the page behind it is hidden from assistive tech), so close it first; focus goes back.
    await page.keyboard.press("Escape");
    await expect(bag).toBeHidden();
    await expect(page.getByTestId("add-to-bag")).toBeFocused();
    await expect(page.getByTestId("open-bag")).toHaveAccessibleName("Bag, 1 item");

    await page.getByTestId("open-bag").click();
    await expect(page.getByRole("heading", { level: 1, name: "Bag" })).toBeVisible();
    await expect(page.getByTestId("cart-subtotal")).toContainText("Rs 4,500");
  });

  test("out-of-stock sizes cannot be selected", async ({ page }) => {
    await page.goto("/product/linen-overshirt");
    await expect(page.getByRole("radio", { name: "XL", exact: true })).toBeDisabled();
  });

  test("the bag page keeps quantity changes and removal with undo", async ({ page }) => {
    await page.goto("/product/logo-cap");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("dialog", { name: "Bag" }).getByRole("link", { name: "View bag" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Bag" })).toBeVisible();

    const quantity = page.getByRole("group", { name: "Quantity of Logo Cap" });
    await quantity.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.getByTestId("cart-subtotal")).toContainText("Rs 3,600");

    // Like Nike's bag: "−" lowers the quantity, and at 1 it becomes a bin that removes the line.
    await quantity.getByRole("button", { name: "Decrease quantity" }).click();
    await expect(page.getByTestId("cart-subtotal")).toContainText("Rs 1,800");
    await quantity.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("There are no items in your bag.")).toBeVisible();
    await expect(page.getByText("Removed Logo Cap.")).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(quantity).toBeVisible();
    await expect(page.getByTestId("cart-subtotal")).toContainText("Rs 1,800");
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

    // Back from another product shows the style the address names, not the one the page first opened with.
    await page.getByRole("region", { name: "You may also like" }).getByRole("link").first().click();
    await expect(page).not.toHaveURL(/linen-overshirt/);
    await page.goBack();
    await expect(page).toHaveURL(/\/product\/linen-overshirt\?style=Bone$/);
    await expect(page.getByRole("radio", { name: "Bone", exact: true })).toBeChecked();
    await expect(page.getByText("Colour shown: Bone/Natural")).toBeVisible();

    await page.goto("/product/linen-overshirt?style=Bone");
    await expect(page.getByRole("radio", { name: "Bone", exact: true })).toBeChecked();
    // An unknown style falls back to the first style with stock.
    await page.goto("/product/linen-overshirt?style=Nope");
    await expect(page.getByRole("radio", { name: "Black", exact: true })).toBeChecked();
  });

  // specs/product-page-v2.md "Recommendations": two rows under the product; previous/next move one card.
  test("product page shows both carousels", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/product/linen-overshirt");
    const same = page.getByRole("region", { name: "You may also like" });
    const more = page.getByRole("region", { name: "More from Virzeen" });
    await expect(same).toBeVisible();
    await expect(same.getByRole("link").first()).toBeVisible();
    await expect(more).toBeVisible();
    await expect(more.getByRole("link").first()).toBeVisible();

    // The seed has more products in other categories than the 4 that fit at lg, so the buttons show.
    const previous = more.getByRole("button", { name: "Previous products" });
    const next = more.getByRole("button", { name: "Next products" });
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    const row = more.getByRole("list", { name: "More from Virzeen" });
    const cardWidth = await row
      .locator(":scope > li")
      .first()
      .evaluate((card) => card.getBoundingClientRect().width);
    await next.click();
    await expect(previous).toBeEnabled();
    await expect
      .poll(async () => Math.abs((await row.evaluate((list) => list.scrollLeft)) - cardWidth))
      .toBeLessThanOrEqual(1);
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
    // Nothing inside takes focus, so the scrolling body does: keyboard users can scroll it.
    await expect(details.getByRole("region", { name: "Linen Overshirt" })).toBeFocused();
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

// specs/mobile-menu.md: the phone menu (below md), like Nike's.
test.describe("Phone menu", () => {
  test("a guest opens the menu, goes into Shop and opens a category @mobile", async ({ page }) => {
    // The desktop project runs @mobile tests too, and the menu button only shows below md.
    const viewport = page.viewportSize();
    if (!viewport || viewport.width >= 768) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const header = page.getByRole("banner");
    // No account icon on phones: it's in the menu.
    await expect(header.getByRole("link", { name: "Sign in" })).toBeHidden();
    const openMenu = header.getByRole("button", { name: "Open menu" });
    await openMenu.click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();

    // Guests: "Sign in" comes first and takes focus.
    await expect(menu.getByRole("link", { name: "Sign in" })).toBeFocused();
    for (const name of ["Home", "Portfolio", "About", "Favourites", "Bag", "Orders", "Help"]) {
      await expect(menu.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await expect(menu.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // Shop opens its own panel; "All" goes back with focus on Shop.
    const shop = menu.getByRole("button", { name: "Shop", exact: true });
    await shop.click();
    await expect(menu.getByRole("heading", { name: "Shop" })).toBeFocused();
    await expect(menu.getByRole("link", { name: "All products" })).toBeVisible();
    await menu.getByRole("button", { name: "All", exact: true }).click();
    await expect(shop).toBeFocused();

    await shop.click();
    await menu.getByRole("link", { name: "Accessories", exact: true }).click();
    await expect(page).toHaveURL(/\/shop\/accessories$/);
    await expect(menu).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: "Accessories" })).toBeVisible();

    // Escape closes it and focus returns to the menu button.
    await openMenu.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(openMenu).toBeFocused();
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
