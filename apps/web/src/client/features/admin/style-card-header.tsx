"use client";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  FormField,
  Input,
} from "@virzeen/ui";
import { useRef, useState } from "react";

type StyleCardHeaderProps = {
  headingId: string;
  style: string;
  /** Returns why the name can't be used, or null when the style was renamed. */
  onRename: (to: string) => string | null;
  onRemove: () => void;
};

// The card is keyed by the style's name, so a rename draws a new card: focus finds its Rename button by name.
const renameButtonOf = (style: string) =>
  document.querySelector<HTMLElement>(`[data-style-rename="${CSS.escape(style)}"]`);

/**
 * A style card's header: the name (h3), Rename (in place) and Remove style (confirmed). The name field opens with
 * its text selected; Save name or Cancel puts focus back on Rename. After Remove, focus goes to Add style.
 */
export function StyleCardHeader({ headingId, style, onRename, onRemove }: StyleCardHeaderProps) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(style);
  const [renameError, setRenameError] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const removed = useRef(false);

  function openRename() {
    setNewName(style);
    setRenameError(null);
    setRenaming(true);
    requestAnimationFrame(() => {
      nameInput.current?.focus();
      nameInput.current?.select();
    });
  }

  function closeRename(name: string) {
    setRenaming(false);
    requestAnimationFrame(() => renameButtonOf(name)?.focus());
  }

  function rename() {
    const name = newName.trim();
    const problem = name === style ? null : onRename(newName);
    setRenameError(problem);
    if (!problem) closeRename(name || style);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="min-w-0 font-display text-h3 wrap-anywhere">
          {style}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            shape="pill"
            data-style-rename={style}
            aria-expanded={renaming}
            onClick={openRename}
          >
            Rename
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" shape="pill">
                Remove style
              </Button>
            </DialogTrigger>
            <DialogContent
              title={`Remove ${style}?`}
              description="Its photos go too. Saved sizes stay on the list, switched off, because past orders use them. Nothing changes in the shop until you save."
              onCloseAutoFocus={(event) => {
                if (!removed.current) return;
                // The card is gone with its Remove style button.
                event.preventDefault();
                document.querySelector<HTMLElement>("[data-add-style]")?.focus();
              }}
            >
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Keep</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      removed.current = true;
                      onRemove();
                    }}
                  >
                    Remove
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {renaming && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <FormField label="Style name" error={renameError ?? undefined} className="flex-1">
            <Input
              ref={nameInput}
              value={newName}
              maxLength={40}
              autoComplete="off"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  rename();
                }
                if (e.key === "Escape") closeRename(style);
              }}
            />
          </FormField>
          <div className="flex gap-2 sm:pt-7">
            <Button size="sm" shape="pill" onClick={rename}>
              Save name
            </Button>
            <Button variant="ghost" size="sm" shape="pill" onClick={() => closeRename(style)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
