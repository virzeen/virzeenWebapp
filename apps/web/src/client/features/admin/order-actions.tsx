"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { advanceOrderSchema, orderWithReasonSchema } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

type ReasonField = {
  name: string;
  label: string;
  multiline?: boolean;
  /** The server's rule for this field (from `@virzeen/validators`), so its message shows under the field. */
  schema: z.ZodString;
};

// The rules the server actions parse with (packages/validators/src/orders.ts).
const reasonSchema = orderWithReasonSchema.shape.reason;
const shippedSchema = advanceOrderSchema.options[1].shape; // the SHIPPED step

/**
 * A dialog that collects one or two text fields before running an action. The confirm button stays
 * enabled: pressing it shows what's missing under each field (docs/ui/patterns.md §4). It opens empty every time.
 */
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
  fields: ReasonField[];
  confirmLabel: string;
  destructive?: boolean;
  warning?: string;
  onConfirm: (values: Record<string, string>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(z.object(Object.fromEntries(fields.map((field) => [field.name, field.schema])))),
    mode: "onTouched",
    defaultValues: Object.fromEntries(fields.map((field) => [field.name, ""])),
  });
  const { errors, isSubmitting } = form.formState;

  function changeOpen(next: boolean) {
    if (!next && isSubmitting) return; // stay open until the action answers
    if (next) form.reset(); // every opening starts empty, whatever was typed last time
    setOpen(next);
  }

  async function confirm(values: Record<string, string>) {
    if (await onConfirm(values)) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description} hideClose={isSubmitting}>
        <form onSubmit={form.handleSubmit(confirm)} noValidate className="flex flex-col gap-6">
          <Stack gap={4}>
            {warning && <Alert variant="warning">{warning}</Alert>}
            {fields.map((field) => (
              <FormField key={field.name} label={field.label} error={errors[field.name]?.message} required>
                {field.multiline ? (
                  <Textarea
                    rows={3}
                    maxLength={field.schema.maxLength ?? undefined}
                    {...form.register(field.name)}
                  />
                ) : (
                  <Input
                    autoComplete="off"
                    maxLength={field.schema.maxLength ?? undefined}
                    {...form.register(field.name)}
                  />
                )}
              </FormField>
            ))}
          </Stack>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isSubmitting}>
                Back
              </Button>
            </DialogClose>
            <Button type="submit" variant={destructive ? "destructive" : "primary"} loading={isSubmitting}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A finished step swaps its button (or the dialog's trigger, where Radix sends focus back) for the next step's,
 * which drops keyboard focus to the page and the next Tab to "Skip to content". When the order's state changes
 * and focus was lost, this puts it on the first action now on offer, or on the group when none is left.
 */
function useKeepFocusInGroup(state: string) {
  const groupRef = useRef<HTMLDivElement>(null);
  const shownState = useRef(state);
  useEffect(() => {
    if (shownState.current === state) return; // first render: leave focus where the page put it
    shownState.current = state;
    // A timeout runs after Radix's own return-focus attempt for a closing dialog.
    const timer = setTimeout(() => {
      const group = groupRef.current;
      const active = document.activeElement;
      if (!group || (active !== null && active !== document.body && active.isConnected)) return;
      (group.querySelector<HTMLElement>("button:not(:disabled)") ?? group).focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [state]);
  return groupRef;
}

/** The fulfilment and payment steps available for this order's current state (payment-policy.md §3). */
export function OrderActions({ orderNumber, status, paymentStatus, paymentMethod }: OrderActionsProps) {
  const [isPending, run] = useRunner();
  const groupRef = useKeepFocusInGroup(`${status}|${paymentStatus}`);
  const canCancel = ["PENDING", "CONFIRMED", "PROCESSING"].includes(status) && paymentStatus !== "PENDING";
  const isOnline = paymentMethod !== "COD";

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label="Order actions"
      tabIndex={-1}
      className="flex flex-wrap gap-3 focus:outline-none"
    >
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
            { name: "courierName", label: "Courier", schema: shippedSchema.courierName },
            { name: "trackingNumber", label: "Tracking number", schema: shippedSchema.trackingNumber },
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
          fields={[
            {
              name: "reason",
              label: "What happened (for your records)",
              multiline: true,
              schema: reasonSchema,
            },
          ]}
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
            fields={[
              { name: "reason", label: "Provider reference and note", multiline: true, schema: reasonSchema },
            ]}
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
          fields={[
            {
              name: "reason",
              label: "Reason and provider refund reference",
              multiline: true,
              schema: reasonSchema,
            },
          ]}
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
          fields={[{ name: "reason", label: "Reason", multiline: true, schema: reasonSchema }]}
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
          fields={[
            {
              name: "reason",
              label: "Reason (shown to the customer)",
              multiline: true,
              schema: reasonSchema,
            },
          ]}
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
