import "server-only";

// One interface for every payment provider (ADR-0003). Verification is always server-to-server.

/** What the browser does next after "Place order" (docs/backend/api-contract.md POST /checkout). */
export type CheckoutNext =
  | { type: "done" }
  | { type: "redirect"; url: string }
  | { type: "form"; action: string; fields: Record<string, string> };

export type OrderForPayment = {
  orderNumber: string;
  subtotalPaisa: number;
  shippingPaisa: number;
  totalPaisa: number;
  customer: { name: string; email: string; phone: string };
};

/** Provider's answer about one payment attempt, normalised. */
export type ProviderVerdict =
  | {
      kind: "COMPLETED";
      amountPaisa: number;
      providerTxnId: string | null;
      providerStatus: string;
      raw: unknown;
    }
  | { kind: "PENDING"; providerStatus: string; raw: unknown }
  /** Provider can't settle it yet ("halt" state). Never auto-resolved (payment-policy.md §8). */
  | { kind: "AMBIGUOUS"; providerStatus: string; raw: unknown }
  /** No payment was made in this session (eSewa NOT_FOUND). */
  | { kind: "NOT_FOUND"; providerStatus: string; raw: unknown }
  | { kind: "CANCELLED"; providerStatus: string; raw: unknown }
  | { kind: "EXPIRED"; providerStatus: string; raw: unknown }
  | { kind: "REFUNDED"; providerStatus: string; raw: unknown }
  | { kind: "ERROR"; message: string };

export interface PaymentProvider {
  /** Starts a payment attempt for an order that is already saved with its total. */
  initiate(order: OrderForPayment, attempt: number): Promise<{ providerRef: string; next: CheckoutNext }>;
  /** Asks the provider for the truth about an attempt. Never throws for provider/network errors. */
  verify(payment: { providerRef: string; amountPaisa: number }): Promise<ProviderVerdict>;
}
