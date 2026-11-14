import { LogoMark } from "@/client/components/layout/logo-mark";

/**
 * The expiry icon of the points card: an hourglass whose sand runs from the top bulb to the bottom one, then the glass
 * turns over and it starts again (still with reduced motion). Draws in the colour of the text around it.
 */
export function SandGlass() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      className="size-6 motion-safe:animate-hourglass"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h12M6 21h12" />
      <path d="M7 3c0 5 3.5 6.5 5 9-1.5 2.5-5 4-5 9M17 3c0 5-3.5 6.5-5 9 1.5 2.5 5 4 5 9" />
      <path
        d="M8.6 5.2h6.8c-.4 2.6-2.2 3.9-3.4 5.6-1.2-1.7-3-3-3.4-5.6z"
        fill="currentColor"
        stroke="none"
        className="origin-bottom fill-box motion-safe:animate-sand-top"
      />
      <path d="M12 12v6" strokeWidth="1" className="motion-safe:animate-sand-stream" />
      <path
        d="M8.4 19.4c.6-2.4 2.2-3.2 3.6-4.6 1.4 1.4 3 2.2 3.6 4.6z"
        fill="currentColor"
        stroke="none"
        className="origin-bottom fill-box motion-safe:animate-sand-bottom"
      />
    </svg>
  );
}

/** The worth icon of the points card: a small silver coin with the Virzeen mark that flips now and then. */
export function SpinningCoin() {
  return (
    <span
      aria-hidden
      className="grid size-7 place-items-center rounded-full border border-canvas/70 bg-canvas/15 motion-safe:animate-icon-flip"
    >
      <LogoMark className="h-auto w-3.5" />
    </span>
  );
}
