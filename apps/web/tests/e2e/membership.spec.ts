import { expect, test } from "@playwright/test";
import { createDbClient } from "@virzeen/db";
import { E2E_DATABASE_URL } from "./env";
import { addToBag, checkoutWith, completeEmailSignIn, uniqueEmail } from "./helpers";

// The profile's membership (points card and benefits row), the member portal's Pass offer, and the public
// Membership page (docs/specs/membership-portal.md).

async function grantPass(email: string, endsAt: Date) {
  const db = createDbClient(E2E_DATABASE_URL);
  try {
    await db.user.update({ where: { email }, data: { passStartsAt: new Date(), passEndsAt: endsAt } });
  } finally {
    await db.$disconnect();
  }
}

test("a free MONO Member sees their card, and the Pass offer in the portal", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.41" });
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, uniqueEmail("freemember"));
  await expect(page).toHaveURL(/\/account$/);

  // The profile holds the membership (owner 2026-11-13): the points card, then the benefits as a row of cards.
  await expect(page.getByTestId("wallet-panel")).toBeVisible();
  const benefits = page.getByRole("region", { name: "Member Benefits" });
  await expect(benefits.getByTestId("benefit-card")).toHaveCount(6);
  await expect(page.getByTestId("perk-express")).toHaveCount(0);
  await expect(page.getByTestId("member-highlights")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "The Monochrome Pass" })).toHaveCount(0);

  // The portal: the Pass offer with both plans, and no way to buy it yet.
  await page.getByRole("link", { name: "Your membership" }).click();
  await expect(page).toHaveURL(/\/account\/membership$/);
  const offer = page.getByRole("region", { name: "The Monochrome Pass" });
  await expect(offer).toContainText("रु 499");
  await expect(offer).toContainText("रु 2,999");
  await expect(offer).toContainText("रु 4,599");
  await expect(offer.getByRole("button", { name: "Pass opens soon" })).toBeDisabled();

  await page.goto("/membership");
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

  await expect(page.getByRole("region", { name: "Member Benefits" }).getByTestId("benefit-card")).toHaveCount(
    6,
  );
  await expect(page.getByTestId("wallet-panel")).toBeVisible();

  // A benefit's page shows the member's own card for it: a Pass member has 3 Express Deliveries a month.
  await page.goto("/membership/benefits/express-delivery");
  await expect(page.getByRole("heading", { level: 1, name: "Express Delivery" })).toBeVisible();
  await expect(page.getByTestId("benefit-live").getByTestId("express-left")).toHaveText("3 of 3 left");
  await expect(page.getByTestId("member-highlights")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "The Monochrome Pass" })).toHaveCount(0);
});

test("a member opens a benefit from the profile and a guest reads it with a sign-in button", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.44" });
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, uniqueEmail("benefitpage"));
  await expect(page).toHaveURL(/\/account$/);

  // Each card on the profile opens its page, which has the row of the other five and the member's own card.
  await page
    .getByRole("link", { name: /Refer a friend/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/membership\/benefits\/refer-a-friend$/);
  await expect(page.getByRole("heading", { level: 1, name: "Refer a friend" })).toBeVisible();
  await expect(page.getByTestId("benefit-live").getByTestId("referral-code")).toBeVisible();
  await expect(page.getByRole("region", { name: "Member Benefits" }).getByTestId("benefit-card")).toHaveCount(
    5,
  );

  // A guest reads the same page, with no personal card and a way to sign in.
  await page.context().clearCookies();
  await page.goto("/membership/benefits/birthday-reward");
  await expect(page.getByRole("heading", { level: 1, name: "Birthday reward" })).toBeVisible();
  await expect(page.getByTestId("benefit-live")).toHaveCount(0);
  await expect(page.getByTestId("benefit-feature").getByRole("link", { name: "Sign in" })).toBeVisible();

  const missing = await page.goto("/membership/benefits/nothing-here");
  expect(missing?.status()).toBe(404);
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

test("the Membership portal shows a free member their benefits and a Pass member their hero and savings", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.43" });
  const email = uniqueEmail("portal");
  await page.goto("/login?next=%2Faccount%2Fmembership");
  await completeEmailSignIn(page, email);
  await expect(page).toHaveURL(/\/account\/membership$/);
  await expect(page.getByTestId("wallet-panel")).toBeVisible();
  await expect(page.getByRole("region", { name: "The Monochrome Pass" })).toBeVisible();

  await grantPass(email, new Date(Date.now() + 40 * 24 * 60 * 60 * 1000));
  await page.goto("/account/membership");
  await expect(page.getByRole("heading", { level: 1, name: /Welcome back/ })).toBeVisible();
  await expect(page.getByTestId("pass-days-left")).toContainText(/\d+ days left/);
  await expect(page.getByTestId("pass-saved")).toHaveText("रु 0");
  await expect(page.getByRole("heading", { level: 2, name: "Everything your Pass includes" })).toBeVisible();
  // Pass benefits that work today show a tick; the rest say Soon.
  await expect(page.getByRole("heading", { level: 3, name: "Delivery and dispatch" })).toBeVisible();
  await expect(page.getByRole("region", { name: "The Monochrome Pass" })).toHaveCount(0);
});

test("a Pass member pays no delivery and gets 10% off, and a code replaces the 10%", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.44" });
  const email = uniqueEmail("passbuy");
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, email);
  await grantPass(email, new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
  await addToBag(page, "monochrome-oversized-tee", { color: "Black", size: "M" });

  // The bag: रु 2,450 less 10% (रु 245), delivery free.
  await page.goto("/cart");
  await expect(page.getByTestId("cart-pass-discount")).toHaveText("−रु 245");
  await expect(page.getByTestId("cart-delivery")).toHaveText("Free");
  await expect(page.getByTestId("cart-total")).toHaveText("रु 2,205");

  // Checkout: the Pass discount line, what the Pass saved (245 + the रु 150 a member would pay), and the order.
  await checkoutWith(page, /Cash on delivery/, { continueToReview: false });
  await expect(page.getByTestId("checkout-total")).toHaveText("रु 2,205");
  await expect(page.getByText("Monochrome Pass discount")).toBeVisible();
  await expect(page.getByTestId("pass-saving")).toHaveText("You saved रु 395 with your Pass.");
  await page.getByRole("radio", { name: /Cash on delivery/ }).click();
  await expect(page.getByTestId("review-discount")).toContainText("Monochrome Pass discount");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?order=VZ-\d{6}-\d{4}/);
});
