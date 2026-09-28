"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "../lib/cn";

/**
 * Short confirmation that needs a decision ("Remove item?", "Cancel order?").
 * Long content or forms belong in a `Sheet` or a page. Focus is trapped, Escape closes, focus returns to the trigger.
 *
 * ```tsx
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <DialogTrigger asChild><Button variant="destructive">Cancel order</Button></DialogTrigger>
 *   <DialogContent title="Cancel this order?" description="Stock is returned to the shop.">
 *     <DialogFooter>…buttons…</DialogFooter>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Hide the corner close button (e.g. while a request is running). */
  hideClose?: boolean;
};

export function DialogContent({
  className,
  title,
  description,
  hideClose = false,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="inset-0 fixed z-50 bg-ink/50 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "max-w-md gap-6 p-6 fixed top-1/2 left-1/2 z-50 flex w-full -translate-x-1/2 -translate-y-1/2 flex-col rounded-md bg-canvas shadow-md data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in",
          "max-sm:top-auto max-sm:bottom-0 max-sm:max-w-none max-sm:translate-y-0 max-sm:rounded-b-none",
          className,
        )}
        {...(description ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        <div className="gap-2 pr-8 flex flex-col">
          <DialogPrimitive.Title className="font-display text-h3 text-ink">{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="text-body text-ink-muted">
              {description}
            </DialogPrimitive.Description>
          )}
        </div>
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="top-3 right-3 size-11 absolute inline-flex items-center justify-center rounded-full text-ink-muted transition-colors duration-150 ease-standard hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="size-5" strokeWidth={1.5} aria-hidden />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Button row at the bottom of a dialog: secondary action first, primary last. */
export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("gap-3 sm:flex-row sm:justify-end flex flex-col-reverse", className)} {...props} />
  );
}
