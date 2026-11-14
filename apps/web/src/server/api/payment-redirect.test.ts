import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/env", () => ({ siteUrl: "https://virzeen.test" }));
vi.mock("@/server/bootstrap", () => ({}));
vi.mock("@/server/logger", () => ({ logger: { warn: () => {} } }));
vi.mock("@/server/security/rate-limit", () => ({
  clientIp: async () => "1.2.3.4",
  rateLimit: async () => {},
}));
vi.mock("@/server/services/stock-alerts", () => ({ sendDueStockAlerts: () => {} }));

const { redirectFor } = await import("./payment-redirect");

const ORDER = "VZ-261110-0001";
const target = (result: Parameters<typeof redirectFor>[0]) => redirectFor(result).headers.get("location");

// Where a customer coming back from eSewa or Khalti lands (specs/payment-window.md).
describe("redirectFor", () => {
  it.each([
    ["PAID", `https://virzeen.test/checkout/success?order=${ORDER}`],
    ["PENDING", `https://virzeen.test/checkout/success?order=${ORDER}`],
    ["MISMATCH", `https://virzeen.test/checkout/success?order=${ORDER}`],
    ["RETRY", `https://virzeen.test/account/orders/${ORDER}?payment=failed`],
    ["LATE", `https://virzeen.test/account/orders/${ORDER}`],
    ["FAILED", `https://virzeen.test/checkout/failed?order=${ORDER}`],
    ["EXPIRED", `https://virzeen.test/checkout/failed?order=${ORDER}`],
  ] as const)("%s → %s", (outcome, url) => {
    expect(target({ outcome, orderNumber: ORDER, answered: true })).toBe(url);
  });

  it("sends an unknown payment to the failed page", () => {
    expect(target(null)).toBe("https://virzeen.test/checkout/failed");
  });
});
