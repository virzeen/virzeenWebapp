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
  Tooltip,
} from "@virzeen/ui";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import type { ActionError } from "@/server/actions/result";
import {
  archiveCollectionAction,
  archiveProductAction,
  archiveSizeGuideAction,
} from "@/server/actions/admin/catalog";
import { archivePortfolioProjectAction } from "@/server/actions/admin/portfolio";

const ACTIONS = {
  product: archiveProductAction,
  collection: archiveCollectionAction,
  portfolio: archivePortfolioProjectAction,
  sizeGuide: archiveSizeGuideAction,
} as const;

// Trying again can't help with these: something must change first (a collection or size guide still has products)
// or the item is already gone.
const BLOCKED = new Set<ActionError["code"]>(["CONFLICT", "NOT_FOUND"]);

type ArchiveButtonProps = {
  kind: keyof typeof ACTIONS;
  id: string;
  name: string;
  /** Where to go after archiving (defaults to staying and refreshing). */
  redirectTo?: string;
  /** The button's word: "Archive" (default) or "Delete" for products. Either way it is a soft delete. */
  label?: "Archive" | "Delete";
  /** A trash icon button named after the item, with a tooltip, for rows that are short on room (the products list). */
  icon?: boolean;
};

/** Archive (soft delete) with a confirmation Dialog — catalog data is never hard-deleted (data-rules.md §1). */
export function ArchiveButton({
  kind,
  id,
  name,
  redirectTo,
  label = "Archive",
  icon = false,
}: ArchiveButtonProps) {
  const done = label === "Delete" ? "deleted" : "archived";
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
      toast.success(`${name} ${done}`);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {icon ? (
        <Tooltip content={label}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`${label} ${name}`}>
              <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
            </Button>
          </DialogTrigger>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" shape="pill">
            {label}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        title={blocked ? `${name} can't be ${done} yet` : `${label} ${name}?`}
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
                {label}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
