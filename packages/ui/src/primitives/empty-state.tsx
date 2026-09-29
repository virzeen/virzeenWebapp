import { cn } from "../lib/cn";

export type EmptyStateProps = {
  /** Message from docs/ui/content-style.md, e.g. "Your bag is empty." */
  title: React.ReactNode;
  /** The title's element. `h1` when the empty state is the whole page (404, error, offline); `p` by default. */
  titleAs?: "h1" | "h2" | "h3" | "p";
  description?: React.ReactNode;
  /** One action, usually a `ButtonLink` ("Browse the collection"). */
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

/** Shown when there's no data (empty bag, no orders, no results). Errors use `Alert` instead. */
export function EmptyState({
  title,
  titleAs: Title = "p",
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 px-4 py-16 text-center", className)}>
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-surface text-ink-muted">
          {icon}
        </div>
      )}
      <div className="flex max-w-prose flex-col gap-2">
        <Title className="font-display text-h3 text-ink">{title}</Title>
        {description && <p className="text-body text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
