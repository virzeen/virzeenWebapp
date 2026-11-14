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
  RadioGroup,
  RadioGroupItem,
  toast,
} from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { addWalletAction } from "@/server/actions/admin/members";

type MemberWalletActionsProps = {
  userId: string;
  /** The customer's name or, when they have none, their email. */
  label: string;
};

/**
 * Admin → Customers: add credit (whole rupees) or points to a customer, for a gift or a goodwill credit. The reason is
 * required and kept in the audit log (specs/wallet.md).
 */
export function MemberWalletActions({ userId, label }: MemberWalletActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"CREDIT" | "POINTS">("CREDIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setAmount("");
    setReason("");
    setError(null);
  }

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await addWalletAction({ userId, kind, amount: Number(amount), reason });
      if (!result.ok)
        return setError(
          result.error.fields?.amount ?? result.error.fields?.reason ?? messageFor(result.error),
        );
      toast.success(kind === "CREDIT" ? "Credit added" : "Points added");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" shape="pill" aria-label={`Add credit or points for ${label}`}>
          Add credit
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Add credit or points"
        description={`For ${label}. It is recorded in the audit log.`}
      >
        {error && <Alert variant="danger">{error}</Alert>}
        <RadioGroup
          aria-label="What to add"
          value={kind}
          onValueChange={(value) => setKind(value as "CREDIT" | "POINTS")}
          className="grid-cols-2"
        >
          <RadioGroupItem value="CREDIT" label="Credit" description="Rupees" />
          <RadioGroupItem value="POINTS" label="Points" description="1 point = Rs 1" />
        </RadioGroup>
        <FormField label={kind === "CREDIT" ? "Amount (Rs)" : "Points"} required>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </FormField>
        <FormField label="Reason" required>
          <Input maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} />
        </FormField>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" shape="pill">
              Cancel
            </Button>
          </DialogClose>
          <Button shape="pill" loading={isPending} disabled={!amount || !reason.trim()} onClick={add}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
