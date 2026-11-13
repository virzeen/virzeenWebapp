import { expect, test } from "@playwright/test";
import { createDbClient } from "@virzeen/db";
import { E2E_DATABASE_URL } from "./env";
import { addToBag, checkoutWith, completeEmailSignIn, uniqueEmail } from "./helpers";

// Member perks (docs/specs/member-perks.md): gift wrapping, Express Delivery, the birthday reward and referral codes.

async function setBirthdayThisMonth(email: string) {
  const db = createDbClient(E2E_DATABASE_URL);
  try {
    await db.user.update({
      where: { email },
      data: { birthday: new Date(Date.UTC(1995, new Date().getUTCMonth(), 15)) },
    });
  } finally {
    await db.$disconnect();
  }
}

test("a member adds gift wrapping and Express Delivery, and the order and the portal show them", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.61" });
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, uniqueEmail("perkcheckout"));
  await addToBag(page, "monochrome-oversized-tee", { color: "Black", size: "M" }); // रु 2,450 + रु 150 delivery
  await checkoutWith(page, /Cash on delivery/, { continueToReview: false });
  await expect(page.getByTestId("checkout-total")).toHaveText("रु 2,600");

  // Gift wrapping is रु 100 for a MONO Member.
  await page.getByRole("checkbox", { name: /Add gift wrapping/ }).check();
  await expect(page.getByTestId("checkout-gift-wrap")).toHaveText("रु 100");
  await expect(page.getByTestId("checkout-total")).toHaveText("रु 2,700");

  // Express Delivery: one a month for a MONO Member.
  const speed = page.getByTestId("delivery-speed");
  await expect(speed).toContainText("1 of 1 left this month");
  await speed.getByRole("radio", { name: /Express Delivery/ }).click();

  await page.getByRole("radio", { name: /Cash on delivery/ }).click();
  await expect(page.getByTestId("review-gift-wrap")).toContainText("रु 100");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?order=VZ-\d{6}-\d{4}/);
  await expect(page.getByTestId("order-gift-wrap")).toContainText("रु 100");
  await expect(page.getByText("Express", { exact: true })).toBeVisible();

  // The month's one Express is used: the portal says so, and checkout greys the option out.
  await page.goto("/account/membership");
  await expect(page.getByTestId("express-left")).toHaveText("0 of 1 left");
  await addToBag(page, "monochrome-oversized-tee", { color: "Black", size: "M" });
  // The saved address is already chosen, so checkout opens at Payment.
  await page.goto("/checkout");
  await expect(page.getByTestId("delivery-speed")).toContainText("Used this month");
  await expect(page.getByRole("radio", { name: /Express Delivery/ })).toBeDisabled();
});

test("a MONO Member gets 5% off in their birthday month, and a promo code is the only other discount", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.62" });
  const email = uniqueEmail("birthday");
  await page.goto("/login?next=%2Faccount%2Fmembership");
  await completeEmailSignIn(page, email);

  // No birthday yet: the card asks for it. Then it is saved once.
  await expect(page.getByTestId("perk-birthday")).toContainText("Add your birthday");
  await setBirthdayThisMonth(email);
  await page.goto("/account/membership");
  await expect(page.getByTestId("birthday-state")).toContainText("birthday month");

  // रु 2,450 less 5% (रु 122, whole rupees) and delivery रु 150 (the bag is under रु 3,000).
  await addToBag(page, "monochrome-oversized-tee", { color: "Black", size: "M" });
  await checkoutWith(page, /Cash on delivery/, { continueToReview: false });
  await expect(page.getByTestId("checkout-discount")).toHaveText("−रु 122");
  await expect(page.getByText("Birthday reward").first()).toBeVisible();
  await expect(page.getByTestId("checkout-total")).toHaveText("रु 2,478");
});

test("a member shares a code and a new member adds it before their first order", async ({ browser }) => {
  const inviter = await browser.newContext({ extraHTTPHeaders: { "X-Forwarded-For": "198.51.100.63" } });
  const inviterPage = await inviter.newPage();
  await inviterPage.goto("/login?next=%2Faccount%2Fmembership");
  await completeEmailSignIn(inviterPage, uniqueEmail("inviter"));
  const code = (await inviterPage.getByTestId("referral-code").textContent()) ?? "";
  expect(code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
  await expect(inviterPage.getByTestId("perk-referral")).toContainText("रु 200 credit");

  const friend = await browser.newContext({ extraHTTPHeaders: { "X-Forwarded-For": "198.51.100.64" } });
  const friendPage = await friend.newPage();
  await friendPage.goto("/login?next=%2Faccount%2Fmembership");
  await completeEmailSignIn(friendPage, uniqueEmail("friend"));
  const card = friendPage.getByTestId("perk-referral");
  await card.getByLabel("A friend's code").fill("NOTACODE");
  await card.getByRole("button", { name: "Add" }).click();
  await expect(card).toContainText("That code doesn't match anyone.");
  await card.getByLabel("A friend's code").fill(code.toLowerCase());
  await card.getByRole("button", { name: "Add" }).click();
  await expect(card).toContainText("Invited by");
  await expect(card.getByLabel("A friend's code")).toHaveCount(0);

  await inviter.close();
  await friend.close();
});
