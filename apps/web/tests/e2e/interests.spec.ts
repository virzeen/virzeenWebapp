import { expect, test } from "@playwright/test";
import { completeEmailSignIn, uniqueEmail } from "./helpers";

// The profile, laid out like Nike's (docs/specs/member-area-nike-layout.md): Your picks (Nike's Interests, in our own
// words), "Find your next favourite" and Member Benefits, in that order.

test("a member adds a pick and sees it on the profile, then clears it", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.51" });
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, uniqueEmail("interests"));
  await expect(page).toHaveURL(/\/account$/);

  // Nike's order: picks, then the recommendations, then the benefits.
  const interests = page.getByTestId("interests");
  await expect(interests.getByRole("heading", { level: 2, name: "Your picks" })).toBeVisible();
  await expect(interests.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: "Find your next favourite" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Member Benefits" })).toBeVisible();
  // The sideways rows never scroll up and down inside themselves (owner: the wheel over a card scrolled the row).
  for (const name of ["Find your next favourite", "Member Benefits"]) {
    const row = page
      .getByRole("region", { name })
      .locator("ul[class*='overflow-x-auto'], div[class*='overflow-x-auto']")
      .first();
    await expect(row).toHaveCSS("overflow-y", "hidden");
  }
  await expect(interests.getByTestId("interest-tile")).toHaveCount(0);

  // The dialog: Save stays off until something is chosen.
  await interests.getByTestId("add-interests").click();
  const dialog = page.getByRole("dialog", { name: "Select your picks" });
  await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
  await expect(dialog.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
  const first = dialog.getByRole("checkbox").first();
  // The row reads "{name}Category" or "{name}Collection": the name is what the tile shows.
  const label = (await first.evaluate((node) => node.closest("label")?.textContent ?? ""))
    .replace(/(Category|Collection)$/, "")
    .trim();
  await first.click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();

  // It shows as a tile (a category or a collection), and the tabs filter it.
  await expect(interests.getByTestId("interest-tile")).toHaveCount(1);
  await expect(interests.getByTestId("interest-tile")).toContainText(label);
  await interests.getByRole("tab", { name: "Collections" }).click();
  await expect(interests.getByRole("tab", { name: "Collections" })).toHaveAttribute("aria-selected", "true");

  // Edit clears it again.
  await interests.getByRole("button", { name: "Edit" }).click();
  await page
    .getByRole("dialog", { name: "Select your picks" })
    .getByRole("checkbox", { checked: true })
    .first()
    .click();
  await page.getByRole("dialog", { name: "Select your picks" }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog", { name: "Select your picks" })).toBeHidden();
  await interests.getByRole("tab", { name: "All" }).click();
  await expect(interests.getByTestId("interest-tile")).toHaveCount(0);
});

test("a card in Find your next favourite has a heart that saves it, and the wheel scrolls the page over a card", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.55" });
  await page.setViewportSize({ width: 1463, height: 900 });
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, uniqueEmail("cardheart"));
  await expect(page).toHaveURL(/\/account$/);

  // The round heart in the top right corner of the photo: it saves the product and turns filled.
  const row = page.getByRole("region", { name: "Find your next favourite" });
  const heart = row.getByTestId("card-heart").first();
  await heart.scrollIntoViewIfNeeded();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  const [photo, circle] = [await row.locator("img").first().boundingBox(), await heart.boundingBox()];
  expect(circle!.x + circle!.width).toBeGreaterThan(photo!.x + photo!.width - 24);
  expect(circle!.y).toBeLessThan(photo!.y + 24);
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog").getByText("Added to favourites")).toBeVisible();
  await page.keyboard.press("Escape");

  // The wheel over a card photo, with a little sideways drift as a trackpad gives, still scrolls the page.
  const image = row.locator("img").first();
  await image.scrollIntoViewIfNeeded();
  const box = (await image.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, Math.max(80, Math.min(box.y + box.height / 2, 800)));
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(4, 240);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 100);
});
