import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { MAILPIT_URL } from "./env";

// Shared steps for the journeys. Locators use roles and labels first (testing-strategy.md §4).

export const uniqueEmail = (prefix: string) =>
  `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@example.com`;

type MailpitSummary = { ID: string; Subject: string };

// Each email is read once, so a second sign-in never picks up the previous (already used) code.
const readMessageIds = new Set<string>();

/** Waits for an unread email to `to` whose subject matches, and returns its plain text. */
export async function readEmail(to: string, subject: RegExp): Promise<string> {
  let text = "";
  await expect
    .poll(
      async () => {
        const list = (await (
          await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`)
        ).json()) as { messages?: MailpitSummary[] };
        const message = list.messages?.find((m) => subject.test(m.Subject) && !readMessageIds.has(m.ID));
        if (!message) return false;
        text = (
          (await (await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`)).json()) as { Text: string }
        ).Text;
        readMessageIds.add(message.ID);
        return true;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  return text;
}

/** Signs in with an emailed 6-digit code, starting from the current page's sign-in form. */
export async function completeEmailSignIn(page: Page, email: string) {
  await page.getByLabel(/Email/).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page).toHaveURL(/\/verify/);
  const code = /\b(\d{6})\b/.exec(await readEmail(email, /sign-in code/))?.[1] ?? "";
  // No button: the code is checked as soon as the sixth digit is in.
  await page.getByLabel(/6-digit code/).fill(code);
  // Wait for the redirect off the sign-in code page (admins go on to /admin/verify for their authenticator):
  // the session cookie is set only once the code is accepted.
  await page.waitForURL((url) => url.pathname !== "/verify");
}

export async function signIn(page: Page, email: string, next = "/account") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await completeEmailSignIn(page, email);
  await expect(page).toHaveURL(new RegExp(next.replace(/[/?]/g, "\\$&")));
}

export async function addToBag(page: Page, slug: string, options: { color?: string; size?: string } = {}) {
  await page.goto(`/product/${slug}`);
  if (options.color) await page.getByRole("radio", { name: options.color, exact: true }).click();
  if (options.size) await page.getByRole("radio", { name: options.size, exact: true }).click();
  await page.getByRole("button", { name: "Add to bag" }).click();
  await expect(page.getByRole("dialog", { name: "Added to bag" })).toBeVisible();
}

/** Fills the delivery address form on /checkout (or /account/addresses). */
export async function fillAddress(page: Page) {
  await page.getByLabel(/Full name/).fill("Asha Shrestha");
  await page.getByLabel(/Mobile number/).fill("9812345678");
  await page.getByRole("combobox", { name: /Province/ }).click();
  await page.getByRole("option", { name: "Bagmati" }).click();
  await page.getByRole("combobox", { name: /District/ }).click();
  await page.getByRole("option", { name: "Lalitpur" }).click();
  await page.getByLabel(/City or municipality/).fill("Lalitpur");
  await page.getByLabel(/Street address/).fill("Jhamsikhel Road");
}

/** Checkout from the bag: sign in if asked, add an address, choose a payment method. */
export async function checkoutWith(page: Page, method: RegExp) {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/checkout$/);
  const useAddress = page.getByRole("button", { name: "Use this address" });
  const savedAddress = page.getByRole("radio", { name: /Asha Shrestha/ });
  // isVisible() doesn't wait, so first wait for either the new-address form or a saved address.
  await expect(useAddress.or(savedAddress).first()).toBeVisible();
  if (await useAddress.isVisible()) {
    await fillAddress(page);
    await useAddress.click();
  }
  await expect(savedAddress).toBeChecked();
  await page.getByRole("radio", { name: method }).click();
}

// ── TOTP (RFC 6238) for the admin step-up ──
function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of input.replace(/[\s=]/g, "").toUpperCase())
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function totp(secret: string): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = (hmac.at(-1) ?? 0) & 15;
  return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
