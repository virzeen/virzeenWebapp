import "server-only";
import { getCoreConfig } from "../config";
import { AppError } from "../errors";
import type { PaymentProvider, ProviderVerdict } from "./provider";

// Khalti KPG-2 web checkout (payment-policy.md §6). Khalti amounts are paisa: no conversion needed.

export const KHALTI_MIN_PAISA = 1_000; // Rs 10

type InitiateResponse = { pidx?: string; payment_url?: string; expires_at?: string };
type LookupResponse = {
  pidx?: string;
  total_amount?: number;
  status?: string;
  transaction_id?: string | null;
};

function khaltiRequest(path: string, body: unknown) {
  const { khalti, fetch } = getCoreConfig();
  if (!khalti.secretKey) throw new AppError("PAYMENT_FAILED", "Khalti isn't configured.");
  return fetch(`${khalti.baseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { Authorization: `Key ${khalti.secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
}

/** The last two labels of a host name: `test-pay.khalti.com` → `khalti.com`. */
const siteOf = (host: string) => host.split(".").slice(-2).join(".");

/**
 * The customer is only ever sent to Khalti's own payment page: same scheme and site as the API we called
 * (`dev.khalti.com` → `test-pay.khalti.com`, `khalti.com` → `pay.khalti.com`; the e2e mock is localhost for both).
 */
function isKhaltiPage(paymentUrl: string) {
  try {
    const page = new URL(paymentUrl);
    const api = new URL(getCoreConfig().khalti.baseUrl);
    return page.protocol === api.protocol && siteOf(page.hostname) === siteOf(api.hostname);
  } catch {
    return false;
  }
}

export const khaltiProvider: PaymentProvider = {
  async initiate(order) {
    const { siteUrl } = getCoreConfig();
    if (order.totalPaisa < KHALTI_MIN_PAISA) {
      throw new AppError("PAYMENT_FAILED", "Khalti needs an order of at least Rs 10.");
    }
    // Khalti's breakdown must add up to the amount, so the items line is after any discount code.
    const itemsPaisa = order.subtotalPaisa - order.discountPaisa;
    if (order.discountPaisa < 0 || itemsPaisa < 0 || itemsPaisa + order.shippingPaisa !== order.totalPaisa) {
      throw new AppError("INTERNAL", "Khalti amounts don't add up.");
    }
    let body: InitiateResponse;
    try {
      const response = await khaltiRequest("/epayment/initiate/", {
        return_url: `${siteUrl}/api/payments/khalti/callback`,
        website_url: siteUrl,
        amount: order.totalPaisa,
        purchase_order_id: order.orderNumber,
        purchase_order_name: `Virzeen order ${order.orderNumber}`,
        customer_info: {
          name: order.customer.name,
          email: order.customer.email,
          phone: order.customer.phone,
        },
        amount_breakdown: [
          { label: "Items", amount: itemsPaisa },
          { label: "Shipping", amount: order.shippingPaisa },
        ],
      });
      if (!response.ok) throw new AppError("PAYMENT_FAILED", `Khalti initiate HTTP ${response.status}`);
      body = (await response.json()) as InitiateResponse;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("PAYMENT_FAILED", "Couldn't reach Khalti.");
    }
    if (
      !body.pidx ||
      !body.payment_url ||
      !/^[A-Za-z0-9]+$/.test(body.pidx) ||
      !isKhaltiPage(body.payment_url)
    ) {
      throw new AppError("PAYMENT_FAILED", "Khalti returned an invalid response.");
    }
    return { providerRef: body.pidx, next: { type: "redirect", url: body.payment_url } };
  },

  async verify(payment): Promise<ProviderVerdict> {
    let body: LookupResponse;
    try {
      const response = await khaltiRequest("/epayment/lookup/", { pidx: payment.providerRef });
      if (!response.ok) return { kind: "ERROR", message: `Khalti lookup HTTP ${response.status}` };
      body = (await response.json()) as LookupResponse;
    } catch (error) {
      return { kind: "ERROR", message: `Khalti lookup failed: ${String(error)}` };
    }
    if (body.pidx !== undefined && body.pidx !== payment.providerRef) {
      return { kind: "ERROR", message: "Khalti lookup returned a different pidx" };
    }
    const status = String(body.status ?? "");
    switch (status.toLowerCase()) {
      case "completed":
        if (!Number.isInteger(body.total_amount))
          return { kind: "ERROR", message: "Khalti lookup returned an invalid amount" };
        return {
          kind: "COMPLETED",
          amountPaisa: body.total_amount as number,
          providerTxnId: body.transaction_id ?? null,
          providerStatus: status,
          raw: body,
        };
      // Khalti's lookup table: "Pending" → "Hold, do not provide service. And contact Khalti team." It may still
      // settle either way, so it's never read as unpaid (payment-policy.md §1.5, §6).
      case "pending":
        return { kind: "AMBIGUOUS", providerStatus: status, raw: body };
      // The link exists but nothing was paid on it yet.
      case "initiated":
        return { kind: "PENDING", providerStatus: status, raw: body };
      case "user canceled":
        return { kind: "CANCELLED", providerStatus: status, raw: body };
      case "expired":
        return { kind: "EXPIRED", providerStatus: status, raw: body };
      case "refunded":
      case "partially refunded":
        return { kind: "REFUNDED", providerStatus: status, raw: body };
      default:
        return { kind: "ERROR", message: `Unknown Khalti status "${status}"` };
    }
  },
};
