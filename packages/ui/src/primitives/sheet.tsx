"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "../lib/cn";

/**
 * A panel that slides in over the page and holds content or a flow.
 * `side="right"`: cart drawer and the phone menu. `side="bottom"`: mobile filters.
 * Critical yes/no confirmations use `Dialog` instead.
 *
 * `header` replaces the title bar (and its close button) with your own top row, e.g. a back button and an X made
 * with `SheetClose` (give it an `aria-label`). The title then stays only for screen readers, still naming the dialog:
 *
 * ```tsx
 * <SheetContent title="Menu" header={<SheetClose asChild><Button … aria-label="Close menu">…</Button></SheetClose>}>
 * ```
 */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

const sheetVariants = cva("fixed z-40 flex flex-col bg-canvas shadow-md outline-none", {
  variants: {
    side: {
      right:
        "inset-y-0 right-0 h-full w-full max-w-md data-[state=closed]:animate-slide-out-right data-[state=open]:animate-slide-in-right",
      bottom:
        "inset-x-0 bottom-0 max-h-5/6 rounded-t-md data-[state=closed]:animate-slide-out-bottom data-[state=open]:animate-slide-in-bottom",
    },
  },
  defaultVariants: { side: "right" },
});

export type SheetContentProps = React.ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants> & {
    /** Title shown in the title bar; also the dialog's accessible name (only for screen readers with `header`). */
    title: React.ReactNode;
    description?: React.ReactNode;
    /**
     * Your own top row in place of the title bar, which also drops the default close button: put an X made with
     * `SheetClose` in it. The title and description stay for screen readers. The row is 64px tall and doesn't scroll.
     */
    header?: React.ReactNode;
    /** Sticky footer (e.g. subtotal + Checkout button). */
    footer?: React.ReactNode;
  };

export function SheetContent({
  className,
  side,
  title,
  description,
  header,
  footer,
  children,
  ...props
}: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <SheetPrimitive.Content
        className={cn(sheetVariants({ side }), className)}
        {...(description ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        {header ? (
          <div className="flex min-h-16 shrink-0 items-center gap-4 px-6">
            <SheetPrimitive.Title className="sr-only">{title}</SheetPrimitive.Title>
            {description && (
              <SheetPrimitive.Description className="sr-only">{description}</SheetPrimitive.Description>
            )}
            {header}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-3">
            <div className="flex flex-col">
              <SheetPrimitive.Title className="font-display text-h3 text-ink">{title}</SheetPrimitive.Title>
              {description && (
                <SheetPrimitive.Description className="text-small text-ink-muted">
                  {description}
                </SheetPrimitive.Description>
              )}
            </div>
            <SheetPrimitive.Close
              className="-mr-3 inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 ease-standard hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
              aria-label="Close"
            >
              <X className="size-5" strokeWidth={1.5} aria-hidden />
            </SheetPrimitive.Close>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
