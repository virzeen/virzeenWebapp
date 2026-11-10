import "server-only";
import { stockAlertService } from "@virzeen/core";
import { after } from "next/server";

/**
 * Sends the "back in stock" emails that are due, after the reply has gone (specs/notify-me.md). Call it from every
 * request that can return stock: admin product saves and archives, admin order changes, payment returns, checkout
 * with an online method, reconciliation. Cheap when nothing is due; never throws. `after()` runs even when the
 * request fails, so it can be scheduled before the work.
 */
export function sendDueStockAlerts() {
  after(() => stockAlertService.sendDue());
}
