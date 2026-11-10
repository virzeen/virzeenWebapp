"use client";

import { Button, Link, toast } from "@virzeen/ui";
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { messageFor } from "@/client/lib/error-messages";
import { cancelStockAlertAction, type StockAlertRow } from "@/server/actions/stock-alerts";

type StockAlertListProps = {
  alerts: StockAlertRow[];
  /** Where focus goes when the last request is removed and the section goes (an element with tabIndex -1). */
  emptyFocusId: string;
};

/**
 * The profile's "Notify me" list (specs/notify-me.md): the sizes the customer waits for, newest first, each with
 * Remove. After a Remove, focus moves to the next row's Remove, else the previous one's; the section goes once the
 * last one is removed, and focus moves to `emptyFocusId`.
 */
export function StockAlertList({ alerts, emptyFocusId }: StockAlertListProps) {
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLUListElement>(null);
  // The removed row's place, to put focus back after the list draws again.
  const refocusAt = useRef<number | null>(null);
  const shown = alerts.filter((alert) => !removed.has(alert.variantId));

  useLayoutEffect(() => {
    const index = refocusAt.current;
    if (index === null) return;
    refocusAt.current = null;
    const buttons = listRef.current?.querySelectorAll<HTMLElement>("[data-stock-alert-remove]");
    (buttons?.item(index) ?? buttons?.item(index - 1) ?? document.getElementById(emptyFocusId))?.focus();
  });

  if (shown.length === 0) return null;

  function setPendingFor(variantId: string, now: boolean) {
    setPending((current) => {
      const next = new Set(current);
      if (now) next.add(variantId);
      else next.delete(variantId);
      return next;
    });
  }

  function remove(alert: StockAlertRow, index: number) {
    setPendingFor(alert.variantId, true);
    startTransition(async () => {
      const result = await cancelStockAlertAction({ variantId: alert.variantId });
      setPendingFor(alert.variantId, false);
      if (!result.ok) return void toast.error(messageFor(result.error));
      refocusAt.current = index;
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
      <ul ref={listRef} className="divide-y divide-line border-y border-line">
        {shown.map((alert, index) => (
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
              loading={pending.has(alert.variantId)}
              aria-label={`Remove ${alert.productName}, ${alert.variantLabel}`}
              data-stock-alert-remove
              onClick={() => remove(alert, index)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
