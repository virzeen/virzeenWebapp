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
  Input,
  Stack,
  Textarea,
  toast,
} from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import {
  advanceOrderAction,
  markCodCollectedAction,
  markPaidManuallyAction,
  markRefusedAtDoorAction,
  recordRefundAction,
  reverifyPaymentAction,
} from "@/server/actions/admin/orders";
import type { ActionResult } from "@/server/actions/result";

type OrderActionsProps = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
};

type Run = <T>(action: () => Promise<ActionResult<T>>, success: string) => Promise<boolean>;

function useRunner(): [boolean, Run] {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const run: Run = (action, success) =>
    new Promise((resolve) => {
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          toast.success(success);
          router.refresh();
        } else {
          toast.error(messageFor(result.error));
        }
        resolve(result.ok);
      });
    });
  return [isPending, run];
}

/** A dialog that collects one or two text fields before running an action. */
function ReasonDialog({
  trigger,
  title,
  description,
  fields,
  confirmLabel,
  destructive = false,
  onConfirm,
  warning,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  fields: { name: string; label: string; multiline?: boolean }[];
  confirmLabel: string;
  destructive?: boolean;
  warning?: string;
  onConfirm: (values: Record<string, string>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const complete = fields.every((f) => (values[f.name] ?? "").trim().length >= 2);

  async function confirm() {
    setBusy(true);
    const ok = await onConfirm(values);
    setBusy(false);
    if (ok) {
      setOpen(false);
      setValues({});
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description} hideClose={busy}>
        <Stack gap={4}>
          {warning && <Alert variant="warning">{warning}</Alert>}
          {fields.map((field) => (
            <FormField key={field.name} label={field.label} required>
              {field.multiline ? (
                <Textarea
                  rows={3}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                />
              ) : (
                <Input
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                />
              )}
            </FormField>
          ))}
        </Stack>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={busy}>
              Back
            </Button>
          </DialogClose>
          <Button
            variant={destructive ? "destructive" : "primary"}
            loading={busy}
            disabled={!complete}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The fulfilment and payment steps available for this order's current state (payment-policy.md §3). */
export function OrderActions({ orderNumber, status, paymentStatus, paymentMethod }: OrderActionsProps) {
  const [isPending, run] = useRunner();
  const canCancel = ["PENDING", "CONFIRMED", "PROCESSING"].includes(status) && paymentStatus !== "PENDING";
  const isOnline = paymentMethod !== "COD";

  return (
    <div className="flex flex-wrap gap-3">
      {status === "CONFIRMED" && (
        <Button
          shape="pill"
          loading={isPending}
          onClick={() =>
            run(() => advanceOrderAction({ orderNumber, to: "PROCESSING" }), "Marked as being packed")
          }
        >
          Start packing
        </Button>
      )}
      {status === "PROCESSING" && (
        <ReasonDialog
          trigger={<Button shape="pill">Mark shipped</Button>}
          title="Mark as shipped"
          description="The customer gets an email with the courier and tracking number."
          fields={[
            { name: "courierName", label: "Courier" },
            { name: "trackingNumber", label: "Tracking number" },
          ]}
          confirmLabel="Mark shipped"
          onConfirm={(v) =>
            run(
              () =>
                advanceOrderAction({
                  orderNumber,
                  to: "SHIPPED",
                  courierName: v.courierName ?? "",
                  trackingNumber: v.trackingNumber ?? "",
                }),
              "Marked as shipped",
            )
          }
        />
      )}
      {status === "SHIPPED" && (
        <Button
          shape="pill"
          loading={isPending}
          onClick={() =>
            run(() => advanceOrderAction({ orderNumber, to: "DELIVERED" }), "Marked as delivered")
          }
        >
          Mark delivered
        </Button>
      )}
      {paymentStatus === "COD_DUE" && ["SHIPPED", "DELIVERED"].includes(status) && (
        <Button
          variant="secondary"
          shape="pill"
          loading={isPending}
          onClick={() => run(() => markCodCollectedAction({ orderNumber }), "Cash marked as collected")}
        >
          Cash collected
        </Button>
      )}
      {status === "SHIPPED" && paymentStatus === "COD_DUE" && (
        <ReasonDialog
          trigger={
            <Button variant="destructive" shape="pill">
              Refused at door
            </Button>
          }
          title="Customer refused the parcel?"
          description="The order is cancelled and its items go back into stock. The customer isn't emailed. This can't be undone."
          fields={[{ name: "reason", label: "What happened (for your records)", multiline: true }]}
          confirmLabel="Mark refused"
          destructive
          onConfirm={(v) =>
            run(
              () => markRefusedAtDoorAction({ orderNumber, reason: v.reason ?? "" }),
              "Marked as refused; stock restored",
            )
          }
        />
      )}
      {isOnline && paymentStatus === "PENDING" && (
        <>
          <Button
            variant="secondary"
            shape="pill"
            loading={isPending}
            onClick={() =>
              run(() => reverifyPaymentAction({ orderNumber }), "Payment re-checked with the provider")
            }
          >
            Re-verify payment
          </Button>
          <ReasonDialog
            trigger={
              <Button variant="ghost" shape="pill">
                Mark paid (manual)
              </Button>
            }
            title="Mark paid manually?"
            warning="Only do this after confirming the exact amount arrived in the eSewa/Khalti merchant dashboard (runbook: payment-stuck-pending)."
            fields={[{ name: "reason", label: "Provider reference and note", multiline: true }]}
            confirmLabel="Mark paid"
            onConfirm={(v) =>
              run(() => markPaidManuallyAction({ orderNumber, reason: v.reason ?? "" }), "Marked as paid")
            }
          />
        </>
      )}
      {isOnline && paymentStatus === "PAID" && ["CANCELLED", "RETURNED", "DELIVERED"].includes(status) && (
        <ReasonDialog
          trigger={
            <Button variant="secondary" shape="pill">
              Record refund
            </Button>
          }
          title="Record a refund"
          description="Refund first in the provider's merchant dashboard, then record it here."
          fields={[{ name: "reason", label: "Reason and provider refund reference", multiline: true }]}
          confirmLabel="Record refund"
          onConfirm={(v) =>
            run(() => recordRefundAction({ orderNumber, reason: v.reason ?? "" }), "Refund recorded")
          }
        />
      )}
      {status === "DELIVERED" && (
        <ReasonDialog
          trigger={
            <Button variant="ghost" shape="pill">
              Mark returned
            </Button>
          }
          title="Mark as returned"
          fields={[{ name: "reason", label: "Reason", multiline: true }]}
          confirmLabel="Mark returned"
          onConfirm={(v) =>
            run(
              () => advanceOrderAction({ orderNumber, to: "RETURNED", reason: v.reason ?? "" }),
              "Marked as returned",
            )
          }
        />
      )}
      {canCancel && (
        <ReasonDialog
          trigger={
            <Button variant="destructive" shape="pill">
              Cancel order
            </Button>
          }
          title="Cancel this order?"
          description="Stock goes back to the shop and the customer is emailed. This can't be undone."
          fields={[{ name: "reason", label: "Reason (shown to the customer)", multiline: true }]}
          confirmLabel="Cancel order"
          destructive
          onConfirm={(v) =>
            run(
              () => advanceOrderAction({ orderNumber, to: "CANCELLED", reason: v.reason ?? "" }),
              "Order cancelled",
            )
          }
        />
      )}
    </div>
  );
}
