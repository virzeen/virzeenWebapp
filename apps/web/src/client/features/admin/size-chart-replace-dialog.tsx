"use client";

import { Button, Dialog, DialogClose, DialogContent, DialogFooter } from "@virzeen/ui";
import { useRef, useState } from "react";

type Focus = () => HTMLElement | null | undefined;

/** Something that would replace the size table (a template, a whole pasted table), asked about first. */
export type ReplaceTableRequest = {
  title: string;
  description: string;
  /** Puts the new table in. */
  replace: () => void;
  /** Where focus goes after replacing: the new table's first box to fill. */
  focusAfterReplace: Focus;
  /** Where focus goes after "Keep my table": where it was (the box pasted into, the template's button). */
  focusAfterKeep: Focus;
};

/**
 * Asks before something replaces a size table that has something typed in it (patterns.md §10), like "Start from a
 * template". `ask` opens it; the request stays while it closes, so its text doesn't change on the way out.
 */
export function useReplaceTableDialog() {
  const [request, setRequest] = useState<ReplaceTableRequest | null>(null);
  const [open, setOpen] = useState(false);
  const replaced = useRef(false);
  const keepRef = useRef<HTMLButtonElement>(null);

  function ask(next: ReplaceTableRequest) {
    replaced.current = false;
    setRequest(next);
    setOpen(true);
  }

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        title={request?.title ?? ""}
        description={request?.description}
        // Replacing loses what's typed: focus starts on "Keep my table", so Enter can't replace it by habit.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          keepRef.current?.focus();
        }}
        // Nothing opened it with a trigger, so focus is put back by hand.
        onCloseAutoFocus={(event) => {
          const target = replaced.current ? request?.focusAfterReplace() : request?.focusAfterKeep();
          if (!target) return;
          event.preventDefault();
          target.focus();
        }}
      >
        <DialogFooter>
          <DialogClose asChild>
            <Button ref={keepRef} variant="secondary">
              Keep my table
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              replaced.current = true;
              request?.replace();
              setOpen(false);
            }}
          >
            Replace table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { ask, dialog };
}
