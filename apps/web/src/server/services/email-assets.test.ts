import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EMAIL_WORDMARK_PATH } from "@virzeen/emails";
import { describe, expect, it } from "vitest";

// Every email links to images this app serves from public/; a renamed or missing file breaks them all silently.
describe("email images", () => {
  it("serves the wordmark every email links to", () => {
    const file = fileURLToPath(new URL(`../../../public${EMAIL_WORDMARK_PATH}`, import.meta.url));
    expect(existsSync(file)).toBe(true);
  });
});
