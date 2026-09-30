"use client";

import { Button, Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@virzeen/ui";
import { LayoutTemplate } from "lucide-react";
import { useId, useRef, useState } from "react";
import { SIZE_CHART_TEMPLATES, type SizeChartTemplateId } from "./size-chart-templates";

type ChoicesProps = {
  onPick: (id: SizeChartTemplateId) => void;
  /** Layout of the list: three across on the empty table, one under another in the dialog. */
  className: string;
};

/** Tops, Bottoms and Blank, each a button with what it holds under it (its description). */
export function SizeChartTemplateChoices({ onPick, className }: ChoicesProps) {
  const idBase = useId();
  return (
    <ul className={className}>
      {SIZE_CHART_TEMPLATES.map((template) => (
        <li key={template.id} className="flex flex-col items-start gap-1">
          <Button
            variant="secondary"
            size="sm"
            shape="pill"
            aria-describedby={`${idBase}-${template.id}`}
            data-template={template.id}
            onClick={() => onPick(template.id)}
          >
            {template.name}
          </Button>
          <span id={`${idBase}-${template.id}`} className="text-small text-ink-muted">
            {template.summary}
          </span>
        </li>
      ))}
    </ul>
  );
}

type DialogProps = {
  /** Something is typed in the table, so a template would replace it: the dialog says so. */
  replaces: boolean;
  onPick: (id: SizeChartTemplateId) => void;
  /** Where focus goes once a template is in: the table's first box to fill. */
  focusAfterPick: (id: SizeChartTemplateId) => HTMLElement | null | undefined;
};

/** "Start from a template" once the table has started: asks before replacing it, with the same three choices. */
export function SizeChartTemplateDialog({ replaces, onPick, focusAfterPick }: DialogProps) {
  const [open, setOpen] = useState(false);
  const picked = useRef<SizeChartTemplateId | null>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) picked.current = null;
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" shape="pill">
          <LayoutTemplate className="size-4" strokeWidth={1.5} aria-hidden />
          Start from a template
        </Button>
      </DialogTrigger>
      <DialogContent
        title={replaces ? "Replace the table with a template?" : "Start from a template"}
        description={
          replaces
            ? "What's in the table now is replaced. The values are left blank for you to fill in."
            : "The values are left blank for you to fill in."
        }
        // Replacing loses what's typed: focus starts on "Keep my table", so Enter can't replace it by habit.
        onOpenAutoFocus={(event) => {
          if (!replaces) return;
          event.preventDefault();
          keepRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          if (!picked.current) return;
          const target = focusAfterPick(picked.current);
          if (!target) return;
          event.preventDefault();
          target.focus();
        }}
      >
        <SizeChartTemplateChoices
          className="flex flex-col gap-4"
          onPick={(id) => {
            picked.current = id;
            onPick(id);
            setOpen(false);
          }}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button ref={keepRef} variant="secondary">
              {replaces ? "Keep my table" : "Cancel"}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
