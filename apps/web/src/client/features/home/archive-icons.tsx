import type { ReactNode } from "react";

/**
 * The Virzeen Archive's icons (specs/home-archive.md): our own drawings, one family, in the line-and-bead style of the
 * bracelet the owner chose (2026-11-15). Thin outlines at rest; the solid parts fill in when the tile is hovered
 * (the tile link is the `group`). Draw in the colour of the text around them.
 */
export type ArchiveIconName =
  | "bracelet"
  | "tee"
  | "trousers"
  | "home"
  | "box"
  | "bag"
  | "ring"
  | "watch"
  | "glasses"
  | "sparkle"
  | "gem"
  | "tag";

/** The parts that fill in on hover. */
const FILL =
  "fill-transparent transition-colors duration-250 ease-standard group-hover:fill-current motion-reduce:transition-none";

/** Twelve beads on a ring, like the owner's reference. Fixed numbers, so server and browser draw the same. */
const BEADS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * Math.PI) / 6;
  return {
    key: `bead-${i}`,
    cx: (12 + 7.4 * Math.sin(angle)).toFixed(2),
    cy: (12 - 7.4 * Math.cos(angle)).toFixed(2),
  };
});

const DRAWINGS: Record<ArchiveIconName, ReactNode> = {
  bracelet: (
    <>
      <circle cx="12" cy="12" r="7.4" />
      {BEADS.map((bead) => (
        <circle key={bead.key} cx={bead.cx} cy={bead.cy} r="1.55" className={FILL} />
      ))}
    </>
  ),
  tee: (
    <path
      className={FILL}
      d="M8.5 3.5 4 5.6 2.5 10.2l3.2 1.2 1-1.6v10.7h10.6V9.8l1 1.6 3.2-1.2L20 5.6l-4.5-2.1c-.6 1.5-1.9 2.4-3.5 2.4s-2.9-.9-3.5-2.4Z"
    />
  ),
  trousers: (
    <>
      <path className={FILL} d="M6.5 3h11l1.6 17.5h-5.2L12 9.8l-1.9 10.7H4.9L6.5 3Z" />
      <path d="M6.3 6h11.4" />
    </>
  ),
  home: <path className={FILL} d="M3.5 10.6 12 3.5l8.5 7.1v9.9h-6v-5.8h-5v5.8h-6v-9.9Z" />,
  box: (
    <>
      <path d="M12 2.8 20.5 7.4v9.2L12 21.2l-8.5-4.6V7.4L12 2.8Z" />
      <path className={FILL} d="M3.5 7.4 12 2.8l8.5 4.6L12 12 3.5 7.4Z" />
      <path d="M12 12v9.2" />
    </>
  ),
  bag: (
    <>
      <path d="M8.5 8.5V7a3.5 3.5 0 0 1 7 0v1.5" />
      <path className={FILL} d="M4.5 8.5h15l-1 12h-13l-1-12Z" />
    </>
  ),
  ring: (
    <>
      <circle cx="12" cy="14.6" r="6" />
      <path className={FILL} d="m9.6 5.6 1.3-2.1h2.2l1.3 2.1-2.4 3-2.4-3Z" />
    </>
  ),
  watch: (
    <>
      <path className={FILL} d="M9 2.8h6l.5 3.6h-7L9 2.8ZM8.5 17.6h7l-.5 3.6H9l-.5-3.6Z" />
      <circle cx="12" cy="12" r="5.6" />
      <path d="M12 9.4V12l1.8 1.2" />
    </>
  ),
  glasses: (
    <>
      <circle cx="6.5" cy="13" r="3.6" className={FILL} />
      <circle cx="17.5" cy="13" r="3.6" className={FILL} />
      <path d="M10.1 12.4c1.1-.8 2.7-.8 3.8 0M2.9 12.6 2 9M21.1 12.6 22 9" />
    </>
  ),
  sparkle: (
    <>
      <path
        className={FILL}
        d="M10.5 4c.5 4.7 2.8 7 7.5 7.5-4.7.5-7 2.8-7.5 7.5-.5-4.7-2.8-7-7.5-7.5 4.7-.5 7-2.8 7.5-7.5Z"
      />
      <path
        className={FILL}
        d="M18.5 2.5c.2 1.6 1 2.4 2.5 2.5-1.6.2-2.4 1-2.5 2.5-.2-1.6-1-2.4-2.5-2.5 1.6-.2 2.4-1 2.5-2.5Z"
      />
    </>
  ),
  gem: (
    <>
      <path d="M7 4h10l4 5-9 11.5L3 9l4-5Z" />
      <path className={FILL} d="M7 4h10l4 5H3l4-5Z" />
      <path d="m9.4 9 2.6 11.5L14.6 9" />
    </>
  ),
  tag: (
    <path
      className={FILL}
      fillRule="evenodd"
      d="M3.5 3.5H11l9.5 9.5-7.5 7.5L3.5 11V3.5Zm5.6 4.3a1.3 1.3 0 1 0-2.6 0 1.3 1.3 0 0 0 2.6 0Z"
    />
  ),
};

export function ArchiveIcon({ name, className }: { name: ArchiveIconName; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {DRAWINGS[name]}
    </svg>
  );
}
