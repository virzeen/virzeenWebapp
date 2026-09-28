"use client";

import { Button, Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger, toast } from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
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
  const [isPending, startTransition] = useTransition();

  function archive() {
    startTransition(async () => {
      const result = await ACTIONS[kind]({ id });
      if (!result.ok) return void toast.error(messageFor(result.error));
      setOpen(false);
      toast.success(`${name} archived`);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" shape="pill">
          Archive
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Archive ${name}?`}
        description="It disappears from the shop. Past orders keep their details."
      >
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep</Button>
          </DialogClose>
          <Button variant="destructive" loading={isPending} onClick={archive}>
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
