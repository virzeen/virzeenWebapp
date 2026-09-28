// ◆ OWNER DECISION PENDING (docs/STATUS.md): maximum order total for Cash on Delivery (payment-policy.md §7).
export const COD_MAX_TOTAL_PAISA = 2_000_000; // Rs 20,000

export function isCodAvailable(totalPaisa: number): boolean {
  return totalPaisa <= COD_MAX_TOTAL_PAISA;
}
