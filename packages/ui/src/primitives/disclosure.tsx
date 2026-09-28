"use client";

import { ChevronDown } from "lucide-react";
import {
  Accordion as AccordionPrimitive,
  Separator as SeparatorPrimitive,
  Tabs as TabsPrimitive,
  Tooltip as TooltipPrimitive,
  VisuallyHidden as VisuallyHiddenPrimitive,
} from "radix-ui";
import { cn } from "../lib/cn";

/** Divides groups of content. Use spacing alone when it's enough. */
export function Separator({ className, ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      className={cn(
        "shrink-0 bg-line data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

/** Switch between views of the same thing (Details / Care / Shipping). Not for page navigation. */
export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("flex gap-6 border-b border-line", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent text-small font-medium text-ink-muted transition-colors duration-150 ease-standard hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none data-[state=active]:border-ink data-[state=active]:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "pt-4 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

/** Collapsible sections: FAQ, product description and care on mobile. Not for primary content. */
export function Accordion({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root className={cn("border-t border-line", className)} {...props} />;
}

export type AccordionItemProps = React.ComponentProps<typeof AccordionPrimitive.Item> & {
  title: React.ReactNode;
};

export function AccordionItem({ className, title, children, ...props }: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item className={cn("border-b border-line", className)} {...props}>
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="group flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-body font-medium text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none">
          {title}
          <ChevronDown
            className="size-5 shrink-0 text-ink-muted transition-transform duration-250 ease-standard group-aria-expanded:rotate-180"
            strokeWidth={1.5}
            aria-hidden
          />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="pb-4 text-body text-ink-muted">
        {children}
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}

/** Explains an icon button on desktop. Never put essential information in a tooltip (not visible on touch). */
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-20 rounded-sm bg-ink px-2 py-1 text-small text-canvas shadow-sm data-[state=delayed-open]:animate-fade-in"
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/** Text only screen readers announce (e.g. extra context for an icon). */
export const VisuallyHidden = VisuallyHiddenPrimitive.Root;
