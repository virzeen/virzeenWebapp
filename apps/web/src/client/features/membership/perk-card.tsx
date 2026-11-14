import { cn } from "@virzeen/ui";

type PerkCardProps = {
  /** A small icon in a circle (decorative). */
  icon: React.ReactNode;
  title: string;
  /** The perk in a few words, large. */
  value: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  testId?: string;
};

/**
 * One member perk on the portal (specs/member-perks.md): an icon, the name, the benefit large, and a line or a small
 * control under it. Quiet on purpose: the perks sit below the points card and shouldn't compete with it.
 */
export function PerkCard({ icon, title, value, className, children, testId }: PerkCardProps) {
  return (
    <article
      className={cn("flex flex-col gap-4 rounded-md border border-line bg-surface p-6", className)}
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-canvas"
        >
          {icon}
        </span>
        <h3 className="text-body text-ink-muted">{title}</h3>
      </div>
      <p className="font-display text-h2">{value}</p>
      {children}
    </article>
  );
}
