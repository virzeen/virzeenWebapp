"use client";

import { X } from "lucide-react";
import { Dialog as DropPanelPrimitive } from "radix-ui";
import { cn } from "../lib/cn";

/**
 * A short confirmation that drops down from the top, like Nike's "Added to bag": across the top of the screen on
 * phones, under the header on the right from `md` (lined up with the page's right edge, where the bag icon is).
 * Modal: the page dims, focus stays inside, Escape or a click outside closes it, and focus returns to what opened it.
 * For the result of an action with a next step or two ("View bag", "Checkout"). Decisions belong in a `Dialog`,
 * lists and forms in a `Sheet`.
 *
 * ```tsx
 * <DropPanel open={open} onOpenChange={setOpen}>
 *   <DropPanelContent title="Added to bag" icon={<CircleCheck … />} footer={<>…two buttons…</>}>
 *     …what was added…
 *   </DropPanelContent>
 * </DropPanel>
 * ```
 */
export const DropPanel = DropPanelPrimitive.Root;
export const DropPanelTrigger = DropPanelPrimitive.Trigger;
export const DropPanelClose = DropPanelPrimitive.Close;

export type DropPanelContentProps = React.ComponentProps<typeof DropPanelPrimitive.Content> & {
  /** The panel's heading, also its accessible name. */
  title: React.ReactNode;
  /** A 20px icon before the title (`aria-hidden`), e.g. a check after an add. */
  icon?: React.ReactNode;
  description?: React.ReactNode;
  /** The actions under the content: two buttons share the row equally. */
  footer?: React.ReactNode;
};

export function DropPanelContent({
  className,
  title,
  icon,
  description,
  footer,
  children,
  ...props
}: DropPanelContentProps) {
  return (
    <DropPanelPrimitive.Portal>
      <DropPanelPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DropPanelPrimitive.Content
        className={cn(
          "fixed inset-x-0 top-0 z-40 flex max-h-dvh flex-col gap-6 overflow-y-auto rounded-b-md bg-canvas px-4 pt-4 pb-6 shadow-md outline-none data-[state=closed]:animate-lift-up data-[state=open]:animate-drop-down sm:px-6",
          // From md: a 384px panel right under the 64px header, its right edge on the page's (Container's) right
          // edge, where the header's icons end.
          "md:inset-x-auto md:top-16 md:right-6 md:w-full md:max-w-sm md:rounded-md md:p-6 lg:right-page-edge",
          className,
        )}
        {...(description ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DropPanelPrimitive.Title className="flex items-center gap-2 text-body font-medium text-ink">
              {icon}
              {title}
            </DropPanelPrimitive.Title>
            {description && (
              <DropPanelPrimitive.Description className="text-small text-ink-muted">
                {description}
              </DropPanelPrimitive.Description>
            )}
          </div>
          <DropPanelPrimitive.Close
            className="-my-2 -mr-3 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 ease-standard hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="size-5" strokeWidth={1.5} aria-hidden />
          </DropPanelPrimitive.Close>
        </div>
        {children}
        {footer && <div className="grid auto-cols-fr grid-flow-col gap-3">{footer}</div>}
      </DropPanelPrimitive.Content>
    </DropPanelPrimitive.Portal>
  );
}
