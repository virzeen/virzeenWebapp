import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./helpers";

// Journey: favourites (docs/specs/favourites.md). A guest's favourites live in the browser and move to the
// account on sign-in; the page (Nike layout) adds a favourite to the bag through the Add to bag popup, removes it
// with the heart (Undo, then the card fades away), and the bag page shows favourites or "You might also like".
test.describe("Favourites", () => {
  test("a guest's favourite moves to the account on sign-in, goes into the bag and is removed with the heart", async ({
    page,
  }) => {
    await page.goto("/product/linen-overshirt");
    await page.getByRole("radio", { name: "Bone", exact: true }).click();
    await page.getByRole("button", { name: "Favourite", exact: true }).click();
    // "Added to favourites" drops down with the product in the saved style, and "View favourites".
    const addedPanel = page.getByRole("dialog", { name: "Added to favourites" });
    await expect(addedPanel.getByText("Linen Overshirt")).toBeVisible();
    await expect(addedPanel.getByText("Tops · Bone")).toBeVisible();
    await expect(addedPanel.getByRole("link", { name: "View favourites" })).toHaveAttribute(
      "href",
      "/favourites",
    );
    await page.keyboard.press("Escape");
    await expect(addedPanel).toBeHidden();
    const favourited = page.getByRole("button", { name: "Favourited", exact: true });
    await expect(favourited).toHaveAttribute("aria-pressed", "true");
    await expect(favourited).toBeFocused();

    await page.getByRole("banner").getByRole("link", { name: "Favourites" }).click();
    await expect(page).toHaveURL(/\/favourites$/);
    const heading = page.getByRole("heading", { level: 1, name: "Favourites" });
    await expect(heading).toBeVisible();
    // The saved style: the card opens the product in that style and says "Category · Style".
    const card = page.getByRole("link", { name: /Linen Overshirt/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Tops · Bone");
    await expect(card).toHaveAttribute("href", "/product/linen-overshirt?style=Bone");
    // The count is for screen readers only.
    await expect(page.getByText("1 item", { exact: true })).toHaveClass(/sr-only/);

    await signIn(page, uniqueEmail("favourites"), "/favourites");
    await expect(card).toBeVisible();
    // Moved to the account: gone from the browser, and still listed after a reload (rendered from the account).
    await expect.poll(() => page.evaluate(() => localStorage.getItem("virzeen:favourites"))).toBeNull();
    await page.reload();
    await expect(card).toBeVisible();

    // "Add to bag": the popup with the style's sizes as on the product page (Bone XL is sold out).
    const addToBag = page.getByRole("button", { name: "Add to bag" });
    await addToBag.click();
    const popup = page.getByRole("dialog", { name: "Linen Overshirt" });
    await expect(popup).toHaveAccessibleDescription("Tops · Bone");
    await expect(popup.getByRole("radio", { name: "XL", exact: true })).toBeDisabled();
    await expect(popup.getByRole("link", { name: "View full product" })).toHaveAttribute(
      "href",
      "/product/linen-overshirt?style=Bone",
    );
    // Before a size: "Select a size", and focus on the first size.
    await popup.getByRole("button", { name: "Add to bag" }).click();
    await expect(popup.getByText("Select a size")).toBeVisible();
    await expect(popup.getByRole("radio", { name: "S", exact: true })).toBeFocused();
    await popup.getByRole("radio", { name: "M", exact: true }).click();
    await popup.getByRole("button", { name: "Add to bag" }).click();
    await expect(popup).toBeHidden();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag).toHaveAccessibleDescription("Added to bag · 1 item");
    await expect(bag.getByText("Linen Overshirt")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(bag).toBeHidden();
    // The pill now says "Added" and keeps focus.
    const added = page.getByRole("button", { name: "Added to bag. Add another" });
    await expect(added).toBeFocused();

    // The bag page lists the favourite under the bag, already added.
    await page.goto("/cart");
    const bagFavourites = page.getByRole("region", { name: "Favourites" });
    await expect(bagFavourites.getByRole("link", { name: "Linen Overshirt", exact: true })).toBeVisible();
    await expect(bagFavourites.getByRole("button", { name: "Added to bag. Add another" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "You might also like" })).toHaveCount(0);

    // The heart removes it at once (the save is the Server Action's POST); Undo saves it again.
    await page.goto("/favourites");
    const heart = page.getByRole("button", { name: "Favourite Linen Overshirt, Bone" });
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Removed from favourites")).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Removed from favourites")).toBeHidden();

    // Removed again and left alone: 5 seconds later the card fades away and the empty state shows.
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === "/favourites",
    );
    await heart.click();
    expect((await saved).ok()).toBe(true);
    const empty = page.getByText("Items added to your Favourites will be saved here.");
    await expect(empty).toBeVisible({ timeout: 10_000 });
    await expect(card).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("link", { name: "Shop", exact: true })).toHaveAttribute(
      "href",
      "/shop",
    );
    await page.reload();
    await expect(empty).toBeVisible();

    // No favourites: the bag page suggests products instead.
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "You might also like" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Favourites" })).toHaveCount(0);
  });
});
