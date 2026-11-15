import { expect, test, type Page } from "@playwright/test";
import { createDbClient } from "@virzeen/db";
import { E2E_DATABASE_URL } from "./env";
import { completeEmailSignIn, uniqueEmail } from "./helpers";

// Who may see a collection or a product (docs/specs/catalog-groups-visibility.md): hidden completely from everyone
// else (the address shows "not found", no menu entry, no sitemap line), shown to the Monochrome Pass.

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

const notFound = (page: Page) => page.getByText("We couldn't find that page.");

test("a Pass-only collection is not found for a visitor or a MONO Member, and shown to a Pass member", async ({
  page,
}) => {
  await makePassOnlyCollection();
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.61" });

  // A visitor: nothing of it anywhere.
  await page.goto(`/collections/${COLLECTION}`);
  await expect(notFound(page)).toBeVisible();
  await page.goto(`/product/${PRODUCT}`);
  await expect(notFound(page)).toBeVisible();
  await page.goto("/shop");
  await expect(page.getByRole("link", { name: /E2E Pass Only Tee/ })).toHaveCount(0);
  await page.goto("/shop?q=pass+club");
  await expect(page.getByRole("link", { name: /E2E Pass Only Tee/ })).toHaveCount(0);
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain(COLLECTION);
  expect(sitemap).not.toContain(PRODUCT);

  // A MONO Member (free): the same.
  const email = uniqueEmail("passclub");
  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto(`/collections/${COLLECTION}`);
  await expect(notFound(page)).toBeVisible();
  await page.goto(`/product/${PRODUCT}`);
  await expect(notFound(page)).toBeVisible();

  // A Pass member: the collection, its product and the menu entry.
  await grantPass(email);
  await page.goto(`/collections/${COLLECTION}`);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Pass Club" })).toBeVisible();
  await expect(page.getByRole("link", { name: /E2E Pass Only Tee/ })).toBeVisible();
  await page.getByRole("link", { name: /E2E Pass Only Tee/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Pass Only Tee" })).toBeVisible();
});
