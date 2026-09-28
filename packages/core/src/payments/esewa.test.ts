import { describe, expect, it } from "vitest";
import { json, mockProvider, TEST_ESEWA } from "../../test/setup";
import {
  buildEsewaForm,
  decodeEsewaCallback,
  esewaProvider,
  fromEsewaAmount,
  signEsewa,
  toEsewaAmount,
} from "./esewa";

const encode = (payload: Record<string, unknown>) => Buffer.from(JSON.stringify(payload)).toString("base64");

function signedCallback(overrides: Record<string, unknown> = {}) {
  const payload: Record<string, unknown> = {
    transaction_code: "000AWEO",
    status: "COMPLETE",
    total_amount: "4,600.0",
    transaction_uuid: "VZ-260928-0001-1",
    product_code: TEST_ESEWA.productCode,
    signed_field_names:
      "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
    ...overrides,
  };
  const message = String(payload.signed_field_names)
    .split(",")
    .map((name) => `${name}=${payload[name]}`)
    .join(",");
  return { ...payload, signature: signEsewa(message, TEST_ESEWA.secretKey) };
}

describe("eSewa signature", () => {
  it("matches eSewa's published test vector", () => {
    expect(
      signEsewa("total_amount=110,transaction_uuid=241028,product_code=EPAYTEST", TEST_ESEWA.secretKey),
    ).toBe("i94zsd3oXF6ZsSr/kGqT4sSzYQzjj1W/waxjWyRwaME=");
  });
});

describe("amount conversion (only in the adapter)", () => {
  it("converts paisa to rupees with two decimals and back", () => {
    expect(toEsewaAmount(460_000)).toBe("4600.00");
    expect(fromEsewaAmount("4,600.0")).toBe(460_000);
    expect(fromEsewaAmount(4600)).toBe(460_000);
    expect(fromEsewaAmount("abc")).toBeNull();
  });
});

describe("buildEsewaForm", () => {
  it("signs total_amount, transaction_uuid and product_code, with amounts that add up", () => {
    const form = buildEsewaForm({
      transactionUuid: "VZ-260928-0001-1",
      subtotalPaisa: 450_000,
      shippingPaisa: 10_000,
      totalPaisa: 460_000,
      successUrl: "https://virzeen.test/api/payments/esewa/success",
      failureUrl: "https://virzeen.test/api/payments/esewa/failure",
    });
    expect(form.action).toBe("https://rc-epay.esewa.com.np/api/epay/main/v2/form");
    expect(form.fields).toMatchObject({
      amount: "4500.00",
      product_delivery_charge: "100.00",
      total_amount: "4600.00",
    });
    const message = `total_amount=4600.00,transaction_uuid=VZ-260928-0001-1,product_code=${TEST_ESEWA.productCode}`;
    expect(form.fields.signature).toBe(signEsewa(message, TEST_ESEWA.secretKey));
  });

  it("refuses amounts that don't add up", () => {
    expect(() =>
      buildEsewaForm({
        transactionUuid: "x",
        subtotalPaisa: 1,
        shippingPaisa: 1,
        totalPaisa: 3,
        successUrl: "s",
        failureUrl: "f",
      }),
    ).toThrow();
  });
});

describe("decodeEsewaCallback", () => {
  it("accepts a correctly signed callback", () => {
    expect(decodeEsewaCallback(encode(signedCallback())).transaction_uuid).toBe("VZ-260928-0001-1");
  });

  it("rejects a tampered amount (invalid signature)", () => {
    const tampered = { ...signedCallback(), total_amount: "1.0" };
    expect(() => decodeEsewaCallback(encode(tampered))).toThrowError(
      expect.objectContaining({ code: "PAYMENT_FAILED" }),
    );
  });

  it("rejects garbage", () => {
    expect(() => decodeEsewaCallback("not-base64-json")).toThrowError(
      expect.objectContaining({ code: "PAYMENT_FAILED" }),
    );
  });

  it("rejects a callback for another merchant", () => {
    expect(() => decodeEsewaCallback(encode(signedCallback({ product_code: "OTHER" })))).toThrow();
  });
});

describe("esewaProvider.verify", () => {
  it("maps COMPLETE with its amount and ref id", async () => {
    mockProvider((url) => {
      expect(url.pathname).toBe("/api/epay/transaction/status/");
      expect(url.searchParams.get("total_amount")).toBe("4600.00");
      return json({ status: "COMPLETE", total_amount: 4600.0, ref_id: "REF123", transaction_uuid: "VZ-1" });
    });
    await expect(esewaProvider.verify({ providerRef: "VZ-1", amountPaisa: 460_000 })).resolves.toMatchObject({
      kind: "COMPLETED",
      amountPaisa: 460_000,
      providerTxnId: "REF123",
    });
  });

  it.each([
    ["PENDING", "PENDING"],
    ["AMBIGUOUS", "AMBIGUOUS"],
    ["NOT_FOUND", "NOT_FOUND"],
    ["CANCELED", "CANCELLED"],
    ["FULL_REFUND", "REFUNDED"],
  ])("maps %s to %s", async (status, kind) => {
    mockProvider(() => json({ status }));
    await expect(esewaProvider.verify({ providerRef: "VZ-1", amountPaisa: 100 })).resolves.toMatchObject({
      kind,
    });
  });

  it("reports provider outages as ERROR instead of throwing", async () => {
    mockProvider(() => new Response("down", { status: 503 }));
    await expect(esewaProvider.verify({ providerRef: "VZ-1", amountPaisa: 100 })).resolves.toMatchObject({
      kind: "ERROR",
    });
  });
});
