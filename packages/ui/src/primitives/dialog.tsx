"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useId } from "react";
import { cn } from "../lib/cn";

/**
 * Short confirmation that needs a decision ("Remove item?", "Cancel order?").
 * Long content or forms belong in a `Sheet` or a page. Focus is trapped, Escape closes, focus returns to the trigger.
 * `size="lg"`: the longer popups the owner chose: the product page's "View product details" and "Size guide"
 * (specs/product-page.md, specs/size-guides.md). Its body scrolls between the title and a `footer` that stays in
 * view. The body takes keyboard focus (focus starts there when the dialog opens), so arrow keys and Page Down scroll
 * it; `media` puts a small picture (e.g. the product's photo) left of the title.
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

const dialogVariants = cva(
  [
    "fixed top-1/2 left-1/2 z-50 flex w-full -translate-x-1/2 -translate-y-1/2 flex-col rounded-md bg-canvas shadow-md data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in",
    "max-sm:top-auto max-sm:bottom-0 max-sm:max-w-none max-sm:translate-y-0 max-sm:rounded-b-none",
  ],
  {
    variants: {
      size: {
        md: "max-w-md gap-6 p-6",
        lg: "max-h-5/6 max-w-2xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof dialogVariants> & {
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Buttons under the content (`DialogFooter`); with `size="lg"` they stay in view while the body scrolls. */
    footer?: React.ReactNode;
    /** Hide the corner close button (e.g. while a request is running). */
    hideClose?: boolean;
    /** A small picture left of the title and description, e.g. the product's photo (decorative: give it alt=""). */
    media?: React.ReactNode;
  };

export function DialogContent({
  className,
  size,
  title,
  description,
  footer,
  hideClose = false,
  media,
  children,
  ...props
}: DialogContentProps) {
  const large = size === "lg";
  // Names the large dialog's scrolling body after the title (Radix keeps the title's own id to itself).
  const titleTextId = useId();
  const heading = (
    <>
      <DialogPrimitive.Title className="font-display text-h3 text-ink">
        {large ? <span id={titleTextId}>{title}</span> : title}
      </DialogPrimitive.Title>
      {description && (
        <DialogPrimitive.Description className="text-body text-ink-muted">
          {description}
        </DialogPrimitive.Description>
      )}
    </>
  );
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/50 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(dialogVariants({ size }), className)}
        {...(description ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        <div
          className={cn(
            "flex flex-col gap-2 pr-8",
            large && "border-b border-line px-6 pt-6 pr-14 pb-4",
            media && "flex-row items-center gap-4",
          )}
        >
          {media ? (
            <>
              <div className="w-16 shrink-0 overflow-hidden rounded-sm">{media}</div>
              <div className="flex min-w-0 flex-col gap-1">{heading}</div>
            </>
          ) : (
            heading
          )}
        </div>
        {large ? (
          <div
            // Focusable, so keyboard users can scroll it even when nothing inside takes focus (WCAG 2.1.1, axe
            // scrollable-region-focusable); the lint rule doesn't know a scrolling region needs focus.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- keyboard scrolling (WCAG 2.1.1)
            tabIndex={0}
            role="region"
            aria-labelledby={titleTextId}
            className="min-h-0 flex-1 overflow-y-auto p-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus focus-visible:outline-solid"
          >
            {children}
          </div>
        ) : (
          children
        )}
        {footer && (large ? <div className="border-t border-line px-6 py-4">{footer}</div> : footer)}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 ease-standard hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
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
    <div className={cn("flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)} {...props} />
  );
}
