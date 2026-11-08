import { expect, test } from "@playwright/test";

// specs/search.md: the header search panel's live results, then every match on /shop?q=.
test.describe("Search", () => {
  test("customer finds a product while typing and opens every match @mobile", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Search" }).click();

    const panel = page.getByRole("dialog", { name: "Search" });
    const box = panel.getByRole("searchbox", { name: "Search products" });
    await expect(box).toBeFocused();
    // Before typing: "Popular search terms" chips, each a search for its term.
    const terms = panel.getByRole("navigation", { name: "Popular search terms" });
    await expect(terms.getByRole("link", { name: "tops" })).toHaveAttribute("href", "/shop?q=tops");

    // Live results: a name word and a colour must both match.
    await box.pressSequentially("black tee");
    await expect(panel.getByRole("status")).toHaveText("1 product");
    await expect(panel.getByRole("link", { name: /Monochrome Oversized Tee/ })).toBeVisible();
    await expect(panel.getByRole("link", { name: "See all results" })).toHaveAttribute(
      "href",
      "/shop?q=black%20tee",
    );

    // Enter opens the shop listing for the same query; the panel closes.
    await box.press("Enter");
    await expect(page).toHaveURL(/\/shop\?q=black(\+|%20)tee$/);
    await expect(panel).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: 'Results for "black tee"' })).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: /Monochrome Oversized Tee/ }),
    ).toBeVisible();
  });

  test("a search with no match says so and offers every product", async ({ page }) => {
    // Opened directly (a shared link, a search engine), the page names the search and isn't indexed. After an
    // in-app search the production build keeps the prefetched /shop tab title (known issue, specs/search.md).
    await page.goto("/shop?q=zzzz");
    await expect(page).toHaveTitle('Results for "zzzz" | Virzeen');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
    await expect(page.getByText('Nothing matches "zzzz".')).toBeVisible();
    await page.getByRole("link", { name: "Show all products" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Shop" })).toBeVisible();

    await page.getByRole("banner").getByRole("button", { name: "Search" }).click();
    const panel = page.getByRole("dialog", { name: "Search" });
    await panel.getByRole("searchbox", { name: "Search products" }).pressSequentially("zzzz");
    await expect(panel.getByText('Nothing matches "zzzz".')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(page.getByRole("banner").getByRole("button", { name: "Search" })).toBeFocused();
  });
});
