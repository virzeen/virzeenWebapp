import { expect, test } from "@playwright/test";
import { completeEmailSignIn, uniqueEmail } from "./helpers";

// The profile, laid out like Nike's (docs/specs/member-area-nike-layout.md): Interests, "Find your next favourite" and
// Member Benefits, in that order.

test("a member adds an interest and sees it on the profile, then clears it", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.51" });
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, uniqueEmail("interests"));
  await expect(page).toHaveURL(/\/account$/);

  // Nike's order: Interests, then the recommendations, then the benefits.
  const interests = page.getByTestId("interests");
  await expect(interests.getByRole("heading", { level: 2, name: "Interests" })).toBeVisible();
  await expect(interests.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: "Find your next favourite" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Member Benefits" })).toBeVisible();
  await expect(interests.getByTestId("interest-tile")).toHaveCount(0);

  // The dialog: Save stays off until something is chosen.
  await interests.getByTestId("add-interests").click();
  const dialog = page.getByRole("dialog", { name: "Your interests" });
  await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
  const first = dialog.getByRole("checkbox").first();
  const label = (await first.evaluate((node) => node.closest("label")?.textContent ?? "")).trim();
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
    .getByRole("dialog", { name: "Your interests" })
    .getByRole("checkbox", { checked: true })
    .first()
    .click();
  await page.getByRole("dialog", { name: "Your interests" }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog", { name: "Your interests" })).toBeHidden();
  await interests.getByRole("tab", { name: "All" }).click();
  await expect(interests.getByTestId("interest-tile")).toHaveCount(0);
});
