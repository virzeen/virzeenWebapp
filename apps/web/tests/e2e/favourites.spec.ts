import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./helpers";

// Journey: favourites (docs/specs/favourites.md). A guest's favourites live in the browser and move to the
// account on sign-in; the page (Nike layout) adds a favourite to the bag and removes it in edit mode.
test.describe("Favourites", () => {
  test("a guest's favourite moves to the account on sign-in, goes into the bag and is removed in edit mode", async ({
    page,
  }) => {
    await page.goto("/product/linen-overshirt");
    await page.getByRole("radio", { name: "Bone", exact: true }).click();
    await page.getByRole("button", { name: "Favourite", exact: true }).click();
    await expect(page.getByRole("button", { name: "Favourited", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

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

    // "Select size": the style's sizes as on the product page (Bone XL is sold out), then Add to bag.
    const selectSize = page.getByRole("button", { name: "Select size" });
    await selectSize.click();
    const popup = page.getByRole("dialog", { name: "Select size" });
    await expect(popup).toContainText("Linen Overshirt");
    await expect(popup.getByRole("radio", { name: "XL", exact: true })).toBeDisabled();
    await popup.getByRole("radio", { name: "M", exact: true }).click();
    await popup.getByRole("button", { name: "Add to bag" }).click();
    await expect(popup).toBeHidden();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag.getByText("Added to bag")).toBeVisible();
    await expect(bag.getByText("Linen Overshirt")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(bag).toBeHidden();
    await expect(selectSize).toBeFocused();

    // Edit mode: a round Remove on the photo. The card goes at once; the save is the Server Action's POST.
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const done = page.getByRole("button", { name: "Done", exact: true });
    await expect(done).toHaveAttribute("aria-pressed", "true");
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === "/favourites",
    );
    await page.getByRole("button", { name: "Remove Linen Overshirt, Bone" }).click();
    const empty = page.getByText("Items added to your Favourites will be saved here.");
    await expect(empty).toBeVisible();
    // No card left to move to, so focus goes to "Done"; pressing it leaves edit mode and hides it.
    await expect(done).toBeFocused();
    expect((await saved).ok()).toBe(true);
    await done.click();
    await expect(heading).toBeFocused();
    await expect(page.getByRole("button", { name: /^(Edit|Done)$/ })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("link", { name: "Shop", exact: true })).toHaveAttribute(
      "href",
      "/shop",
    );

    await page.reload();
    await expect(empty).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  });
});
