"use client";

import { Button, Dialog, DialogClose, DialogContent, DialogFooter } from "@virzeen/ui";
import type { FeatureCardView } from "./features-state";

type FeatureRemoveDialogProps = {
  /** The card asked about; kept while the dialog closes, so its text doesn't change on the way out. */
  card: FeatureCardView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
  /** Where focus goes once it has closed: the card's Remove (Keep), or the card that took its place. */
  focusAfterClose: () => HTMLElement | null | undefined;
};

/** "Remove this feature?" before a feature card goes (patterns.md §10: destructive actions are confirmed). */
export function FeatureRemoveDialog({
  card,
  open,
  onOpenChange,
  onRemove,
  focusAfterClose,
}: FeatureRemoveDialogProps) {
  const description = !card
    ? undefined
    : card.title.trim()
      ? `"${card.title}" comes off the product page.`
      : "Its picture comes off the product page.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Remove this feature?"
        description={description}
        // The button that opened it may be gone (its card was removed).
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          focusAfterClose()?.focus();
        }}
      >
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onRemove}>
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
