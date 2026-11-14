import { expect, test } from "@playwright/test";
import { completeEmailSignIn, uniqueEmail } from "./helpers";

// Settings, laid out like Nike's: six sections (Shop preferences and Linked accounts were taken out, owner
// 2026-11-14), each Save off until something changes, and Payment methods saving on a tick
// (docs/specs/member-area-nike-layout.md).

const SECTIONS = [
  "Account details",
  "Payment methods",
  "Delivery addresses",
  "Communication preferences",
  "Profile visibility",
  "Privacy",
];

test("a member works through the six Settings sections", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.52" });
  const email = uniqueEmail("settings");
  await page.goto("/login?next=%2Faccount%2Fsettings");
  await completeEmailSignIn(page, email);
  await expect(page).toHaveURL(/\/account\/settings$/);

  // The list on the left has all six, in Nike's order, and Account details shows the Password row.
  const nav = page.getByRole("navigation", { name: "Settings" });
  await expect(nav.getByRole("link")).toHaveText(SECTIONS);
  await expect(page.getByRole("link", { name: "Edit" })).toHaveAttribute(
    "href",
    "/account/settings/password",
  );
  await expect(page.getByRole("button", { name: "Sign out" }).first()).toBeVisible();

  // Account details, like Nike's: floating-label boxes, a locked birthday, Save off until the name changes.
  await expect(page.getByRole("textbox", { name: /^Email/ })).toHaveValue(email);
  await expect(page.getByRole("textbox", { name: /^Date of birth/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  await page.getByRole("textbox", { name: /^Name/ }).fill("Asha Rai");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

  // Payment methods: just Cash on delivery, and no Save button: a tick is saved at once.
  await nav.getByRole("link", { name: "Payment methods" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Payment methods" })).toBeVisible();
  const cod = page.getByRole("checkbox", { name: "Cash on delivery" });
  await expect(cod).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  await cod.click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Cash on delivery" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Cash on delivery" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Cash on delivery" })).not.toBeChecked();

  // Communication preferences: the email tick.
  await nav.getByRole("link", { name: "Communication preferences" }).click();
  const tick = page.getByRole("checkbox", { name: "Yes, send me emails." });
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  const before = await tick.isChecked();
  await tick.click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Yes, send me emails." })).toBeChecked({
    checked: !before,
  });

  // Profile visibility: first name by default; anonymous once chosen and saved.
  await nav.getByRole("link", { name: "Profile visibility" }).click();
  await expect(page.getByRole("radio", { name: /First name/ })).toBeChecked();
  await page.getByRole("radio", { name: /Anonymous/ }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { name: /Anonymous/ })).toBeChecked();

  // Privacy: the download is a JSON attachment with the member's own data and no secrets.
  await nav.getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("link", { name: "Download my data" })).toHaveAttribute(
    "href",
    "/api/account/export",
  );
  const download = await page.request.get("/api/account/export");
  expect(download.status()).toBe(200);
  expect(download.headers()["content-disposition"]).toContain("attachment");
  const body = await download.text();
  expect(JSON.parse(body)).toMatchObject({ email, reviewNameStyle: "ANONYMOUS" });
  expect(body).not.toMatch(/"(password|token|accessToken|refreshToken)"/i);
});

test("the data download needs a signed-in member", async ({ request }) => {
  const response = await request.get("/api/account/export");
  expect(response.status()).toBe(401);
});

test("a member deletes their account and is signed out, and the email can start again", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.53" });
  const email = uniqueEmail("delete");
  await page.goto("/login?next=%2Faccount%2Fsettings");
  await completeEmailSignIn(page, email);
  await expect(page).toHaveURL(/\/account\/settings$/);

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  const confirm = dialog.getByRole("button", { name: "Delete account" });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole("textbox", { name: "Type DELETE to confirm" }).fill("DELETE");
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // Back on the home page, signed out: the account pages ask to sign in again.
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);

  // The same email starts a fresh account.
  await completeEmailSignIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByTestId("interests")).toBeVisible();
});

// Nike's hover menu on the profile icon (docs/specs/member-area-nike-layout.md). Signed out there is no menu.
test("the profile icon opens an account menu on hover, and Sign out ends the session", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.54" });
  await page.goto("/");
  await expect(page.getByTestId("account-menu")).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.goto("/login?next=%2Faccount");
  await completeEmailSignIn(page, uniqueEmail("accountmenu"));
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/");

  const menu = page.getByRole("navigation", { name: "Account" });
  await expect(menu).toBeHidden();
  await page.getByRole("link", { name: "My profile" }).hover();
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link")).toHaveText(["Profile", "Orders", "Favourites", "Account settings"]);
  await expect(menu.getByRole("button", { name: "Sign out" })).toBeVisible();

  // Moving down into the panel keeps it open, and a link works.
  await menu.getByRole("link", { name: "Account settings" }).click();
  await expect(page).toHaveURL(/\/account\/settings$/);

  await page.getByRole("link", { name: "My profile" }).hover();
  await menu.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
});
