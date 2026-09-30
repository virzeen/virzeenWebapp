import { devices, expect, test } from "@playwright/test";

// "Install the Virzeen app" on phones: the browser's install panel on Android, a guide on iPhone, nothing on
// computers. Each group sets its own phone, so these run in the desktop project only.

const LABEL = "Install the Virzeen app";
// A phone's screen and user agent, in Chromium (a describe group can't switch browsers).
const phone = ({ userAgent, viewport, deviceScaleFactor, isMobile, hasTouch }: (typeof devices)[string]) => ({
  userAgent,
  viewport,
  deviceScaleFactor,
  isMobile,
  hasTouch,
});
const pixel7 = phone(devices["Pixel 7"]);
const iPhone = phone(devices["iPhone 14"]);

test.describe("Android", () => {
  test.use(pixel7);

  test("the button opens the browser's install panel, then hides once installed", async ({ page }) => {
    await page.goto("/");
    const footerButton = page.getByRole("contentinfo").getByRole("button", { name: LABEL });
    await expect(footerButton).toBeVisible(); // rendered after hydration, so the offer listener is ready

    // Stand-in for Chrome's install offer: records the prompt and answers "installed".
    await page.evaluate(() => {
      const offer = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt: () => {
          (window as { prompted?: boolean }).prompted = true;
          return Promise.resolve();
        },
        userChoice: Promise.resolve({ outcome: "accepted" }),
      });
      window.dispatchEvent(offer);
    });

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: LABEL }).click();
    await expect.poll(() => page.evaluate(() => (window as { prompted?: boolean }).prompted)).toBe(true);
    await expect(footerButton).toBeHidden();
  });

  test("without an install offer, the button shows the steps for the browser menu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("button", { name: LABEL }).click();
    const guide = page.getByRole("dialog", { name: LABEL });
    await expect(guide.getByText("Add to Home screen")).toBeVisible();
    await guide.getByRole("button", { name: "Got it" }).click();
    await expect(guide).toBeHidden();
  });
});

test.describe("iPhone", () => {
  test.use(iPhone);

  test("the menu button shows the Add to Home Screen steps", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: LABEL }).click();
    const guide = page.getByRole("dialog", { name: LABEL });
    await expect(guide.getByText("Add to Home Screen")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
    await guide.getByRole("button", { name: "Got it" }).click();
    await expect(guide).toBeHidden();
  });
});

test("computers don't show the button", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle"); // hydrated: a phone would show the button by now
  await expect(page.getByRole("button", { name: LABEL })).toHaveCount(0);
});
