import { expect, test } from "@playwright/test";
import { createDbClient } from "@virzeen/db";
import { E2E_DATABASE_URL } from "./env";
import { readEmail, uniqueEmail } from "./helpers";

// Email first, a code, the create-account step for a new email, the profile, and an optional password
// (docs/specs/sign-in-v2.md, docs/checkoutfeatures.md §3.2–3.4).

test("a new email creates an account, lands on the profile, sets a password and signs in with it", async ({
  page,
  browser,
}) => {
  // Its own visitor address, so these sign-ins don't use up the 10-codes-per-address limit the suite shares.
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.21" });
  const email = uniqueEmail("join");

  await page.goto("/login?next=%2Fcheckout");
  await page.getByLabel(/Email/).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();

  // Not registered: the create-account panel, with the code already sent.
  await expect(page).toHaveURL(/\/signup\?/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Now let's make you a MONO Member.");
  await expect(page.getByText(`We've sent a code to ${email}`)).toBeVisible();
  // No password field here, and nothing says the code signs in by itself.
  await expect(page.getByLabel(/password/i)).toHaveCount(0);
  const create = page.getByRole("button", { name: "Create Account" });
  await expect(create).toBeDisabled();

  // The countdown runs inside the code field, at its end: seconds first, then a resend icon (no "Resend code" text).
  await expect(page.getByTestId("resend-countdown")).toBeVisible();
  await expect(page.getByText(/Resend code in/)).toHaveCount(1); // only the screen-reader copy of the countdown
  await expect(page.getByRole("button", { name: "Resend code" })).toHaveCount(0);

  const code = /\b(\d{6})\b/.exec(await readEmail(email, /sign-in code/))?.[1] ?? "";
  await page.getByLabel(/6-digit code/).fill(code);
  await page.getByLabel(/^First Name/).fill("Sita");
  await page.getByLabel(/^Last Name/).fill("Rai");
  await expect(create).toBeDisabled(); // a preference and the terms are still missing
  await page.getByRole("combobox", { name: /Shopping Preference/ }).click();
  await page.getByRole("option", { name: "Home" }).click();
  await page.getByLabel(/Date of Birth/).fill("1998-03-14");
  await page.getByRole("checkbox", { name: /I agree to the/ }).check();
  await expect(create).toBeEnabled();
  await create.click();

  // Straight to the member's profile, whatever page they were headed for.
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("Sita Rai").first()).toBeVisible();

  const db = createDbClient(E2E_DATABASE_URL);
  try {
    const saved = await db.user.findUniqueOrThrow({ where: { email } });
    expect(saved).toMatchObject({ name: "Sita Rai", shoppingPreference: "HOME", marketingOptIn: true });
    expect(saved.termsAcceptedAt).not.toBeNull();
    expect(saved.birthday?.toISOString().slice(0, 10)).toBe("1998-03-14");
  } finally {
    await db.$disconnect();
  }

  // Settings → Password: set one (at least 8 characters, typed twice).
  await page.goto("/account/settings/password");
  await page.getByLabel(/^New password/).fill("short");
  await page.getByLabel(/^Confirm new password/).fill("short");
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  await page.getByLabel(/^New password/).fill("monochrome-2026");
  await page.getByLabel(/^Confirm new password/).fill("monochrome-2026");
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByText("Password saved")).toBeVisible();
  await expect(page.getByRole("button", { name: "Change password" })).toBeVisible();

  // Next time: the code page offers "Use Password".
  const other = await browser.newContext({ extraHTTPHeaders: { "X-Forwarded-For": "198.51.100.22" } });
  const second = await other.newPage();
  await second.goto("/login");
  await second.getByLabel(/Email/).fill(email);
  await second.getByRole("button", { name: "Continue with email" }).click();
  await expect(second).toHaveURL(/\/verify\?/);
  await expect(second.getByRole("heading", { level: 1 })).toHaveText(
    "Enter the 6-digit code sent to your email.",
  );
  await second.getByRole("button", { name: "Use Password" }).click();
  await expect(second.getByRole("heading", { level: 1 })).toHaveText("Enter your password.");

  await second.getByLabel(/^Password/).fill("not-my-password");
  await second.getByRole("button", { name: "Sign In" }).click();
  await expect(second.getByText("That email and password don't match.")).toBeVisible();

  await second.getByLabel(/^Password/).fill("monochrome-2026");
  await second.getByRole("button", { name: "Sign In" }).click();
  await expect(second).toHaveURL(/\/account$/);
  await expect(second.getByText("Sita Rai").first()).toBeVisible();
  await other.close();
});

test("the code page for a member without a password offers no password", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.23" });
  const email = uniqueEmail("nopw");
  const db = createDbClient(E2E_DATABASE_URL);
  try {
    await db.user.create({
      data: { id: crypto.randomUUID().replace(/-/g, ""), name: "No Password", email, emailVerified: true },
    });
  } finally {
    await db.$disconnect();
  }
  await page.goto("/login");
  await page.getByLabel(/Email/).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page).toHaveURL(/\/verify\?/);
  await expect(page.getByLabel(/6-digit code/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Use Password" })).toHaveCount(0);
  await expect(page.getByText(/sign you in as soon as/i)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Edit" })).toHaveAttribute("href", /\/login/);
});

test("Edit on the code page goes back to the sign-in form with the same email", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.24" });
  const email = uniqueEmail("edit");
  await page.goto("/login?next=%2Fshop");
  await page.getByLabel(/Email/).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page).toHaveURL(/\/signup\?/);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByLabel(/Email/)).toHaveValue(email);
});

test("the resend icon appears when the countdown ends and sends a new code", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.25" });
  const email = uniqueEmail("resend");
  const db = createDbClient(E2E_DATABASE_URL);
  try {
    await db.user.create({
      data: { id: crypto.randomUUID().replace(/-/g, ""), name: "Resend Tester", email, emailVerified: true },
    });
  } finally {
    await db.$disconnect();
  }
  await page.goto("/login");
  await page.getByLabel(/Email/).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page).toHaveURL(/\/verify\?/);
  await expect(page.getByTestId("resend-countdown")).toBeVisible();
  // 30 seconds: the icon is the only control that takes the countdown's place.
  const resend = page.getByRole("button", { name: "Resend code" });
  await expect(resend).toBeVisible({ timeout: 40_000 });
  await expect(page.getByTestId("resend-countdown")).toHaveCount(0);
  await resend.click();
  await expect(page.getByTestId("resend-countdown")).toBeVisible();
});
