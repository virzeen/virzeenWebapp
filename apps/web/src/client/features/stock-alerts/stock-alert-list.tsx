"use client";

import { Button, Link, toast } from "@virzeen/ui";
import { useState, useTransition } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { messageFor } from "@/client/lib/error-messages";
import { cancelStockAlertAction, type StockAlertRow } from "@/server/actions/stock-alerts";

/**
 * The profile's "Notify me" list (specs/notify-me.md): the sizes the customer waits for, newest first, each with
 * Remove. The section goes once the last one is removed.
 */
export function StockAlertList({ alerts }: { alerts: StockAlertRow[] }) {
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const shown = alerts.filter((alert) => !removed.has(alert.variantId));
  if (shown.length === 0) return null;

  function remove(alert: StockAlertRow) {
    setPendingId(alert.variantId);
    startTransition(async () => {
      const result = await cancelStockAlertAction({ variantId: alert.variantId });
      setPendingId(null);
      if (!result.ok) return void toast.error(messageFor(result.error));
      setRemoved((current) => new Set(current).add(alert.variantId));
      toast.message(`We won't email you about ${alert.productName}.`);
    });
  }

  return (
    <section aria-labelledby="profile-notify-me" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="profile-notify-me" className="font-display text-h2">
          Notify me
        </h2>
        <p className="text-small text-ink-muted">We&apos;ll email you once when each of these is back.</p>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {shown.map((alert) => (
          <li key={alert.variantId} className="flex items-center gap-4 py-4">
            <div className="w-16 shrink-0">
              <CloudImage src={alert.imageUrl} alt={alert.imageAlt} sizes="64px" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={alert.href} className="text-body wrap-anywhere">
                {alert.productName}
              </Link>
              <p className="text-small text-ink-muted">{alert.variantLabel}</p>
            </div>
            <Button
              variant="underline"
              size="sm"
              loading={pendingId === alert.variantId}
              aria-label={`Remove ${alert.productName}, ${alert.variantLabel}`}
              onClick={() => remove(alert)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
