import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./helpers";

// Journey: favourites (docs/specs/favourites.md). A guest's favourites live in the browser and move to the
// account on sign-in.
test.describe("Favourites", () => {
  test("a guest's favourite moves to the account on sign-in and can be removed", async ({ page }) => {
    await page.goto("/product/linen-overshirt");
    await page.getByRole("radio", { name: "Bone", exact: true }).click();
    await page.getByRole("button", { name: "Favourite", exact: true }).click();
    await expect(page.getByRole("button", { name: "Favourited", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("banner").getByRole("link", { name: "Favourites" }).click();
    await expect(page).toHaveURL(/\/favourites$/);
    await expect(page.getByRole("heading", { level: 1, name: "Favourites" })).toBeVisible();
    // The saved style: its name on the card, and the card opens the product in that style.
    const card = page.getByRole("link", { name: /Linen Overshirt/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Bone");
    await expect(card).toHaveAttribute("href", "/product/linen-overshirt?style=Bone");
    await expect(page.getByText("1 item", { exact: true })).toBeVisible();

    await signIn(page, uniqueEmail("favourites"), "/favourites");
    await expect(card).toBeVisible();
    // Moved to the account: gone from the browser, and still listed after a reload (rendered from the account).
    await expect.poll(() => page.evaluate(() => localStorage.getItem("virzeen:favourites"))).toBeNull();
    await page.reload();
    await expect(card).toBeVisible();

    // The card goes at once; the save is the Server Action's POST to this page.
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === "/favourites",
    );
    await page.getByRole("button", { name: "Remove Linen Overshirt, Bone" }).click();
    await expect(page.getByText("No favourites yet")).toBeVisible();
    // The pressed button is gone, so focus goes to the heading.
    await expect(page.getByRole("heading", { level: 1, name: "Favourites" })).toBeFocused();
    expect((await saved).ok()).toBe(true);
    await page.reload();
    await expect(page.getByText("No favourites yet")).toBeVisible();
  });
});
