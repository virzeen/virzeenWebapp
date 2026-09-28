"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "../lib/cn";

/**
 * A panel that slides in over the page and holds content or a flow.
 * `side="right"`: cart drawer. `side="bottom"`: mobile filters and menus.
 * Critical yes/no confirmations use `Dialog` instead.
 */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

const sheetVariants = cva("fixed z-40 flex flex-col bg-canvas shadow-md outline-none", {
  variants: {
    side: {
      right:
        "inset-y-0 right-0 max-w-md h-full w-full data-[state=closed]:animate-slide-out-right data-[state=open]:animate-slide-in-right",
      bottom:
        "inset-x-0 bottom-0 max-h-5/6 rounded-t-md data-[state=closed]:animate-slide-out-bottom data-[state=open]:animate-slide-in-bottom",
    },
  },
  defaultVariants: { side: "right" },
});

export type SheetContentProps = React.ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants> & {
    /** Title shown in the header; also the dialog's accessible name. */
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Sticky footer (e.g. subtotal + Checkout button). */
    footer?: React.ReactNode;
  };

export function SheetContent({
  className,
  side,
  title,
  description,
  footer,
  children,
  ...props
}: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="inset-0 fixed z-40 bg-ink/40 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <SheetPrimitive.Content
        className={cn(sheetVariants({ side }), className)}
        {...(description ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        <div className="gap-4 px-6 py-3 flex items-center justify-between border-b border-line">
          <div className="flex flex-col">
            <SheetPrimitive.Title className="font-display text-h3 text-ink">{title}</SheetPrimitive.Title>
            {description && (
              <SheetPrimitive.Description className="text-small text-ink-muted">
                {description}
              </SheetPrimitive.Description>
            )}
          </div>
          <SheetPrimitive.Close
            className="-mr-3 size-11 inline-flex items-center justify-center rounded-full text-ink-muted transition-colors duration-150 ease-standard hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="size-5" strokeWidth={1.5} aria-hidden />
          </SheetPrimitive.Close>
        </div>
        <div className="px-6 py-4 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line">{footer}</div>}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
