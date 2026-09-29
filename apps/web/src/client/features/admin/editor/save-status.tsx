"use client";

import { Button, cn, toast } from "@virzeen/ui";
import { formatDateTime } from "@/client/lib/format";
import { useProductEditor } from "./editor-context";

/** Brings the first field with a problem into view and focus; says the problem when it isn't on screen. */
function revealFirstProblem(message: string) {
  const target = document.querySelector<HTMLElement>(
    '[data-product-editor] [aria-invalid="true"], [data-product-editor] [data-field-error]',
  );
  if (!target) return void toast.error(message);
  target.scrollIntoView({ block: "center" });
  target.focus({ preventScroll: true });
}

/**
 * The top bar's save state (specs/product-editor-on-page.md "Autosave"): "Saving…", "Saved" (the time in its
 * title), "Couldn't save: {reason}" with Try again, or "Fix the highlighted field to save" with Show. Announced
 * politely; the buttons sit outside the live region.
 */
export function SaveStatus({ className }: { className?: string }) {
  const { save, retry } = useProductEditor();
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-x-2", className)}>
      <p
        aria-live="polite"
        data-save-state={save.status}
        className={cn(
          "text-small",
          save.status === "error" || save.status === "invalid" ? "text-danger" : "text-ink-muted",
        )}
        title={save.status === "saved" ? `Saved ${formatDateTime(save.savedAt)}` : undefined}
      >
        {save.status === "saving" && "Saving…"}
        {save.status === "saved" && "Saved"}
        {save.status === "error" && `Couldn't save: ${save.message}`}
        {save.status === "invalid" && "Fix the highlighted field to save"}
      </p>
      {save.status === "error" && (
        <Button variant="link" size="sm" onClick={retry}>
          Try again
        </Button>
      )}
      {save.status === "invalid" && (
        <Button variant="link" size="sm" onClick={() => revealFirstProblem(save.message)}>
          Show
        </Button>
      )}
    </div>
  );
}
