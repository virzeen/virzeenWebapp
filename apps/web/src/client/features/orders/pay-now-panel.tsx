"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  FormField,
  RadioGroup,
  RadioGroupItem,
  toast,
} from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitProviderForm } from "@/client/features/checkout/submit-provider-form";
import { messageFor } from "@/client/lib/error-messages";
import { cancelUnpaidOrderAction, payNowAction } from "@/server/actions/payments";

type OnlineMethod = "ESEWA" | "KHALTI";

const METHOD_LABELS: Record<OnlineMethod, string> = { ESEWA: "eSewa", KHALTI: "Khalti" };

type PayNowPanelProps = {
  orderNumber: string;
  /** When the 15 minutes run out, as the shop shows times ("3:45 PM", Nepal time). */
  payBy: string;
  /** Whole minutes left when the page loaded. */
  minutesLeft: number;
  /** The online methods switched on, in checkout's order. */
  methods: OnlineMethod[];
  /** The order's method: picked first. */
  defaultMethod: OnlineMethod;
  /** The customer just came back from a payment that didn't go through. */
  failed: boolean;
};

function timeLeft(minutes: number) {
  if (minutes < 1) return "less than a minute left";
  return minutes === 1 ? "1 minute left" : `${minutes} minutes left`;
}

/**
 * "Waiting for your payment" on an online order's page (specs/payment-window.md): the time to pay by, Pay now with
 * eSewa or Khalti (a new attempt, the same total), and Cancel order behind a confirmation (the items go back to the
 * bag).
 */
export function PayNowPanel({
  orderNumber,
  payBy,
  minutesLeft,
  methods,
  defaultMethod,
  failed,
}: PayNowPanelProps) {
  const router = useRouter();
  const [method, setMethod] = useState<OnlineMethod>(
    methods.includes(defaultMethod) ? defaultMethod : methods[0]!,
  );
  const [error, setError] = useState<string | null>(null);
  const [paying, startPaying] = useTransition();
  const [cancelling, startCancelling] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function payNow() {
    setError(null);
    startPaying(async () => {
      const result = await payNowAction({ orderNumber, paymentMethod: method });
      if (!result.ok) return setError(messageFor(result.error));
      const { next } = result.data;
      if (next.type === "done") router.push(`/checkout/success?order=${orderNumber}`);
      else if (next.type === "redirect") window.location.assign(next.url);
      else submitProviderForm(next.action, next.fields);
    });
  }

  function cancelOrder() {
    startCancelling(async () => {
      const result = await cancelUnpaidOrderAction({ orderNumber });
      setConfirmOpen(false);
      if (!result.ok) return setError(messageFor(result.error));
      toast.success("Order cancelled. The items are back in your bag.");
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="pay-now-heading" className="flex flex-col gap-6 rounded-md bg-surface p-6">
      {failed && (
        <Alert variant="warning">Payment didn&apos;t go through. You can still pay until {payBy}.</Alert>
      )}
      <div className="flex flex-col gap-2">
        <h2 id="pay-now-heading" className="font-display text-h3">
          Waiting for your payment
        </h2>
        <p className="text-body">
          Pay by <span className="whitespace-nowrap">{payBy}</span> to keep this order (
          {timeLeft(minutesLeft)}). After that it&apos;s cancelled and the items go back to your bag.
        </p>
      </div>
      {methods.length > 1 && (
        <FormField label="Pay with">
          <RadioGroup
            variant="card"
            value={method}
            onValueChange={(value) => setMethod(value as OnlineMethod)}
            className="grid-cols-2"
          >
            {methods.map((value) => (
              <RadioGroupItem key={value} value={value} label={METHOD_LABELS[value]} />
            ))}
          </RadioGroup>
        </FormField>
      )}
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="flex flex-col gap-2 sm:items-start">
        <Button size="lg" shape="pill" loading={paying} disabled={cancelling} onClick={payNow}>
          {methods.length > 1 ? "Pay now" : `Pay now with ${METHOD_LABELS[method]}`}
        </Button>
        <p className="text-small text-ink-muted">
          If you&apos;ve just paid, it can take a minute to show here.
        </p>
      </div>
      <Dialog open={confirmOpen} onOpenChange={(open) => !cancelling && setConfirmOpen(open)}>
        <DialogTrigger asChild>
          <Button variant="underline" className="self-start" disabled={paying}>
            Cancel order
          </Button>
        </DialogTrigger>
        <DialogContent title="Cancel this order?" description="The items go back to your bag.">
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" shape="pill" disabled={cancelling}>
                Keep order
              </Button>
            </DialogClose>
            <Button shape="pill" loading={cancelling} onClick={cancelOrder}>
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
