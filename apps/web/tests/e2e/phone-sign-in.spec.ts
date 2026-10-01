import { devices, expect, test } from "@playwright/test";
import { readEmail, uniqueEmail } from "./helpers";

// Owner report 2026-10-01: "from the phone, Sign in returns me to the home page". In the installed app, going to
// the mail app for the code and coming back through the app's icon restarts the app on the home page; it must
// come back to the code screen instead (client/lib/pending-sign-in.ts). Each test sets its own phone, so these
// run in the desktop project only.

const { userAgent, viewport, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"];
test.use({ userAgent, viewport, deviceScaleFactor, isMobile, hasTouch });

/**
 * Its own visitor address (a documentation range, as Railway's edge would pass it on), so these sign-ins don't
 * use up the 10-codes-per-address limit (rate-limit.ts "otp:ip") the rest of the suite shares.
 */
async function ownAddress(page: import("@playwright/test").Page, n: number) {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": `203.0.113.${n}` });
}

/** Pretends the site runs as the installed app (display-mode: standalone). */
async function asInstalledApp(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query.includes("display-mode: standalone")
        ? ({
            matches: true,
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
          } as MediaQueryList)
        : original(query);
  });
}

test.describe("Phone sign-in", () => {
  test("the menu's Sign in opens the sign-in page and the code signs in to the account", async ({ page }) => {
    await ownAddress(page, 11);
    await page.goto("/product/linen-overshirt");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();

    const email = uniqueEmail("phone-menu");
    await page.getByLabel(/Email/).fill(email);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await expect(page).toHaveURL(/\/verify/);
    const code = /\b(\d{6})\b/.exec(await readEmail(email, /sign-in code/))?.[1] ?? "";
    await page.getByLabel(/6-digit code/).fill(code);
    await expect(page).toHaveURL(/\/account/);
  });

  test("the installed app comes back to the code screen after a trip to the mail app", async ({ page }) => {
    await ownAddress(page, 12);
    await asInstalledApp(page);
    await page.goto("/login");
    const email = uniqueEmail("phone-app");
    await page.getByLabel(/Email/).fill(email);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await expect(page).toHaveURL(/\/verify/);

    // The phone restarts the app on its start page, the home page.
    await page.goto("/");
    await expect(page).toHaveURL(/\/verify\?email=/);
    await expect(page.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible();

    const code = /\b(\d{6})\b/.exec(await readEmail(email, /sign-in code/))?.[1] ?? "";
    await page.getByLabel(/6-digit code/).fill(code);
    await expect(page).toHaveURL(/\/account/);

    // Signed in: the next start stays on the home page.
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("timeless monochromium experience.");
    await expect(page).toHaveURL(/\/$/);
  });

  test("a browser tab is never sent back to the code screen", async ({ page }) => {
    await ownAddress(page, 13);
    await page.goto("/login");
    await page.getByLabel(/Email/).fill(uniqueEmail("phone-tab"));
    await page.getByRole("button", { name: "Continue with email" }).click();
    await expect(page).toHaveURL(/\/verify/);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("timeless monochromium experience.");
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("Fast product pages", () => {
  test("touching a product starts loading its page before the tap ends", async ({ page }) => {
    await page.goto("/shop");
    const link = page.getByRole("link", { name: /Linen Overshirt/ }).first();
    await expect(link).toBeVisible();
    // The whole page (an RSC request without Next's "prefetch" header), not only the skeleton <Link> prefetches.
    const prefetched = page.waitForRequest((request) => {
      const headers = request.headers();
      return (
        new URL(request.url()).pathname === "/product/linen-overshirt" &&
        headers["rsc"] === "1" &&
        headers["next-router-prefetch"] === undefined
      );
    });
    await link.dispatchEvent("touchstart");
    await prefetched;
    await link.click();
    await expect(page.getByRole("heading", { level: 1, name: "Linen Overshirt" })).toBeVisible();
  });
});
