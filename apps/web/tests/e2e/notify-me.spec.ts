import { expect, test } from "@playwright/test";
import { completeEmailSignIn, uniqueEmail } from "./helpers";

// "Notify me when it's back" (specs/notify-me.md). The seed's Linen Overshirt is sold out in Black XL. The email when
// it's back is covered by core's stock-alert tests (admin save and cancellations call the same notifyAvailable).

test("a guest picks a sold-out size, signs in, asks to be emailed, and manages it from the profile", async ({
  page,
}) => {
  // Its own address for the sign-in limits, which every journey's sign-ins share.
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.40" });
  await page.goto("/product/linen-overshirt?style=Black");

  // The sold-out size is struck through but can be picked; Add to bag gives way to Notify me.
  const xl = page.getByRole("radio", { name: "XL, sold out" });
  await xl.click();
  await expect(xl).toBeChecked();
  await expect(page.getByRole("button", { name: "Add to bag" })).toHaveCount(0);
  await page.getByRole("button", { name: "Notify me when it's back" }).click();

  // A guest signs in first and comes back to the same style and size.
  await expect(page).toHaveURL(/\/login\?next=/);
  await completeEmailSignIn(page, uniqueEmail("notify"));
  await expect(page).toHaveURL(/\/product\/linen-overshirt\?style=Black&size=XL$/);
  await expect(page.getByRole("radio", { name: "XL, sold out" })).toBeChecked();

  await page.getByRole("button", { name: "Notify me when it's back" }).click();
  await expect(page.getByText("We'll email you when it's back.")).toBeVisible();
  await expect(page.getByRole("button", { name: "We'll email you" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Don't notify me" })).toBeVisible();

  // Saved on the account: still there after a reload.
  await page.reload();
  await expect(page.getByRole("button", { name: "We'll email you" })).toBeVisible();

  // The profile lists it; Remove ends it and the section goes.
  await page.goto("/account");
  const list = page.getByRole("region", { name: "Notify me" });
  await expect(list.getByRole("link", { name: "Linen Overshirt" })).toHaveAttribute(
    "href",
    "/product/linen-overshirt?style=Black&size=XL",
  );
  await expect(list.getByText("Black / XL", { exact: true })).toBeVisible();
  await list.getByRole("button", { name: "Remove Linen Overshirt, Black / XL" }).click();
  await expect(list).toHaveCount(0);

  await page.goto("/product/linen-overshirt?style=Black&size=XL");
  await expect(page.getByRole("button", { name: "Notify me when it's back" })).toBeVisible();
});

test("Don't notify me on the product page stops the request", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.41" });
  await page.goto(`/login?next=${encodeURIComponent("/product/linen-overshirt?style=Black&size=XL")}`);
  await completeEmailSignIn(page, uniqueEmail("notify-stop"));
  await expect(page).toHaveURL(/\/product\/linen-overshirt/);

  await page.getByRole("button", { name: "Notify me when it's back" }).click();
  await expect(page.getByRole("button", { name: "We'll email you" })).toBeVisible();
  await page.getByRole("button", { name: "Don't notify me" }).click();
  await expect(page.getByText("We won't email you about it.")).toBeVisible();
  // The control that had focus went away: focus is on the main button again.
  await expect(page.getByRole("button", { name: "Notify me when it's back" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Don't notify me" })).toHaveCount(0);
});
