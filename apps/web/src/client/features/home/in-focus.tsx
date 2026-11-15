import { Container, Link } from "@virzeen/ui";
import { ArchiveIcon, type ArchiveIconName } from "./archive-icons";

export type InFocusTile = {
  key: string;
  kind: "category" | "collection";
  slug: string;
  name: string;
  href: string;
};

/** First match wins: words in a category's or collection's name or slug pick its icon. */
const ICONS: { words: RegExp; icon: ArchiveIconName }[] = [
  { words: /home|living|decor|kitchen|bed|furniture/i, icon: "home" },
  { words: /bottom|pant|trouser|jean|short|skirt/i, icon: "trousers" },
  { words: /wear|top|shirt|tee|hoodie|jacket|knit|clothing|apparel/i, icon: "tee" },
  { words: /watch|time/i, icon: "watch" },
  { words: /glass|eye|sun/i, icon: "glasses" },
  { words: /access|bracelet|bead/i, icon: "bracelet" },
  { words: /jewel|gem|ring|necklace/i, icon: "ring" },
  { words: /bag|tote|carry/i, icon: "bag" },
  { words: /essential|basic|core|pack/i, icon: "box" },
  { words: /new|launch|drop|sale|offer/i, icon: "sparkle" },
];

/** The icon for a tile: by its words, else a general one for its kind. */
export function iconFor(tile: Pick<InFocusTile, "kind" | "name" | "slug">): ArchiveIconName {
  const found = ICONS.find(({ words }) => words.test(`${tile.name} ${tile.slug}`));
  if (found) return found.icon;
  return tile.kind === "collection" ? "gem" : "tag";
}

/**
 * The last section of the home page, before the footer: "VIRZEEN ARCHIVE'S", like Nike's Spotlight (owner,
 * 2026-11-15; specs/home-archive.md). A big heading, one line under it, then a centred grid of small tiles (one of our
 * own outline icons, `archive-icons.tsx`, whose solid parts fill in on hover while the name fades a little, and a name each), up to eight to a row. A tile is a shop category or a live collection, so it needs no admin work.
 * Server Component; nothing to show, nothing drawn.
 */
export function InFocus({ tiles }: { tiles: InFocusTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <Container as="section" aria-labelledby="archive-heading" className="py-16 lg:py-24">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 id="archive-heading" className="font-display text-display tracking-tight uppercase">
          Virzeen Archive&apos;s
        </h2>
        <p className="max-w-prose text-body-lg text-ink">Every category and collection, one tap away.</p>
      </div>
      <ul className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-y-8 lg:mt-14">
        {tiles.map((tile) => (
          <li key={tile.key} className="basis-1/3 px-2 sm:basis-1/4 md:basis-1/6 lg:basis-1/8">
            <Link
              href={tile.href}
              variant="subtle"
              className="group flex min-h-11 flex-col items-center gap-3 text-ink hover:text-ink"
            >
              <ArchiveIcon name={iconFor(tile)} className="size-8" />
              <span className="text-center text-small font-medium tracking-tight transition-opacity duration-250 ease-standard group-hover:opacity-70 motion-reduce:transition-none">
                {tile.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
