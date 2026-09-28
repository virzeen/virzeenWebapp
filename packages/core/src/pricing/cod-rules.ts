// Maximum order total for Cash on Delivery (payment-policy.md §7). Owner decision 2026-09-28: no limit while
// cash on delivery is the only payment method. Set a number of paisa to bring a limit back.
export const COD_MAX_TOTAL_PAISA: number | null = null;

export function isCodAvailable(totalPaisa: number): boolean {
  return COD_MAX_TOTAL_PAISA === null || totalPaisa <= COD_MAX_TOTAL_PAISA;
}
