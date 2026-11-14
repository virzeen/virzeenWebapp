import { cn } from "../lib/cn";

/** The rim's thin discs (coin-edge styles each by position). */
const EDGE_LAYERS = ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "e10", "e11"] as const;

/** The pile under the coin, bottom first: where each lands and its drop, one after another. */
const PILE = [
  {
    id: "p1",
    className:
      "bottom-3 translate-x-0.5 motion-safe:group-hover/coin:animate-coin-drop-1 motion-safe:group-data-active/coin:animate-coin-drop-1",
  },
  {
    id: "p2",
    className:
      "bottom-6 -translate-x-1 motion-safe:group-hover/coin:animate-coin-drop-2 motion-safe:group-data-active/coin:animate-coin-drop-2",
  },
  {
    id: "p3",
    className:
      "bottom-9 translate-x-1 motion-safe:group-hover/coin:animate-coin-drop-3 motion-safe:group-data-active/coin:animate-coin-drop-3",
  },
  {
    id: "p4",
    className:
      "bottom-12 -translate-x-0.5 motion-safe:group-hover/coin:animate-coin-drop-4 motion-safe:group-data-active/coin:animate-coin-drop-4",
  },
] as const;

export type CoinStackProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** The emblem raised on both faces (e.g. the brand mark, an SVG that uses `currentColor`). Decorative. */
  mark: React.ReactNode;
  /** Plays the stack and holds it (for a tap on touch screens); hovering plays it too. */
  active?: boolean;
};

/**
 * A thick 3D silver coin with an embossed emblem (the points in the member portal, specs/wallet.md). It sways slowly;
 * on hover, or while `active`, it spins three times, jumps and lands flat on a pile of coins that drop in one after
 * another. Fixed size (10rem by 14rem). Decorative: hidden from assistive tech, so say what it stands for in text
 * next to it. Still with reduced motion.
 */
export function CoinStack({ mark, active = false, className, ...props }: CoinStackProps) {
  return (
    <span
      aria-hidden
      data-active={active || undefined}
      className={cn("group/coin coin-stage block", className)}
      {...props}
    >
      <span className="coin-ground" />
      {PILE.map((coin) => (
        <span key={coin.id} className={cn("coin-flat opacity-0", coin.className)} />
      ))}
      <span className="motion-safe:animate-coin-idle motion-safe:group-hover/coin:animate-coin-stack motion-safe:group-data-active/coin:animate-coin-stack coin-hero">
        <span className="coin-edge">
          {EDGE_LAYERS.map((layer) => (
            <span key={layer} />
          ))}
        </span>
        <span className="coin-face">
          <span className="coin-emboss">{mark}</span>
        </span>
        <span className="coin-face coin-face-back">
          <span className="coin-emboss">{mark}</span>
        </span>
      </span>
    </span>
  );
}
