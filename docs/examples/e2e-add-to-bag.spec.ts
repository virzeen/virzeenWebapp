// apps/web/tests/e2e/add-to-bag.spec.ts
import { expect, test } from "@playwright/test";

test.describe("Add to bag", () => {
  test("customer picks a size and adds the product to the bag", async ({ page }) => {
    await page.goto("/product/linen-overshirt");

    const addButton = page.getByRole("button", { name: "Select a size" });
    await expect(addButton).toBeDisabled();

    await page.getByRole("radio", { name: "M" }).check();
    await page.getByRole("button", { name: "Add to bag" }).click();

    await expect(page.getByText("Added to bag")).toBeVisible();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag).toBeVisible();
    await expect(bag.getByText("Linen Overshirt")).toBeVisible();
    await expect(bag.getByTestId("cart-subtotal")).toContainText("Rs");
  });

  test("out-of-stock sizes cannot be selected", async ({ page }) => {
    await page.goto("/product/linen-overshirt");
    await expect(page.getByRole("radio", { name: "XL" })).toBeDisabled();
  });
});
// No page.waitForTimeout(): web-first assertions (await expect) retry automatically.
