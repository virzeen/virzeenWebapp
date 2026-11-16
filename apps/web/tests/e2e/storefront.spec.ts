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
    await expect(bag.getByTestId("cart-subtotal")).toContainText("रु 4,500");
    await expect(bag.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");

    // The drawer is modal (the page behind it is hidden from assistive tech), so close it first; focus goes back.
    await page.keyboard.press("Escape");
    await expect(bag).toBeHidden();
    await expect(page.getByTestId("add-to-bag")).toBeFocused();
    await expect(page.getByTestId("open-bag")).toHaveAccessibleName("Bag, 1 item");

    await page.getByTestId("open-bag").click();
    await expect(page.getByRole("heading", { level: 1, name: "Bag" })).toBeVisible();
    await expect(page.getByTestId("cart-subtotal")).toContainText("रु 4,500");
  });

  test("an out-of-stock size can be picked but offers Notify me instead of Add to bag", async ({ page }) => {
    await page.goto("/product/linen-overshirt");
    const xl = page.getByRole("radio", { name: "XL, sold out", exact: true });
    await xl.click();
    await expect(xl).toBeChecked();
    await expect(page.getByRole("button", { name: "Add to bag" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Notify me when it's back" })).toBeVisible();
  });

  test("the bag page keeps quantity changes and removal with undo", async ({ page }) => {
    await page.goto("/product/logo-cap");
    await page.getByRole("button", { name: "Add to bag" }).click();
    const drawer = page.getByRole("dialog", { name: "Bag" });
    await drawer.getByRole("link", { name: "View bag" }).click();
    // The drawer slides closed before the page's own lines are the only ones.
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: "Bag" })).toBeVisible();

    const quantity = page.getByRole("group", { name: "Quantity of Logo Cap" });
    await quantity.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.getByTestId("cart-subtotal")).toContainText("रु 3,600");

    // Like Nike's bag: "−" lowers the quantity, and at 1 it becomes a bin that removes the line.
    await quantity.getByRole("button", { name: "Decrease quantity" }).click();
    await expect(page.getByTestId("cart-subtotal")).toContainText("रु 1,800");
    await quantity.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("There are no items in your bag.")).toBeVisible();
    await expect(page.getByText("Removed Logo Cap.")).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(quantity).toBeVisible();
    await expect(page.getByTestId("cart-subtotal")).toContainText("रु 1,800");
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

    // The seed has more products in other collections than the 4 that fit at lg, so the buttons show.
    const previous = more.getByRole("button", { name: "Previous products" });
    const next = more.getByRole("button", { name: "Next products" });
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    const row = more.getByRole("list", { name: "More from Virzeen" });
    // One press moves one card: from a card's left edge to the next one's (the card and the gap after it).
    const step = await row.evaluate((list) => {
      const [first, second] = [...list.children].map((card) => card.getBoundingClientRect().left);
      return (second ?? 0) - (first ?? 0);
    });
    await next.click();
    await expect(previous).toBeEnabled();
    await expect
      .poll(async () => Math.abs((await row.evaluate((list) => list.scrollLeft)) - step))
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
  test("a guest opens the menu and goes to a collection from the header's links @mobile", async ({
    page,
  }) => {
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

    // Guests: "Sign in" comes first and takes focus. The large rows are the header's links (owner 2026-11-10).
    await expect(menu.getByRole("link", { name: "Sign in" })).toBeFocused();
    for (const name of ["New and Featured", "Tops", "Accessories", "Favourites", "Bag", "Orders", "Help"]) {
      await expect(menu.getByRole("link", { name, exact: true })).toBeVisible();
    }
    for (const name of ["Home", "Portfolio", "About", "Settings"]) {
      await expect(menu.getByRole("link", { name, exact: true })).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await menu.getByRole("link", { name: "Accessories", exact: true }).click();
    await expect(page).toHaveURL(/\/collections\/accessories$/);
    await expect(menu).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: "Accessories" })).toBeVisible();

    // On a collection's page, its row is the current one.
    await openMenu.click();
    await expect(menu.getByRole("link", { name: "Accessories", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

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

    // An old category address goes to the collection with the same slug, keeping the filters.
    await page.goto("/shop/accessories?sort=price-asc");
    await expect(page).toHaveURL(/\/collections\/accessories\?sort=price-asc$/);
    await expect(page.getByRole("heading", { level: 1, name: "Accessories" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Logo Cap/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Linen Overshirt/ })).toHaveCount(0);

    await page.goto("/portfolio/preorder-starting-soon");
    await expect(page.getByRole("heading", { level: 1, name: "Preorder starting soon" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shop the story" })).toBeVisible();
  });

  test("the home hero fills the whole screen on a phone, a tablet and a computer", async ({ page }) => {
    for (const [width, height] of [
      [390, 844],
      [768, 1024],
      [1280, 800],
      [2560, 1080],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
      // The photo starts under the see-through header and reaches the bottom edge, from one side to the other.
      const box = (await hero.boundingBox())!;
      const header = (await page.getByRole("banner").boundingBox())!;
      const pageWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(box.y).toBeLessThanOrEqual(header.y + 0.5);
      expect(Math.abs(box.y + box.height - height)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.width - pageWidth)).toBeLessThanOrEqual(1);
      // The photo covers the hero exactly, so it too reaches the bottom edge (with or without a bar above the header).
      const photo = (await hero.locator("img").boundingBox())!;
      expect(Math.abs(photo.width - pageWidth)).toBeLessThanOrEqual(1);
      expect(Math.abs(photo.y - box.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(photo.y + photo.height - height)).toBeLessThanOrEqual(1);
    }
  });

  test("on a phone the notice bar has Join Now and Sign In on its first line and the notice under them, and the header sits right under it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop");
    const bar = page.getByRole("region", { name: "Notices" });
    const notice = bar.locator("p").first();
    const join = bar.getByRole("link", { name: "Join Now" });
    const signIn = bar.getByRole("link", { name: "Sign In" });
    await expect(join).toBeVisible();
    await expect(signIn).toBeVisible();
    const barBox = (await bar.boundingBox())!;
    const noticeBox = (await notice.boundingBox())!;
    const joinBox = (await join.boundingBox())!;
    const header = (await page.getByRole("banner").boundingBox())!;
    // Two lines: the links above, the notice and its link below them (one line is 36px, two are 68px).
    expect(noticeBox.y).toBeGreaterThanOrEqual(joinBox.y + joinBox.height - 1);
    expect(Math.abs(barBox.height - 68)).toBeLessThanOrEqual(1);
    // No extra gap: the header starts where the bar ends (the status-bar inset is not added a second time).
    expect(Math.abs(header.y - (barBox.y + barBox.height))).toBeLessThanOrEqual(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);

    // From md the links move into the bar's right corner, on the same line as the words.
    await page.setViewportSize({ width: 1280, height: 800 });
    const wide = (await bar.boundingBox())!;
    const wideJoin = (await bar.getByRole("link", { name: "Join Now" }).boundingBox())!;
    expect(Math.abs(wide.height - 36)).toBeLessThanOrEqual(1);
    expect(wideJoin.y).toBeLessThan(wide.y + wide.height);
  });

  test("on a phone the listing has the collections under the title, then a sticky bar with a Filters icon and Sort By, and the header hides on the way down", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/collections/accessories");
    const pageWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const title = page.getByRole("heading", { level: 1 });
    const chips = page.getByRole("navigation", { name: "Collections" });
    const current = chips.locator('[aria-current="page"]');
    const filters = page.getByRole("button", { name: "Filters" });
    const sort = page.getByRole("button", { name: "Sort By" });
    await expect(current).toBeVisible();
    await expect(filters).toBeVisible();
    await expect(sort).toBeVisible();
    // Filters is the icon only (no words), the same height as the pills.
    await expect(filters).toHaveText("");
    // Order down the page: title, collections, then the bar with Filters and Sort By on one line.
    const [t, c, f, s] = [
      await title.boundingBox(),
      await chips.boundingBox(),
      await filters.boundingBox(),
      await sort.boundingBox(),
    ];
    expect(c!.y).toBeGreaterThan(t!.y + t!.height - 1);
    expect(f!.y).toBeGreaterThan(c!.y + c!.height - 1);
    expect(Math.abs(f!.y - s!.y)).toBeLessThanOrEqual(1);
    // The current collection is on screen (the row scrolled to it), and nothing makes the page scroll sideways.
    await expect
      .poll(async () => {
        const box = (await current.boundingBox())!;
        return box.x >= 0 && box.x + box.width <= pageWidth;
      })
      .toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);

    // Sort By opens a bottom panel like Filters, with the choices as links.
    await sort.click();
    const panel = page.getByRole("dialog", { name: "Sort by" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: "Newest" })).toHaveAttribute("aria-current", "true");
    const price = panel.getByRole("link", { name: "Price: Low-High" });
    await expect(price).toBeVisible();
    await price.click();
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(panel).toBeHidden();
    await expect(sort).toContainText("Price: Low-High");

    // Scrolling down hides the Virzeen header and leaves the title with the filter bar at the top; scrolling up
    // brings the header back with the title and the bar under it.
    const header = page.getByRole("banner");
    const titleBar = page.locator("[data-listing-bar]");
    const bar = page.locator("[data-phone-listing-bar]");
    const top = async (locator: typeof bar) => Math.round((await locator.boundingBox())!.y);
    // Scroll in small steps, as a finger does, until the header has moved away (a jump that comes with a page that is
    // still loading its pictures is not counted as scrolling).
    const scrollUntilHeaderY = async (by: number, done: (y: number) => boolean) =>
      expect
        .poll(
          async () => {
            await page.evaluate((step) => window.scrollBy(0, step), by);
            return done((await header.boundingBox())!.y);
          },
          { timeout: 15_000 },
        )
        .toBe(true);
    await scrollUntilHeaderY(80, (y) => y < 0);
    await expect(header).not.toBeInViewport();
    // Further down, the title and the bar have both reached the top (the header stays away while scrolling down).
    await page.evaluate(() => window.scrollBy(0, 300));
    await expect(header).not.toBeInViewport();
    await expect.poll(() => top(titleBar)).toBe(0);
    await expect.poll(() => top(bar)).toBe(48);
    await expect(title).toBeInViewport();
    await expect(filters).toBeInViewport();
    await expect(sort).toBeInViewport();
    await scrollUntilHeaderY(-40, (y) => y >= 0);
    await expect(header).toBeInViewport();
    await expect.poll(() => top(titleBar)).toBe(64);
    await expect.poll(() => top(bar)).toBe(112);
    await expect(filters).toBeInViewport();
  });

  test("the wheel keeps scrolling the home page smoothly when a scroll carries on over New and Featured", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const row = page.getByRole("region", { name: "New and Featured" }).getByRole("list").first();
    await row.scrollIntoViewIfNeeded();
    // The pointer rests in the white space just above the cards; the page scroll then brings them under it.
    const box = (await row.boundingBox())!;
    await page.evaluate((by) => window.scrollBy(0, by), box.y - 500);
    const rowTop = (await row.boundingBox())!.y;
    await page.mouse.move(box.x + 200, rowTop - 120);

    // Every frame's scroll position, and when it last changed.
    const start = await page.evaluate(() => {
      const w = window as unknown as { ys: number[]; changedAt: number };
      w.ys = [window.scrollY];
      w.changedAt = performance.now();
      const tick = () => {
        if (window.scrollY !== w.ys.at(-1)) w.changedAt = performance.now();
        w.ys.push(window.scrollY);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      return window.scrollY;
    });
    // A trackpad-like scroll: small, mostly downward ticks with a little sideways drift now and then.
    for (let i = 0; i < 30; i++) await page.mouse.wheel(i % 3 === 0 ? 3 : 0, 30);
    await expect
      .poll(() =>
        page.evaluate(() => performance.now() - (window as unknown as { changedAt: number }).changedAt),
      )
      .toBeGreaterThan(300);

    const { ys, end } = await page.evaluate(() => ({
      ys: (window as unknown as { ys: number[] }).ys,
      end: window.scrollY,
    }));
    // It never springs back up on the way down (owner: "it goes up and down like a spring"), and it got somewhere.
    const steps = ys.slice(1).map((y, i) => y - ys[i]!);
    expect(Math.min(...steps)).toBeGreaterThan(-0.5);
    expect(end - start).toBeGreaterThan(600);
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
