import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EMAIL_WORDMARK_DARK_PATH, EMAIL_WORDMARK_PATH } from "@virzeen/emails";
import { describe, expect, it } from "vitest";

// Every email links to images this app serves from public/; a renamed or missing file breaks them all silently.
describe("email images", () => {
  it.each([EMAIL_WORDMARK_PATH, EMAIL_WORDMARK_DARK_PATH])(
    "serves the wordmark %s every email links to",
    (path) => {
      const file = fileURLToPath(new URL(`../../../public${path}`, import.meta.url));
      expect(existsSync(file)).toBe(true);
    },
  );
});
