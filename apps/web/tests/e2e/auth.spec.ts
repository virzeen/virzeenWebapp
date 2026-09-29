import { expect, test } from "@playwright/test";
import { readEmail, uniqueEmail } from "./helpers";

// Journey: the sign-in code is checked as soon as the sixth digit is in (docs/specs/sign-in-code.md).
test.describe("Sign-in code", () => {
  test("a wrong code is rejected and cleared, then the right one signs in", async ({ page }) => {
    // Code checks sent by the page: exactly one per code, however it is completed or submitted.
    let checks = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/auth/sign-in/email-otp") checks += 1;
    });
    const email = uniqueEmail("code");
    await page.goto("/login?next=%2Faccount");
    await page.getByLabel(/Email/).fill(email);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await expect(page).toHaveURL(/\/verify/);
    const code = /\b(\d{6})\b/.exec(await readEmail(email, /sign-in code/))?.[1] ?? "";
    const wrong = `${code.slice(0, 5)}${(Number(code[5]) + 1) % 10}`;

    const field = page.getByLabel(/6-digit code/);
    await expect(field).toBeFocused();
    await field.pressSequentially(wrong);
    // Enter while that code is being checked sends nothing more.
    await page.keyboard.press("Enter");
    await expect(page.getByText("That code isn't right. Check it and try again.").first()).toBeVisible();
    expect(checks).toBe(1);
    // The boxes empty and keep focus, so the customer can simply type again.
    await expect(field).toHaveValue("");
    await expect(field).toBeFocused();

    await page.keyboard.type(code);
    await expect(page).toHaveURL(/\/account/);
    expect(checks).toBe(2);
  });
});
