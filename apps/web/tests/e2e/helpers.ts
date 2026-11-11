import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { createDbClient } from "@virzeen/db";
import { E2E_DATABASE_URL, MAILPIT_URL } from "./env";

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

/** Test set-up in the throwaway e2e database: a registered member, so the email check sends the code page. */
export async function createMember(email: string) {
  const db = createDbClient(E2E_DATABASE_URL);
  try {
    await db.user.create({
      data: { id: crypto.randomUUID().replace(/-/g, ""), name: "Test Member", email, emailVerified: true },
    });
  } finally {
    await db.$disconnect();
  }
}

/**
 * Signs in with an emailed 6-digit code, starting from the current page's sign-in form. A registered email goes to the
 * code page (the sign-in goes on by itself at the sixth digit); a new email goes to the create-account page, which
 * is filled in here and ends on the profile (docs/specs/sign-in-v2.md), after which the page the test was headed to
 * (`next`) is opened.
 */
export async function completeEmailSignIn(page: Page, email: string) {
  await page.getByLabel(/Email/).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page).toHaveURL(/\/(verify|signup)/);
  const isNew = page.url().includes("/signup");
  const next = new URL(page.url()).searchParams.get("next") ?? "/account";
  const code = /\b(\d{6})\b/.exec(await readEmail(email, /sign-in code/))?.[1] ?? "";
  await page.getByLabel(/6-digit code/).fill(code);
  if (isNew) {
    await page.getByLabel(/^First Name/).fill("Test");
    await page.getByLabel(/^Last Name/).fill("Customer");
    await page.getByRole("combobox", { name: /Shopping Preference/ }).click();
    await page.getByRole("option", { name: "Clothing" }).click();
    await page.getByRole("checkbox", { name: /I agree to the/ }).check();
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/account/);
    if (next !== "/account") await page.goto(next);
    return;
  }
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
  await expect(page.getByRole("dialog", { name: "Bag" })).toBeVisible();
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

/**
 * Checkout as a signed-in member: add or pick an address, then choose a payment method, which opens the Order review. `continueToReview: false` stops at the open Payment step (for the discount code field).
 */
export async function checkoutWith(page: Page, method: RegExp, options: { continueToReview?: boolean } = {}) {
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
  // A chosen address opens Payment by itself, and choosing a method opens the Order review: no Continue buttons.
  if (options.continueToReview !== false) await page.getByRole("radio", { name: method }).click();
}

/** Fills the guest's Delivery Options form on /checkout?as=guest (docs/specs/checkout-v2-week1.md). */
export async function fillGuestDetails(page: Page, email: string) {
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^First name/).fill("Sita");
  await page.getByLabel(/^Last name/).fill("Rai");
  await page.getByRole("combobox", { name: /Province/ }).click();
  await page.getByRole("option", { name: "Bagmati" }).click();
  await page.getByRole("combobox", { name: /District/ }).click();
  await page.getByRole("option", { name: "Kathmandu", exact: true }).click();
  await page.getByLabel(/^Municipality/).fill("Kathmandu");
  await page.getByLabel(/^Ward no\./).fill("4");
  await page.getByLabel(/^Tole or street/).fill("Baneshwor");
  await page.getByLabel(/^Mobile number/).fill("98 12345678");
  await page.getByLabel(/^Delivery notes/).fill("Call at the gate");
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
