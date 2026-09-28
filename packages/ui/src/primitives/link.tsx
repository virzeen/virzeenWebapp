import { cva, type VariantProps } from "class-variance-authority";
import NextLink from "next/link";
import { cn } from "../lib/cn";
import { buttonVariants } from "./button";

const linkVariants = cva(
  "rounded-sm transition-colors duration-150 ease-standard focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none",
  {
    variants: {
      variant: {
        default: "text-ink underline underline-offset-4 hover:text-ink-muted",
        subtle: "text-ink-muted hover:text-ink",
        nav: "inline-flex min-h-11 items-center text-small font-medium tracking-wide text-ink hover:text-ink-muted aria-[current=page]:underline aria-[current=page]:underline-offset-8",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type NextLinkProps = React.ComponentProps<typeof NextLink>;

export type LinkProps = NextLinkProps & VariantProps<typeof linkVariants>;

/**
 * Navigates to a URL (client-side for internal routes).
 * `default` for inline text links, `subtle` for secondary links (footer, meta), `nav` for header navigation
 * (set `aria-current="page"` on the active item).
 * To trigger an action use `Button`; for a link that looks like a button use `ButtonLink`.
 */
export function Link({ className, variant, ...props }: LinkProps) {
  return <NextLink className={cn(linkVariants({ variant }), className)} {...props} />;
}

export type ButtonLinkProps = NextLinkProps & VariantProps<typeof buttonVariants>;

/**
 * A navigation link styled as a button: hero calls-to-action, "Continue shopping", "View order".
 * Accepts the same `variant`, `size` and `shape` as `Button`.
 */
export function ButtonLink({ className, variant, size, shape, ...props }: ButtonLinkProps) {
  return <NextLink className={cn(buttonVariants({ variant, size, shape }), className)} {...props} />;
}

export { linkVariants };
