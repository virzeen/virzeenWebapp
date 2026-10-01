import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN_EMAIL } from "./env";
import { completeEmailSignIn, signIn, totp, uniqueEmail } from "./helpers";

// Journeys 6–7 (testing-strategy.md §2) plus the admin TOTP step-up (security-policy.md §2).

/**
 * The product editor saves by itself after every finished edit (specs/product-editor-on-page.md): wait until the top
 * bar says "Saved" with nothing running, e.g. before leaving the page.
 */
async function expectSaved(page: Page) {
  const status = page.locator("[data-save-state]");
  await expect(status).toHaveAttribute("data-save-state", "saved");
  await expect(status).toHaveText("Saved");
}

/** A photo from the gallery's + tile. Uploads are off in e2e, so it opens the "Image reference" popup. */
async function addPhoto(page: Page, imageRef: string) {
  await page.getByTitle("Add photos").click();
  const popup = page.getByRole("dialog", { name: "Add photos" });
  await popup.getByLabel(/^Image reference/).fill(imageRef);
  await popup.getByRole("button", { name: "Add photo" }).click();
  await expect(popup).toBeHidden();
}

/** A style from the "Add style" button or + tile: the "Add a style" popup with its name. */
async function addStyle(page: Page, name: string) {
  await page.getByRole("button", { name: "Add style" }).click();
  const popup = page.getByRole("dialog", { name: "Add a style" });
  await popup.getByLabel(/^Style name/).fill(name);
  await popup.getByRole("button", { name: "Add style" }).click();
  await expect(popup).toBeHidden();
  await expect(page.getByRole("radio", { name, exact: true })).toBeChecked();
}

test("guests are sent to sign in, customers get a 404 for /admin, and Sign out ends the session", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);

  await signIn(page, uniqueEmail("customer"));
  const response = await page.goto("/admin/orders");
  expect(response?.status()).toBe(404);

  // Sign out from the account settings page (the same button as the admin header and admin settings).
  await page.goto("/account/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
});

test("admin sets up two-factor, builds a product on its page and it appears in the shop", async ({
  page,
}) => {
  // One long journey with a save after every edit.
  test.slow();
  await page.goto("/login?next=/admin");
  await completeEmailSignIn(page, E2E_ADMIN_EMAIL);
  await expect(page).toHaveURL(/\/admin\/verify/);

  // Enrol an authenticator, then pass the step-up.
  await page.getByRole("button", { name: "Set up authenticator" }).click();
  // Step 1: the key is only inside the QR code and the phone-only "open in app" link; backup codes on request.
  const qr = page.getByRole("img", { name: "Authenticator setup code" });
  await expect(qr).toBeVisible();
  const openInApp = page.locator('a[href^="otpauth:"]');
  await expect(openInApp).toBeHidden(); // desktop viewport
  const backupCode = page.getByText(/^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/).first();
  await expect(backupCode).toBeHidden();
  await page.getByRole("button", { name: "Show backup codes" }).click();
  await expect(backupCode).toBeVisible();
  const secret = new URL((await openInApp.getAttribute("href")) ?? "").searchParams.get("secret") ?? "";
  // Step 2: the QR code gives way to the code field.
  await page.getByRole("button", { name: "Next" }).click();
  await expect(qr).toBeHidden();
  await expect(page.getByText("2. Enter the 6-digit code your app shows.")).toBeVisible();
  await page.getByLabel(/6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: "Turn on two-factor" }).click();
  await expect(page.getByRole("button", { name: "Verify" })).toBeVisible();
  await page.getByLabel(/6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

  // A size guide (specs/size-guides.md): two measurements and two sizes in cm, picked on the product below.
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Size guides" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Size guides" })).toBeVisible();
  await page.getByRole("link", { name: "New size guide" }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("E2E Tops");
  await page.getByLabel("Measurement 1", { exact: true }).fill("Chest");
  await page.getByRole("button", { name: "Add measurement" }).click();
  await expect(page.getByLabel("Measurement 2", { exact: true })).toBeFocused();
  await page.getByLabel("Measurement 2", { exact: true }).fill("Length");
  await page.getByLabel("Size, row 1", { exact: true }).fill("M");
  await page.getByLabel("Chest (cm), M", { exact: true }).fill("96-101");
  await page.getByLabel("Length (cm), M", { exact: true }).fill("72");
  await page.getByRole("button", { name: "Add size" }).click();
  await page.getByLabel("Size, row 2", { exact: true }).fill("L");
  await page.getByLabel("Chest (cm), L", { exact: true }).fill("102-107");
  await page.getByLabel("Length (cm), L", { exact: true }).fill("74");
  await page
    .getByLabel(/^How to measure/)
    .fill("Chest: around the fullest part.\nLength: from the shoulder down.");
  await page.getByRole("button", { name: "Save size guide" }).click();
  await expect(page.getByText("Size guide saved")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/size-guides\/(?!new)[a-z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Tops" })).toBeVisible();
  await expect(page.getByLabel("Length (cm), L", { exact: true })).toHaveValue("74");

  // An Accessories guide is one size chart picture (specs/product-page-v2.md), shown as customers will see it.
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Size guides" }).click();
  await page.getByRole("link", { name: "New size guide" }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("E2E Bags");
  await page.getByRole("radio", { name: /^Accessories/ }).click();
  await page.getByRole("button", { name: "Save size guide" }).click();
  await expect(page.getByText("Upload the size chart picture").first()).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/size-guides\/new$/);
  // Uploads are off in e2e: the uploader takes an image reference instead.
  await page.getByLabel(/^Image reference/).fill("/placeholder/product-04.jpg");
  await page.getByRole("button", { name: "Add size chart picture" }).click();
  const customerView = page.getByRole("region", { name: "What customers see" });
  await expect(customerView.getByRole("img", { name: "E2E Bags size chart" })).toBeVisible();
  // Only the picture, as in the shop's popup (owner, 2026-10-01): no title, name or "Open full size".
  await expect(customerView.getByRole("link", { name: /Open full size/ })).toHaveCount(0);
  await expect(customerView.getByText("E2E Bags", { exact: true })).toHaveCount(0);
  await expect(customerView.getByRole("radiogroup", { name: "Units" })).toHaveCount(0);
  await page.getByRole("button", { name: "Save size guide" }).click();
  await expect(page).toHaveURL(/\/admin\/size-guides\/(?!new)[a-z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Bags" })).toBeVisible();
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Size guides" }).click();
  await expect(page.getByRole("row", { name: /E2E Bags/ }).getByText("Accessories")).toBeVisible();
  await expect(page.getByRole("row", { name: /E2E Tops/ }).getByText("Clothing")).toBeVisible();

  // New product (specs/product-editor-on-page.md): a small popup makes a draft, and its editor opens.
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Products" }).click();
  await page.getByRole("button", { name: "New product" }).click();
  const newProduct = page.getByRole("dialog", { name: "New product" });
  await newProduct.getByLabel(/^Product name/).fill("E2E Beanie");
  await newProduct.getByRole("combobox", { name: /Category/ }).click();
  await page.getByRole("option", { name: "Accessories" }).click();
  await newProduct.getByLabel(/^Price \(Rs\)/).fill("1350");
  await newProduct.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/(?!new)[a-z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Beanie" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Status: Draft" })).toBeVisible();

  // The editor is the product page: double-click the name, type, click outside, and it saves by itself.
  await page.getByRole("heading", { level: 1, name: "E2E Beanie" }).dblclick();
  const nameBox = page.getByRole("textbox", { name: "Product name" });
  await expect(nameBox).toBeFocused();
  await nameBox.fill("E2E Monochrome Beanie");
  await page.getByText(/^Prices include 13% VAT/).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Monochrome Beanie" })).toBeVisible();
  await expectSaved(page);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // A photo with the + tile at the end of the thumbnails; it becomes the main photo.
  await addPhoto(page, "/placeholder/product-06.jpg");
  await expect(page.getByTestId("gallery-main").getByText("Main photo", { exact: true })).toBeVisible();

  // The description, under the buttons (Ctrl+Enter saves a long text; so does clicking outside).
  await page.getByRole("button", { name: "Edit description", exact: true }).click();
  const description = page.getByRole("textbox", { name: "Description", exact: true });
  await description.fill("A ribbed beanie for cold Kathmandu mornings.");
  await description.press("Control+Enter");
  await expect(page.getByText("A ribbed beanie for cold Kathmandu mornings.")).toBeVisible();

  // The first style takes over the product's style number (-101).
  await addStyle(page, "Black");
  await expect(page.getByRole("radiogroup", { name: "Colour: Black" })).toBeVisible();

  // Sizes: the pencil opens the size chips; then each size box has the picked style's stock under it.
  await page.getByRole("button", { name: "Edit sizes" }).click();
  await page.getByRole("textbox", { name: "Sizes" }).fill("S, M,");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByLabel("Stock, Black, S", { exact: true }).fill("5");
  await page.getByLabel("Stock, Black, M", { exact: true }).fill("7");
  await page.getByLabel("Stock, Black, M", { exact: true }).press("Tab");
  await expectSaved(page);

  // Colour shown for the picked style, under the description.
  const colourShown = page.getByRole("textbox", { name: "Colour shown", exact: true });
  await page.getByRole("button", { name: "Edit colour shown of Black" }).click();
  await colourShown.fill("Black/White");
  await colourShown.press("Enter");
  await expect(page.getByText("Colour shown: Black/White")).toBeVisible();

  // A second style with its own photo and price. It's picked once added, and shows the shared photo until it has one.
  await addStyle(page, "Mountain print");
  await expect(page.getByText("These photos are shared by every style.", { exact: false })).toBeVisible();
  await addPhoto(page, "/placeholder/product-02.jpg");
  await expect(page.getByTestId("gallery-main").locator('img[src*="product-02"]')).toBeVisible();
  // Style photos turn the chips into picture tiles.
  await expect(page.getByRole("radiogroup", { name: "Style: Mountain print" })).toBeVisible();
  await page.getByRole("button", { name: "Edit price of Mountain print" }).click();
  const price = page.getByRole("textbox", { name: "Price (Rs)", exact: true });
  await price.fill("1650");
  await price.press("Enter");
  await expect(page.getByText(/Customers pay Rs 1,650/)).toBeVisible();
  await page.getByLabel("Stock, Mountain print, S", { exact: true }).fill("3");
  await page.getByLabel("Stock, Mountain print, S", { exact: true }).press("Tab");
  await expectSaved(page);
  // Back to Black: its own price and stock.
  await page.getByRole("radio", { name: "Black", exact: true }).click();
  await expect(page.getByText(/Customers pay Rs 1,350/)).toBeVisible();
  await expect(page.getByLabel("Stock, Black, M", { exact: true })).toHaveValue("7");

  // The product details popup's lists, in the box right under "View product details" (one per line).
  await page.getByRole("button", { name: "Edit product details" }).click();
  const detailLines = page.getByRole("textbox", { name: "Product details (one per line)" });
  await detailLines.fill("100% merino wool\nHand wash cold");
  await detailLines.press("Control+Enter");
  await page.getByRole("button", { name: "Edit benefits" }).click();
  const benefitLines = page.getByRole("textbox", { name: "Benefits (one per line)" });
  await benefitLines.fill("Keeps your ears warm\nSoft on the skin");
  await benefitLines.press("Control+Enter");
  const detailsBox = page.getByRole("region", { name: "In the product details popup" });
  await expect(detailsBox.getByText("100% merino wool")).toBeVisible();
  await expect(detailsBox.getByText("Keeps your ears warm")).toBeVisible();
  // Every product starts as made in China.
  await expect(page.getByText("Country/Region of origin: China")).toBeVisible();

  // Features that perform: pick Custom and build one row of one landscape picture (each choice saves at once), then
  // add a picture-only feature through the + tile. It saves straight away; the title comes later with its pencil.
  const features = page.getByRole("region", { name: "Features that perform" });
  await features.getByRole("radio", { name: "Custom", exact: true }).click();
  await features.getByRole("button", { name: "Add row" }).click();
  await features
    .getByRole("radiogroup", { name: "Pictures in row 1" })
    .getByRole("radio", { name: "1", exact: true })
    .click();
  await features
    .getByRole("radiogroup", { name: "Shape of row 1" })
    .getByRole("radio", { name: "Landscape" })
    .click();
  await expect(features.getByText("This row holds 1 picture. You have 0.")).toBeVisible();
  // Uploads are off in e2e, so the + tile opens the "Image reference" box.
  await features.getByRole("button", { name: "Add feature" }).click();
  const addFeature = page.getByRole("dialog", { name: "Add feature" });
  await addFeature.getByLabel(/^Image reference/).fill("/placeholder/product-03.jpg");
  await addFeature.getByRole("button", { name: "Add feature" }).click();
  await expect(addFeature).toBeHidden();
  await expect(features.getByText("1 of 9")).toBeVisible();
  await expect(features.getByText("This row holds 1 picture. You have 1.")).toBeVisible();
  await expectSaved(page);
  const titlePencil = features.getByRole("button", { name: "Edit title of feature 1" });
  await expect(titlePencil).toBeFocused();
  await titlePencil.click();
  const featureTitle = features.getByRole("textbox", { name: "Title", exact: true });
  await featureTitle.fill("Ribbed for warmth");
  await featureTitle.press("Enter");
  await expect(features.getByRole("heading", { level: 3, name: "Ribbed for warmth" })).toBeVisible();
  await expectSaved(page);
  // Drag to reorder: a second picture-only feature, dragged by its picture onto the first one's place, goes first and
  // saves at once. dnd-kit starts a mouse drag after 8px, so the pointer moves in steps.
  await features.getByRole("button", { name: "Add feature" }).click();
  await addFeature.getByLabel(/^Image reference/).fill("/placeholder/product-05.jpg");
  await addFeature.getByRole("button", { name: "Add feature" }).click();
  await expect(addFeature).toBeHidden();
  await expect(features.getByText("2 of 9")).toBeVisible();
  await expectSaved(page);
  const featureCards = features.locator("[data-feature]");
  // Mid-screen: clear of the sticky top bar, and of the edges where dragging scrolls the page.
  await featureCards.first().evaluate((card) => card.scrollIntoView({ block: "center" }));
  const dragFrom = await featureCards.nth(1).locator("img").boundingBox();
  const dropOn = await featureCards.first().locator("img").boundingBox();
  if (!dragFrom || !dropOn) throw new Error("The feature pictures aren't on screen");
  const [fromX, fromY] = [dragFrom.x + dragFrom.width / 2, dragFrom.y + dragFrom.height / 2];
  const [toX, toY] = [dropOn.x + dropOn.width / 2, dropOn.y + dropOn.height / 2];
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(fromX - 12, fromY, { steps: 3 });
  await page.mouse.move(toX, toY, { steps: 12 });
  await page.mouse.move(toX + 1, toY + 1);
  await page.mouse.up();
  await expect(featureCards.first().locator('img[src*="product-05"]')).toBeVisible();
  await expect(
    featureCards.nth(1).getByRole("heading", { level: 3, name: "Ribbed for warmth" }),
  ).toBeVisible();
  await expect(features.getByText("Moved feature 2 to position 1 of 2")).toBeAttached();
  await expectSaved(page);

  // The size guide, picked inside "Size and fit".
  await page.getByRole("button", { name: "Edit size guide" }).click();
  await page.getByRole("combobox", { name: "Size guide" }).click();
  await page.getByRole("option", { name: "E2E Tops" }).click();
  await expect(page.getByText("Size guide: E2E Tops")).toBeVisible();
  await expectSaved(page);

  // Settings: the slug followed the name (a draft never published); SKUs were made when the rows were saved.
  await page.getByRole("button", { name: "Settings" }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings.getByLabel(/URL slug/)).toHaveValue("e2e-monochrome-beanie");
  await settings.getByRole("checkbox", { name: /Edit SKU codes/ }).click();
  await expect(settings.getByLabel("SKU, Black, M")).toHaveValue("VZ-E2EMONOCHROM-BLACK-M");
  await page.keyboard.press("Escape");
  await expect(settings).toBeHidden();

  // Publish: the checklist passes, so it goes live.
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Product published")).toBeVisible();
  await expect(page.getByRole("button", { name: "Status: Published" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();
  await expectSaved(page);

  // Everything was saved: after a reload the page shows it, with the style number of the first style.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Monochrome Beanie" })).toBeVisible();
  await expect(page.getByLabel("Stock, Black, M", { exact: true })).toHaveValue("7");
  await expect(page.getByLabel(/^Stock, Black, /)).toHaveCount(2);
  await expect(page.getByText(/^Style: VZ\d{4,}-101$/)).toBeVisible();
  await expect(features.getByText("2 of 9")).toBeVisible();
  // The dragged order was saved.
  await expect(featureCards.first().locator('img[src*="product-05"]')).toBeVisible();
  // "You may also like": published products of the same category, as under the shop page.
  await expect(page.getByRole("heading", { level: 2, name: "You may also like" })).toBeVisible();

  // Preview: the product page in a new tab, following the editor as it changes.
  const [preview] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Preview", exact: true }).click(),
  ]);
  await expect(preview.getByText("Preview: only you can see this.", { exact: false })).toBeVisible();
  await expect(preview.getByRole("heading", { level: 1, name: "E2E Monochrome Beanie" })).toBeVisible();
  await expect(preview.getByText("Colour shown: Black/White")).toBeVisible();
  await expect(preview.getByRole("heading", { level: 2, name: "You may also like" })).toBeVisible();
  // The features in their layout (Custom: one landscape row, repeated), with the title added in the editor.
  await expect(preview.getByRole("heading", { level: 3, name: "Ribbed for warmth" })).toBeVisible();
  await page.getByRole("button", { name: "Edit colour shown of Black" }).click();
  await colourShown.fill("Black/Grey");
  await colourShown.press("Enter");
  await expect(preview.getByText("Colour shown: Black/Grey")).toBeVisible();
  await preview.getByRole("radio", { name: "S", exact: true }).click();
  await preview.getByRole("button", { name: "Add to bag" }).click();
  await expect(preview.getByText("This is a preview. Nothing was added to your bag.")).toBeVisible();
  await preview.close();
  await page.getByRole("button", { name: "Edit colour shown of Black" }).click();
  await colourShown.fill("Black/White");
  await colourShown.press("Enter");
  await expect(page.getByText("Colour shown: Black/White")).toBeVisible();
  await expectSaved(page);

  // The shop.
  await page.goto("/shop/accessories");
  await page.getByRole("link", { name: /E2E Monochrome Beanie/ }).click();
  await expect(page).toHaveURL(/\/product\/e2e-monochrome-beanie/);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Monochrome Beanie" })).toBeVisible();
  await expect(page.getByText("Rs 1,350").first()).toBeVisible();
  await expect(page.getByText("Colour shown: Black/White")).toBeVisible();
  await expect(page.getByText(/^Style: VZ\d{4,}-101$/)).toBeVisible();
  await expect(page.getByText("Country/Region of origin: China")).toBeVisible();
  // The picked size guide opens as a popup; inches are worked out from cm (72 cm is 28.5 in).
  await page.getByRole("button", { name: "Size guide" }).first().click();
  const sizeGuide = page.getByRole("dialog", { name: "Size guide" });
  await expect(sizeGuide.getByRole("cell", { name: "72", exact: true })).toBeVisible();
  await sizeGuide.getByRole("radio", { name: "in", exact: true }).click();
  await expect(sizeGuide.getByRole("cell", { name: "28.5", exact: true })).toBeVisible();
  await expect(sizeGuide.getByRole("cell", { name: "72", exact: true })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(sizeGuide).toBeHidden();
  // View product details: everything in one popup, named after the product.
  await page.getByRole("button", { name: "View product details" }).click();
  const details = page.getByRole("dialog", { name: "E2E Monochrome Beanie" });
  await expect(details.getByText("Keeps your ears warm")).toBeVisible();
  await expect(details.getByText("100% merino wool")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details).toBeHidden();
  // Features that perform, then "You may also like", under the product.
  await expect(page.getByRole("heading", { level: 2, name: "Features that perform" })).toBeVisible();
  await expect(page.getByText("Ribbed for warmth", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "You may also like" })).toBeVisible();
  // Style tiles: picking one changes its photos, price, colour shown, style number and the address.
  await page.getByRole("radio", { name: "Mountain print" }).click();
  await expect(page).toHaveURL(/[?&]style=Mountain(%20|\+)print/);
  await expect(page.getByText("Colour shown: Mountain print")).toBeVisible();
  await expect(page.getByText(/^Style: VZ\d{4,}-102$/)).toBeVisible();
  await expect(page.locator('main img[src*="product-02"]').first()).toBeVisible();
  await expect(page.getByText("Rs 1,650").first()).toBeVisible();
  await expect(page.getByRole("radio", { name: "M", exact: true })).toBeDisabled();

  // Products list: status filters, and Duplicate makes a draft copy (stock 0) that opens in the editor.
  await page.goto("/admin/products");
  await page.getByRole("link", { name: /^Drafts \(\d+\)$/ }).click();
  await expect(page.getByRole("link", { name: /E2E Monochrome Beanie/ })).toBeHidden();
  await page.getByRole("link", { name: /^All \(\d+\)$/ }).click();
  await page.getByRole("button", { name: "Duplicate E2E Monochrome Beanie" }).click();
  await expect(page.getByText("Copy saved as a draft")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Monochrome Beanie (copy)" })).toBeVisible();
  await expect(page.getByLabel("Stock, Black, S", { exact: true })).toHaveValue("0");
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeVisible();

  // The size guide can't be archived while products use it (the product and its copy).
  await page.goto("/admin/size-guides");
  const tops = page.getByRole("row", { name: /E2E Tops/ });
  await expect(tops.getByText("2 products")).toBeVisible();
  await tops.getByRole("button", { name: "Archive" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Archive" }).click();
  await expect(page.getByRole("dialog", { name: "E2E Tops can't be archived yet" })).toBeVisible();
  await expect(
    page.getByText("2 products use this size guide. Pick another guide on them first."),
  ).toBeVisible();
  await page.getByRole("button", { name: "OK" }).click();

  // A mistyped admin address stays inside the admin frame, with a way back.
  await page.goto("/admin/no-such-page");
  await expect(
    page.getByRole("heading", { level: 1, name: "This page doesn't exist, or the item was archived." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to dashboard" })).toBeVisible();

  // Settings, the last nav item: the admin's own account, sign-in security and Sign out.
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(E2E_ADMIN_EMAIL);
  await page.getByLabel(/^Name/).fill("E2E Admin");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const security = page.getByRole("region", { name: "Sign-in security" });
  await expect(security.getByText("On", { exact: true })).toBeVisible();
  await expect(
    security.getByText(
      /On this device, you'll be asked for the next one after \d{1,2} [A-Z][a-z]{2} \d{4}, \d{1,2}:\d{2} [AP]M\./,
    ),
  ).toBeVisible();
  // The authenticator is never reset or switched off from the website (security-policy.md §2).
  await expect(security.getByRole("button")).toHaveCount(0);

  // Sign out from the admin header: back to the home page, and /admin asks to sign in again.
  await page.getByRole("banner").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});

test("an admin on the authenticator step can sign out and use a different email", async ({ page }) => {
  await page.goto("/login?next=/admin");
  await completeEmailSignIn(page, E2E_ADMIN_EMAIL);
  await expect(page).toHaveURL(/\/admin\/verify/);
  await expect(page.getByText(`Signed in as ${E2E_ADMIN_EMAIL}`)).toBeVisible();

  await page.getByRole("button", { name: "Use a different email" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  // Signed out: the admin area asks for an email again.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});
