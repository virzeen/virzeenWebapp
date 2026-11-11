import { expect, test } from "@playwright/test";
import { createDbClient } from "@virzeen/db";
import { E2E_DATABASE_URL } from "./env";
import { completeEmailSignIn, uniqueEmail } from "./helpers";

// The member portal: a free MONO Member's card and the Pass offer, a Pass member's black card, and the public
// Membership page (docs/specs/membership-portal.md).

async function grantPass(email: string, endsAt: Date) {
  const db = createDbClient(E2E_DATABASE_URL);
  try {
    await db.user.update({ where: { email }, data: { passStartsAt: new Date(), passEndsAt: endsAt } });
  } finally {
    await db.$disconnect();
  }
}

test("a free MONO Member sees their card, the free benefits and the Pass offer", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.41" });
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, uniqueEmail("freemember"));
  await expect(page).toHaveURL(/\/account$/);

  await expect(page.getByRole("heading", { level: 2, name: "MONO Member" })).toBeVisible();
  await expect(page.getByRole("img", { name: "MONO Member card" })).toBeVisible();
  const highlights = page.getByTestId("member-highlights");
  await expect(highlights).toContainText("Ships within 24 hours");
  await expect(highlights).toContainText("रु 150");

  // The Pass offer: both plans, and no way to buy it yet.
  const offer = page.getByRole("region", { name: "The Monochrome Pass" });
  await expect(offer).toContainText("रु 2,999");
  await expect(offer).toContainText("रु 4,599");
  await expect(offer.getByRole("button", { name: "Pass opens soon" })).toBeDisabled();

  await page.getByRole("link", { name: "See every benefit" }).click();
  await expect(page).toHaveURL(/\/membership$/);
  await expect(page.getByRole("heading", { level: 1, name: "Shop your way" })).toBeVisible();
  // The viewer's own level is marked on the cards, and its table headers are the bold ones.
  await expect(page.locator("article[data-current]")).toContainText("MONO Member");
  await expect(page.locator('th[aria-current="true"]').first()).toHaveText("MONO Member");
});

test("a Monochrome Pass member sees the black card and no offer", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.42" });
  const email = uniqueEmail("passmember");
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, email);
  await grantPass(email, new Date("2027-05-10T00:00:00.000Z"));
  await page.goto("/account");

  await expect(page.getByRole("heading", { level: 2, name: "Monochrome Pass" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Monochrome Pass card" })).toContainText(
    "Valid until 10 May 2027",
  );
  await expect(page.getByTestId("member-highlights")).toContainText("Free delivery on every order");
  await expect(page.getByRole("region", { name: "The Monochrome Pass" })).toHaveCount(0);
});

test("a guest sees the three levels and is asked to log in for the Pass", async ({ page }) => {
  await page.goto("/membership");
  await expect(page.getByRole("heading", { level: 2, name: "Guest" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "MONO Member" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Monochrome Pass" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in to get the Pass" })).toHaveAttribute(
    "href",
    /\/login\?next=%2Fmembership/,
  );
  await expect(page.locator("article[data-current]")).toContainText("Guest");
  // The table: Pass delivery is free, a guest's is रु 200.
  await expect(page.getByRole("row", { name: /Delivery fee/ })).toContainText("रु 200");
  await expect(page.getByRole("row", { name: /Delivery fee/ })).toContainText("Free, no minimum");
});
