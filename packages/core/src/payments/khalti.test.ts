import { describe, expect, it } from "vitest";
import { json, mockProvider } from "../../test/setup";
import { khaltiProvider } from "./khalti";

const order = {
  orderNumber: "VZ-260928-0001",
  subtotalPaisa: 450_000,
  shippingPaisa: 10_000,
  totalPaisa: 460_000,
  customer: { name: "Asha", email: "asha@example.com", phone: "9812345678" },
};

describe("khaltiProvider.initiate", () => {
  it("sends the amount in paisa with the secret key and returns the payment URL", async () => {
    mockProvider(async (url, init) => {
      expect(url.href).toBe("https://dev.khalti.com/api/v2/epayment/initiate/");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Key test_secret_key");
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body).toMatchObject({ amount: 460_000, purchase_order_id: "VZ-260928-0001" });
      return json({
        pidx: "bZQLD9wRVWo4CdESSfuSsB",
        payment_url: "https://test-pay.khalti.com/?pidx=bZQLD9wRVWo4CdESSfuSsB",
      });
    });
    await expect(khaltiProvider.initiate(order, 1)).resolves.toEqual({
      providerRef: "bZQLD9wRVWo4CdESSfuSsB",
      next: { type: "redirect", url: "https://test-pay.khalti.com/?pidx=bZQLD9wRVWo4CdESSfuSsB" },
    });
  });

  it("fails with PAYMENT_FAILED when Khalti rejects the request", async () => {
    mockProvider(() => json({ detail: "Invalid token." }, 401));
    await expect(khaltiProvider.initiate(order, 1)).rejects.toMatchObject({ code: "PAYMENT_FAILED" });
  });

  it("refuses orders under Rs 10", async () => {
    await expect(khaltiProvider.initiate({ ...order, totalPaisa: 999 }, 1)).rejects.toMatchObject({
      code: "PAYMENT_FAILED",
    });
  });
});

describe("khaltiProvider.verify", () => {
  it("maps Completed with the paid amount", async () => {
    mockProvider(() =>
      json({ pidx: "abc", status: "Completed", total_amount: 460_000, transaction_id: "T1" }),
    );
    await expect(khaltiProvider.verify({ providerRef: "abc", amountPaisa: 460_000 })).resolves.toMatchObject({
      kind: "COMPLETED",
      amountPaisa: 460_000,
      providerTxnId: "T1",
    });
  });

  it.each([
    ["Pending", "PENDING"],
    ["Initiated", "PENDING"],
    ["User canceled", "CANCELLED"],
    ["Expired", "EXPIRED"],
    ["Refunded", "REFUNDED"],
    ["Partially refunded", "REFUNDED"],
  ])("maps %s to %s", async (status, kind) => {
    mockProvider(() => json({ pidx: "abc", status, total_amount: 460_000 }));
    await expect(khaltiProvider.verify({ providerRef: "abc", amountPaisa: 460_000 })).resolves.toMatchObject({
      kind,
    });
  });

  it("treats a lookup for a different pidx as an error", async () => {
    mockProvider(() => json({ pidx: "other", status: "Completed", total_amount: 460_000 }));
    await expect(khaltiProvider.verify({ providerRef: "abc", amountPaisa: 460_000 })).resolves.toMatchObject({
      kind: "ERROR",
    });
  });
});
