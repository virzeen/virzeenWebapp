"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  toast,
} from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { formatDate } from "@/client/lib/format";
import { endPassAction, grantPassAction } from "@/server/actions/admin/members";

type MemberPassActionsProps = {
  userId: string;
  /** The customer's name or, when they have none, their email. */
  label: string;
  /** ISO string of when the running Pass ends, or null when they have none. */
  passEndsAt: string | null;
};

/**
 * Admin → Customers: give a customer the Monochrome Pass for 6 months or a year, add to a running one, or end it
 * (specs/membership-portal.md). Every change is audited on the server. Used until the Pass can be bought online.
 */
export function MemberPassActions({ userId, label, passEndsAt }: MemberPassActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const running = passEndsAt !== null && new Date(passEndsAt) > new Date();

  function grant(months: 6 | 12) {
    setError(null);
    startTransition(async () => {
      const result = await grantPassAction({ userId, months });
      if (!result.ok) return setError(messageFor(result.error));
      toast.success(`Pass until ${formatDate(result.data.passEndsAt)}`);
      setOpen(false);
      router.refresh();
    });
  }

  function end() {
    setError(null);
    startTransition(async () => {
      const result = await endPassAction({ userId });
      if (!result.ok) return setError(messageFor(result.error));
      toast.success("Pass ended");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" shape="pill" aria-label={`Manage the Pass for ${label}`}>
          Manage Pass
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Monochrome Pass"
        description={
          running
            ? `${label} has the Pass until ${formatDate(passEndsAt)}.`
            : `${label} is a free MONO Member. Give them the Pass for 6 months or a year.`
        }
      >
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button shape="pill" loading={isPending} onClick={() => grant(6)} className="flex-1">
            {running ? "Add 6 months" : "Give 6 months"}
          </Button>
          <Button shape="pill" loading={isPending} onClick={() => grant(12)} className="flex-1">
            {running ? "Add 1 year" : "Give 1 year"}
          </Button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" shape="pill">
              Close
            </Button>
          </DialogClose>
          {running && (
            <Button variant="destructive" shape="pill" loading={isPending} onClick={end}>
              End Pass
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
