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
import { useEffect, useRef, useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import type { ActionError } from "@/server/actions/result";
import {
  archiveCategoryAction,
  archiveCollectionAction,
  archiveProductAction,
} from "@/server/actions/admin/catalog";
import { archivePortfolioProjectAction } from "@/server/actions/admin/portfolio";

const ACTIONS = {
  product: archiveProductAction,
  category: archiveCategoryAction,
  collection: archiveCollectionAction,
  portfolio: archivePortfolioProjectAction,
} as const;

// Trying again can't help with these: something must change first (a category still has products) or the
// item is already gone.
const BLOCKED = new Set<ActionError["code"]>(["CONFLICT", "NOT_FOUND"]);

type ArchiveButtonProps = {
  kind: keyof typeof ACTIONS;
  id: string;
  name: string;
  /** Where to go after archiving (defaults to staying and refreshing). */
  redirectTo?: string;
};

/** Archive (soft delete) with a confirmation Dialog — catalog data is never hard-deleted (data-rules.md §1). */
export function ArchiveButton({ kind, id, name, redirectTo }: ArchiveButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<Pick<ActionError, "code" | "message"> | null>(null);
  const [isPending, startTransition] = useTransition();
  const okRef = useRef<HTMLButtonElement>(null);
  const blocked = error !== null && BLOCKED.has(error.code);

  // The Archive button that had focus is gone once archiving is blocked; keep focus inside the dialog.
  useEffect(() => {
    if (blocked) okRef.current?.focus();
  }, [blocked]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setError(null);
  }

  function archive() {
    setError(null);
    startTransition(async () => {
      const result = await ACTIONS[kind]({ id });
      if (!result.ok) {
        // Shown in the dialog, not a toast: the admin has to act on it (and a toast would cover the buttons).
        setError(result.error);
        if (result.error.code === "NOT_FOUND") router.refresh();
        return;
      }
      setOpen(false);
      toast.success(`${name} archived`);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" shape="pill">
          Archive
        </Button>
      </DialogTrigger>
      <DialogContent
        title={blocked ? `${name} can't be archived yet` : `Archive ${name}?`}
        description={blocked ? undefined : "It disappears from the shop. Past orders keep their details."}
      >
        {error && <Alert variant="danger">{messageFor(error)}</Alert>}
        <DialogFooter>
          {blocked ? (
            <DialogClose asChild>
              <Button ref={okRef}>OK</Button>
            </DialogClose>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="secondary">Keep</Button>
              </DialogClose>
              <Button variant="destructive" loading={isPending} onClick={archive}>
                Archive
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
