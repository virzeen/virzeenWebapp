import { Check } from "lucide-react";

/** A filled circle with a tick: the bullet of the membership point lists. `onDark` is the outlined one for black cards. */
export function Bullet({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
        onDark ? "border border-canvas/60 text-canvas" : "bg-ink text-canvas"
      }`}
    >
      <Check className="size-3" strokeWidth={2.5} />
    </span>
  );
}
