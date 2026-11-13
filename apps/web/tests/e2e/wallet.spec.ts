import { expect, test } from "@playwright/test";
import { createDbClient } from "@virzeen/db";
import { E2E_DATABASE_URL } from "./env";
import { addToBag, checkoutWith, completeEmailSignIn, uniqueEmail } from "./helpers";

// Points and credit (docs/specs/wallet.md): spend them at checkout, see the balances and lines on the account page.

async function giveWallet(email: string, lines: { kind: "POINTS" | "CREDIT"; amount: number }[]) {
  const db = createDbClient(E2E_DATABASE_URL);
  try {
    const user = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
    for (const line of lines) {
      await db.walletEntry.create({
        data: {
          userId: user.id,
          kind: line.kind,
          type: "ADJUST",
          amount: line.amount,
          remaining: line.amount,
          reason: "Welcome gift",
        },
      });
    }
  } finally {
    await db.$disconnect();
  }
}

test("a member pays part of an order with credit and points and sees their balances drop", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.51" });
  const email = uniqueEmail("wallet");
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, email);
  await giveWallet(email, [
    { kind: "CREDIT", amount: 50_000 }, // Rs. 500
    { kind: "POINTS", amount: 1_000 },
  ]);

  await addToBag(page, "monochrome-oversized-tee", { color: "Black", size: "M" }); // Rs. 2,450 + Rs. 150 delivery
  await checkoutWith(page, /Cash on delivery/, { continueToReview: false });
  await expect(page.getByTestId("checkout-total")).toHaveText("रु 2,600");
  const panel = page.getByTestId("wallet-panel");
  await expect(panel).toContainText("रु 500 available");
  await expect(panel).toContainText("1000 available");

  await panel.getByRole("checkbox", { name: /Use my credit/ }).check();
  await expect(page.getByTestId("checkout-credit")).toHaveText("−रु 500");
  await expect(page.getByTestId("checkout-total")).toHaveText("रु 2,100");
  // Points pay for at most 20% of the products: 20% of रु 2,450 is रु 490.
  await panel.getByRole("checkbox", { name: /Use my points/ }).check();
  await expect(page.getByTestId("checkout-points")).toHaveText("−रु 490");
  await expect(page.getByTestId("checkout-total")).toHaveText("रु 1,610");

  await page.getByRole("radio", { name: /Cash on delivery/ }).click();
  await expect(page.getByTestId("review-credit")).toBeVisible();
  await expect(page.getByTestId("review-points")).toBeVisible();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?order=VZ-\d{6}-\d{4}/);

  await page.goto("/account/membership");
  await expect(page.getByTestId("wallet-points")).toHaveText("510");
  await expect(page.getByTestId("wallet-credit")).toHaveCount(0);
  const lines = page.getByRole("list", { name: "Recent points and credit" });
  await expect(lines).toContainText("Spent");
  await expect(lines).toContainText("Welcome gift");
});

test("a member with no points or credit sees no wallet choices at checkout", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.52" });
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, uniqueEmail("nowallet"));
  await addToBag(page, "monochrome-oversized-tee", { color: "Black", size: "M" });
  await checkoutWith(page, /Cash on delivery/, { continueToReview: false });
  await expect(page.getByTestId("wallet-panel")).toHaveCount(0);
});
