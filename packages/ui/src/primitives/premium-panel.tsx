import { cn } from "../lib/cn";

export type PremiumPanelProps = React.ComponentProps<"article"> & {
  /** A large brand mark drawn faintly in the background, bottom right (the Virzeen logo). Decorative. */
  watermark?: React.ReactNode;
};

/**
 * The black panel of the Monochrome Pass (specs/membership-portal.md): rounded, with the brand mark as a faint
 * watermark behind the content, a border that glows and fades, and a band of light that sweeps across now and then, so
 * it reads as a VIP card. The shine is off with reduced motion. Put the content inside as normal children; the panel
 * sets white text on black. One per page at most: it is the single "premium" surface.
 */
export function PremiumPanel({ watermark, className, children, ...props }: PremiumPanelProps) {
  return (
    <article
      className={cn("relative isolate overflow-hidden rounded-xl bg-ink p-8 text-canvas", className)}
      {...props}
    >
      {watermark && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -bottom-16 -z-10 w-80 text-canvas/10"
        >
          {watermark}
        </div>
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl border border-canvas/60 motion-safe:animate-shine-border"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-canvas/15 to-transparent motion-safe:animate-shine-sweep"
      />
      {children}
    </article>
  );
}
