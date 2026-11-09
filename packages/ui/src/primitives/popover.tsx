"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "../lib/cn";

/**
 * A small panel anchored to a button: a few lines of detail or a short list (the product editor's "Before publishing"
 * checklist on its status chip). Not modal: Escape, a click outside or the trigger closes it, and focus returns to
 * the trigger. Name the panel with `aria-label` or `aria-labelledby`. Decisions belong in a `Dialog`; long content
 * or forms in a `Sheet`. `elevation="flat"` drops the border and the shadow: a plain white panel, like Nike's
 * "Sort By" list (the shop's `SortMenu`).
 *
 * ```tsx
 * <Popover>
 *   <PopoverTrigger asChild><Button variant="secondary" size="sm">Draft</Button></PopoverTrigger>
 *   <PopoverContent aria-labelledby="checklist-heading">…</PopoverContent>
 * </Popover>
 * ```
 */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

const popoverContentVariants = cva(
  "z-20 flex w-72 max-w-(--radix-popover-content-available-width) flex-col gap-3 rounded-md bg-canvas p-4 text-body text-ink outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in",
  {
    variants: {
      elevation: {
        raised: "border border-line shadow-md",
        flat: "",
      },
    },
    defaultVariants: { elevation: "raised" },
  },
);

export type PopoverContentProps = React.ComponentProps<typeof PopoverPrimitive.Content> &
  VariantProps<typeof popoverContentVariants>;

export function PopoverContent({
  className,
  elevation,
  align = "start",
  sideOffset = 8,
  collisionPadding = 16,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(popoverContentVariants({ elevation }), className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
