import { expect, test, type Page } from "@playwright/test";
import { createDbClient } from "@virzeen/db";
import { E2E_DATABASE_URL } from "./env";
import { completeEmailSignIn, uniqueEmail } from "./helpers";

// Who may buy from a collection or a product (docs/specs/catalog-groups-visibility.md, owner 2026-11-16): everyone sees
// a Monochrome Pass item, locked, in a "For Members only" row; only a Pass member can add it to the bag.

const COLLECTION = "e2e-pass-club";
const PRODUCT = "e2e-pass-only-tee";

/** A Pass-only collection with one public product in it, in the throwaway e2e database. */
async function makePassOnlyCollection() {
  const db = createDbClient(E2E_DATABASE_URL);
  try {
    const collection = await db.collection.upsert({
      where: { slug: COLLECTION },
      create: { slug: COLLECTION, name: "E2E Pass Club", audience: "PASS", sortOrder: 90 },
      update: { audience: "PASS", archivedAt: null },
    });
    await db.product.upsert({
      where: { slug: PRODUCT },
      create: {
        slug: PRODUCT,
        name: "E2E Pass Only Tee",
        description: "Only for the Monochrome Pass.",
        isPublished: true,
        publishedAt: new Date(),
        mainCollectionId: collection.id,
        collections: { connect: { id: collection.id } },
        images: { create: [{ url: "/placeholder/product-1.jpg", alt: "Front view", sortOrder: 0 }] },
        variants: {
          create: [{ sku: "VZ-E2EPASS-STD", pricePaisa: 250_000, stock: 5, isActive: true }],
        },
        fromPricePaisa: 250_000,
      },
      update: { archivedAt: null, isPublished: true },
    });
  } finally {
    await db.$disconnect();
  }
}

async function grantPass(email: string) {
  const db = createDbClient(E2E_DATABASE_URL);
  try {
    await db.user.update({
      where: { email },
      data: { passStartsAt: new Date(), passEndsAt: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000) },
    });
  } finally {
    await db.$disconnect();
  }
}

test("a Pass-only collection is seen by everyone, locked, and only a Pass member can buy from it", async ({
  page,
}) => {
  await makePassOnlyCollection();
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.61" });
  const lockedButton = page.getByRole("link", { name: "Only for Monochrome members" });
  const addToBag = page.getByTestId("add-to-bag");

  // A visitor sees the collection and its product in the "For Members only" row, and the page with a locked button.
  await page.goto(`/collections/${COLLECTION}`);
  await expect(page.getByRole("heading", { level: 1, name: /E2E Pass Club/ })).toBeVisible();
  const row = page.getByRole("region", { name: "For Members only" });
  await expect(row.getByRole("link", { name: /E2E Pass Only Tee/ })).toBeVisible();
  await expect(row.getByText("Members only", { exact: true })).toBeVisible();
  await page.goto("/shop");
  await expect(
    page.getByRole("region", { name: "For Members only" }).getByRole("link", { name: /E2E Pass Only Tee/ }),
  ).toBeVisible();
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(PRODUCT);
  await page.goto(`/product/${PRODUCT}`);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Pass Only Tee" })).toBeVisible();
  await expect(addToBag).toHaveCount(0);
  await expect(lockedButton).toHaveAttribute("href", /\/login\?next=%2Fproduct%2Fe2e-pass-only-tee/);
  await lockedButton.click();
  await expect(page).toHaveURL(/\/login/);

  // A MONO Member (free) is a public shopper: the same locked button, which points to the Monochrome Pass.
  const email = uniqueEmail("passclub");
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto(`/product/${PRODUCT}`);
  await expect(addToBag).toHaveCount(0);
  await expect(lockedButton).toHaveAttribute("href", "/membership");

  // A Pass member buys it like any other product.
  await grantPass(email);
  await page.goto(`/collections/${COLLECTION}`);
  await page.getByRole("link", { name: /E2E Pass Only Tee/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Pass Only Tee" })).toBeVisible();
  await expect(lockedButton).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Select a size" }).or(addToBag)).toBeVisible();
});
