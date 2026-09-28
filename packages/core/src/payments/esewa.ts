import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getCoreConfig } from "../config";
import { AppError } from "../errors";
import type { PaymentProvider, ProviderVerdict } from "./provider";

// eSewa ePay v2 (payment-policy.md §5). Paisa ↔ rupee conversion happens ONLY in this file.

/** 460000 paisa → "4600.00" (eSewa amounts are rupees with two decimals). */
export function toEsewaAmount(paisa: number): string {
  if (!Number.isInteger(paisa) || paisa < 0) throw new AppError("INTERNAL", "Invalid amount.");
  return (paisa / 100).toFixed(2);
}

/** "4,600.0" / "4600" / 4600 → 460000 paisa. */
export function fromEsewaAmount(value: unknown): number | null {
  const text =
    typeof value === "number" ? String(value) : typeof value === "string" ? value.replace(/,/g, "") : "";
  if (!/^\d+(\.\d{1,2})?$/.test(text.trim())) return null;
  return Math.round(Number.parseFloat(text) * 100);
}

export function signEsewa(message: string, secretKey: string): string {
  return createHmac("sha256", secretKey).update(message).digest("base64");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const ESEWA_SIGNED_FIELDS = "total_amount,transaction_uuid,product_code";

export function buildEsewaForm(input: {
  transactionUuid: string;
  subtotalPaisa: number;
  shippingPaisa: number;
  totalPaisa: number;
  successUrl: string;
  failureUrl: string;
}) {
  const { esewa } = getCoreConfig();
  if (input.subtotalPaisa + input.shippingPaisa !== input.totalPaisa) {
    throw new AppError("INTERNAL", "eSewa amounts don't add up.");
  }
  const fields: Record<string, string> = {
    amount: toEsewaAmount(input.subtotalPaisa),
    tax_amount: "0",
    product_service_charge: "0",
    product_delivery_charge: toEsewaAmount(input.shippingPaisa),
    total_amount: toEsewaAmount(input.totalPaisa),
    transaction_uuid: input.transactionUuid,
    product_code: esewa.productCode,
    success_url: input.successUrl,
    failure_url: input.failureUrl,
    signed_field_names: ESEWA_SIGNED_FIELDS,
  };
  const message = ESEWA_SIGNED_FIELDS.split(",")
    .map((name) => `${name}=${fields[name]}`)
    .join(",");
  fields.signature = signEsewa(message, esewa.secretKey);
  return { action: `${esewa.formUrl}/api/epay/main/v2/form`, fields };
}

export type EsewaCallbackPayload = {
  transaction_code?: string;
  status?: string;
  total_amount?: string | number;
  transaction_uuid: string;
  product_code?: string;
  signed_field_names: string;
  signature: string;
};

/**
 * Decodes the `data` param eSewa appends to the success URL and checks its signature (timing-safe).
 * Throws PAYMENT_FAILED for anything malformed or forged. A valid signature is still NOT proof of payment:
 * the caller must verify with the status API.
 */
export function decodeEsewaCallback(data: string): EsewaCallbackPayload {
  const { esewa } = getCoreConfig();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(data, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new AppError("PAYMENT_FAILED", "Invalid payment response.");
  }
  const { signed_field_names: signedFieldNames, signature, transaction_uuid: transactionUuid } = payload;
  if (
    typeof signedFieldNames !== "string" ||
    typeof signature !== "string" ||
    typeof transactionUuid !== "string"
  ) {
    throw new AppError("PAYMENT_FAILED", "Invalid payment response.");
  }
  const names = signedFieldNames.split(",");
  if (!names.includes("transaction_uuid") || !names.includes("total_amount")) {
    throw new AppError("PAYMENT_FAILED", "Invalid payment response.");
  }
  const message = names.map((name) => `${name}=${String(payload[name] ?? "")}`).join(",");
  if (!safeEqual(signEsewa(message, esewa.secretKey), signature)) {
    throw new AppError("PAYMENT_FAILED", "Invalid payment signature.");
  }
  if (payload.product_code !== undefined && payload.product_code !== esewa.productCode) {
    throw new AppError("PAYMENT_FAILED", "Invalid payment response.");
  }
  return payload as EsewaCallbackPayload;
}

type EsewaStatusResponse = {
  product_code?: string;
  transaction_uuid?: string;
  total_amount?: string | number;
  status?: string;
  ref_id?: string | null;
};

export const esewaProvider: PaymentProvider = {
  async initiate(order, attempt) {
    const { siteUrl } = getCoreConfig();
    const transactionUuid = `${order.orderNumber}-${attempt}`;
    const form = buildEsewaForm({
      transactionUuid,
      subtotalPaisa: order.subtotalPaisa,
      shippingPaisa: order.shippingPaisa,
      totalPaisa: order.totalPaisa,
      successUrl: `${siteUrl}/api/payments/esewa/success`,
      failureUrl: `${siteUrl}/api/payments/esewa/failure?ref=${encodeURIComponent(transactionUuid)}`,
    });
    return { providerRef: transactionUuid, next: { type: "form", ...form } };
  },

  async verify(payment): Promise<ProviderVerdict> {
    const { esewa, fetch } = getCoreConfig();
    const url = new URL("/api/epay/transaction/status/", esewa.statusUrl);
    url.searchParams.set("product_code", esewa.productCode);
    url.searchParams.set("total_amount", toEsewaAmount(payment.amountPaisa));
    url.searchParams.set("transaction_uuid", payment.providerRef);

    let body: EsewaStatusResponse;
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) return { kind: "ERROR", message: `eSewa status HTTP ${response.status}` };
      body = (await response.json()) as EsewaStatusResponse;
    } catch (error) {
      return { kind: "ERROR", message: `eSewa status request failed: ${String(error)}` };
    }
    if (body.transaction_uuid !== undefined && body.transaction_uuid !== payment.providerRef) {
      return { kind: "ERROR", message: "eSewa status returned a different transaction" };
    }

    const status = String(body.status ?? "").toUpperCase();
    switch (status) {
      case "COMPLETE": {
        const amountPaisa = fromEsewaAmount(body.total_amount);
        if (amountPaisa === null)
          return { kind: "ERROR", message: "eSewa status returned an invalid amount" };
        return {
          kind: "COMPLETED",
          amountPaisa,
          providerTxnId: body.ref_id ?? null,
          providerStatus: status,
          raw: body,
        };
      }
      case "PENDING":
        return { kind: "PENDING", providerStatus: status, raw: body };
      case "AMBIGUOUS":
        return { kind: "AMBIGUOUS", providerStatus: status, raw: body };
      case "NOT_FOUND":
        return { kind: "NOT_FOUND", providerStatus: status, raw: body };
      case "CANCELED":
        return { kind: "CANCELLED", providerStatus: status, raw: body };
      case "FULL_REFUND":
      case "PARTIAL_REFUND":
        return { kind: "REFUNDED", providerStatus: status, raw: body };
      default:
        return { kind: "ERROR", message: `Unknown eSewa status "${status}"` };
    }
  },
};
